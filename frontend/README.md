# Date Night Picker — frontend

React + TypeScript + Vite, Tailwind v4, framer-motion (springs), react-leaflet (OpenStreetMap).

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Pages
| Route | What |
|---|---|
| `/` | Home / landing |
| `/quiz` | 6-step date questionnaire: occasion, food + dietary, vibe + aesthetic, iOS-style wheel pickers (budget, distance, time) + party size, route builder (start → pick up date → extra stops) |
| `/results` | Date selection page from the mockup: map + route/trip time (left), detail panel with greyed background, menu at a glance, vibe, top review, compatibility breakdown (right), top 3 + scrolling list |
| `/search` | Free-text search (vibe-word expansion like `search.py`) + cuisine/price filters |
| `/place/:id` | Single-restaurant view (same map + panel) |
| `/profile` | Profile, home location, partner linking via invite code, scrapbook (photo of you two + dish photo, star rating, would/wouldn't return) |

## Data
All restaurant data comes from the local Flask backend (`../app.py`), which ranks the Yelp Open Dataset
with `../search.py` (BM25 + date-signal lexicon, quiz terms included). No external search API, no photos.
`npm run dev` proxies `/api` to `http://127.0.0.1:5000`, so start `python app.py` first.
Profile, partner link and scrapbook persist to `localStorage` only. Partner linking is simulated until there are server-side accounts.
Drive distance/time are estimates (straight line × 1.3 at ~28 mph); "Open in Maps" gives live routing with all stops as waypoints.
