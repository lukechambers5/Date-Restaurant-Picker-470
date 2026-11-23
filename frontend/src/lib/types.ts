export type Cuisine = string

export type Vibe = 'Romantic' | 'Cozy' | 'Lively' | 'Chill' | 'Trendy' | 'Adventurous'
export type Aesthetic = 'Candlelit' | 'Rooftop' | 'Rustic' | 'Modern' | 'Garden' | 'Retro'
export type Occasion = 'first' | 'anniversary' | 'casual' | 'celebration' | 'justbecause'
export type Dietary = 'Vegetarian' | 'Vegan' | 'Gluten-free' | 'Halal'

export interface Place {
  label: string
  lat: number
  lng: number
}

/** A restaurant as served by the Flask backend (built from the Yelp dataset). */
export interface Restaurant {
  id: string
  name: string
  address: string
  city: string | null
  lat: number
  lng: number
  stars: number | null
  reviewCount: number
  price: 1 | 2 | 3 | 4 | null
  categories: string[]
  cuisine: string
  tags: string[]
  facts: string[]
  source: 'yelp' | 'osm' | 'sample'
}

export interface Compat {
  food: number
  aesthetic: number
  vibe: number
  price: number
  occasion: number
  overall: number
  stars: number // 0..5 in .5 steps
}

/** One ranked result: restaurant + why it ranked there. */
export interface Hit {
  r: Restaurant
  compat: Compat | null
  snippets: string[] // review sentences supporting the ranking ("date fit" explanation)
  aspects: { ambiance: number; quiet: number; service: number } // percentiles 0-100
  parts: { bm25: number; embedding: number; date: number } | null // z-scores of the hybrid ranker
}

export interface RankResponse {
  query: string
  terms: string[]
  relaxed: string[]
  results: Hit[]
}

export interface Meta {
  source: 'yelp' | 'sample'
  count: number
  embeddings: boolean
  cities: { name: string; lat: number; lng: number; count: number }[]
  cuisines: string[]
}

export interface Prefs {
  occasion: Occasion
  cuisines: Cuisine[]
  dietary: Dietary[]
  vibes: Vibe[]
  aesthetics: Aesthetic[]
  budget: number // per person, USD
  maxMiles: number
  time: string // "7:30 PM"
  partySize: number
  city: string | null
  start: Place
  pickup: Place | null
  stops: Place[]
}

/** Small copy of a restaurant kept with scrapbook entries / picks so they render offline. */
export interface RestaurantRef {
  id: string
  name: string
  cuisine: string
  address: string
}

export interface Profile {
  name: string
  avatar?: string
  home: Place
  bio: string
  code: string
  since: string
}

export interface Partner {
  name: string
  code: string
  avatar?: string
  linkedAt: string
}

export interface ScrapEntry {
  id: string
  restaurant: RestaurantRef
  date: string
  photo?: string
  dishPhoto?: string
  rating: number
  wouldReturn: boolean
  note: string
  createdAt: string
}
