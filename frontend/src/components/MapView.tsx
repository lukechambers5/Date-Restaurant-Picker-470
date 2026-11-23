import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { Place, Restaurant } from '../lib/types'

// Standard OSM tiles, darkened with a CSS filter (.dnp-dark-tiles in index.css) — no API key needed.
const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const pin = (html: string, size = 34) =>
  L.divIcon({ className: 'dnp-pin', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })

const destIcon = pin(
  `<div style="width:34px;height:34px;border-radius:50%;background:#ff3b30;display:grid;place-items:center;box-shadow:0 0 0 6px rgba(255,59,48,.25),0 6px 16px rgba(0,0,0,.5);font-size:16px">❤</div>`,
)
const dotIcon = pin(`<div style="width:12px;height:12px;border-radius:50%;background:#fff;opacity:.55;border:2px solid #000"></div>`, 12)
const stopIcon = (label: string, color = '#fff') =>
  pin(
    `<div style="width:26px;height:26px;border-radius:50%;background:${color};color:#000;font:700 12px Inter,system-ui;display:grid;place-items:center;border:2px solid #000;box-shadow:0 4px 12px rgba(0,0,0,.5)">${label}</div>`,
    26,
  )

function Fit({ pts }: { pts: [number, number][] }) {
  const map = useMap()
  const key = pts.map((p) => p.join()).join('|')
  useEffect(() => {
    if (pts.length === 1) map.flyTo(pts[0], 14, { duration: 0.8 })
    else if (pts.length > 1) map.flyToBounds(L.latLngBounds(pts), { padding: [50, 50], duration: 0.8, maxZoom: 15 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

interface Props {
  route?: Place[]
  dest?: Restaurant
  others?: Restaurant[]
  onSelect?: (id: string) => void
  onPick?: (lat: number, lng: number) => void
  picked?: Place | null
  interactive?: boolean
  className?: string
}

export default function MapView({ route = [], dest, others = [], onSelect, onPick, picked, interactive = true, className = '' }: Props) {
  const pts = useMemo<[number, number][]>(() => {
    const p: [number, number][] = route.map((x) => [x.lat, x.lng])
    if (dest && !route.length) p.push([dest.lat, dest.lng])
    if (picked) p.push([picked.lat, picked.lng])
    return p
  }, [route, dest, picked])

  const center: [number, number] = pts[0] ?? [30.6187, -96.3365]
  const stops = route.slice(0, -1)

  return (
    <MapContainer
      center={center}
      zoom={13}
      zoomControl={interactive}
      scrollWheelZoom={false}
      dragging={interactive}
      attributionControl
      className={`h-full w-full ${className}`}
    >
      <TileLayer url={TILE} attribution={ATTR} className="dnp-dark-tiles" />
      <Fit pts={pts} />
      {onPick && <ClickToPick onPick={onPick} />}
      {others.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={dotIcon} eventHandlers={{ click: () => onSelect?.(r.id) }}>
          <Tooltip direction="top" offset={[0, -6]}>{r.name}</Tooltip>
        </Marker>
      ))}
      {route.length > 1 && (
        <>
          <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#000', weight: 7, opacity: 0.6 }} />
          <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#ff3b30', weight: 3.5, dashArray: '2 8', lineCap: 'round' }} />
        </>
      )}
      {stops.map((s, i) => (
        <Marker key={`${s.label}-${i}`} position={[s.lat, s.lng]} icon={stopIcon(i === 0 ? 'A' : String.fromCharCode(65 + i), i === 0 ? '#fff' : '#ffd60a')}>
          <Tooltip direction="top" offset={[0, -12]}>{s.label}</Tooltip>
        </Marker>
      ))}
      {dest && <Marker position={[dest.lat, dest.lng]} icon={destIcon}><Tooltip direction="top" offset={[0, -16]}>{dest.name}</Tooltip></Marker>}
      {picked && <Marker position={[picked.lat, picked.lng]} icon={destIcon} />}
    </MapContainer>
  )
}
