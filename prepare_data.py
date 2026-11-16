"""
Build the restaurant metadata file the web app needs from the Yelp Open Dataset.
Run after yelp_checkpoint.py (which writes restaurant_reviews.jsonl).

Usage:
    python prepare_data.py
    python prepare_data.py --business data/yelp_academic_dataset_business.json \
                           --reviews restaurant_reviews.jsonl --out data/restaurants.jsonl

Output: one restaurant per line with the fields the ranker / UI use
(name, location, stars, price, categories, ambience, noise level, ...).
Everything is local — the app never calls a search API.
"""
import argparse
import ast
import json
import os


def attr(v):
    """Yelp stores attributes as python-literal strings: "u'quiet'", "True", "{'romantic': False}"."""
    if not isinstance(v, str):
        return v
    try:
        return ast.literal_eval(v)
    except Exception:
        return v.strip("u'\"")


def convert(b):
    a = b.get("attributes") or {}
    amb = attr(a.get("Ambience")) if a.get("Ambience") else None
    meal = attr(a.get("GoodForMeal")) if a.get("GoodForMeal") else None
    price = attr(a.get("RestaurantsPriceRange2"))
    return {
        "id": b["business_id"],
        "name": b["name"],
        "address": ", ".join(x for x in [b.get("address"), b.get("city"), b.get("state")] if x),
        "city": b.get("city"),
        "state": b.get("state"),
        "lat": b.get("latitude"),
        "lng": b.get("longitude"),
        "stars": b.get("stars"),
        "review_count": b.get("review_count"),
        "price": int(price) if str(price).isdigit() else None,
        "categories": [c.strip() for c in (b.get("categories") or "").split(",") if c.strip()],
        "attributes": {
            "ambience": amb if isinstance(amb, dict) else {},
            "noise": attr(a.get("NoiseLevel")) if a.get("NoiseLevel") else None,
            "alcohol": attr(a.get("Alcohol")) if a.get("Alcohol") else None,
            "outdoor": attr(a.get("OutdoorSeating")) if a.get("OutdoorSeating") else None,
            "reservations": attr(a.get("RestaurantsReservations")) if a.get("RestaurantsReservations") else None,
            "dinner": (meal or {}).get("dinner") if isinstance(meal, dict) else None,
        },
        "source": "yelp",
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--business", default="data/yelp_academic_dataset_business.json")
    p.add_argument("--reviews", default="restaurant_reviews.jsonl")
    p.add_argument("--out", default="data/restaurants.jsonl")
    args = p.parse_args()

    ids = set()
    with open(args.reviews, encoding="utf-8") as f:
        for line in f:
            ids.add(json.loads(line)["business_id"])
    print(f"{len(ids):,} restaurants have reviews in {args.reviews}")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    n = 0
    with open(args.business, encoding="utf-8") as f, open(args.out, "w", encoding="utf-8") as out:
        for line in f:
            b = json.loads(line)
            if b["business_id"] in ids:
                out.write(json.dumps(convert(b)) + "\n")
                n += 1
    print(f"Wrote {n:,} restaurants to {args.out}")


if __name__ == "__main__":
    main()
