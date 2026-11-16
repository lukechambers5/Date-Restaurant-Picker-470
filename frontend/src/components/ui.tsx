import { AnimatePresence, motion, useMotionValueEvent, useSpring } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { Check, Minus, Plus, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { bouncy, sheet, snappy, tick } from '../lib/motion'

/* ---------- Pressable: springy tap feedback ---------- */
export function Pressable({ className = '', children, ...rest }: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.02 }}
      transition={bouncy}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function Button({
  variant = 'primary', className = '', children, ...rest
}: HTMLMotionProps<'button'> & { variant?: 'primary' | 'ghost' | 'soft' }) {
  const styles = {
    primary: 'bg-brand text-white shadow-[0_8px_30px_-8px_rgba(255,59,48,.7)] hover:bg-brand-soft',
    soft: 'bg-white/10 text-white hover:bg-white/15',
    ghost: 'text-white/80 hover:text-white hover:bg-white/5',
  }[variant]
  return (
    <Pressable
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none ${styles} ${className}`}
      {...rest}
    >
      {children}
    </Pressable>
  )
}

/* ---------- Chip: toggle with bounce + check ---------- */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      layout
      onClick={() => { tick(); onClick() }}
      whileTap={{ scale: 0.9 }}
      animate={{ scale: on ? [1, 1.08, 1] : 1 }}
      transition={bouncy}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ${
        on ? 'bg-brand text-white ring-brand' : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10'
      }`}
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.span
            initial={{ width: 0, opacity: 0, scale: 0 }}
            animate={{ width: 'auto', opacity: 1, scale: 1 }}
            exit={{ width: 0, opacity: 0, scale: 0 }}
            transition={bouncy}
            className="inline-flex overflow-hidden"
          >
            <Check size={14} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  )
}

/* ---------- Segmented control with sliding pill ---------- */
export function Segmented<T extends string | number>({
  options, value, onChange, id,
}: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="inline-flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => { tick(); onChange(o.value) }}
          className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            value === o.value ? 'text-white' : 'text-white/55 hover:text-white/80'
          }`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} transition={bouncy} className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/15" />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------- Numbers that spring/overshoot to their value ---------- */
export function AnimatedNumber({ value, className = '', suffix = '' }: { value: number; className?: string; suffix?: string }) {
  const mv = useSpring(0, { stiffness: 110, damping: 13 })
  const [shown, setShown] = useState(0)
  useEffect(() => { mv.set(value) }, [mv, value])
  useMotionValueEvent(mv, 'change', (v) => setShown(Math.round(v)))
  return <span className={`tabular-nums ${className}`}>{shown}{suffix}</span>
}

/* ---------- Rolling digit (slides up/down on change) ---------- */
export function RollingValue({ value, className = '' }: { value: string | number; className?: string }) {
  const [prev, setPrev] = useState(value)
  const [dir, setDir] = useState(1)
  if (value !== prev) {
    setDir(Number(value) < Number(prev) ? -1 : 1)
    setPrev(value)
  }
  return (
    <span className={`relative inline-flex overflow-hidden tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={String(value)}
          custom={dir}
          variants={{
            enter: (d: number) => ({ y: d > 0 ? '70%' : '-70%', opacity: 0, scale: 0.7 }),
            center: { y: 0, opacity: 1, scale: 1 },
            exit: (d: number) => ({ y: d > 0 ? '-70%' : '70%', opacity: 0, scale: 0.7 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={bouncy}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  const [shake, setShake] = useState(0)
  const step = (d: number) => {
    const n = value + d
    if (n < min || n > max) { setShake((s) => s + 1); return }
    tick()
    onChange(n)
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">{label}</div>
      <motion.div
        key={shake}
        animate={shake ? { x: [0, -8, 7, -4, 2, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 rounded-2xl bg-panel2/60 px-3 py-3"
      >
        <Pressable type="button" onClick={() => step(-1)} className="grid size-10 place-items-center rounded-full bg-white/10"><Minus size={18} /></Pressable>
        <RollingValue value={value} className="min-w-10 justify-center text-3xl font-semibold" />
        <Pressable type="button" onClick={() => step(1)} className="grid size-10 place-items-center rounded-full bg-white/10"><Plus size={18} /></Pressable>
      </motion.div>
    </div>
  )
}

/* ---------- Stars ---------- */
export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <span key={i} className="relative" style={{ width: size, height: size }}>
            <Star size={size} className="absolute text-white/20" fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-brand" fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          type="button"
          key={n}
          whileTap={{ scale: 0.75 }}
          animate={n <= value ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : { scale: 1 }}
          transition={{ ...bouncy, delay: n <= value ? (n - 1) * 0.04 : 0 }}
          onClick={() => { tick(); onChange(n) }}
          aria-label={`${n} stars`}
        >
          <Star size={32} className={n <= value ? 'text-brand' : 'text-white/20'} fill="currentColor" strokeWidth={0} />
        </motion.button>
      ))}
    </div>
  )
}

/* ---------- Bottom sheet / modal: drag down to dismiss ---------- */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose() }}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={sheet}
            className="relative max-h-[92vh] w-full overflow-hidden rounded-t-[28px] bg-panel ring-1 ring-white/10 sm:max-w-lg sm:rounded-[28px]"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between px-6 pb-2 pt-3">
              <h2 className="text-lg font-semibold">{title}</h2>
              <Pressable onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/10"><X size={16} /></Pressable>
            </div>
            <div className="max-h-[calc(92vh-70px)] overflow-y-auto px-6 pb-8" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------- Toast ---------- */
export function Toast({ msg }: { msg: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[1100] flex justify-center px-4">
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg}
            initial={{ y: 40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={bouncy}
            className="glass rounded-full px-5 py-3 text-sm font-medium ring-1 ring-white/10"
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">{children}</div>
}

export const FadeIn = ({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ ...snappy, delay }}
    className={className}
  >
    {children}
  </motion.div>
)
