import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardList, Heart, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapCard } from '../components/Detail'
import { DetailPanel, RestaurantRow } from '../components/Panel'
import { AddMemorySheet } from '../components/Scrapbook'
import { Button, Segmented } from '../components/ui'
import { rankRestaurants } from '../lib/api'
import { OCCASIONS, toRef } from '../lib/data'
import { buildRoute } from '../lib/geo'
import { bouncy, snappy } from '../lib/motion'
import { useStore } from '../lib/store'
import type { RankResponse } from '../lib/types'

type Sort = 'match' | 'distance' | 'price'

export default function Results() {
  const { prefs, picked, setPicked, notify } = useStore()
  const nav = useNavigate()
  const [data, setData] = useState<RankResponse | null>(null)
  const [error, setError] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('match')
  const [logOpen, setLogOpen] = useState(false)

  useEffect(() => {
    if (!prefs) return
    let live = true
    rankRestaurants(prefs)
      .then((d) => live && setData(d))
      .catch(() => live && setError('Could not reach the search server. Is `python app.py` running?'))
    return () => { live = false }
  }, [prefs])

  const ranked = useMemo(
    () => (data && prefs ? data.results.map((h) => ({ ...h, route: buildRoute(prefs, h.r) })) : []),
    [data, prefs],
  )
  const list = useMemo(() => {
    const l = [...ranked]
    if (sort === 'distance') l.sort((a, b) => a.route.lastLeg.miles - b.route.lastLeg.miles)
    if (sort === 'price') l.sort((a, b) => (a.r.price ?? 9) - (b.r.price ?? 9) || (b.compat?.overall ?? 0) - (a.compat?.overall ?? 0))
    return l
  }, [ranked, sort])

  if (!prefs) return <NeedsQuiz onGo={() => nav('/quiz')} />
  if (error) return <div className="py-24 text-center text-mute">{error}</div>
  if (!data) return <Finding />
  if (!ranked.length) return <div className="py-24 text-center text-mute">No restaurants matched. Try widening distance or budget in the quiz.</div>

  const current = ranked.find((x) => x.r.id === sel) ?? ranked[0]
  const occ = OCCASIONS.find((o) => o.id === prefs.occasion)

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={snappy} className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-mute">Your night:</span>
        {[`${occ?.emoji} ${occ?.label}`, prefs.cuisines.slice(0, 3).join(', ') || 'Any food', `$${prefs.budget}/pp`, `≤ ${prefs.maxMiles} mi`, prefs.time, ...prefs.vibes.slice(0, 2)].map((t) => (
          <span key={t} className="rounded-full bg-white/[0.06] px-3 py-1 text-[13px] font-medium ring-1 ring-white/10">{t}</span>
        ))}
        <Button variant="ghost" className="ml-auto !py-1.5 text-sm" onClick={() => nav('/quiz')}><SlidersHorizontal size={15} /> Edit</Button>
      </motion.div>

      <div className="-mt-3 text-[12px] text-white/40">
        BM25 query from your quiz: <span className="font-mono text-white/60">“{data.query}”</span>
        {data.relaxed.length > 0 && <span className="ml-2 text-amber-300/80">· loosened {data.relaxed.join(' & ')} to find enough spots</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,360px)_1fr]">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={bouncy}>
          <MapCard r={current.r} route={current.route} others={ranked.slice(0, 10).map((x) => x.r).filter((r) => r.id !== current.r.id)} onSelect={setSel} />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...bouncy, delay: 0.05 }}>
          <DetailPanel
            hit={current}
            route={current.route}
            terms={data.terms}
            picked={picked?.id === current.r.id}
            onPick={() => {
              const next = picked?.id === current.r.id ? null : toRef(current.r)
              setPicked(next)
              if (next) notify(`It's a date — ${current.r.name} at ${prefs.time} 💕`)
            }}
            onLog={() => setLogOpen(true)}
          />
        </motion.div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{sort === 'match' ? 'Your top 3' : 'All spots'}</h2>
          <p className="text-sm text-mute">Tap a spot to see it on the map. Stars = compatibility with your quiz.</p>
        </div>
        <Segmented id="sort" value={sort} onChange={setSort} options={[{ value: 'match', label: 'Best match' }, { value: 'distance', label: 'Closest' }, { value: 'price', label: 'Cheapest' }]} />
      </div>

      <motion.div layout className="space-y-3">
        <AnimatePresence initial={false}>
          {list.map((x, i) => (
            <motion.div
              key={x.r.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ ...bouncy, delay: Math.min(i, 6) * 0.04 }}
            >
              {i === 3 && sort === 'match' && <div className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-mute">More spots</div>}
              <RestaurantRow
                r={x.r}
                compat={x.compat}
                route={x.route}
                rank={i + 1}
                selected={x.r.id === current.r.id}
                onClick={() => { setSel(x.r.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <AddMemorySheet open={logOpen} onClose={() => setLogOpen(false)} restaurant={toRef(current.r)} />
    </div>
  )
}

function Finding() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.25, 1, 1.18, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-5 grid size-20 place-items-center rounded-full bg-brand/15 text-brand"
        >
          <Heart size={38} fill="currentColor" />
        </motion.div>
        <div className="text-xl font-semibold">Finding your perfect spots…</div>
        <div className="mt-1 text-sm text-mute">Searching reviews for food, vibe, budget and occasion</div>
      </div>
    </div>
  )
}

function NeedsQuiz({ onGo }: { onGo: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={bouncy} className="max-w-md rounded-[32px] bg-panel p-8 text-center ring-1 ring-white/10">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-brand/15 text-brand"><ClipboardList size={30} /></div>
        <h1 className="text-2xl font-bold">Take the quiz first</h1>
        <p className="mt-2 text-white/60">We need a little info about your date night before we can rank spots for you. It takes about a minute.</p>
        <Button className="mt-6" onClick={onGo}>Start the quiz</Button>
      </motion.div>
    </div>
  )
}
