import { artFor } from '../lib/data'

/**
 * Generated backdrop for a restaurant — a gradient tinted by cuisine with its emoji as texture.
 * No photos are loaded: all data is local, nothing is fetched from a live service.
 */
export function PlaceArt({ cuisine, grey = true, className = '' }: { cuisine: string; grey?: boolean; className?: string }) {
  const { hue: h, emoji } = artFor(cuisine)
  return (
    <div
      className={`grain absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: `
          radial-gradient(120% 90% at 85% 10%, hsl(${h} 80% 45% / .55), transparent 60%),
          radial-gradient(90% 80% at 10% 100%, hsl(${(h + 40) % 360} 70% 35% / .45), transparent 60%),
          radial-gradient(60% 60% at 50% 40%, hsl(${(h + 330) % 360} 60% 25% / .5), transparent 70%),
          linear-gradient(160deg, #1a1a1d, #0b0b0c)`,
        filter: grey ? 'saturate(.55)' : undefined,
      }}
    >
      <div aria-hidden className="absolute -right-6 -top-10 rotate-12 select-none text-[220px] leading-none opacity-[0.13] blur-[1px]">
        {emoji}
      </div>
      <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 22px)' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    </div>
  )
}
