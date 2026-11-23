import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Copy, Heart, Home as HomeIcon, Link2, Pencil, Plus, Unlink } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LocationField } from '../components/LocationField'
import { PlaceArt } from '../components/PlaceArt'
import { AddMemorySheet, ScrapbookGrid } from '../components/Scrapbook'
import { AnimatedNumber, Button, Pressable, SectionLabel, Sheet } from '../components/ui'
import { compressImage } from '../lib/image'
import { bouncy, snappy } from '../lib/motion'
import { useStore } from '../lib/store'
import type { Profile as TProfile } from '../lib/types'

const makeCode = () => 'DNP-' + Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

function Avatar({ src, name, size = 96, onPick }: { src?: string; name: string; size?: number; onPick?: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <motion.button
      type="button"
      whileTap={onPick ? { scale: 0.92 } : undefined}
      whileHover={onPick ? { scale: 1.04 } : undefined}
      transition={bouncy}
      onClick={() => onPick && ref.current?.click()}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-[#ff8a65] font-bold ring-4 ring-black ${onPick ? '' : 'cursor-default'}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : (name[0] ?? '?').toUpperCase()}
      {onPick && (
        <span className="absolute bottom-0 inset-x-0 flex justify-center bg-black/55 py-1"><Camera size={size * 0.14} /></span>
      )}
      {onPick && (
        <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; if (f) onPick(await compressImage(f, 400, 0.8)); e.target.value = ''
        }} />
      )}
    </motion.button>
  )
}

function ProfileForm({ initial, onSave, submit }: { initial?: TProfile; onSave: (p: TProfile) => void; submit: string }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [avatar, setAvatar] = useState(initial?.avatar)
  const { defaultStart } = useStore()
  const [home, setHome] = useState(initial?.home ?? defaultStart)
  return (
    <div className="space-y-5">
      <div className="flex justify-center"><Avatar src={avatar} name={name || '?'} onPick={setAvatar} /></div>
      <div>
        <SectionLabel>Your name</SectionLabel>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-brand" />
      </div>
      <div>
        <SectionLabel>About you</SectionLabel>
        <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Sushi snob, dessert-first kind of person" className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-brand" />
      </div>
      <LocationField label="Home base" icon={<HomeIcon size={17} />} value={home} onChange={setHome} />
      <Button className="w-full" disabled={!name.trim()} onClick={() => onSave({
        name: name.trim(), bio, avatar, home, code: initial?.code ?? makeCode(), since: initial?.since ?? new Date().toISOString(),
      })}>{submit}</Button>
    </div>
  )
}

