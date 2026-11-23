import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { tick } from '../lib/motion'

/**
 * iOS-style wheel picker: drag/flick with momentum, rubber-band past the ends,
 * snaps to the nearest item with a spring, 3D cylinder tilt, haptic tick on each item.
 * Also supports mouse wheel, arrow keys and tapping an item.
 */
interface Props<T extends string | number> {
  items: T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
  label?: string
  itemHeight?: number
  visible?: number
  className?: string
}

const SNAP = { type: 'spring' as const, stiffness: 420, damping: 30, mass: 0.9 }

export function WheelPicker<T extends string | number>({
  items, value, onChange, format = String, label, itemHeight: H = 44, visible = 5, className = '',
}: Props<T>) {
  const n = items.length
  const idx = Math.max(0, items.indexOf(value))
  const y = useMotionValue(-idx * H)
  const last = useRef(idx)
  const dragging = useRef(false)
  const [active, setActive] = useState(idx)
  const boxRef = useRef<HTMLDivElement>(null)
  const clampI = (i: number) => Math.max(0, Math.min(n - 1, i))
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const snapTo = (i: number, velocity = 0) => {
    animate(y, -clampI(i) * H, { ...SNAP, velocity })
  }

  // external value change → animate wheel there
  useEffect(() => {
    if (!dragging.current && idx !== last.current) {
      last.current = idx
      setActive(idx)
      snapTo(idx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  useMotionValueEvent(y, 'change', (v) => {
    const i = clampI(Math.round(-v / H))
    if (i !== last.current) {
      last.current = i
      setActive(i)
      tick()
      onChangeRef.current(items[i])
    }
  })

  // non-passive wheel listener so the page doesn't scroll while spinning
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    let acc = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      acc += e.deltaY
      if (Math.abs(acc) >= 28) {
        const steps = Math.trunc(acc / 28)
        acc -= steps * 28
        snapTo(last.current + Math.sign(steps) * Math.min(3, Math.abs(steps)))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, H])

  const pad = ((visible - 1) / 2) * H

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">{label}</div>}
      <div
        ref={boxRef}
        tabIndex={0}
        role="spinbutton"
        aria-label={label}
        aria-valuetext={format(items[active])}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); snapTo(last.current - 1) }
          if (e.key === 'ArrowDown') { e.preventDefault(); snapTo(last.current + 1) }
        }}
        className="relative w-full select-none overflow-hidden rounded-2xl bg-panel2/60 outline-none ring-brand/50 focus-visible:ring-2 touch-none"
        style={{ height: H * visible, perspective: 700 }}
      >
        {/* selection band – pops a little on every tick */}
        <motion.div
          key={active}
          initial={{ scale: 1.07 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 700, damping: 15 }}
          className="pointer-events-none absolute inset-x-2 rounded-xl bg-white/[0.09] ring-1 ring-white/10"
          style={{ top: pad, height: H }}
        />
        <div className="wheel-mask absolute inset-0">
          <motion.div
            drag="y"
            style={{ y, top: pad }}
            className="absolute inset-x-0 cursor-grab active:cursor-grabbing"
            dragConstraints={{ top: -(n - 1) * H, bottom: 0 }}
            dragElastic={0.22}
            dragTransition={{
              power: 0.3,
              timeConstant: 220,
              modifyTarget: (t) => Math.max(-(n - 1) * H, Math.min(0, Math.round(t / H) * H)),
              bounceStiffness: 520,
              bounceDamping: 22,
            }}
            onDragStart={() => (dragging.current = true)}
            onDragTransitionEnd={() => (dragging.current = false)}
          >
            {items.map((it, i) => (
              <WheelItem key={String(it)} i={i} y={y} H={H} active={i === active} onTap={() => snapTo(i)}>
                {format(it)}
              </WheelItem>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function WheelItem({
  i, y, H, active, onTap, children,
}: { i: number; y: MotionValue<number>; H: number; active: boolean; onTap: () => void; children: React.ReactNode }) {
  const d = useTransform(y, (v) => (v + i * H) / H) // 0 = centered
  const rotateX = useTransform(d, [-3, 0, 3], [62, 0, -62])
  const opacity = useTransform(d, [-3, -1.5, 0, 1.5, 3], [0.05, 0.4, 1, 0.4, 0.05])
  const scale = useTransform(d, [-2, 0, 2], [0.86, 1.06, 0.86])
  return (
    <motion.div
      onTap={onTap}
      style={{ height: H, rotateX, opacity, scale }}
      className={`flex items-center justify-center text-[22px] tabular-nums tracking-tight transition-colors ${
        active ? 'font-semibold text-white' : 'font-medium text-white/70'
      }`}
    >
      {children}
    </motion.div>
  )
}
