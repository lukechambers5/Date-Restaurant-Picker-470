/*
 * Talks to the local Flask backend (app.py), which ranks restaurants from the
 * Yelp dataset on disk with search.py's BM25 + date-lexicon (+ optional embeddings).
 * No external search API is used. In dev, Vite proxies /api to http://127.0.0.1:5000.
 */
import type { Hit, Meta, Prefs, RankResponse, Restaurant } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  return res.json() as Promise<T>
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const getMeta = () => fetch('/api/meta').then((r) => json<Meta>(r))

export const rankRestaurants = (prefs: Prefs, k = 30) => post('/api/rank', { prefs, k }).then((r) => json<RankResponse>(r))

export function searchRestaurants(q: string, f: { city?: string | null; cuisine?: string | null; price?: number; k?: number } = {}) {
  const p = new URLSearchParams({ q, k: String(f.k ?? 30) })
  if (f.city) p.set('city', f.city)
  if (f.cuisine) p.set('cuisine', f.cuisine)
  if (f.price) p.set('price', String(f.price))
  return fetch(`/api/search?${p}`).then((r) => json<{ query: string; results: Hit[] }>(r))
}

export const getRestaurant = (id: string, prefs?: Prefs | null) =>
  post(`/api/restaurant/${encodeURIComponent(id)}`, { prefs }).then((r) => json<Hit>(r))

export const lookupRestaurants = (q: string, k = 8) =>
  fetch(`/api/lookup?${new URLSearchParams({ q, k: String(k) })}`).then((r) => json<Restaurant[]>(r))
