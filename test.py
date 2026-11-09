from search import Searcher
from search import tune, ndcg
ids = ["A","B","C"]
reviews = [
 ["Romantic candlelit Italian place, quiet and intimate, perfect anniversary dinner."],
 ["Super loud sports bar, crowded and rushed service, great wings."],
 ["Cozy little pasta spot with dim lighting, great for a first date."],
]
s = Searcher(ids, reviews)
res = s.search("quiet candlelit Italian for a first date", k=3)
for r in res: print(r)
assert res[-1][0] == "B", "loud sports bar should rank last"
# baseline vs hybrid
bm_only = s.search("quiet candlelit Italian for a first date", k=3, w=(1,0,0))
print("BM25 only:", [r[0] for r in bm_only]); print("Hybrid:", [r[0] for r in res])

labels = {"quiet candlelit Italian for a first date": {"A": 3, "C": 2, "B": 0},
          "loud sports bar with wings": {"B": 3, "A": 0, "C": 0}}
w, score = tune(s, labels)
print("Tuned weights:", w, "NDCG@10:", round(score, 3))
print("Aspects for A:", s.aspect_scores(0))
print("PASS")