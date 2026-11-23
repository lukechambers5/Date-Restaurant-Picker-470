import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, BookHeart, ClipboardList, Heart, MapPinned, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlaceArt } from '../components/PlaceArt'
import { Button, Stars } from '../components/ui'
import { searchRestaurants } from '../lib/api'
import type { Restaurant } from '../lib/types'
import { bouncy, snappy } from '../lib/motion'
import { priceLabel } from '../lib/score'
import { useStore } from '../lib/store'

const steps = [
  { icon: ClipboardList, title: 'Take the date quiz', body: 'Occasion, cravings, vibe, budget and who you are picking up on the way.' },
  { icon: MapPinned, title: 'Get your top 3', body: 'Ranked by compatibility, with a map, total trip time and directions.' },
  { icon: BookHeart, title: 'Keep the memories', body: 'Link your partner, snap a photo there and rate every date night.' },
]

export default function Home() {
  const nav = useNavigate()
  const { prefs, profile, scrapbook } = useStore()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 400], [0, -60])
  const [featured, setFeatured] = useState<Restaurant[]>([])
  useEffect(() => {
    searchRestaurants('', { k: 6 }).then((d) => setFeatured(d.results.map((h) => h.r))).catch(() => {})
  }, [])

  return (
    <div className="space-y-20">
      {/* hero */}
      <section className="relative grid items-center gap-10 pt-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={snappy}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-brand/30">
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}><Heart size={12} fill="currentColor" /></motion.span>
            {profile ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Bryan · College Station'}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...snappy, delay: 0.05 }}
            className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
            Stop asking <br /><span className="font-script text-6xl font-normal text-brand sm:text-8xl">“where should we eat?”</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...snappy, delay: 0.1 }}
            className="mt-6 max-w-lg text-lg text-white/65">
            Answer a few quick questions and we'll find the restaurants that match your night — the food, the vibe, the budget and the drive.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...snappy, delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => nav('/quiz')} className="px-7 py-4 text-base">
              Plan date night <ArrowRight size={18} />
            </Button>
            {prefs && <Button variant="soft" onClick={() => nav('/results')} className="px-6 py-4 text-base">See my matches</Button>}
            <Button variant="ghost" onClick={() => nav('/search')} className="px-5 py-4 text-base"><Search size={17} /> Browse spots</Button>
          </motion.div>
          {scrapbook.length > 0 && (
            <div className="mt-6 text-sm text-mute">📸 {scrapbook.length} date{scrapbook.length > 1 ? 's' : ''} in your scrapbook</div>
          )}
        </div>

        {/* floating card stack */}
        <motion.div style={{ y }} className="relative mx-auto h-[420px] w-full max-w-md">
          {featured.slice(0, 3).map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 80, rotate: 0 }}
              animate={{ opacity: 1, y: i * 26, rotate: [-6, 4, -1][i], x: [-30, 20, 0][i] }}
              transition={{ ...bouncy, delay: 0.25 + i * 0.12 }}
              whileHover={{ scale: 1.04, rotate: 0, zIndex: 5 }}
              drag
              dragSnapToOrigin
              dragTransition={{ bounceStiffness: 500, bounceDamping: 18 }}
              className="absolute inset-x-6 top-0 h-[300px] cursor-grab overflow-hidden rounded-[30px] ring-1 ring-white/10 shadow-2xl active:cursor-grabbing"
              style={{ zIndex: 3 - i }}
            >
              <PlaceArt cuisine={r.cuisine} grey={false} />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-white/60">{r.cuisine} · {priceLabel(r.price)}</div>
                <div className="text-2xl font-bold">{r.name}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-white/70">{r.stars != null && <Stars value={r.stars} />} {r.tags.slice(0, 3).join(' · ')}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* how it works */}
      <section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ ...bouncy, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="rounded-[28px] bg-panel p-6 ring-1 ring-white/5"
            >
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand/15 text-brand"><s.icon size={22} /></div>
              <div className="text-sm font-semibold text-mute">Step {i + 1}</div>
              <div className="mt-1 text-xl font-semibold">{s.title}</div>
              <p className="mt-2 text-[15px] text-white/60">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* featured carousel */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Local favorites</h2>
          <Link to="/search" className="text-sm font-semibold text-brand">See all →</Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4">
          {featured.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...bouncy, delay: i * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="snap-start"
            >
              <Link to={`/place/${encodeURIComponent(r.id)}`} className="relative block h-64 w-60 overflow-hidden rounded-[26px] ring-1 ring-white/10">
                <PlaceArt cuisine={r.cuisine} grey={false} />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="text-lg font-bold">{r.name}</div>
                  <div className="text-sm text-white/65">{r.cuisine}{r.tags[0] ? ` · ${r.tags[0]}` : ''}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
