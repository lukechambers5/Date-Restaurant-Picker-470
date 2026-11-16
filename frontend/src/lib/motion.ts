import type { Transition } from 'framer-motion'

/** Apple-ish spring presets */
export const snappy: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.8 }
export const bouncy: Transition = { type: 'spring', stiffness: 480, damping: 16, mass: 0.7 }
export const gentle: Transition = { type: 'spring', stiffness: 260, damping: 28 }
export const sheet: Transition = { type: 'spring', stiffness: 380, damping: 36 }

export const tick = () => {
  try {
    navigator.vibrate?.(4)
  } catch {
    /* unsupported */
  }
}
