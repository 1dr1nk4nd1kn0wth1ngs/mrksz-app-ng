import clsx from 'clsx'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Match } from '../api/types'
import { useNow } from '../api/live'
import { dayKey, fmtShort, fmtTime, relativeDay } from '../lib/format'
import { liveMinute, matchStatus, matchTime, sideOf } from '../lib/match'
import { Avatar, Badge, LiveDot } from './ui'

export function StatusBadge({ m }: { m: Match }) {
  const status = matchStatus(m)
  const now = useNow(30_000, status === 'live')
  if (status === 'live')
    return (
      <Badge tone="live">
        <LiveDot /> Élő {liveMinute(m, now)}'
      </Badge>
    )
  if (status === 'finished') return <Badge>Vége</Badge>
  return null
}

function TeamCell({
  name,
  picture,
  align,
  bold,
  dim,
}: {
  name: string
  picture?: string
  align: 'left' | 'right'
  bold?: boolean
  dim?: boolean
}) {
  return (
    <div
      className={clsx(
        'flex min-w-0 flex-1 items-center gap-2.5',
        align === 'right' && 'flex-row-reverse text-right',
        dim && 'text-zinc-500 dark:text-zinc-400',
      )}
    >
      <Avatar src={picture} name={name} size={32} />
      <span className={clsx('truncate text-sm', bold ? 'font-semibold' : 'font-medium')}>{name || 'TBD'}</span>
    </div>
  )
}

/** One match as a clickable row: home team · score/time · away team. */
export function MatchRow({
  m,
  highlight,
  showCompetition = true,
  showDate = false,
  trailing,
}: {
  m: Match
  highlight?: string
  showCompetition?: boolean
  showDate?: boolean
  trailing?: ReactNode
}) {
  const status = matchStatus(m)
  const homeWon = status === 'finished' && m.homeScore > m.awayScore
  const awayWon = status === 'finished' && m.awayScore > m.homeScore
  const hl = highlight ? sideOf(m, highlight) : null
  return (
    <Link
      to={`/match/${m.id}`}
      className="group flex flex-col gap-1.5 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
    >
      {(showCompetition || showDate || status === 'live') && (
        <div className="flex items-center gap-2 text-xs muted">
          {showDate && <span className="tabular">{fmtShort(m.date)}</span>}
          {showCompetition && m.competition?.name && <span className="truncate">{m.competition.name}</span>}
          {m.round ? <span>· {m.round}. forduló</span> : null}
          <span className="ml-auto">
            <StatusBadge m={m} />
          </span>
        </div>
      )}
      {/* Phones: one team per line, score on the right, so names are not cut short. */}
      <div className="flex items-center gap-3 sm:hidden">
        <div className="min-w-0 flex-1 space-y-1.5">
          {(['home', 'away'] as const).map((side) => {
            const name = side === 'home' ? m.homeTeam : m.awayTeam
            const won = side === 'home' ? homeWon : awayWon
            const lost = side === 'home' ? awayWon : homeWon
            return (
              <div key={side} className="flex items-center gap-2.5">
                <Avatar src={side === 'home' ? m.homePicture : m.awayPicture} name={name} size={24} />
                <span
                  className={clsx(
                    'min-w-0 flex-1 truncate text-sm',
                    won || hl === side ? 'font-semibold' : 'font-medium',
                    lost && hl !== side && 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  {name || 'TBD'}
                </span>
                {status !== 'scheduled' && (
                  <span
                    className={clsx(
                      'text-base font-semibold tabular',
                      status === 'live' && 'text-red-600 dark:text-red-400',
                      lost && 'text-zinc-400 dark:text-zinc-500',
                    )}
                  >
                    {side === 'home' ? m.homeScore : m.awayScore}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {status === 'scheduled' && (
          <span className="rounded-lg bg-zinc-100 px-2 py-1 text-sm font-medium tabular dark:bg-zinc-800">
            {fmtTime(m.date) || '–'}
          </span>
        )}
        {trailing}
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <TeamCell
          name={m.homeTeam}
          picture={m.homePicture}
          align="left"
          bold={homeWon || hl === 'home'}
          dim={awayWon && hl !== 'home'}
        />
        <div className="w-20 shrink-0 text-center">
          {status === 'scheduled' ? (
            <span className="rounded-lg bg-zinc-100 px-2 py-1 text-sm font-medium tabular dark:bg-zinc-800">
              {fmtTime(m.date) || '–'}
            </span>
          ) : (
            <span
              className={clsx('text-lg font-semibold tabular', status === 'live' && 'text-red-600 dark:text-red-400')}
            >
              {m.homeScore}
              <span className="mx-1 text-zinc-300 dark:text-zinc-600">:</span>
              {m.awayScore}
            </span>
          )}
        </div>
        <TeamCell
          name={m.awayTeam}
          picture={m.awayPicture}
          align="right"
          bold={awayWon || hl === 'away'}
          dim={homeWon && hl !== 'away'}
        />
        {trailing}
      </div>
    </Link>
  )
}

/** Matches grouped by calendar day, newest or oldest first. */
export function MatchList({
  matches,
  order = 'asc',
  highlight,
  showCompetition = true,
  groupByDay = true,
  renderTrailing,
}: {
  matches: Match[]
  order?: 'asc' | 'desc'
  highlight?: string
  showCompetition?: boolean
  groupByDay?: boolean
  renderTrailing?: (m: Match) => ReactNode
}) {
  const groups = useMemo(() => {
    const sorted = [...matches].sort((a, b) => (order === 'asc' ? 1 : -1) * (matchTime(a) - matchTime(b)))
    if (!groupByDay) return [{ key: 'all', label: '', items: sorted }]
    const map = new Map<string, Match[]>()
    for (const m of sorted) {
      const k = dayKey(m.date)
      map.set(k, [...(map.get(k) ?? []), m])
    }
    return [...map.entries()].map(([key, items]) => ({ key, label: relativeDay(items[0]!.date), items }))
  }, [matches, order, groupByDay])

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key}>
          {g.label && (
            <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase first-letter:uppercase dark:text-zinc-400">
              {g.label}
            </h3>
          )}
          <div className="card divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800">
            {g.items.map((m) => (
              <MatchRow
                key={m.id}
                m={m}
                highlight={highlight}
                showCompetition={showCompetition}
                showDate={!groupByDay}
                trailing={renderTrailing?.(m)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Compact card for horizontal strips (home page). */
export function MatchCard({ m }: { m: Match }) {
  const status = matchStatus(m)
  return (
    <Link to={`/match/${m.id}`} className="card card-hover flex w-64 shrink-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2 text-xs muted">
        <span className="truncate">{m.competition?.name ?? ''}</span>
        {status === 'scheduled' ? (
          <span className="tabular">
            {relativeDay(m.date)} {fmtTime(m.date)}
          </span>
        ) : (
          <StatusBadge m={m} />
        )}
      </div>
      {(['home', 'away'] as const).map((side) => {
        const name = side === 'home' ? m.homeTeam : m.awayTeam
        const score = side === 'home' ? m.homeScore : m.awayScore
        const other = side === 'home' ? m.awayScore : m.homeScore
        return (
          <div key={side} className="flex items-center gap-2.5">
            <Avatar src={side === 'home' ? m.homePicture : m.awayPicture} name={name} size={28} />
            <span
              className={clsx(
                'flex-1 truncate text-sm',
                status === 'finished' && score > other ? 'font-semibold' : 'font-medium',
              )}
            >
              {name}
            </span>
            {status !== 'scheduled' && <span className="text-base font-semibold tabular">{score}</span>}
          </div>
        )
      })}
    </Link>
  )
}
