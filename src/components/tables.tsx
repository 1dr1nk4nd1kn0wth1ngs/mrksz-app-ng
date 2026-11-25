import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { PlayerStat, StandingRow } from '../api/types'
import { normalizeName, type Outcome } from '../lib/match'
import { Avatar, FormPill, TeamLink } from './ui'

export function StandingsTable({
  rows,
  form,
  season,
  compact,
  qualified,
  highlight,
}: {
  rows: StandingRow[]
  form?: Map<string, Outcome[]>
  season?: number
  compact?: boolean
  /** Normalized names of teams that advanced (e.g. appear in the playoff bracket). */
  qualified?: Set<string>
  highlight?: string
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/60">
            <tr>
              <th className="th w-10 text-center">#</th>
              <th className="th text-left">Csapat</th>
              <th className="th text-center" title="Mérkőzés">
                M
              </th>
              <th className="th text-center" title="Győzelem">
                Gy
              </th>
              <th className="th text-center" title="Vereség">
                V
              </th>
              {!compact && (
                <>
                  <th className="th hidden text-center sm:table-cell" title="Szerzett pont">
                    SzP
                  </th>
                  <th className="th hidden text-center sm:table-cell" title="Kapott pont">
                    KP
                  </th>
                </>
              )}
              <th className="th text-center" title="Pontkülönbség">
                +/-
              </th>
              {form && !compact && <th className="th hidden text-left md:table-cell">Forma</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r, i) => {
              const diff = (r.pointsFor ?? 0) - (r.pointsAgainst ?? 0)
              const f = form?.get(normalizeName(r.name)) ?? []
              const isHl = highlight && normalizeName(highlight) === normalizeName(r.name)
              return (
                <tr
                  key={r.name}
                  className={clsx(
                    'transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
                    isHl && 'bg-accent-50/60 dark:bg-accent-500/10',
                  )}
                >
                  <td className="td text-center">
                    <span
                      className={clsx(
                        'inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold tabular',
                        qualified?.has(normalizeName(r.name))
                          ? 'bg-accent-600 text-white'
                          : 'text-zinc-500 dark:text-zinc-400',
                      )}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="td w-full max-w-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar src={r.picture} name={r.name} size={26} />
                      <TeamLink name={r.name} season={season} className="min-w-0 truncate font-medium" />
                    </div>
                  </td>
                  <td className="td text-center tabular muted">{r.played}</td>
                  <td className="td text-center font-semibold tabular">{r.win}</td>
                  <td className="td text-center tabular">{r.loss}</td>
                  {!compact && (
                    <>
                      <td className="td hidden text-center tabular muted sm:table-cell">{r.pointsFor ?? '–'}</td>
                      <td className="td hidden text-center tabular muted sm:table-cell">{r.pointsAgainst ?? '–'}</td>
                    </>
                  )}
                  <td
                    className={clsx(
                      'td text-center tabular',
                      diff > 0 && 'text-emerald-600 dark:text-emerald-400',
                      diff < 0 && 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  {form && !compact && (
                    <td className="td hidden md:table-cell">
                      <div className="flex gap-1">
                        {f.map((o, k) => (
                          <FormPill key={k} o={o} />
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type SortKey = 'points' | 'assists' | 'total' | 'played' | 'name'

export function PlayerStatsTable({
  stats,
  linkFor,
  limit,
  searchable = true,
}: {
  stats: PlayerStat[]
  linkFor?: (s: PlayerStat) => string | undefined
  limit?: number
  searchable?: boolean
}) {
  const [sort, setSort] = useState<SortKey>('total')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(() => {
    const q = normalizeName(query)
    const val = (s: PlayerStat) =>
      sort === 'points'
        ? s.points
        : sort === 'assists'
          ? s.assists
          : sort === 'played'
            ? s.played
            : s.points + s.assists
    const sorted = [...stats].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'hu')
        : val(b) - val(a) || b.points + b.assists - (a.points + a.assists) || a.name.localeCompare(b.name, 'hu'),
    )
    // Rank ties share a place.
    let lastVal: number | null = null
    let lastRank = 0
    const ranked = sorted.map((s, i) => {
      const v = sort === 'name' ? i : val(s)
      if (v !== lastVal) {
        lastRank = i + 1
        lastVal = v
      }
      return { s, rank: lastRank }
    })
    return q ? ranked.filter((r) => normalizeName(r.s.name).includes(q)) : ranked
  }, [stats, sort, query])

  const visible = limit && !expanded && !query ? rows.slice(0, limit) : rows
  const head = (key: SortKey, label: string, title: string, cls = '') => (
    <th className={clsx('th text-center', cls)} title={title}>
      <button
        onClick={() => setSort(key)}
        className={clsx(
          'uppercase transition hover:text-zinc-900 dark:hover:text-zinc-100',
          sort === key && 'text-accent-600 dark:text-accent-400',
        )}
      >
        {label}
      </button>
    </th>
  )

  return (
    <div className="card overflow-hidden">
      {searchable && stats.length > 10 && (
        <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
          <input
            className="input py-2"
            placeholder="Játékos keresése…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/60">
            <tr>
              <th className="th w-10 text-center">#</th>
              <th className="th text-left">
                <button
                  onClick={() => setSort('name')}
                  className={clsx('uppercase', sort === 'name' && 'text-accent-600 dark:text-accent-400')}
                >
                  Név
                </button>
              </th>
              {head('played', 'M', 'Mérkőzés')}
              {head('points', 'P', 'Pont (gól)')}
              {head('assists', 'A', 'Assziszt')}
              {head('total', 'P+A', 'Kanadai pontok')}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map(({ s, rank }, i) => {
              const href = linkFor?.(s)
              return (
                <tr key={`${s.playerId ?? s.id ?? s.name}-${i}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="td text-center text-xs tabular muted">{rank}</td>
                  <td className="td w-full max-w-0 truncate font-medium">
                    {href ? (
                      <Link to={href} className="hover:text-accent-600 hover:underline dark:hover:text-accent-400">
                        {s.name}
                      </Link>
                    ) : (
                      s.name
                    )}
                  </td>
                  <td className="td text-center tabular muted">{s.played}</td>
                  <td className={clsx('td text-center tabular', sort === 'points' && 'font-semibold')}>{s.points}</td>
                  <td className={clsx('td text-center tabular', sort === 'assists' && 'font-semibold')}>{s.assists}</td>
                  <td className={clsx('td text-center tabular', sort === 'total' && 'font-semibold')}>
                    {s.points + s.assists}
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="td py-8 text-center muted">
                  Nincs találat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {limit && !query && rows.length > limit && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="w-full border-t border-zinc-100 py-2.5 text-sm font-medium text-accent-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-accent-400 dark:hover:bg-zinc-800/40"
        >
          {expanded ? 'Kevesebb' : `Mind a ${rows.length} játékos`}
        </button>
      )}
    </div>
  )
}

/** Links a stat row to the player page when an id is known, otherwise to a name search. */
export function playerStatLink(s: PlayerStat): string {
  const id = s.playerId ?? s.id
  return id ? `/players/${id}` : `/players?q=${encodeURIComponent(s.name)}`
}