export default function Profile() {
  const { profile, setProfile, partner, setPartner, scrapbook, picked, notify } = useStore()
  const [editing, setEditing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [code, setCode] = useState('')
  const [pname, setPname] = useState('')
  const [copied, setCopied] = useState(false)
  const [codeErr, setCodeErr] = useState(0)

  if (!profile) {
    return (
      <div className="mx-auto max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={snappy} className="rounded-[32px] bg-panel p-7 ring-1 ring-white/10">
          <h1 className="text-center text-2xl font-bold">Create your profile</h1>
          <p className="mb-6 mt-1 text-center text-sm text-mute">Track and rate spots, link your partner, and build your date scrapbook.</p>
          <ProfileForm submit="Create profile" onSave={(p) => { setProfile(p); notify(`Welcome, ${p.name}! 💕`) }} />
        </motion.div>
      </div>
    )
  }

  const avg = scrapbook.length ? scrapbook.reduce((s, e) => s + e.rating, 0) / scrapbook.length : 0
  const again = scrapbook.length ? Math.round((scrapbook.filter((e) => e.wouldReturn).length / scrapbook.length) * 100) : 0
  const cuisineCount = scrapbook.reduce<Record<string, number>>((m, e) => { const c = e.restaurant.cuisine; if (c) m[c] = (m[c] ?? 0) + 1; return m }, {})
  const fav = Object.entries(cuisineCount).sort((a, b) => b[1] - a[1])[0]?.[0]

  const link = () => {
    const c = code.trim().toUpperCase()
    if (!/^DNP-[A-Z0-9]{4}$/.test(c) || c === profile.code || !pname.trim()) { setCodeErr((n) => n + 1); return }
    setPartner({ name: pname.trim(), code: c, linkedAt: new Date().toISOString() })
    setCode(''); setPname('')
    notify(`Linked with ${pname.trim()} 💞`)
  }

  return (
    <div className="space-y-10">
      {/* profile header */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={snappy} className="relative overflow-hidden rounded-[32px] bg-panel p-6 ring-1 ring-white/10 sm:p-8">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center">
            <Avatar src={profile.avatar} name={profile.name} size={104} onPick={(avatar) => setProfile({ ...profile, avatar })} />
            <AnimatePresence>
              {partner && (
                <motion.div initial={{ x: -40, opacity: 0, scale: 0.5 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: -40, opacity: 0, scale: 0.5 }} transition={bouncy} className="-ml-5 flex items-center">
                  <Avatar src={partner.avatar} name={partner.name} size={104} />
                  <motion.span animate={{ scale: [1, 1.25, 1, 1.15, 1] }} transition={{ duration: 1.3, repeat: Infinity }} className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 sm:left-[104px] sm:top-[52px] text-brand drop-shadow-lg">
                    <Heart size={30} fill="currentColor" stroke="black" strokeWidth={1.5} />
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight">{profile.name}{partner && <span className="text-white/50"> & {partner.name}</span>}</h1>
            {profile.bio && <p className="mt-1 text-white/65">{profile.bio}</p>}
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-mute sm:justify-start">
              <span className="inline-flex items-center gap-1"><HomeIcon size={14} /> {profile.home.label}</span>
              <span>Since {new Date(profile.since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
          <Button variant="soft" onClick={() => setEditing(true)}><Pencil size={15} /> Edit</Button>
        </div>

        {/* stats */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Dates logged', node: <AnimatedNumber value={scrapbook.length} /> },
            { label: 'Avg rating', node: <span>{avg ? avg.toFixed(1) : '–'}<span className="text-base text-white/40">/5</span></span> },
            { label: 'Would return', node: <AnimatedNumber value={again} suffix="%" /> },
            { label: 'Fave cuisine', node: <span className="text-xl">{fav ?? '–'}</span> },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...bouncy, delay: 0.1 + i * 0.05 }} className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/5">
              <div className="text-3xl font-bold tracking-tight">{s.node}</div>
              <div className="mt-1 text-xs font-medium text-mute">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* tonight's plan */}
      {picked && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={bouncy}>
          <Link to={`/place/${encodeURIComponent(picked.id)}`} className="relative block overflow-hidden rounded-[28px] p-6 ring-1 ring-brand/40">
            <PlaceArt cuisine={picked.cuisine} />
            <div className="relative">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Upcoming date</div>
              <div className="mt-1 text-2xl font-bold">{picked.name}</div>
              <div className="text-sm text-white/70">{picked.address}</div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* partner link */}
      <section>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Partner</h2>
        <AnimatePresence mode="wait">
          {partner ? (
            <motion.div key="linked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={snappy} className="flex flex-wrap items-center gap-4 rounded-[28px] bg-panel p-5 ring-1 ring-white/10">
              <Avatar src={partner.avatar} name={partner.name} size={56} />
              <div className="flex-1">
                <div className="font-semibold">Linked with {partner.name}</div>
                <div className="text-sm text-mute">{partner.code} · since {new Date(partner.linkedAt).toLocaleDateString()}</div>
                <div className="mt-1 text-xs text-white/40">Shared scrapbook & quiz results will sync once accounts are on the server.</div>
              </div>
              <Button variant="ghost" onClick={() => { if (confirm(`Unlink ${partner.name}?`)) setPartner(null) }}><Unlink size={15} /> Unlink</Button>
            </motion.div>
          ) : (
            <motion.div key="unlinked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={snappy} className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] bg-panel p-6 ring-1 ring-white/10">
                <SectionLabel>Your invite code</SectionLabel>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-3xl font-bold tracking-widest">{profile.code}</span>
                  <Pressable
                    onClick={async () => { try { await navigator.clipboard.writeText(profile.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }}
                    className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="Copy code"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={String(copied)} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={bouncy}>
                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </motion.span>
                    </AnimatePresence>
                  </Pressable>
                </div>
                <p className="mt-2 text-sm text-mute">Send this to your partner. You can link one account.</p>
              </div>
              <motion.div key={codeErr} animate={codeErr ? { x: [0, -10, 9, -5, 3, 0] } : {}} transition={{ duration: 0.4 }} className="rounded-[28px] bg-panel p-6 ring-1 ring-white/10">
                <SectionLabel>Link their account</SectionLabel>
                <div className="space-y-2">
                  <input value={pname} onChange={(e) => setPname(e.target.value)} placeholder="Their name" className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-brand" />
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DNP-XXXX" className="w-full rounded-xl bg-white/5 px-4 py-3 font-mono uppercase outline-none ring-1 ring-white/10 focus:ring-brand" />
                </div>
                <Button className="mt-3 w-full" onClick={link}><Link2 size={16} /> Link partner</Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* scrapbook */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Scrapbook</h2>
            <p className="text-sm text-mute">Every spot you've been, with photos and ratings.</p>
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add memory</Button>
        </div>
        {scrapbook.length ? (
          <ScrapbookGrid entries={scrapbook} />
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={bouncy}
            onClick={() => setAddOpen(true)}
            className="flex w-full flex-col items-center gap-2 rounded-[28px] border-2 border-dashed border-white/15 py-16 text-mute hover:border-brand/50 hover:text-white"
          >
            <span className="text-4xl">📸</span>
            <span className="font-semibold">Add your first date memory</span>
            <span className="text-sm">Snap a pic of you two, rate the night, and say if you'd go back.</span>
          </motion.button>
        )}
      </section>

      <AddMemorySheet open={addOpen} onClose={() => setAddOpen(false)} />
      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit profile">
        <ProfileForm initial={profile} submit="Save" onSave={(p) => { setProfile(p); setEditing(false); notify('Profile saved') }} />
      </Sheet>
    </div>
  )
}
