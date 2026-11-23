# Date Restaurant Picker (CSCE 470)
## Setup
pip install rank_bm25 sentence-transformers numpy
## Run
python test.py                      # toy test, no data needed
python search.py "cozy quiet date"  # needs restaurant_reviews.jsonl in cwd
## Method
BM25 over per-restaurant review docs (with vibe-word query expansion) + sentence-embedding
similarity (top-3 passages) + weighted date-signal lexicon score, combined via z-scored weighted sum.
## Web app (Date Night Picker)
Everything runs on local data: no live search API, no image fetching.

```bash
# 1. data (once): Yelp Open Dataset files in data/
python yelp_checkpoint.py      # -> restaurant_reviews.jsonl
python prepare_data.py         # -> data/restaurants.jsonl (names, location, price, categories, ambience)
# optional: python osm_pull.py -> osm_restaurants.jsonl (our own collected data, indexed too)

# 2. backend
pip install -r requirements.txt
python app.py                  # http://127.0.0.1:5000

# 3. frontend (dev)
cd frontend && npm install && npm run dev   # http://localhost:5173, proxies /api to Flask
```
If the Yelp files aren't there, the backend falls back to `sample_data/` (20 made-up restaurants) so the UI still works.
`npm run build` in `frontend/` lets `python app.py` serve the whole app from one process.

**How the quiz feeds the ranker** (`quiz.py`): the quiz answers (occasion, cuisines, vibes, aesthetics, dietary needs)
become the BM25 query, expand into related vibe words, and are added to the date-signal lexicon with their own weights.
For example, picking "Lively" stops `loud` from counting against a place. Distance and budget are filters. The compatibility breakdown
(food / vibe / aesthetic / price / occasion) is a 0.45 × hybrid-score percentile + 0.55 × attribute-fit blend (`datastore.py`).
Set `EMBED_MODEL=all-MiniLM-L6-v2` (with sentence-transformers installed) to turn on the embedding component; `MAX_BIZ` caps
how many restaurants are indexed (default 3000).
