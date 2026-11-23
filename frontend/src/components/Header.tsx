import { motion } from 'framer-motion'
import { ClipboardList, Search, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { bouncy } from '../lib/motion'
import { useStore } from '../lib/store'

function IconLink({ to, label, children }: { to: string; label: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} aria-label={label} title={label}>
      {({ isActive }) => (
        <motion.span
          whileTap={{ scale: 0.82 }}
          whileHover={{ scale: 1.1, rotate: -4 }}
          transition={bouncy}
          className={`relative grid size-10 place-items-center rounded-full text-brand sm:size-11 ${isActive ? 'bg-brand/15' : 'hover:bg-white/5'}`}
        >
          {children}
          {isActive && <motion.span layoutId="nav-dot" transition={bouncy} className="absolute -bottom-1 size-1.5 rounded-full bg-brand" />}
        </motion.span>
      )}
    </NavLink>
  )
}

export function Header() {
  const { profile, partner } = useStore()
  return (
    <header className="sticky top-0 z-[500] border-b border-white/5 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center sm:gap-1">
          <IconLink to="/quiz" label="Date questionnaire"><ClipboardList size={24} strokeWidth={2.2} /></IconLink>
          <IconLink to="/search" label="Search places"><Search size={23} strokeWidth={2.4} /></IconLink>
        </div>
        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
          <motion.span
            whileHover={{ scale: 1.05 }}
            transition={bouncy}
            className="block whitespace-nowrap font-script text-[24px] leading-none text-brand min-[420px]:text-[30px] sm:text-[38px]"
          >
            Date Night Picker
          </motion.span>
        </Link>
        <NavLink to="/profile" aria-label="Your profile" title="Your profile">
          {({ isActive }) => (
            <motion.span whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }} transition={bouncy} className="relative flex items-center">
              {partner && (
                <span className="-mr-3 hidden size-9 sm:grid place-items-center overflow-hidden rounded-full bg-panel3 text-xs font-bold ring-2 ring-black">
                  {partner.avatar ? <img src={partner.avatar} alt="" className="size-full object-cover" /> : partner.name[0]}
                </span>
              )}
              <span className={`relative grid size-11 place-items-center overflow-hidden rounded-full ring-2 ${isActive ? 'ring-brand' : 'ring-black'} bg-brand text-white`}>
                {profile?.avatar ? <img src={profile.avatar} alt="" className="size-full object-cover" /> : profile ? <span className="font-bold">{profile.name[0]}</span> : <UserRound size={24} fill="currentColor" />}
              </span>
            </motion.span>
          )}
        </NavLink>
      </div>
    </header>
  )
}
