import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Car, Flag, Heart, Plus, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocationField } from '../components/LocationField'
import { WheelPicker } from '../components/WheelPicker'
import { Button, Chip, Pressable, RollingValue, Stepper } from '../components/ui'
import { CUISINES, FALLBACK_CENTER, OCCASIONS } from '../lib/data'
import { bouncy, gentle, tick } from '../lib/motion'
import { useStore } from '../lib/store'
import type { Aesthetic, Dietary, Prefs, Vibe } from '../lib/types'

const VIBES: { v: Vibe; e: string }[] = [
  { v: 'Romantic', e: '🌹' }, { v: 'Cozy', e: '🕯️' }, { v: 'Lively', e: '🎉' },
  { v: 'Chill', e: '😌' }, { v: 'Trendy', e: '✨' }, { v: 'Adventurous', e: '🧭' },
]
const AESTHETICS: Aesthetic[] = ['Candlelit', 'Rooftop', 'Rustic', 'Modern', 'Garden', 'Retro']
const DIETARY: Dietary[] = ['Vegetarian', 'Vegan', 'Gluten-free', 'Halal']

const BUDGETS = Array.from({ length: 29 }, (_, i) => 10 + i * 5) // $10 … $150
const MILES = Array.from({ length: 30 }, (_, i) => i + 1)
const TIMES = Array.from({ length: 27 }, (_, i) => {
  const mins = 17 * 60 + i * 15 // 5:00 PM … 11:30 PM
  const h = Math.floor(mins / 60), m = mins % 60
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} PM`
})

const defaults: Prefs = {
  occasion: 'first', cuisines: [], dietary: [], vibes: [], aesthetics: [],
  budget: 40, maxMiles: 8, time: '7:00 PM', partySize: 2,
  city: null, start: FALLBACK_CENTER, pickup: null, stops: [],
}

const STEPS = ['Occasion', 'Food', 'Vibe', 'Details', 'Route', 'Review'] as const

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

export default function Quiz() {
  const { prefs, profile, setPrefs, meta, defaultStart } = useStore()
  const cities = useMemo(() => (meta && meta !== 'error' ? meta.cities : []), [meta])
  const nav = useNavigate()
  const [p, setP] = useState<Prefs>(() => prefs ?? { ...defaults, start: profile?.home ?? defaultStart })
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const set = (patch: Partial<Prefs>) => setP((x) => ({ ...x, ...patch }))
  // first run: once the dataset's cities load, start from the biggest one
  useEffect(() => {
    if (!prefs && !profile && cities.length) {
      setP((x) => (x.city ? x : { ...x, city: cities[0].name, start: { label: `${cities[0].name} (center)`, lat: cities[0].lat, lng: cities[0].lng } }))
    }
  }, [cities, prefs, profile])

  const go = (d: number) => {
    tick()
    setDir(d)
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + d)))
  }
  const finish = () => {
    setPrefs(p)
    nav('/results', { state: { fresh: true } })
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* progress */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-white/80">{STEPS[step]}</span>
          <span className="tabular-nums text-mute"><RollingValue value={step + 1} /> / {STEPS.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={bouncy} />
        </div>
        <div className="mt-3 flex justify-between">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => { setDir(i > step ? 1 : -1); setStep(i) }} aria-label={`Go to ${s}`} className="p-1">
              <motion.span
                animate={{ scale: i === step ? 1.4 : 1, backgroundColor: i <= step ? '#ff3b30' : 'rgba(255,255,255,.2)' }}
                transition={bouncy}
                className="block size-2 rounded-full"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[460px]">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={step}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 80, opacity: 0, scale: 0.97 }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (d: number) => ({ x: d * -80, opacity: 0, scale: 0.97 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={gentle}
          >
            {step === 0 && (
              <Q title="What's the occasion?" sub="This shapes everything — a first date needs a different spot than an anniversary.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {OCCASIONS.map((o, i) => {
                    const on = p.occasion === o.id
                    return (
                      <motion.button
                        key={o.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, scale: on ? 1.02 : 1 }}
                        transition={{ ...bouncy, delay: i * 0.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { tick(); set({ occasion: o.id }) }}
                        className={`relative flex items-center gap-4 overflow-hidden rounded-3xl p-5 text-left ring-1 transition-colors ${
                          on ? 'bg-brand/15 ring-brand' : 'bg-panel ring-white/10 hover:bg-panel2'
                        }`}
                      >
                        <motion.span animate={on ? { rotate: [0, -15, 12, 0], scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.5 }} className="text-3xl">{o.emoji}</motion.span>
                        <span>
                          <span className="block text-[17px] font-semibold">{o.label}</span>
                          <span className="block text-sm text-mute">{o.sub}</span>
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </Q>
            )}

            {step === 1 && (
              <Q title="What are you craving?" sub="Pick any — or none if you're open to anything.">
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => <Chip key={c} on={p.cuisines.includes(c)} onClick={() => set({ cuisines: toggle(p.cuisines, c) })}>{c}</Chip>)}
                </div>
                <div className="mt-8 mb-3 text-sm font-semibold text-white/80">Any dietary needs?</div>
                <div className="flex flex-wrap gap-2">
                  {DIETARY.map((d) => <Chip key={d} on={p.dietary.includes(d)} onClick={() => set({ dietary: toggle(p.dietary, d) })}>{d}</Chip>)}
                </div>
              </Q>
            )}

            {step === 2 && (
              <Q title="Set the mood" sub="How should the night feel?">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {VIBES.map(({ v, e }) => {
                    const on = p.vibes.includes(v)
                    return (
                      <motion.button
                        key={v}
                        whileTap={{ scale: 0.92 }}
                        animate={{ scale: on ? [1, 1.07, 1] : 1 }}
                        transition={bouncy}
                        onClick={() => { tick(); set({ vibes: toggle(p.vibes, v) }) }}
                        className={`flex flex-col items-center gap-1 rounded-3xl py-5 ring-1 transition-colors ${on ? 'bg-brand/15 ring-brand' : 'bg-panel ring-white/10 hover:bg-panel2'}`}
                      >
                        <span className="text-3xl">{e}</span>
                        <span className="text-sm font-semibold">{v}</span>
                      </motion.button>
                    )
                  })}
                </div>
                <div className="mt-8 mb-3 text-sm font-semibold text-white/80">Aesthetic</div>
                <div className="flex flex-wrap gap-2">
                  {AESTHETICS.map((a) => <Chip key={a} on={p.aesthetics.includes(a)} onClick={() => set({ aesthetics: toggle(p.aesthetics, a) })}>{a}</Chip>)}
                </div>
              </Q>
            )}

            {step === 3 && (
              <Q title="The details" sub="Flick the wheels — they've got a little bounce.">
                <div className="grid grid-cols-3 gap-3">
                  <WheelPicker label="Budget / person" items={BUDGETS} value={p.budget} onChange={(budget) => set({ budget })} format={(v) => `$${v}${v === 150 ? '+' : ''}`} />
                  <WheelPicker label="Max distance" items={MILES} value={p.maxMiles} onChange={(maxMiles) => set({ maxMiles })} format={(v) => `${v} mi`} />
                  <WheelPicker label="Time" items={TIMES} value={p.time} onChange={(time) => set({ time })} />
                </div>
                <div className="mt-8 flex justify-center">
                  <Stepper label="Party size" value={p.partySize} min={2} max={8} onChange={(partySize) => set({ partySize })} />
                </div>
              </Q>
            )}

            {step === 4 && (
              <Q title="Plan the route" sub="We'll add up the whole trip — including picking up your date or a stop for flowers.">
                <div className="space-y-3">
                  {cities.length > 1 && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="mr-1 text-sm font-semibold text-white/80">City</span>
                      {cities.map((c) => (
                        <Chip key={c.name} on={p.city === c.name} onClick={() => set({ city: c.name, start: { label: `${c.name} (center)`, lat: c.lat, lng: c.lng }, pickup: null, stops: [] })}>
                          {c.name}
                        </Chip>
                      ))}
                    </div>
                  )}
                  <LocationField label="Starting from" icon={<Flag size={17} />} value={p.start} onChange={(start) => set({ start })} />
                  <AnimatePresence initial={false}>
                    {p.pickup ? (
                      <motion.div key="pickup" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={gentle}>
                        <LocationField label="Picking up your date" icon={<Heart size={17} />} value={p.pickup} onChange={(pickup) => set({ pickup })} onRemove={() => set({ pickup: null })} />
                      </motion.div>
                    ) : null}
                    {p.stops.map((s, i) => (
                      <motion.div key={`stop-${i}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={gentle}>
                        <LocationField
                          label={`Stop ${i + 1} before dinner`}
                          icon={<Car size={17} />}
                          value={s}
                          onChange={(np) => set({ stops: p.stops.map((x, j) => (j === i ? np : x)) })}
                          onRemove={() => set({ stops: p.stops.filter((_, j) => j !== i) })}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!p.pickup && (
                      <Pressable onClick={() => set({ pickup: { ...p.start, label: 'Their place' } })} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-sm font-medium ring-1 ring-white/10">
                        <Plus size={15} /> Pick up my date
                      </Pressable>
                    )}
                    {p.stops.length < 3 && (
                      <Pressable onClick={() => set({ stops: [...p.stops, { ...p.start, label: `Stop ${p.stops.length + 1}` }] })} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-sm font-medium ring-1 ring-white/10">
                        <Plus size={15} /> Add a stop
                      </Pressable>
                    )}
                  </div>
                </div>
              </Q>
            )}

            {step === 5 && (
              <Q title="Look good?" sub="Tap any card to tweak it.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Summary label="Occasion" onClick={() => { setDir(-1); setStep(0) }}>{OCCASIONS.find((o) => o.id === p.occasion)?.emoji} {OCCASIONS.find((o) => o.id === p.occasion)?.label}</Summary>
                  <Summary label="Food" onClick={() => { setDir(-1); setStep(1) }}>{p.cuisines.length ? p.cuisines.join(', ') : 'Open to anything'}{p.dietary.length ? ` · ${p.dietary.join(', ')}` : ''}</Summary>
                  <Summary label="Mood" onClick={() => { setDir(-1); setStep(2) }}>{[...p.vibes, ...p.aesthetics].join(', ') || 'Surprise us'}</Summary>
                  <Summary label="Details" onClick={() => { setDir(-1); setStep(3) }}>${p.budget}/person · ≤{p.maxMiles} mi · {p.time} · party of {p.partySize}</Summary>
                  <Summary label="Route" onClick={() => { setDir(-1); setStep(4) }} wide>
                    {[p.start, p.pickup, ...p.stops].filter(Boolean).map((x) => x!.label).join(' → ')} → 🍽️
                  </Summary>
                </div>
              </Q>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* nav */}
      <div className="sticky bottom-4 z-10 mt-8 flex items-center justify-between gap-3 rounded-full bg-black/60 p-2 backdrop-blur-xl ring-1 ring-white/10">
        <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0}><ArrowLeft size={17} /> Back</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => go(1)}>Next <ArrowRight size={17} /></Button>
        ) : (
          <Button onClick={finish}><Sparkles size={17} /> Find my spots</Button>
        )}
      </div>
    </div>
  )
}

function Q({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 mb-7 text-white/60">{sub}</p>
      {children}
    </div>
  )
}

function Summary({ label, children, onClick, wide }: { label: string; children: React.ReactNode; onClick: () => void; wide?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -3 }}
      transition={bouncy}
      onClick={onClick}
      className={`rounded-3xl bg-panel p-5 text-left ring-1 ring-white/10 hover:bg-panel2 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">{label}</div>
      <div className="mt-1.5 text-[15px] font-medium">{children}</div>
    </motion.button>
  )
}
