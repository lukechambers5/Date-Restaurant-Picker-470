Small **made-up** dataset in the same format as the real pipeline output, so the app runs before the Yelp files are in place.
Once `data/restaurants.jsonl` (prepare_data.py) and `restaurant_reviews.jsonl` (yelp_checkpoint.py) exist, the backend uses those instead.
