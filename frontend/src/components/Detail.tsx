import { motion } from 'framer-motion'
import { Car, ExternalLink } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { fmtMiles, fmtMins, googleMapsUrl } from '../lib/geo'
import type { Route } from '../lib/geo'
import type { Compat, Restaurant } from '../lib/types'
import { AnimatedNumber } from './ui'

const MapView = lazy(() => import('./MapView'))

/* ---------------- Compatibility ---------------- */
export function CompatRing({ value, size = 76 }: { value: number; size?: number }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.12)" strokeWidth={7} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke="#ff3b30" strokeWidth={7} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ type: 'spring', stiffness: 60, damping: 12 }}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <AnimatedNumber value={value} className="text-xl font-bold" suffix="%" />
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/60">match</div>
      </div>
    </div>
  )
}

const BARS: [keyof Compat, string][] = [['food', 'Food'], ['aesthetic', 'Aesthetic'], ['vibe', 'Vibe'], ['price', 'Price point'], ['occasion', 'Occasion']]

export function CompatBars({ c }: { c: Compat }) {
  return (
    <div className="space-y-2.5">
      {BARS.map(([k, label], i) => (
        <div key={k}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="text-white/85">{label}</span>
            <AnimatedNumber value={c[k] as number} className="font-semibold" suffix="%" />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand to-[#ff8a65]"
              initial={{ width: 0 }}
              animate={{ width: `${c[k]}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 11, delay: 0.05 * i }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Map card (left of panel) ---------------- */
export function MapCard({ r, route, others, onSelect }: { r: Restaurant; route?: Route; others?: Restaurant[]; onSelect?: (id: string) => void }) {
  const gmaps = route ? googleMapsUrl(route) : `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-panel ring-[6px] ring-black outline outline-1 outline-white/10">
      <div className="relative min-h-[260px] flex-1">
        <Suspense fallback={<div className="h-full animate-pulse bg-white/5" />}>
          <MapView route={route?.points} dest={r} others={others} onSelect={onSelect} />
        </Suspense>
        <a
          href={gmaps}
          target="_blank"
          rel="noreferrer"
          className="glass absolute right-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 transition hover:bg-white/20"
        >
          Open in Maps <ExternalLink size={12} />
        </a>
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        {route ? (
          <>
            <div className="flex items-center justify-center gap-2 text-[15px] font-semibold">
              <Car size={16} className="text-brand" />
              {fmtMiles(route.miles)} <span className="text-white/30">|</span> {fmtMins(route.mins)}
              {route.legs.length > 1 && <span className="text-xs font-medium text-mute">total trip</span>}
            </div>
            {route.legs.length > 1 && (
              <ol className="mt-2 space-y-1 text-[12px] text-mute">
                {route.legs.map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{String.fromCharCode(65 + i)}. {l.from.label} → {l.to.label}</span>
                    <span className="shrink-0 tabular-nums">{fmtMiles(l.miles)} · {fmtMins(l.mins)}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-1 text-center text-[10px] text-white/35">Estimated drive · tap Open in Maps for live traffic</div>
          </>
        ) : (
          <div className="text-center text-sm text-mute">{r.address}</div>
        )}
      </div>
    </div>
  )
}

