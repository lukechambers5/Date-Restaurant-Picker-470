import type { Place, Prefs, Restaurant } from './types'

const R = 3958.8 // earth radius, miles
const ROAD_FACTOR = 1.3 // straight line -> rough road distance
const AVG_MPH = 28 // in-town driving

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface Leg { from: Place; to: Place; miles: number; mins: number }
export interface Route { points: Place[]; legs: Leg[]; miles: number; mins: number; lastLeg: Leg }

export function legBetween(from: Place, to: Place): Leg {
  const miles = haversine(from, to) * ROAD_FACTOR
  const mins = Math.max(2, Math.round((miles / AVG_MPH) * 60 + 2))
  return { from, to, miles, mins }
}

/** start → (pickup) → (stops…) → restaurant */
export function buildRoute(prefs: Pick<Prefs, 'start' | 'pickup' | 'stops'>, r: Restaurant): Route {
  const dest: Place = { label: r.name, lat: r.lat, lng: r.lng }
  const points = [prefs.start, ...(prefs.pickup ? [prefs.pickup] : []), ...prefs.stops, dest]
  const legs: Leg[] = []
  for (let i = 0; i < points.length - 1; i++) legs.push(legBetween(points[i], points[i + 1]))
  return {
    points,
    legs,
    miles: legs.reduce((s, l) => s + l.miles, 0),
    mins: legs.reduce((s, l) => s + l.mins, 0),
    lastLeg: legs[legs.length - 1],
  }
}

const ll = (p: { lat: number; lng: number }) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`

export function googleMapsUrl(route: Route) {
  const [origin, ...rest] = route.points
  const dest = rest[rest.length - 1]
  const waypoints = rest.slice(0, -1)
  const u = new URL('https://www.google.com/maps/dir/')
  u.searchParams.set('api', '1')
  u.searchParams.set('origin', ll(origin))
  u.searchParams.set('destination', ll(dest))
  if (waypoints.length) u.searchParams.set('waypoints', waypoints.map(ll).join('|'))
  u.searchParams.set('travelmode', 'driving')
  return u.toString()
}

/** Apple Maps only supports a single leg, so route from the last stop. */
export function appleMapsUrl(route: Route) {
  const from = route.lastLeg.from
  const to = route.lastLeg.to
  return `https://maps.apple.com/?saddr=${ll(from)}&daddr=${ll(to)}&dirflg=d`
}

export const fmtMiles = (m: number) => `${m < 10 ? m.toFixed(1) : Math.round(m)} mi`
export const fmtMins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`)
