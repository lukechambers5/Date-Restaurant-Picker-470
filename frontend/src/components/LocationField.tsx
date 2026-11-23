import { motion } from 'framer-motion'
import { LocateFixed, MapPin, Trash2 } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { bouncy } from '../lib/motion'
import { useStore } from '../lib/store'
import type { Place } from '../lib/types'
import { Button, Pressable, Sheet } from './ui'

const MapView = lazy(() => import('./MapView'))

interface Props {
  label: string
  hint?: string
  value: Place | null
  onChange: (p: Place) => void
  onRemove?: () => void
  icon?: React.ReactNode
}

export function LocationField({ label, hint, value, onChange, onRemove, icon }: Props) {
  const { presets: PRESET_PLACES } = useStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Place | null>(value)
  const [locating, setLocating] = useState(false)
  const [err, setErr] = useState('')

  const useMine = () => {
    if (!navigator.geolocation) return setErr('Location not available in this browser')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); setErr(''); onChange({ label: 'My location', lat: p.coords.latitude, lng: p.coords.longitude }) },
      () => { setLocating(false); setErr('Could not get your location') },
      { timeout: 8000 },
    )
  }

  return (
    <motion.div layout transition={bouncy} className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-brand/15 text-brand">{icon ?? <MapPin size={18} />}</div>
          <div>
            <div className="text-sm font-semibold">{label}</div>
            <div className="text-[13px] text-mute">{value ? value.label : hint ?? 'Not set'}</div>
          </div>
        </div>
        {onRemove && (
          <Pressable onClick={onRemove} aria-label={`Remove ${label}`} className="grid size-8 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
            <Trash2 size={15} />
          </Pressable>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESET_PLACES.map((p) => (
          <Pressable
            key={p.label}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
              value?.label === p.label ? 'bg-white text-black ring-white' : 'bg-white/5 text-white/75 ring-white/10'
            }`}
          >
            {p.label}
          </Pressable>
        ))}
        <Pressable type="button" onClick={useMine} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 ring-1 ring-white/10">
          <LocateFixed size={13} className={locating ? 'animate-spin' : ''} /> Use mine
        </Pressable>
        <Pressable type="button" onClick={() => { setDraft(value); setOpen(true) }} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 ring-1 ring-white/10">
          <MapPin size={13} /> Pick on map
        </Pressable>
      </div>
      {err && <div className="mt-2 text-xs text-brand">{err}</div>}

      <Sheet open={open} onClose={() => setOpen(false)} title={`Pick: ${label}`}>
        <p className="mb-3 text-sm text-mute">Tap anywhere on the map to drop a pin.</p>
        <div className="h-72 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <Suspense fallback={<div className="h-full animate-pulse bg-white/5" />}>
            <MapView picked={draft} onPick={(lat, lng) => setDraft((d) => ({ label: d && d.label && d.label !== 'My location' && !PRESET_PLACES.some((p) => p.label === d.label) ? d.label : 'Dropped pin', lat, lng }))} />
          </Suspense>
        </div>
        <input
          value={draft?.label ?? ''}
          onChange={(e) => draft && setDraft({ ...draft, label: e.target.value })}
          disabled={!draft}
          placeholder="Name this spot (e.g. Her apartment)"
          className="mt-3 w-full rounded-xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-brand disabled:opacity-40"
        />
        <Button className="mt-4 w-full" disabled={!draft} onClick={() => { if (draft) onChange(draft); setOpen(false) }}>
          Use this spot
        </Button>
      </Sheet>
    </motion.div>
  )
}
