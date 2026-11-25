import clsx from 'clsx'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useTheme, type ThemePref } from '../theme'
import {
  IconBuilding,
  IconCalendar,
  IconHome,
  IconId,
  IconMenu,
  IconMonitor,
  IconMoon,
  IconSearch,
  IconShield,
  IconSun,
  IconTrophy,
  IconUser,
  IconX,
} from './icons'
import { SearchPalette } from './SearchPalette'
import { Spinner } from './ui'

const nav = [
  { to: '/', label: 'Áttekintés', icon: IconHome, end: true },
  { to: '/competitions', label: 'Versenyek', icon: IconTrophy },
  { to: '/matches', label: 'Mérkőzések', icon: IconCalendar },
  { to: '/teams', label: 'Csapatok', icon: IconShield },
  { to: '/players', label: 'Játékosok', icon: IconUser },
  { to: '/associations', label: 'Egyesületek', icon: IconBuilding },
]

const themeMeta: Record<ThemePref, { icon: typeof IconSun; label: string }> = {
  system: { icon: IconMonitor, label: 'Rendszer téma' },
  light: { icon: IconSun, label: 'Világos téma' },
  dark: { icon: IconMoon, label: 'Sötét téma' },
}

function ThemeToggle() {
  const { pref, cycle } = useTheme()
  const { icon: Icon, label } = themeMeta[pref]
  return (
    <button onClick={cycle} className="btn-ghost px-2.5" title={`${label} (váltás)`} aria-label={label}>
      <Icon className="size-[18px]" />
    </button>
  )
}

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isTyping(e))) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="hidden sm:inline">MRKSZ</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  clsx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700"
            >
              <IconSearch className="size-4" />
              <span className="hidden sm:inline">Keresés</span>
              <kbd className="hidden rounded border border-zinc-200 px-1 text-[10px] md:inline dark:border-zinc-700">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <button className="btn-ghost px-2.5 lg:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Menü">
              {menuOpen ? <IconX className="size-5" /> : <IconMenu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="animate-fade-in border-t border-zinc-200 px-4 py-3 lg:hidden dark:border-zinc-800">
            {[
              ...nav,
              { to: '/register', label: 'Regisztráció', icon: IconId },
              { to: '/licence-request', label: 'Versenyengedély igénylés', icon: IconId },
            ].map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-600 dark:text-zinc-400',
                  )
                }
              >
                <n.icon className="size-5" /> {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:pb-12">
        <Suspense
          fallback={
            <div className="flex justify-center py-24">
              <Spinner className="size-7" />
            </div>
          }
        >
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <footer className="hidden border-t border-zinc-200 py-8 text-sm muted lg:block dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <span>Magyar Repülő Korong Szövetség</span>
          <div className="flex gap-5">
            <Link to="/register" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Játékos regisztráció
            </Link>
            <Link to="/licence-request" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Versenyengedély igénylés
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:border-zinc-800/70 dark:bg-zinc-950/85">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {nav.slice(0, 5).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  isActive ? 'text-accent-600 dark:text-accent-400' : 'text-zinc-500 dark:text-zinc-400',
                )
              }
            >
              <n.icon className="size-[22px]" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ScrollRestoration />
    </div>
  )
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}
