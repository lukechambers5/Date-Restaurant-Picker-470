"""
Loads the local dataset, builds the Searcher index and ranks restaurants for a quiz.

Data sources (all local files, no live search):
  data/restaurants.jsonl       metadata, made by prepare_data.py from the Yelp business file
  restaurant_reviews.jsonl     reviews, made by yelp_checkpoint.py
  osm_restaurants.jsonl        optional: our own OSM + website crawl (osm_pull.py)
If the Yelp files are missing it falls back to sample_data/ so the app still runs.
"""
import json
import math
import os
from collections import defaultdict

import numpy as np

import quiz
from search import ASPECTS, Searcher, tok

PRICE_TARGET = {1: 15, 2: 30, 3: 55, 4: 95}  # rough $ per person for Yelp's price levels

# Yelp category -> quiz cuisine
CUISINE_CATS = {
    "Italian": ["italian", "pizza"], "Steakhouse": ["steakhouses"],
    "Japanese": ["japanese", "sushi bars", "ramen"], "Mexican": ["mexican", "tex-mex", "tacos"],
    "French": ["french", "brasseries"], "Indian": ["indian", "pakistani"],
    "American": ["american (new)", "american (traditional)", "burgers", "diners", "southern", "comfort food", "gastropubs"],
    "Seafood": ["seafood"], "Korean": ["korean"], "Thai": ["thai"], "Vietnamese": ["vietnamese"],
    "BBQ": ["barbeque"], "Mediterranean": ["mediterranean", "greek", "middle eastern", "lebanese"],
    "Café": ["cafes", "coffee & tea", "breakfast & brunch"], "Dessert": ["desserts", "bakeries", "ice cream & frozen yogurt"],
    "Chinese": ["chinese", "dim sum", "szechuan"],
}
DIET_CATS = {"Vegetarian": "vegetarian", "Vegan": "vegan", "Gluten-free": "gluten-free", "Halal": "halal"}
# Yelp Ambience flags that support a vibe / aesthetic
AMBIENCE_HINTS = {
    "Romantic": ["romantic", "intimate"], "Cozy": ["intimate"], "Trendy": ["trendy", "hipster"],
    "Chill": ["casual"], "Lively": ["touristy", "divey"], "Candlelit": ["romantic", "classy"],
    "Modern": ["trendy", "upscale"], "Retro": ["divey"],
}


def miles(a_lat, a_lng, b_lat, b_lng):
    r = math.radians
    h = math.sin(r(b_lat - a_lat) / 2) ** 2 + math.cos(r(a_lat)) * math.cos(r(b_lat)) * math.sin(r(b_lng - a_lng) / 2) ** 2
    return 2 * 3958.8 * math.asin(math.sqrt(h)) * 1.3  # x1.3 straight line -> road


def pct_rank(x):
    """0-100 percentile of each value within the array."""
    x = np.asarray(x, float)
    if len(x) < 2:
        return np.full(len(x), 50.0)
    return 100 * x.argsort().argsort() / (len(x) - 1)


def cuisine_of(cats):
    low = [c.lower() for c in cats]
    for label, keys in CUISINE_CATS.items():
        if any(k in low for k in keys):
            return label
    rest = [c for c in cats if c not in ("Restaurants", "Food", "Nightlife", "Bars")]
    return rest[0] if rest else "Restaurant"


