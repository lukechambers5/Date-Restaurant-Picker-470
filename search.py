import json, re, sys
import numpy as np
import itertools
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

# Date-signal lexicon: term -> weight
LEX = {"romantic":2,"intimate":2,"cozy":1.5,"candlelit":2,"candle":1.5,"quiet":1.5,
       "ambiance":1.5,"ambience":1.5,"anniversary":2,"date":1.5,"wine":1,"dim":1,
       "atmosphere":1,"slow":-.5,"unhurried":1,"leisurely":1,"special":1,"attentive":1,"service":.5,
       "loud":-2,"noisy":-2,"crowded":-1.5,"rushed":-1.5,"cramped":-1.5}
EXPAND = {"cozy":["intimate","warm"],"quiet":["calm","peaceful"],
          "romantic":["candlelit","intimate"],"date":["romantic","anniversary"]}

ASPECTS = {"ambiance": ["romantic","intimate","cozy","candlelit","ambiance","ambience","atmosphere","dim"],
           "noise":    ["quiet","peaceful","calm","loud","noisy","crowded"],
           "service":  ["attentive","service","rushed","slow","unhurried","friendly"]}



def ndcg(ranked, rel, k=10):
    dcg = sum(rel.get(b, 0) / np.log2(i + 2) for i, b in enumerate(ranked[:k]))
    ideal = sorted(rel.values(), reverse=True)[:k]
    idcg = sum(r / np.log2(i + 2) for i, r in enumerate(ideal))
    return dcg / idcg if idcg else 0

def tune(s, labels, grid=(0, .5, 1, 2)):
    """labels: {query: {business_id: relevance 0-3}}. Returns best (w, mean NDCG@10)."""
    best = (None, -1)
    for w in itertools.product(grid, repeat=3):
        if not any(w): continue
        m = np.mean([ndcg([b for b, _, _ in s.search(q, 10, w, False)], rel)
                     for q, rel in labels.items()])
        if m > best[1]: best = (w, m)
    return best

tok = lambda s: re.findall(r"[a-z']+", s.lower())

def load(path="restaurant_reviews.jsonl", max_per=20, max_biz=300):
    docs = {}
    with open(path) as f:
        for line in f:
            r = json.loads(line)
            b = r["business_id"]
            if b not in docs and len(docs) >= max_biz:
                continue
            if len(docs.setdefault(b, [])) < max_per:
                docs[b].append(r["text"])
    ids = list(docs)
    return ids, [docs[i] for i in ids]

def expand(q):
    t = tok(q)
    return t + [e for w in t for e in EXPAND.get(w, [])]

class Searcher:
    def __init__(self, ids, reviews, model="all-MiniLM-L6-v2"):
        self.ids, self.reviews = ids, reviews
        self.docs = [tok(" ".join(r)) for r in reviews]
        self.bm25 = BM25Okapi(self.docs)
        self.m = SentenceTransformer(model)
        # embed each review, keep per-restaurant matrix
        self.emb = [self.m.encode(r, normalize_embeddings=True) for r in reviews]
        # precompute date-signal score (weighted term freq, length-normalized)
        self.date = np.array([sum(LEX.get(w,0) for w in d)/max(len(d),1) for d in self.docs])
        self.emb = [self.m.encode(r, normalize_embeddings=True, show_progress_bar=False) for r in reviews]

    @staticmethod
    def z(x):
        x = np.asarray(x, float); s = x.std()
        return (x-x.mean())/s if s else x*0

    def search(self, q, k=10, w=(1.0, 1.0, 0.5), explain=True):
        bm = self.bm25.get_scores(expand(q))
        qe = self.m.encode([q], normalize_embeddings=True)[0]
        sims = [e @ qe for e in self.emb]
        emb = np.array([np.sort(s)[-3:].mean() for s in sims])  # mean of top-3 passages
        score = w[0]*self.z(bm) + w[1]*self.z(emb) + w[2]*self.z(self.date)
        out = []
        for i in np.argsort(-score)[:k]:
            snip = self.reviews[i][int(np.argmax(sims[i]))][:200] if explain else ""
            out.append((self.ids[i], float(score[i]), snip))
        return out

    def aspect_scores(self, i):
        d = self.docs[i]; n = max(len(d), 1)
        return {a: sum(LEX.get(w, 0) for w in d if w in ws) / n for a, ws in ASPECTS.items()}

if __name__ == "__main__":
    ids, rev = load()
    s = Searcher(ids, rev)
    for bid, sc, sn in s.search(" ".join(sys.argv[1:]) or "quiet candlelit Italian for a first date"):
        print(f"{bid}  {sc:.2f}  {sn}\n")