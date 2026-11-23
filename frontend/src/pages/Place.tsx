import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapCard } from '../components/Detail'
import { DetailPanel } from '../components/Panel'
import { AddMemorySheet, ScrapbookGrid } from '../components/Scrapbook'
import { Button } from '../components/ui'
import { getRestaurant } from '../lib/api'
import { toRef } from '../lib/data'
import { buildRoute } from '../lib/geo'
import { bouncy } from '../lib/motion'
import { useStore } from '../lib/store'
import type { Hit } from '../lib/types'

export default function Place() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { prefs, profile, scrapbook, picked, setPicked, notify } = useStore()
  const [hit, setHit] = useState<Hit | null>(null)
  const [missing, setMissing] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

  useEffect(() => {
    let live = true
    getRestaurant(id, prefs).then((h) => live && setHit(h)).catch(() => live && setMissing(true))
    return () => { live = false }
  }, [id, prefs])

  if (missing) return <div className="py-20 text-center text-mute">Couldn't find that spot. <button className="text-brand" onClick={() => nav('/search')}>Back to search</button></div>
  if (!hit) return <div className="grid min-h-[50vh] place-items-center text-mute">Loading…</div>

  const r = hit.r
  const start = prefs?.start ?? profile?.home
  const route = start ? buildRoute({ start, pickup: prefs?.pickup ?? null, stops: prefs?.stops ?? [] }, r) : undefined
  const memories = scrapbook.filter((e) => e.restaurant.id === r.id)

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="-ml-3" onClick={() => nav(-1)}><ArrowLeft size={17} /> Back</Button>
      <div className="grid gap-5 lg:grid-cols-[minmax(300px,360px)_1fr]">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={bouncy}>
          <MapCard r={r} route={route} />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...bouncy, delay: 0.05 }}>
          <DetailPanel
            hit={hit}
            route={route}
            picked={picked?.id === r.id}
            onPick={() => { const n = picked?.id === r.id ? null : toRef(r); setPicked(n); if (n) notify(`It's a date — ${r.name} 💕`) }}
            onLog={() => setLogOpen(true)}
          />
        </motion.div>
      </div>
      {memories.length > 0 && (
        <section className="pt-4">
          <h2 className="mb-5 text-2xl font-bold tracking-tight">Your memories here</h2>
          <ScrapbookGrid entries={memories} />
        </section>
      )}
      <AddMemorySheet open={logOpen} onClose={() => setLogOpen(false)} restaurant={toRef(r)} />
    </div>
  )
}