class Store:
    def __init__(self, root=".", max_biz=None, max_per=None, model=None):
        self.root = root
        max_biz = max_biz or int(os.environ.get("MAX_BIZ", 3000))
        max_per = max_per or int(os.environ.get("MAX_PER", 20))
        meta_path = os.path.join(root, "data", "restaurants.jsonl")
        rev_path = os.path.join(root, "restaurant_reviews.jsonl")
        if os.path.exists(meta_path) and os.path.exists(rev_path):
            self.source = "yelp"
        else:
            meta_path = os.path.join(root, "sample_data", "restaurants.jsonl")
            rev_path = os.path.join(root, "sample_data", "restaurant_reviews.jsonl")
            self.source = "sample"

        meta = {}
        with open(meta_path, encoding="utf-8") as f:
            for line in f:
                m = json.loads(line)
                if m.get("lat") is not None:
                    meta[m["id"]] = m
        # keep the most-reviewed restaurants, balanced across cities
        by_city = defaultdict(list)
        for m in meta.values():
            by_city[m.get("city") or "?"].append(m)
        per_city = max(1, max_biz // max(1, len(by_city)))
        keep = set()
        for ms in by_city.values():
            ms.sort(key=lambda m: -(m.get("review_count") or 0))
            keep.update(m["id"] for m in ms[:per_city])

        docs = defaultdict(list)
        with open(rev_path, encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                b = r["business_id"]
                if b in keep and len(docs[b]) < max_per:
                    docs[b].append(r["text"])

        # our own collected data: OSM restaurants with crawled website text
        osm_path = os.path.join(root, "osm_restaurants.jsonl")
        if os.path.exists(osm_path):
            with open(osm_path, encoding="utf-8") as f:
                for line in f:
                    o = json.loads(line)
                    if not o.get("website_text") or o.get("lat") is None:
                        continue
                    oid = "osm:" + o["osm_id"]
                    meta[oid] = {
                        "id": oid, "name": o["name"], "address": o.get("address") or "Bryan / College Station, TX",
                        "city": "College Station", "lat": o["lat"], "lng": o["lon"], "stars": None, "review_count": 0,
                        "price": None, "categories": [c.strip().title() for c in (o.get("cuisine") or "").split(";") if c],
                        "attributes": {}, "source": "osm",
                    }
                    docs[oid] = [o["website_text"]]

        self.ids = [i for i in docs if i in meta and docs[i]]
        self.meta = [meta[i] for i in self.ids]
        self.pos = {b: i for i, b in enumerate(self.ids)}
        embed = model if model is not None else os.environ.get("EMBED_MODEL") or None
        print(f"[datastore] {self.source}: indexing {len(self.ids):,} restaurants "
              f"({'embeddings: ' + embed if embed else 'BM25 + lexicon, no embeddings'})")
        self.s = Searcher(self.ids, [docs[i] for i in self.ids], model=embed,
                          meta_text=[" ".join([m["name"], *m.get("categories", [])]) for m in self.meta])
        self.cuisine = [cuisine_of(m.get("categories", [])) for m in self.meta]

        # per-restaurant percentiles for the compatibility breakdown
        def termset_pct(terms):
            return pct_rank(self.s.lex_score({t: 1 for t in terms}))
        self.vibe_pct = {k: termset_pct(v) for k, v in quiz.VIBE_TERMS.items()}
        self.aes_pct = {k: termset_pct(v) for k, v in quiz.AESTHETIC_TERMS.items()}
        self.occ_pct = {k: termset_pct(v) for k, v in quiz.OCCASION_TERMS.items()}
        self.diet_pct = {k: termset_pct(v) for k, v in quiz.DIETARY_TERMS.items()}
        asp = [self.s.aspect_scores(i) for i in range(len(self.ids))]
        self.aspect_pct = {a: pct_rank([x[a] for x in asp]) for a in ASPECTS}

        cities = defaultdict(list)
        for m in self.meta:
            cities[m.get("city") or "?"].append(m)
        self.cities = sorted(
            ({"name": c, "lat": float(np.median([m["lat"] for m in ms])), "lng": float(np.median([m["lng"] for m in ms])),
              "count": len(ms)} for c, ms in cities.items()),
            key=lambda c: -c["count"],
        )

    # ------------------------------------------------------------------ output
    def tags(self, i):
        amb = (self.meta[i].get("attributes") or {}).get("ambience") or {}
        out = []
        for k in list(quiz.VIBE_TERMS) + list(quiz.AESTHETIC_TERMS):
            p = self.vibe_pct[k][i] if k in self.vibe_pct else self.aes_pct[k][i]
            if p >= 80 or any(amb.get(h) for h in AMBIENCE_HINTS.get(k, [])):
                out.append(k)
        return out[:5]

    def restaurant(self, i):
        m = self.meta[i]
        a = m.get("attributes") or {}
        facts = []
        if a.get("noise"): facts.append(f"Noise: {str(a['noise']).replace('_', ' ')}")
        if a.get("alcohol") and a["alcohol"] != "none": facts.append(str(a["alcohol"]).replace("_", " ").title())
        if a.get("reservations"): facts.append("Takes reservations")
        if a.get("outdoor"): facts.append("Outdoor seating")
        if a.get("dinner"): facts.append("Good for dinner")
        return {
            "id": m["id"], "name": m["name"], "address": m.get("address") or "", "city": m.get("city"),
            "lat": m["lat"], "lng": m["lng"], "stars": m.get("stars"), "reviewCount": m.get("review_count") or 0,
            "price": m.get("price"), "categories": [c for c in m.get("categories", []) if c not in ("Restaurants", "Food")][:6],
            "cuisine": self.cuisine[i], "tags": self.tags(i), "facts": facts, "source": m.get("source", "yelp"),
        }

    def aspects(self, i):
        return {"ambiance": round(self.aspect_pct["ambiance"][i]), "quiet": round(self.aspect_pct["noise"][i]),
                "service": round(self.aspect_pct["service"][i])}

    # ------------------------------------------------------------------ ranking
    def compat(self, i, p, hybrid_pct, dist):
        cats = [c.lower() for c in self.meta[i].get("categories", [])]
        want = p.get("cuisines") or []
        food = 75 if not want else (100 if self.cuisine[i] in want else 20)
        for d in p.get("dietary") or []:
            if DIET_CATS.get(d) not in cats and self.diet_pct[d][i] < 60:
                food -= 15

        def avg(sel, table, none=72):
            return none if not sel else 30 + 0.7 * float(np.mean([table[k][i] for k in sel if k in table] or [50]))
        amb = (self.meta[i].get("attributes") or {}).get("ambience") or {}
        hint = lambda sel: 15 * sum(1 for k in sel if any(amb.get(h) for h in AMBIENCE_HINTS.get(k, [])))
        vibe = avg(p.get("vibes"), self.vibe_pct) + hint(p.get("vibes") or [])
        aes = avg(p.get("aesthetics"), self.aes_pct) + hint(p.get("aesthetics") or [])

        price_lvl = self.meta[i].get("price")
        budget = p.get("budget", 40)
        if price_lvl in PRICE_TARGET:
            t = PRICE_TARGET[price_lvl]
            price = 100 - min(35, (budget - t) / budget * 55) if budget >= t else 100 - (t - budget) / t * 170
        else:
            price = 65
        occ = 30 + 0.7 * self.occ_pct.get(p.get("occasion"), np.full(len(self.ids), 50))[i]

        clamp = lambda x: max(0, min(100, x))
        food, vibe, aes, price, occ = map(clamp, (food, vibe, aes, price, occ))
        fit = 0.32 * food + 0.2 * vibe + 0.12 * aes + 0.16 * price + 0.2 * occ
        overall = 0.45 * hybrid_pct + 0.55 * fit
        if dist is not None and dist > p.get("maxMiles", 99):
            overall -= min(30, (dist - p["maxMiles"]) * 4)
        overall = round(clamp(overall))
        return {"food": round(food), "vibe": round(vibe), "aesthetic": round(aes), "price": round(price),
                "occasion": round(occ), "overall": overall, "stars": round(overall / 10) / 2}

    def _item(self, i, q, lex, sims=None, compat=None, parts=None):
        return {
            "r": self.restaurant(i),
            "compat": compat,
            "snippets": self.s.snippets(i, q, n=3, extra_lex=lex, sims=None if sims is None else sims.get(i)),
            "aspects": self.aspects(i),
            "parts": parts,
        }

    def rank(self, prefs, k=30, free_text=""):
        q, lex, exp, terms = quiz.build(prefs, free_text)
        start = prefs.get("start") or {}
        relaxed = []

        # filters from the proposal: distance, price (cuisine is a soft preference)
        dist = {i: miles(start["lat"], start["lng"], m["lat"], m["lng"]) if start.get("lat") is not None else None
                for i, m in enumerate(self.meta)}
        max_mi = prefs.get("maxMiles", 99)
        budget = prefs.get("budget", 999)
        idx = [i for i in range(len(self.ids)) if dist[i] is None or dist[i] <= max_mi]
        if len(idx) < 5:
            relaxed.append("distance")
            near = sorted(range(len(self.ids)), key=lambda i: dist[i] if dist[i] is not None else 0)
            idx = near[:max(60, k)]
        cheap = [i for i in idx if PRICE_TARGET.get(self.meta[i].get("price"), 0) <= budget * 1.25]
        if len(cheap) >= 5:
            idx = cheap
        else:
            relaxed.append("price")

        idx, score, parts, sims = self.s.score(q, extra_lex=lex, extra_expand=exp, idx=idx)
        hp = pct_rank(score)
        out = []
        for j, i in enumerate(idx):
            i = int(i)
            c = self.compat(i, prefs, hp[j], dist[i])
            out.append((c["overall"], float(score[j]), i, c, {k2: round(float(v[j]), 2) for k2, v in parts.items()}))
        out.sort(key=lambda x: (-x[0], -x[1]))
        results = [self._item(i, q, lex, sims, c, pr) for _, _, i, c, pr in out[:k]]
        return {"query": q, "terms": terms, "relaxed": relaxed, "results": results}

    def search(self, q, k=30, city=None, cuisine=None, price=None):
        idx = [i for i, m in enumerate(self.meta)
               if (not city or m.get("city") == city) and (not cuisine or self.cuisine[i] == cuisine)
               and (not price or m.get("price") == price)]
        if not idx:
            return {"query": q, "results": []}
        if not tok(q):
            idx.sort(key=lambda i: -((self.meta[i].get("stars") or 0) * math.log1p(self.meta[i].get("review_count") or 0)))
            return {"query": q, "results": [self._item(i, q, None) for i in idx[:k]]}
        idx, score, parts, sims = self.s.score(q, idx=idx)
        order = np.argsort(-score)[:k]
        return {"query": q, "results": [
            self._item(int(idx[j]), q, None, sims, None, {k2: round(float(v[j]), 2) for k2, v in parts.items()})
            for j in order]}

    def one(self, rid, prefs=None):
        i = self.pos.get(rid)
        if i is None:
            return None
        if not prefs:
            return self._item(i, "date night romantic", None)
        q, lex, exp, _ = quiz.build(prefs)
        idx, score, parts, sims = self.s.score(q, extra_lex=lex, extra_expand=exp)
        j = int(np.where(idx == i)[0][0])
        start = prefs.get("start") or {}
        d = miles(start["lat"], start["lng"], self.meta[i]["lat"], self.meta[i]["lng"]) if start.get("lat") is not None else None
        c = self.compat(i, prefs, pct_rank(score)[j], d)
        return self._item(i, q, lex, sims, c, {k2: round(float(v[j]), 2) for k2, v in parts.items()})

    def lookup(self, q, k=8):
        ql = q.lower().strip()
        hits = [i for i, m in enumerate(self.meta) if ql in m["name"].lower()] if ql else list(range(len(self.meta)))
        hits.sort(key=lambda i: (not self.meta[i]["name"].lower().startswith(ql), -(self.meta[i].get("review_count") or 0)))
        return [self.restaurant(i) for i in hits[:k]]

    def info(self):
        return {"source": self.source, "count": len(self.ids), "cities": self.cities,
                "embeddings": self.s.m is not None,
                "cuisines": sorted(set(self.cuisine) & set(CUISINE_CATS)) or sorted(CUISINE_CATS)}

