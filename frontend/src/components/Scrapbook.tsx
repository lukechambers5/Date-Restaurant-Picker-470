import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Search, ThumbsDown, ThumbsUp, Trash2, UtensilsCrossed } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { lookupRestaurants } from '../lib/api'
import { toRef } from '../lib/data'
import { compressImage } from '../lib/image'
import { bouncy, tick } from '../lib/motion'
import { useStore } from '../lib/store'
import type { RestaurantRef, ScrapEntry } from '../lib/types'
import { PlaceArt } from './PlaceArt'
import { Button, Pressable, SectionLabel, Sheet, StarInput, Stars } from './ui'

const today = () => new Date().toISOString().slice(0, 10)

/* ---------- Photo drop target ---------- */
function PhotoInput({ value, onChange, label, icon }: { value?: string; onChange: (v?: string) => void; label: string; icon: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null)
  const { notify } = useStore()
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={bouncy}
      onClick={() => ref.current?.click()}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-dashed ring-white/20 hover:bg-white/10"
    >
      {value ? (
        <>
          <img src={value} alt="" className="size-full object-cover" />
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(undefined) }}
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/70"
            aria-label="Remove photo"
          >
            <Trash2 size={13} />
          </span>
        </>
      ) : (
        <span className="flex size-full flex-col items-center justify-center gap-2 text-xs text-mute">
          {icon}
          {label}
        </span>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          try { onChange(await compressImage(f)) } catch (err) { notify((err as Error).message) }
          e.target.value = ''
        }}
      />
    </motion.button>
  )
}

