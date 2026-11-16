import type { Occasion, Place, Restaurant, RestaurantRef } from './types'

// Static UI vocabulary. Restaurant data itself comes from the backend (local Yelp dataset).

export const FALLBACK_CENTER: Place = { label: 'Texas A&M Campus', lat: 30.6187, lng: -96.3365 }

export const CUISINES = [
  'Italian', 'Steakhouse', 'Japanese', 'Mexican', 'French', 'Indian', 'American', 'Seafood',
  'Korean', 'Thai', 'Vietnamese', 'Chinese', 'BBQ', 'Mediterranean', 'Café', 'Dessert',
]

export const OCCASIONS: { id: Occasion; label: string; emoji: string; sub: string }[] = [
  { id: 'first', label: 'First date', emoji: '🦋', sub: 'Easy conversation, low pressure' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💍', sub: 'Pull out all the stops' },
  { id: 'casual', label: 'Casual night', emoji: '🍕', sub: 'Comfy, fun, no dress code' },
  { id: 'celebration', label: 'Celebration', emoji: '🥂', sub: 'Birthdays, wins, big news' },
  { id: 'justbecause', label: 'Just because', emoji: '💌', sub: 'A little spontaneous love' },
]

const ART: Record<string, [number, string]> = {
  Italian: [18, '🍝'], Steakhouse: [8, '🥩'], Japanese: [200, '🍣'], Mexican: [32, '🌮'], French: [340, '🥂'],
  Indian: [40, '🍛'], American: [268, '🍔'], Seafood: [190, '🦪'], Korean: [0, '🍖'], Thai: [150, '🌺'],
  Vietnamese: [45, '🍜'], Chinese: [355, '🥟'], BBQ: [14, '🔥'], Mediterranean: [95, '🫒'], Café: [28, '☕'], Dessert: [330, '🧁'],
}

/** Generated backdrop colour + emoji for a cuisine (no photos — nothing is fetched live). */
export function artFor(cuisine: string): { hue: number; emoji: string } {
  const a = ART[cuisine]
  if (a) return { hue: a[0], emoji: a[1] }
  let h = 0
  for (const c of cuisine) h = (h * 31 + c.charCodeAt(0)) % 360
  return { hue: h, emoji: '🍽️' }
}

export const toRef = (r: Restaurant): RestaurantRef => ({ id: r.id, name: r.name, cuisine: r.cuisine, address: r.address })
