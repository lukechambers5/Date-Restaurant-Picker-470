import json, re, sys
import numpy as np
import itertools
from collections import Counter
from rank_bm25 import BM25Okapi

try:  # embeddings are optional so the BM25 + lexicon ranker runs on any machine
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover
    SentenceTransformer = None

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
_sent = re.compile(r"(?<=[.!?])\s+")

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

def expand(q, extra=None):
    """Query tokens + vibe-word expansion. `extra` adds more expansions (e.g. from the quiz)."""
    ex = {**EXPAND, **(extra or {})}
    t = tok(q)
    return t + [e for w in t for e in ex.get(w, [])]

class Searcher:
    def __init__(self, ids, reviews, model="all-MiniLM-L6-v2", meta_text=None):
        """meta_text: optional per-restaurant metadata (name, categories) indexed with the reviews
        so BM25 matches "italian" even when no review says it; never used for snippets."""
        self.ids, self.reviews = ids, reviews
        meta_text = meta_text or [""] * len(reviews)
        self.docs = [tok(" ".join(r) + " " + m) for r, m in zip(reviews, meta_text)]
        self.tf = [Counter(d) for d in self.docs]
        self.lens = np.array([max(len(d), 1) for d in self.docs], float)
        self.bm25 = BM25Okapi(self.docs)
        # precompute date-signal score (weighted term freq, length-normalized)
        self.date = self.lex_score(LEX)
        # embed each review, keep per-restaurant matrix (skipped if model=None or not installed)
        self.m = SentenceTransformer(model) if (model and SentenceTransformer) else None
        self.emb = ([self.m.encode(r, normalize_embeddings=True, show_progress_bar=False) for r in reviews]
                    if self.m else None)

    @staticmethod
    def z(x):
        x = np.asarray(x, float); s = x.std()
        return (x-x.mean())/s if s else x*0

    def lex_score(self, lex, idx=None):
        """Weighted lexicon term frequency / doc length, for docs in idx (default: all)."""
        idx = range(len(self.docs)) if idx is None else idx
        return np.array([sum(w * self.tf[i][t] for t, w in lex.items() if t in self.tf[i]) / self.lens[i]
                         for i in idx])

    def score(self, q, w=(1.0, 1.0, 0.5), extra_lex=None, extra_expand=None, idx=None):
        """Hybrid score for docs in idx. extra_lex adds/overrides lexicon weights (quiz terms).
        Returns (idx, score, parts, sims) where parts holds each component's z-score."""
        idx = np.arange(len(self.ids)) if idx is None else np.asarray(idx, int)
        bm = self.bm25.get_scores(expand(q, extra_expand))[idx]
        date = self.date[idx] if not extra_lex else self.lex_score({**LEX, **extra_lex}, idx)
        sims = None
        if self.m is not None:
            qe = self.m.encode([q], normalize_embeddings=True)[0]
            sims = {int(i): self.emb[i] @ qe for i in idx}
            emb = np.array([np.sort(sims[int(i)])[-3:].mean() for i in idx])  # mean of top-3 passages
        else:
            emb = np.zeros(len(idx))
        parts = {"bm25": self.z(bm), "embedding": self.z(emb), "date": self.z(date)}
        score = w[0]*parts["bm25"] + w[1]*parts["embedding"] + w[2]*parts["date"]
        return idx, score, parts, sims

    def search(self, q, k=10, w=(1.0, 1.0, 0.5), explain=True, extra_lex=None, idx=None):
        idx, score, _, sims = self.score(q, w, extra_lex, idx=idx)
        out = []
        for j in np.argsort(-score)[:k]:
            i = int(idx[j])
            snip = ""
            if explain:
                snip = (self.reviews[i][int(np.argmax(sims[i]))][:200] if sims is not None
                        else (self.snippets(i, q, n=1) or [""])[0])
            out.append((self.ids[i], float(score[j]), snip))
        return out

    def snippets(self, i, q, n=2, extra_lex=None, sims=None):
        """'Date fit' explanation: the review sentences that best support the ranking."""
        lex = {**LEX, **(extra_lex or {})}
        qt = set(expand(q))
        best = []
        order = (np.argsort(-sims)[:5] if sims is not None else range(len(self.reviews[i])))
        for r in order:
            for s in _sent.split(self.reviews[i][int(r)]):
                ts = tok(s)
                if len(ts) < 4:
                    continue
                sc = sum(1.0 for t in ts if t in qt) + sum(max(lex.get(t, 0), 0) for t in ts)
                if sc > 0:
                    best.append((sc / (len(ts) ** 0.3), s.strip()[:220]))
        best.sort(key=lambda x: -x[0])
        seen, out = set(), []
        for _, s in best:
            if s not in seen:
                seen.add(s); out.append(s)
            if len(out) == n:
                break
        return out

    def aspect_scores(self, i):
        d = self.docs[i]; n = max(len(d), 1)
        return {a: sum(LEX.get(w, 0) for w in d if w in ws) / n for a, ws in ASPECTS.items()}

if __name__ == "__main__":
    ids, rev = load()
    s = Searcher(ids, rev)
    for bid, sc, sn in s.search(" ".join(sys.argv[1:]) or "quiet candlelit Italian for a first date"):
        print(f"{bid}  {sc:.2f}  {sn}\n")
