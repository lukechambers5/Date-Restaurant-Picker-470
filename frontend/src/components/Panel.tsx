import { AnimatePresence, motion } from 'framer-motion'
import { BookHeart, MapPin, Navigation, Quote, Sparkles } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { appleMapsUrl, fmtMiles, fmtMins, googleMapsUrl } from '../lib/geo'
import type { Route } from '../lib/geo'
import { bouncy, gentle, snappy } from '../lib/motion'
import { priceLabel } from '../lib/score'
import type { Compat, Hit, Restaurant } from '../lib/types'
import { CompatBars, CompatRing } from './Detail'
import { PlaceArt } from './PlaceArt'
import { Button, Stars } from './ui'

interface PanelProps {
  hit: Hit
  route?: Route
  terms?: string[]
  onLog?: () => void
  onPick?: () => void
  picked?: boolean
}

/** Highlight the words in a review snippet that matched the query / quiz terms. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>
  const set = new Set(terms.map((t) => t.toLowerCase()))
  return (
    <>
      {text.split(/([A-Za-z']+)/).map((part, i) =>
        set.has(part.toLowerCase())
          ? <mark key={i} className="rounded bg-brand/25 px-0.5 text-white">{part}</mark>
          : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-16 text-white/65">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full bg-white/70" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ type: 'spring', stiffness: 90, damping: 12 }} />
      </div>
    </div>
  )
}

const sign = (n: number) => `${n >= 0 ? '+' : ''}${n}`

export function DetailPanel({ hit, route, terms = [], onLog, onPick, picked }: PanelProps) {
  const { r, compat, snippets, aspects, parts } = hit
  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-[28px] bg-panel ring-1 ring-white/10">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={r.id} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={gentle} className="absolute inset-0">
          <PlaceArt cuisine={r.cuisine} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={r.id}
          initial="hide"
          animate="show"
          exit="hide"
          variants={{ show: { transition: { staggerChildren: 0.05 } }, hide: {} }}
          className="relative flex h-full flex-col gap-5 p-5 sm:p-7"
        >
          <motion.div variants={item} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">
                <span>{r.cuisine}</span><span>·</span><span>{priceLabel(r.price)}</span>
                {route && (<><span>·</span><span>{fmtMiles(route.lastLeg.miles)} | {fmtMins(route.lastLeg.mins)}</span></>)}
              </div>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{r.name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-white/70">
                {r.stars != null && <><Stars value={r.stars} /> <span className="font-semibold text-white">{r.stars}</span></>}
                <span>({r.reviewCount.toLocaleString()} reviews)</span>
                <span className="text-white/40">· {r.address}</span>
              </div>
            </div>
            {compat && <CompatRing value={compat.overall} />}
          </motion.div>

          <motion.div variants={item} className="grid flex-1 gap-5 md:grid-cols-3">
            <Col title="At a glance">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {r.categories.map((c) => <span key={c} className="rounded-md bg-black/35 px-2 py-0.5 text-[12px] text-white/85">{c}</span>)}
              </div>
              <ul className="space-y-1 text-[13px] text-white/80">
                {r.facts.map((f) => <li key={f}>• {f}</li>)}
                {!r.facts.length && <li className="text-white/45">No extra details in the dataset</li>}
              </ul>
            </Col>
            <Col title="Vibe / aesthetic">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {r.tags.map((t) => <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-medium ring-1 ring-white/10">{t}</span>)}
                {!r.tags.length && <span className="text-[13px] text-white/45">No strong vibe signal in reviews</span>}
              </div>
              <div className="space-y-1.5">
                <Meter label="Ambiance" value={aspects.ambiance} />
                <Meter label="Quiet" value={aspects.quiet} />
                <Meter label="Service" value={aspects.service} />
              </div>
              <div className="mt-1.5 text-[10px] text-white/35">Compared with other restaurants, from review text</div>
            </Col>
            <Col title="Your compatibility">
              {compat ? (
                <CompatBars c={compat} />
              ) : (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/75 ring-1 ring-white/10">
                  <Sparkles size={16} className="mb-1 text-brand" />
                  Take the quiz to see how well this spot fits your night.
                  <Link to="/quiz" className="mt-2 block font-semibold text-brand">Take the quiz →</Link>
                </div>
              )}
            </Col>
          </motion.div>

          {snippets.length > 0 && (
            <motion.figure variants={item} className="rounded-2xl bg-black/35 p-4 ring-1 ring-white/10 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                <Quote size={14} className="text-brand" /> Why it's a date fit
              </div>
              <ul className="space-y-2">
                {snippets.map((s) => (
                  <li key={s} className="text-[14px] italic leading-relaxed text-white/90">“<Highlight text={s} terms={terms} />”</li>
                ))}
              </ul>
              {parts && (
                <figcaption className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/45">
                  <span>BM25 {sign(parts.bm25)}</span>
                  <span>Date signal {sign(parts.date)}</span>
                  {parts.embedding !== 0 && <span>Semantic {sign(parts.embedding)}</span>}
                  <span className="text-white/30">(z-scores in the hybrid ranker)</span>
                </figcaption>
              )}
            </motion.figure>
          )}

          <motion.div variants={item} className="flex flex-wrap gap-2">
            {onPick && (
              <Button onClick={onPick} variant={picked ? 'soft' : 'primary'}>
                <motion.span key={String(picked)} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={bouncy}>{picked ? '❤️' : '🤍'}</motion.span>
                {picked ? "It's a date!" : 'Pick this spot'}
              </Button>
            )}
            {route && (
              <>
                <a href={googleMapsUrl(route)} target="_blank" rel="noreferrer"><Button variant="soft"><Navigation size={16} /> Google Maps</Button></a>
                <a href={appleMapsUrl(route)} target="_blank" rel="noreferrer"><Button variant="soft"><MapPin size={16} /> Apple Maps</Button></a>
              </>
            )}
            {onLog && <Button variant="ghost" onClick={onLog}><BookHeart size={16} /> We went here</Button>}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const item = { hide: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: snappy } }

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{title}</div>
      {children}
    </div>
  )
}

/* ---------------- List row (pill from the mockup) ---------------- */
export function RestaurantRow({
  r, compat, route, rank, selected, onClick,
}: { r: Restaurant; compat?: Compat | null; route?: Route; rank: number; selected: boolean; onClick: () => void }) {
  const medal = ['🥇', '🥈', '🥉'][rank - 1]
  return (
    <motion.button
      layout
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      transition={bouncy}
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-[32px] px-5 py-4 text-left ring-1 transition-colors sm:px-8 sm:py-5 ${
        selected ? 'bg-panel3 ring-brand/70' : 'bg-panel2 ring-white/5 hover:bg-panel3'
      }`}
    >
      {selected && <motion.span layoutId="row-glow" transition={bouncy} className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-brand" />}
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black/40 text-lg">{medal ?? <span className="text-sm font-bold text-white/60">{rank}</span>}</span>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-6">
        <div className="truncate text-xl font-semibold tracking-tight sm:w-72 sm:text-2xl">{r.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-white/65 sm:mt-0 sm:text-[15px]">
          {route && <><span>{fmtMiles(route.lastLeg.miles)}</span><span className="text-white/25">|</span></>}
          <span>{r.cuisine}</span>
          <span className="text-white/25">|</span>
          <span>{priceLabel(r.price)}</span>
          {r.tags[0] && <><span className="text-white/25">|</span><span>{r.tags[0]}</span></>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {compat ? (
          <>
            <div className="text-[11px] font-medium text-white/55 sm:text-xs">Match {compat.stars}/5</div>
            <Stars value={compat.stars} size={16} className="mt-0.5" />
          </>
        ) : r.stars != null ? (
          <>
            <div className="text-[11px] font-medium text-white/55 sm:text-xs">{r.stars}/5 on Yelp</div>
            <Stars value={r.stars} size={16} className="mt-0.5" />
          </>
        ) : null}
      </div>
    </motion.button>
  )
}
