import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { Toast } from './components/ui'
import { gentle } from './lib/motion'
import { useStore } from './lib/store'
import Home from './pages/Home'
import Place from './pages/Place'
import Profile from './pages/Profile'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Search from './pages/Search'

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.99 }}
      transition={gentle}
      className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6"
    >
      {children}
    </motion.main>
  )
}

export default function App() {
  const location = useLocation()
  const { toast } = useStore()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [location.pathname])

  return (
    <div className="min-h-screen">
      <Header />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/quiz" element={<Page><Quiz /></Page>} />
          <Route path="/results" element={<Page><Results /></Page>} />
          <Route path="/search" element={<Page><Search /></Page>} />
          <Route path="/place/:id" element={<Page><Place /></Page>} />
          <Route path="/profile" element={<Page><Profile /></Page>} />
          <Route path="*" element={<Page><Home /></Page>} />
        </Routes>
      </AnimatePresence>
      <footer className="pb-8 text-center text-[11px] text-white/30">
        Date Night Picker · CSCE 470 · ranked locally from the Yelp Open Dataset with BM25 + date-signal lexicon
      </footer>
      <Toast msg={toast} />
    </div>
  )
}
