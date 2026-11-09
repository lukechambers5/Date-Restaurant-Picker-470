"""
Yelp checkpoint script: filters to restaurants in a few metros, computes
key stats, makes 4 figures, and saves a filtered review file for later use.

Usage:
    pip install pandas matplotlib numpy
    python yelp_checkpoint.py

Edit DATA_DIR and CITIES below first.
"""
import json
import re
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

DATA_DIR = "data"  # folder containing the Yelp .json files
BIZ_FILE = f"{DATA_DIR}/yelp_academic_dataset_business.json"
REV_FILE = f"{DATA_DIR}/yelp_academic_dataset_review.json"
CITIES = None  # e.g. ["Philadelphia", "Tampa", "Nashville"]; None = top 3 by restaurant count
MIN_REVIEWS = 5  # drop restaurants with fewer reviews than this
CHUNK = 200_000

DATE_TERMS = [
    "romantic", "cozy", "intimate", "candlelit", "quiet", "loud", "noisy",
    "crowded", "cramped", "rushed", "ambiance|ambience", "date night",
    "first date", "anniversary", "birthday", "special occasion",
]

# ---------------------------------------------------------------- businesses
biz = pd.read_json(BIZ_FILE, lines=True)
print(f"All businesses: {len(biz):,}")

is_rest = biz["categories"].fillna("").str.contains("Restaurants", case=False)
biz = biz[is_rest].copy()
print(f"Restaurants (all metros): {len(biz):,}")

if CITIES is None:
    CITIES = biz["city"].value_counts().head(3).index.tolist()
print("Metros used:", CITIES)
biz = biz[biz["city"].isin(CITIES)].copy()
print(f"Restaurants in chosen metros: {len(biz):,}")
if len(biz) == 0:
    print("\nNo restaurants matched your CITIES. Cities that exist in the dataset:")
    all_rest = pd.read_json(BIZ_FILE, lines=True)
    all_rest = all_rest[all_rest["categories"].fillna("").str.contains("Restaurants", case=False)]
    print(all_rest["city"].value_counts().head(15).to_string())
    raise SystemExit("Set CITIES to names from the list above (or None) and rerun.")

biz["price"] = biz["attributes"].apply(
    lambda a: a.get("RestaurantsPriceRange2") if isinstance(a, dict) else None
)
biz["has_ambience"] = biz["attributes"].apply(
    lambda a: isinstance(a, dict) and a.get("Ambience") not in (None, "None")
)
ids = set(biz["business_id"])

# ------------------------------------------------------------------- reviews
term_hits = {t: 0 for t in DATE_TERMS}
any_term_hits = 0
n_reviews = 0
stars, words, biz_ids = [], [], []
combined = re.compile("|".join(DATE_TERMS), re.I)
compiled = {t: re.compile(t, re.I) for t in DATE_TERMS}

with open("restaurant_reviews.jsonl", "w") as out:
    reader = pd.read_json(
        REV_FILE, lines=True, chunksize=CHUNK,
        dtype={"review_id": str, "user_id": str, "business_id": str},
    )
    for i, chunk in enumerate(reader):
        chunk = chunk[chunk["business_id"].isin(ids)]
        if chunk.empty:
            continue
        for rec in chunk[["business_id", "review_id", "stars", "text"]].to_dict("records"):
            out.write(json.dumps(rec) + "\n")
        n_reviews += len(chunk)
        stars.extend(chunk["stars"].tolist())
        words.extend(chunk["text"].str.split().str.len().tolist())
        biz_ids.extend(chunk["business_id"].tolist())
        for t, rx in compiled.items():
            term_hits[t] += int(chunk["text"].str.contains(rx).sum())
        any_term_hits += int(chunk["text"].str.contains(combined).sum())
        print(f"chunk {i}: kept {n_reviews:,} reviews so far")

rev = pd.DataFrame({"business_id": biz_ids, "stars": stars, "words": words})
per_biz = rev.groupby("business_id").size()
keep = per_biz[per_biz >= MIN_REVIEWS].index
print(f"Restaurants with >= {MIN_REVIEWS} reviews: {len(keep):,}")

# --------------------------------------------------------------------- stats
stats = {
    "metros": CITIES,
    "restaurants_in_metros": int(len(biz)),
    f"restaurants_with_{MIN_REVIEWS}plus_reviews": int(len(keep)),
    "total_reviews": int(n_reviews),
    "mean_reviews_per_restaurant": round(float(per_biz.mean()), 1),
    "median_reviews_per_restaurant": float(per_biz.median()),
    "mean_review_words": round(float(rev["words"].mean()), 1),
    "median_review_words": float(rev["words"].median()),
    "mean_stars": round(float(rev["stars"].mean()), 2),
    "pct_reviews_with_date_term": round(100 * any_term_hits / n_reviews, 1),
    "pct_restaurants_with_ambience_attr": round(100 * biz["has_ambience"].mean(), 1),
}
with open("stats.json", "w") as f:
    json.dump(stats, f, indent=2)
print(json.dumps(stats, indent=2))

# ------------------------------------------------------------------- figures
plt.rcParams.update({"font.size": 8})
fig, ax = plt.subplots(2, 2, figsize=(7.5, 5.5))

ax[0, 0].hist(per_biz, bins=np.logspace(0, np.log10(per_biz.max()), 40), color="#4C72B0")
ax[0, 0].set_xscale("log")
ax[0, 0].set_title("Reviews per restaurant")
ax[0, 0].set_xlabel("# reviews (log)")
ax[0, 0].set_ylabel("# restaurants")

ax[0, 1].hist(rev["words"].clip(upper=600), bins=50, color="#55A868")
ax[0, 1].set_title("Review length")
ax[0, 1].set_xlabel("words (clipped at 600)")
ax[0, 1].set_ylabel("# reviews")

star_counts = rev["stars"].value_counts().sort_index()
ax[1, 0].bar(star_counts.index.astype(int).astype(str), star_counts.values, color="#C44E52")
ax[1, 0].set_title("Star rating distribution")
ax[1, 0].set_xlabel("stars")
ax[1, 0].set_ylabel("# reviews")

labels = [t.split("|")[0] for t in DATE_TERMS]
pcts = [100 * term_hits[t] / n_reviews for t in DATE_TERMS]
order = np.argsort(pcts)
ax[1, 1].barh([labels[i] for i in order], [pcts[i] for i in order], color="#8172B2")
ax[1, 1].set_title("% of reviews mentioning date-signal terms")
ax[1, 1].set_xlabel("% of reviews")

plt.tight_layout()
plt.savefig("checkpoint_figures.png", dpi=250)
print("Saved checkpoint_figures.png, stats.json, restaurant_reviews.jsonl")