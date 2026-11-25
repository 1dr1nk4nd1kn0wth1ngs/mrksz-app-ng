import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAssociations, useCompetitions, usePlayers, useSeasonMatches } from '../api/hooks'
import { teamsFromMatches } from '../lib/aggregate'
import { playerName } from '../lib/format'
import { normalizeName } from '../lib/match'
import { currentSeason } from '../lib/season'
import { IconBuilding, IconSearch, IconShield, IconTrophy, IconUser } from './icons'
import { Avatar, Spinner } from './ui'

interface Result {
  key: string
  kind: 'Játékos' | 'Csapat' | 'Verseny' | 'Egyesület'
  label: string
  sub?: string
  href: string
  picture?: string
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Only mount (and fetch) while open.
  return open ? <Palette onClose={onClose} /> : null
}

function Palette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const debounced = useDebounced(query, 250)
  const season = currentSeason()

  const players = usePlayers(1, debounced, !!debounced.trim())
  const matches = useSeasonMatches(season)
  const comps = useCompetitions(season)
  const assocs = useAssociations()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo<Result[]>(() => {
    const q = normalizeName(query)
    if (!q) return []
    const out: Result[] = []
    for (const c of comps.data ?? [])
      if (normalizeName(c.name).includes(q))
        out.push({
          key: `c${c.id}`,
          kind: 'Verseny',
          label: c.name,
          sub: String(c.season),
          href: `/competitions/${c.id}`,
        })
    for (const t of teamsFromMatches(matches.data ?? []))
      if (normalizeName(t.name).includes(q))
        out.push({
          key: `t${t.name}`,
          kind: 'Csapat',
          label: t.name,
          sub: t.competitions.join(', '),
          href: `/teams/${encodeURIComponent(t.name)}`,
          picture: t.picture,
        })
    for (const a of assocs.data ?? [])
      if (normalizeName(a.name).includes(q))
        out.push({
          key: `a${a.id}`,
          kind: 'Egyesület',
          label: a.name,
          href: `/associations/${a.id}`,
          picture: a.imageURL,
        })
    if (debounced.trim())
      for (const p of (players.data?.players ?? []).slice(0, 8))
        out.push({
          key: `p${p.id}`,
          kind: 'Játékos',
          label: playerName(p),
          sub: p.association?.name,
          href: `/players/${p.id}`,
          picture: p.imageURL,
        })
    return out.slice(0, 20)
  }, [query, debounced, comps.data, matches.data, assocs.data, players.data])

  useEffect(() => setActive(0), [results.length])

  const go = (r: Result) => {
    onClose()
    navigate(r.href)
  }
  const icon = (k: Result['kind']) =>
    k === 'Játékos' ? (
      <IconUser className="size-4" />
    ) : k === 'Csapat' ? (
      <IconShield className="size-4" />
    ) : k === 'Verseny' ? (
      <IconTrophy className="size-4" />
    ) : (
      <IconBuilding className="size-4" />
    )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-fade-in overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 dark:border-zinc-800">
          <IconSearch className="size-5 text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && results[active]) go(results[active])
            }}
            placeholder="Játékos, csapat, verseny, egyesület…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400"
          />
          {players.isFetching && debounced && <Spinner className="size-4" />}
          <kbd className="hidden rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] muted sm:block dark:border-zinc-700">
            Esc
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {query && results.length === 0 && !players.isFetching && (
            <li className="px-3 py-8 text-center text-sm muted">Nincs találat erre: „{query}”</li>
          )}
          {!query && <li className="px-3 py-6 text-center text-sm muted">Kezdj el gépelni a kereséshez.</li>}
          {results.map((r, i) => (
            <li key={r.key}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                  i === active && 'bg-zinc-100 dark:bg-zinc-800',
                )}
              >
                {r.picture !== undefined || r.kind === 'Játékos' || r.kind === 'Csapat' ? (
                  <Avatar src={r.picture} name={r.label} size={30} />
                ) : (
                  <span className="flex size-[30px] items-center justify-center rounded-full bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
                    {icon(r.kind)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.label}</span>
                  {r.sub && <span className="block truncate text-xs muted">{r.sub}</span>}
                </span>
                <span className="flex items-center gap-1 text-xs muted">
                  {icon(r.kind)} {r.kind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