/* ---------- Restaurant typeahead (searches the local dataset by name) ---------- */
function RestaurantPicker({ value, onChange }: { value?: RestaurantRef; onChange: (r: RestaurantRef) => void }) {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<RestaurantRef[]>([])
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    let live = true
    const t = setTimeout(() => lookupRestaurants(q).then((rs) => live && setOpts(rs.map(toRef))).catch(() => {}), 150)
    return () => { live = false; clearTimeout(t) }
  }, [q])
  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 focus-within:ring-brand">
        <Search size={15} className="text-mute" />
        <input
          value={focus ? q : value?.name ?? q}
          onFocus={() => { setFocus(true); setQ('') }}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search restaurants"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <AnimatePresence>
        {focus && opts.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={bouncy}
            className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl bg-panel2 py-1 ring-1 ring-white/10"
          >
            {opts.map((o) => (
              <li key={o.id}>
                <button type="button" onMouseDown={() => { onChange(o); setFocus(false) }} className="w-full px-4 py-2 text-left text-sm hover:bg-white/10">
                  {o.name} <span className="text-mute">· {o.cuisine}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Add memory sheet ---------- */
export function AddMemorySheet({ open, onClose, restaurant }: { open: boolean; onClose: () => void; restaurant?: RestaurantRef }) {
  const { addEntry, notify } = useStore()
  const [place, setPlace] = useState<RestaurantRef | undefined>(restaurant)
  const [date, setDate] = useState(today())
  const [photo, setPhoto] = useState<string>()
  const [dishPhoto, setDishPhoto] = useState<string>()
  const [rating, setRating] = useState(0)
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setPlace(restaurant)
      setDate(today()); setPhoto(undefined); setDishPhoto(undefined); setRating(0); setWouldReturn(null); setNote('')
    }
  }, [open, restaurant])

  const save = () => {
    if (!place || !rating || wouldReturn === null) return
    addEntry({
      id: crypto.randomUUID(), restaurant: place, date, photo, dishPhoto, rating, wouldReturn, note, createdAt: new Date().toISOString(),
    })
    notify('Saved to your scrapbook 📸')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add a date memory">
      <div className="space-y-5">
        <div>
          <SectionLabel>Where did you go?</SectionLabel>
          <RestaurantPicker value={place} onChange={setPlace} />
        </div>
        <div>
          <SectionLabel>When</SectionLabel>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-brand" />
        </div>
        <div>
          <SectionLabel>Photos</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <PhotoInput value={photo} onChange={setPhoto} label="You two there" icon={<Camera size={22} />} />
            <PhotoInput value={dishPhoto} onChange={setDishPhoto} label="Favorite dish" icon={<UtensilsCrossed size={22} />} />
          </div>
        </div>
        <div>
          <SectionLabel>How was it?</SectionLabel>
          <StarInput value={rating} onChange={setRating} />
        </div>
        <div>
          <SectionLabel>Would you go back?</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((v) => (
              <motion.button
                key={String(v)}
                type="button"
                whileTap={{ scale: 0.92 }}
                animate={wouldReturn === v ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={bouncy}
                onClick={() => { tick(); setWouldReturn(v) }}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold ring-1 transition-colors ${
                  wouldReturn === v ? (v ? 'bg-emerald-500/90 ring-emerald-400' : 'bg-brand ring-brand') : 'bg-white/5 ring-white/10'
                }`}
              >
                {v ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />} {v ? 'Would return' : 'One and done'}
              </motion.button>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Notes</SectionLabel>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ordered the tiramisu, laughed at the waiter's jokes…" className="w-full resize-none rounded-xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-brand" />
        </div>
        <Button className="w-full" onClick={save} disabled={!place || !rating || wouldReturn === null}>Save memory</Button>
      </div>
    </Sheet>
  )
}

/* ---------- Polaroid grid ---------- */
export function ScrapbookGrid({ entries }: { entries: ScrapEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const { removeEntry } = useStore()
  const open = entries.find((e) => e.id === openId)
  const openR = open?.restaurant

  return (
    <>
      <motion.div layout className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence>
          {entries.map((e, i) => {
            const r = e.restaurant
            const tilt = ((i * 37) % 7) - 3
            return (
              <motion.button
                key={e.id}
                layout
                initial={{ opacity: 0, scale: 0.6, rotate: tilt * 3 }}
                animate={{ opacity: 1, scale: 1, rotate: tilt }}
                exit={{ opacity: 0, scale: 0.5 }}
                whileHover={{ rotate: 0, scale: 1.05, y: -6, zIndex: 2 }}
                whileTap={{ scale: 0.97 }}
                transition={bouncy}
                onClick={() => setOpenId(e.id)}
                className="relative rounded-md bg-[#f4f1ea] p-2.5 pb-3 text-left text-black shadow-[0_18px_40px_-12px_rgba(0,0,0,.8)]"
              >
                <div className="relative aspect-square overflow-hidden rounded-sm bg-black">
                  {e.photo ? <img src={e.photo} alt="" className="size-full object-cover" /> : <PlaceArt cuisine={r.cuisine} grey={false} />}
                  <span className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${e.wouldReturn ? 'bg-emerald-600' : 'bg-brand'}`}>
                    {e.wouldReturn ? 'Again!' : 'Once'}
                  </span>
                </div>
                <div className="mt-2 truncate font-script text-[22px] leading-tight">{r.name}</div>
                <div className="flex items-center justify-between text-[11px] text-black/55">
                  <span>{new Date(e.date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <Stars value={e.rating} size={11} />
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </motion.div>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={openR?.name ?? ''}>
        {open && openR && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[open.photo, open.dishPhoto].map((p, i) =>
                p ? <img key={i} src={p} alt="" className="aspect-[4/5] w-full rounded-2xl object-cover" /> : (
                  <div key={i} className="relative aspect-[4/5] overflow-hidden rounded-2xl"><PlaceArt cuisine={openR.cuisine} grey={false} /></div>
                ),
              )}
            </div>
            <div className="flex items-center justify-between">
              <Stars value={open.rating} size={20} />
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${open.wouldReturn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-brand/20 text-brand'}`}>
                {open.wouldReturn ? 'Would return' : 'Would not return'}
              </span>
            </div>
            <div className="text-sm text-mute">{new Date(open.date + 'T12:00').toLocaleDateString(undefined, { dateStyle: 'full' })}</div>
            {open.note && <p className="text-[15px] leading-relaxed">{open.note}</p>}
            <Pressable
              onClick={() => { if (confirm('Delete this memory?')) { removeEntry(open.id); setOpenId(null) } }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-brand hover:bg-brand/10"
            >
              <Trash2 size={15} /> Delete memory
            </Pressable>
          </div>
        )}
      </Sheet>
    </>
  )
}
