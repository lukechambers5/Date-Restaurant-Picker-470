import { AnimatePresence, motion } from 'framer-motion'
import { Search as SearchIcon, X } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PlaceArt } from '../components/PlaceArt'
import { Chip, Segmented, Stars } from '../components/ui'
import { searchRestaurants } from '../lib/api'
import { CUISINES } from '../lib/data'
import { fmtMiles, haversine } from '../lib/geo'
import { bouncy } from '../lib/motion'
import { priceLabel } from '../lib/score'
import { useStore } from '../lib/store'
import type { Hit } from '../lib/types'

const SUGGEST = ['quiet candlelit italian', 'cozy first date', 'rooftop view', 'anniversary dinner', 'cheap late night', 'live music']

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const dq = useDeferredValue(q)
  const [cuisine, setCuisine] = useState<string | null>(null)
  const [price, setPrice] = useState<0 | 1 | 2 | 3 | 4>(0)
  const { prefs, profile, meta } = useStore()
  const [city, setCity] = useState<string | null>(prefs?.city ?? null)
  const [results, setResults] = useState<Hit[] | null>(null)
  const [error, setError] = useState('')
  const nav = useNavigate()
  const origin = prefs?.start ?? profile?.home
  const cities = meta && meta !== 'error' ? meta.cities : []
  const cuisines = meta && meta !== 'error' ? meta.cuisines : CUISINES

  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      searchRestaurants(dq, { city, cuisine, price, k: 30 })
        .then((d) => { if (live) { setResults(d.results); setError('') } })
        .catch(() => live && setError('Could not reach the search server. Is `python app.py` running?'))
    }, 180)
    return () => { live = false; clearTimeout(t) }
  }, [dq, city, cuisine, price])

  const terms = new Set(dq.toLowerCase().match(/[a-z']+/g) ?? [])

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold tracking-tight sm:text-4xl">Find a spot</h1>

      <label className="flex items-center gap-3 rounded-2xl bg-panel2 px-5 py-4 ring-1 ring-white/10 focus-within:ring-brand">
        <SearchIcon size={20} className="text-mute" />
        <input
          autoFocus
          value={q}
          onChange={(e) => { setQ(e.target.value); setParams(e.target.value ? { q: e.target.value } : {}, { replace: true }) }}
          placeholder="Try “quiet candlelit Italian for a first date”"
          className="flex-1 bg-transparent text-lg outline-none placeholder:text-white/30"
        />
        <AnimatePresence>
          {q && (
            <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={bouncy} onClick={() => { setQ(''); setParams({}) }} className="grid size-7 place-items-center rounded-full bg-white/15" aria-label="Clear">
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </label>

      {!q && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGEST.map((s) => (
            <button key={s} onClick={() => setQ(s)} className="rounded-full bg-white/5 px-3 py-1.5 text-[13px] text-white/70 ring-1 ring-white/10 hover:bg-white/10">{s}</button>
          ))}
        </div>
      )}

      {cities.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4">
          <Chip on={!city} onClick={() => setCity(null)}>All cities</Chip>
          {cities.map((c) => <Chip key={c.name} on={city === c.name} onClick={() => setCity(city === c.name ? null : c.name)}>{c.name}</Chip>)}
        </div>
      )}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {cuisines.map((c) => <Chip key={c} on={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>{c}</Chip>)}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Segmented id="price" value={price} onChange={setPrice} options={[{ value: 0, label: 'Any' }, { value: 1, label: '$' }, { value: 2, label: '$$' }, { value: 3, label: '$$$' }, { value: 4, label: '$$$$' }]} />
        <span className="text-sm text-mute">{results ? `${results.length}${results.length === 30 ? '+' : ''} spots` : '…'}</span>
      </div>

      {error && <div className="py-16 text-center text-mute">{error}</div>}

      <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {(results ?? []).map(({ r, snippets }, i) => (
            <motion.button
              key={r.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ ...bouncy, delay: Math.min(i, 8) * 0.03 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => nav(`/place/${encodeURIComponent(r.id)}`)}
              className="relative flex min-h-60 flex-col justify-end overflow-hidden rounded-[26px] text-left ring-1 ring-white/10"
            >
              <PlaceArt cuisine={r.cuisine} grey={false} />
              <div className="relative p-5">
                <div className="text-xl font-bold">{r.name}</div>
                <div className="mt-0.5 text-sm text-white/70">
                  {origin && `${fmtMiles(haversine(origin, r) * 1.3)} · `}{r.cuisine} · {priceLabel(r.price)}{r.city ? ` · ${r.city}` : ''}
                </div>
                {r.stars != null && <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/60"><Stars value={r.stars} size={12} /> {r.stars} ({r.reviewCount})</div>}
                {q && snippets[0] && (
                  <p className="mt-2 line-clamp-2 text-[12px] italic text-white/75">
                    “{snippets[0].split(/([A-Za-z']+)/).map((w, j) => (terms.has(w.toLowerCase()) ? <b key={j} className="text-brand-soft">{w}</b> : w))}”
                  </p>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
      {results && !results.length && !error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-20 text-center text-mute">
          <div className="mb-2 text-4xl">🍽️</div>No spots match that. Try fewer filters?
        </motion.div>
      )}
    </div>
  )
}
