"""Turn questionnaire answers into search terms.

The quiz feeds the ranker in two ways:
  1. query text  -> BM25 (+ embeddings) match the review documents against it
  2. extra_lex   -> quiz terms are added to the date-signal lexicon with their own weights,
                    so a "Lively" or "Rooftop" pick changes what counts as a good date signal
"""
import re

# term sets used both for query building and for the compatibility breakdown
VIBE_TERMS = {
    "Romantic":    ["romantic", "intimate", "candlelit", "anniversary", "date"],
    "Cozy":        ["cozy", "warm", "intimate", "cute", "charming"],
    "Lively":      ["lively", "fun", "energetic", "music", "vibrant", "busy"],
    "Chill":       ["relaxed", "chill", "calm", "laid", "casual"],
    "Trendy":      ["trendy", "hip", "stylish", "chic", "instagram"],
    "Adventurous": ["unique", "adventurous", "interesting", "authentic", "different"],
}
AESTHETIC_TERMS = {
    "Candlelit": ["candlelit", "candle", "candles", "dim", "lighting"],
    "Rooftop":   ["rooftop", "roof", "view", "views", "skyline"],
    "Rustic":    ["rustic", "brick", "wood", "farmhouse", "barn"],
    "Modern":    ["modern", "sleek", "contemporary", "minimalist", "industrial"],
    "Garden":    ["garden", "patio", "outdoor", "courtyard", "outside"],
    "Retro":     ["retro", "vintage", "classic", "diner", "nostalgic"],
}
OCCASION_TERMS = {
    "first":       ["first", "date", "conversation", "talk", "relaxed"],
    "anniversary": ["anniversary", "special", "romantic", "celebrate", "occasion"],
    "casual":      ["casual", "fun", "relaxed", "affordable", "easy"],
    "celebration": ["birthday", "celebration", "celebrate", "party", "champagne"],
    "justbecause": ["date", "night", "cute", "sweet", "fun"],
}
DIETARY_TERMS = {
    "Vegetarian": ["vegetarian", "veggie"],
    "Vegan": ["vegan", "plant"],
    "Gluten-free": ["gluten"],
    "Halal": ["halal"],
}
CUISINE_TERMS = {
    "Italian": ["italian", "pasta", "pizza"], "Steakhouse": ["steak", "steakhouse"],
    "Japanese": ["japanese", "sushi", "ramen"], "Mexican": ["mexican", "tacos"],
    "French": ["french", "bistro"], "Indian": ["indian", "curry"], "American": ["american", "burger"],
    "Seafood": ["seafood", "oysters", "fish"], "Korean": ["korean", "bbq"], "Thai": ["thai", "curry"],
    "Vietnamese": ["vietnamese", "pho"], "BBQ": ["bbq", "barbecue", "brisket"],
    "Mediterranean": ["mediterranean", "greek", "hummus"], "Café": ["cafe", "coffee", "brunch"],
    "Dessert": ["dessert", "desserts", "cake"], "Chinese": ["chinese", "dumplings"],
}

QUIZ_WEIGHT = 1.5      # weight of a term the user picked directly
EXPAND_WEIGHT = 0.75   # weight of a related term for that pick


def build(prefs, free_text=""):
    """prefs (dict from the frontend quiz) -> (query, extra_lex, extra_expand, terms_used)."""
    words, lex, expand = [], {}, {}

    def add(label, terms, w=QUIZ_WEIGHT):
        head = re.findall(r"[a-z]+", label.lower().replace("é", "e"))[0]
        words.append(head)
        lex[head] = max(lex.get(head, 0), w)
        expand[head] = terms
        for t in terms:
            lex[t] = max(lex.get(t, 0), EXPAND_WEIGHT * w / QUIZ_WEIGHT)

    occ = prefs.get("occasion")
    if occ in OCCASION_TERMS:
        words.extend({"first": ["first", "date"], "anniversary": ["anniversary"], "casual": ["casual", "date"],
                      "celebration": ["celebration"], "justbecause": ["date", "night"]}[occ])
        for t in OCCASION_TERMS[occ]:
            lex[t] = max(lex.get(t, 0), 1.0)
    for v in prefs.get("vibes", []):
        if v in VIBE_TERMS: add(v, VIBE_TERMS[v])
    for a in prefs.get("aesthetics", []):
        if a in AESTHETIC_TERMS: add(a, AESTHETIC_TERMS[a])
    for c in prefs.get("cuisines", []):
        if c in CUISINE_TERMS: add(c, CUISINE_TERMS[c], w=1.0)
    for d in prefs.get("dietary", []):
        if d in DIETARY_TERMS: add(d, DIETARY_TERMS[d], w=1.0)

    # a "Lively" date shouldn't be punished for being loud or busy
    if "Lively" in prefs.get("vibes", []):
        lex.update({"loud": 0, "crowded": 0, "noisy": -0.5})
    if prefs.get("occasion") == "casual":
        lex["rushed"] = -0.5

    if free_text:
        words = free_text.lower().split() + words
    query = " ".join(dict.fromkeys(words)) or "date night"
    return query, lex, expand, sorted({t for t, w in lex.items() if w > 0})
