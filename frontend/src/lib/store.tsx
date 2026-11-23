import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getMeta } from './api'
import { FALLBACK_CENTER } from './data'
import type { Meta, Partner, Place, Prefs, Profile, RestaurantRef, ScrapEntry } from './types'

interface State {
  prefs: Prefs | null
  profile: Profile | null
  partner: Partner | null
  scrapbook: ScrapEntry[]
  picked: RestaurantRef | null
}

const KEY = 'dnp:v2'
const empty: State = { prefs: null, profile: null, partner: null, scrapbook: [], picked: null }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : empty
  } catch {
    return empty
  }
}

interface Store extends State {
  setPrefs: (p: Prefs) => void
  setProfile: (p: Profile | null) => void
  setPartner: (p: Partner | null) => void
  addEntry: (e: ScrapEntry) => void
  removeEntry: (id: string) => void
  setPicked: (r: RestaurantRef | null) => void
  toast: string | null
  notify: (msg: string) => void
  /** dataset info from the backend; null while loading, 'error' if the server is down */
  meta: Meta | null | 'error'
  /** quick-pick locations: the city centres present in the dataset */
  presets: Place[]
  defaultStart: Place
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const [toast, setToast] = useState<string | null>(null)
  const [meta, setMeta] = useState<Meta | null | 'error'>(null)
  const timer = useRef<number | undefined>(undefined)

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => {
    getMeta().then(setMeta).catch(() => setMeta('error'))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      notify('Storage is full — try removing a few scrapbook photos')
    }
  }, [state, notify])

  const presets = useMemo<Place[]>(
    () => (meta && meta !== 'error' ? meta.cities.slice(0, 6).map((c) => ({ label: `${c.name} (center)`, lat: c.lat, lng: c.lng })) : [FALLBACK_CENTER]),
    [meta],
  )

  const value = useMemo<Store>(
    () => ({
      ...state,
      toast,
      notify,
      meta,
      presets,
      defaultStart: presets[0],
      setPrefs: (prefs) => setState((s) => ({ ...s, prefs })),
      setProfile: (profile) => setState((s) => ({ ...s, profile })),
      setPartner: (partner) => setState((s) => ({ ...s, partner })),
      addEntry: (e) => setState((s) => ({ ...s, scrapbook: [e, ...s.scrapbook] })),
      removeEntry: (id) => setState((s) => ({ ...s, scrapbook: s.scrapbook.filter((x) => x.id !== id) })),
      setPicked: (picked) => setState((s) => ({ ...s, picked })),
    }),
    [state, toast, notify, meta, presets],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}
