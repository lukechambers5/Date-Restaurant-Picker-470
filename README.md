# Date Restaurant Picker (CSCE 470)
## Setup
pip install rank_bm25 sentence-transformers numpy
## Run
python test.py                      # toy test, no data needed
python search.py "cozy quiet date"  # needs restaurant_reviews.jsonl in cwd
## Method
BM25 over per-restaurant review docs (with vibe-word query expansion) + sentence-embedding
similarity (top-3 passages) + weighted date-signal lexicon score, combined via z-scored weighted sum.