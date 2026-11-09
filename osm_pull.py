"""
Free, no-account supplemental data for Bryan / College Station:
  1) restaurant metadata from OpenStreetMap (Overpass API)
  2) a small, polite crawl of each restaurant's own website (robots.txt respected)

Setup:
    pip install requests beautifulsoup4
    python osm_pull.py

Outputs:
    osm_restaurants.jsonl   one restaurant per line (metadata + website text if crawled)
    osm_summary.json        counts to quote in the checkpoint
"""
import json
import time
import urllib.robotparser
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

UA = "CSCE470-DateRestaurantPicker/0.1 (class project; contact: lukechambers0217@tamu.edu)"
HEADERS = {"User-Agent": UA}

# Bounding box around Bryan + College Station (south, west, north, east)
BBOX = "30.52,-96.47,30.75,-96.22"
QUERY = f"""
[out:json][timeout:90];
nwr["amenity"="restaurant"]({BBOX});
out center tags;
"""

print("Querying Overpass...")
r = requests.post(
    "https://overpass-api.de/api/interpreter",
    data={"data": QUERY}, headers=HEADERS, timeout=120,
)
r.raise_for_status()
elements = r.json()["elements"]

restaurants = []
for e in elements:
    t = e.get("tags", {})
    if "name" not in t:
        continue
    lat = e.get("lat") or e.get("center", {}).get("lat")
    lon = e.get("lon") or e.get("center", {}).get("lon")
    restaurants.append({
        "osm_id": f'{e["type"]}/{e["id"]}',
        "name": t["name"],
        "cuisine": t.get("cuisine"),
        "website": t.get("website") or t.get("contact:website"),
        "phone": t.get("phone") or t.get("contact:phone"),
        "opening_hours": t.get("opening_hours"),
        "address": " ".join(filter(None, [
            t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:city"),
        ])) or None,
        "lat": lat, "lon": lon,
        "website_text": None,
    })
print(f"Named restaurants from OSM: {len(restaurants)}")


def allowed(url):
    p = urlparse(url)
    rp = urllib.robotparser.RobotFileParser()
    try:
        rp.set_url(f"{p.scheme}://{p.netloc}/robots.txt")
        rp.read()
        return rp.can_fetch(UA, url)
    except Exception:
        return False  # be conservative if robots.txt can't be read


crawled = 0
for rest in restaurants:
    url = rest["website"]
    if not url:
        continue
    if not url.startswith("http"):
        url = "http://" + url
    try:
        if not allowed(url):
            continue
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200 or "text/html" not in resp.headers.get("content-type", ""):
            continue
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "noscript"]):
            tag.decompose()
        text = " ".join(soup.get_text(separator=" ").split())
        rest["website_text"] = text[:5000]
        crawled += 1
        print(f"crawled {rest['name']} ({len(text)} chars)")
    except Exception as ex:
        print(f"skip {rest['name']}: {ex}")
    time.sleep(1.0)  # be polite

with open("osm_restaurants.jsonl", "w") as f:
    for rest in restaurants:
        f.write(json.dumps(rest) + "\n")

summary = {
    "osm_named_restaurants": len(restaurants),
    "with_website_tag": sum(1 for x in restaurants if x["website"]),
    "with_cuisine_tag": sum(1 for x in restaurants if x["cuisine"]),
    "websites_crawled": crawled,
    "avg_website_chars": round(
        sum(len(x["website_text"]) for x in restaurants if x["website_text"]) / max(crawled, 1)
    ),
}
with open("osm_summary.json", "w") as f:
    json.dump(summary, f, indent=2)
print(json.dumps(summary, indent=2))
