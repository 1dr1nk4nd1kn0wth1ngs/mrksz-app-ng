import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMatch } from '../api/hooks'
import { useLiveMatch, useNow } from '../api/live'
import type { LineupEntry, Match } from '../api/types'
import { IconClock, IconDisc, IconFlag, IconMapPin, IconPause, IconTrophy } from '../components/icons'
import { ScoreFlow } from '../components/ScoreFlow'
import { Avatar, Badge, EmptyState, ErrorState, LiveDot, Skeleton, Tabs, TeamLink } from '../components/ui'
import { fmtDateTime, isToday } from '../lib/format'
import { buildTimeline, liveMinute, matchDuration, matchStatus, sameName, type TimelineEvent } from '../lib/match'

type Tab = 'timeline' | 'lineups' | 'flow'

export default function MatchPage() {
  const id = Number(useParams().id)
  const q = useMatch(id)
  const m = q.data
  const status = m ? matchStatus(m) : 'scheduled'
  // Connect for live games, and for today's games that may start while the page is open.
  const live = useLiveMatch(id, !!m && (status === 'live' || (status === 'scheduled' && isToday(m.date))))
  const now = useNow(15_000, status === 'live')
  const [tab, setTab] = useState<Tab>('timeline')
  const timeline = useMemo(() => (m ? buildTimeline(m) : []), [m])

  if (q.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-96" />
      </div>
    )
  if (q.isError || !m) return <ErrorState error={q.error} onRetry={() => q.refetch()} />

  const season = m.season || new Date(m.date).getFullYear()
  const minute = status === 'live' ? liveMinute(m, now) : null
  const duration = matchDuration(m)
  const hasLineups = (m.homeLineUp?.length ?? 0) + (m.awayLineUp?.length ?? 0) > 0
  const homeWon = status === 'finished' && m.homeScore > m.awayScore
  const awayWon = status === 'finished' && m.awayScore > m.homeScore

  return (
    <div>
      <div className="card relative mb-6 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-home/10 via-transparent to-away/10 dark:from-home/15 dark:to-away/15"
        />
        <div className="relative p-5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm muted">
            {m.competition?.name && (
              <Link
                to={m.competition.id ? `/competitions/${m.competition.id}` : '/competitions'}
                className="flex items-center gap-1.5 font-medium hover:text-accent-600 dark:hover:text-accent-400"
              >
                <IconTrophy className="size-4" /> {m.competition.name}
                {m.round ? ` · ${m.round}. forduló` : ''}
              </Link>
            )}
            <span className="flex items-center gap-1.5">
              <IconClock className="size-4" /> {fmtDateTime(m.date)}
            </span>
            {m.venue && (
              <span className="flex items-center gap-1.5">
                <IconMapPin className="size-4" /> {m.venue}
              </span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <TeamSide name={m.homeTeam} picture={m.homePicture} season={season} won={homeWon} />
            <div className="text-center">
              {status === 'scheduled' ? (
                <div className="text-2xl font-semibold text-zinc-400 sm:text-4xl">vs</div>
              ) : (
                <div className="flex items-center gap-2 text-4xl font-bold tabular sm:gap-4 sm:text-6xl">
                  <span className={clsx(awayWon && 'text-zinc-400 dark:text-zinc-500')}>{m.homeScore}</span>
                  <span className="text-zinc-300 dark:text-zinc-700">:</span>
                  <span className={clsx(homeWon && 'text-zinc-400 dark:text-zinc-500')}>{m.awayScore}</span>
                </div>
              )}
              <div className="mt-3 flex justify-center">
                {status === 'live' ? (
                  <Badge tone="live" className="text-sm">
                    <LiveDot /> Élő · {minute}'
                  </Badge>
                ) : status === 'finished' ? (
                  <Badge className="text-sm">Vége{duration ? ` · ${duration} perc` : ''}</Badge>
                ) : (
                  <Badge tone="accent" className="text-sm">
                    Kezdés: {fmtDateTime(m.date)}
                  </Badge>
                )}
              </div>
              {live === 'connected' && (
                <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">● Valós idejű frissítés</div>
              )}
            </div>
            <TeamSide name={m.awayTeam} picture={m.awayPicture} season={season} won={awayWon} />
          </div>
        </div>
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'timeline', label: 'Idővonal' },
          { value: 'lineups', label: 'Keretek' },
          ...(timeline.filter((e) => e.kind === 'goal').length >= 2
            ? [{ value: 'flow' as const, label: 'Pontok alakulása' }]
            : []),
        ]}
      />

      {tab === 'timeline' &&
        (timeline.length ? (
          <Timeline events={timeline} m={m} finishedAt={status === 'finished' ? duration : null} />
        ) : (
          <EmptyState
            title={status === 'scheduled' ? 'A mérkőzés még nem kezdődött el.' : 'Nincs rögzített esemény.'}
          />
        ))}

      {tab === 'lineups' &&
        (hasLineups ? (
          <div className="grid gap-4 md:grid-cols-2">
            <LineupTable title={m.homeTeam} entries={m.homeLineUp ?? []} side="home" />
            <LineupTable title={m.awayTeam} entries={m.awayLineUp ?? []} side="away" />
          </div>
        ) : (
          <EmptyState title="A keretek még nincsenek leadva." />
        ))}

      {tab === 'flow' && (
        <ScoreFlow events={timeline} homeTeam={m.homeTeam} awayTeam={m.awayTeam} duration={duration} />
      )}
    </div>
  )
}

function TeamSide({ name, picture, season, won }: { name: string; picture?: string; season: number; won: boolean }) {
  return (
    <TeamLink
      name={name}
      season={season}
      className="flex min-w-0 flex-col items-center gap-3 text-center hover:no-underline"
    >
      <Avatar src={picture} name={name} size={72} rounded="xl" className="size-14! sm:size-[72px]!" />
      <span className={clsx('line-clamp-2 text-sm sm:text-lg', won ? 'font-bold' : 'font-semibold')}>{name}</span>
    </TeamLink>
  )
}

function Timeline({ events, m, finishedAt }: { events: TimelineEvent[]; m: Match; finishedAt: number | null }) {
  const playerHref = (name?: string) => {
    if (!name) return undefined
    const entry = [...(m.homeLineUp ?? []), ...(m.awayLineUp ?? [])].find((e) => sameName(e.name, name))
    return entry?.playerId ? `/players/${entry.playerId}` : undefined
  }
  const nameEl = (name?: string) => {
    const href = playerHref(name)
    return href ? (
      <Link to={href} className="hover:text-accent-600 hover:underline dark:hover:text-accent-400">
        {name}
      </Link>
    ) : (
      name
    )
  }
  return (
    <div className="card p-3 sm:p-5">
      {/* Phones: single column, side shown by colour. */}
      <ol className="divide-y divide-zinc-100 sm:hidden dark:divide-zinc-800">
        {events.map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-2">
            <span className="w-9 shrink-0 text-right text-xs font-semibold tabular muted">{e.minute}'</span>
            <span
              className={clsx(
                'h-8 w-1 shrink-0 rounded-full',
                e.kind === 'timeout' ? 'bg-amber-400' : e.side === 'home' ? 'bg-home' : 'bg-away',
              )}
            />
            <div className="min-w-0 flex-1">
              {e.kind === 'timeout' ? (
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Időkérés · {e.side === 'home' ? m.homeTeam : m.awayTeam}
                </span>
              ) : (
                <>
                  <div className="truncate text-sm font-semibold">{nameEl(e.scorer) ?? 'Ismeretlen'}</div>
                  <div className="truncate text-xs muted">
                    {e.callahan ? 'Callahan' : e.assist ? <>assz.: {nameEl(e.assist)}</> : null}
                  </div>
                </>
              )}
            </div>
            {e.kind === 'goal' && (
              <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold tabular dark:bg-zinc-800">
                <span className={clsx(e.side === 'home' && 'text-home')}>{e.home}</span>–
                <span className={clsx(e.side === 'away' && 'text-away')}>{e.away}</span>
              </span>
            )}
          </li>
        ))}
        {finishedAt && <li className="py-2 text-center text-xs font-medium muted">Vége · {finishedAt}'</li>}
      </ol>
      <div className="mb-3 hidden grid-cols-2 gap-4 px-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase sm:grid dark:text-zinc-400">
        <span className="truncate">{m.homeTeam}</span>
        <span className="truncate text-right">{m.awayTeam}</span>
      </div>
      <ol className="relative hidden sm:block">
        <span
          aria-hidden
          className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-zinc-200 dark:bg-zinc-800"
        />
        {events.map((e) => {
          const home = e.side === 'home'
          return (
            <li key={e.id} className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1.5">
              <div className={clsx('min-w-0', home ? 'text-right' : 'invisible')}>
                {home && <EventBody e={e} nameEl={nameEl} align="right" />}
              </div>
              <div
                className={clsx(
                  'z-10 flex w-14 flex-col items-center rounded-full border py-0.5 text-xs font-semibold tabular',
                  e.kind === 'timeout'
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-400'
                    : home
                      ? 'border-home/40 bg-white text-home dark:bg-zinc-900'
                      : 'border-away/40 bg-white text-away dark:bg-zinc-900',
                )}
              >
                <span>{e.minute}'</span>
              </div>
              <div className={clsx('min-w-0', !home ? 'text-left' : 'invisible')}>
                {!home && <EventBody e={e} nameEl={nameEl} align="left" />}
              </div>
            </li>
          )
        })}
        {finishedAt && (
          <li className="relative flex justify-center pt-3">
            <span className="z-10 flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              <IconFlag className="size-3.5" /> Vége · {finishedAt}'
            </span>
          </li>
        )}
      </ol>
    </div>
  )
}

function EventBody({
  e,
  nameEl,
  align,
}: {
  e: TimelineEvent
  nameEl: (n?: string) => React.ReactNode
  align: 'left' | 'right'
}) {
  if (e.kind === 'timeout')
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        <IconPause className="size-4" /> Időkérés
      </span>
    )
  return (
    <div className={clsx('inline-flex max-w-full items-start gap-2.5', align === 'right' && 'flex-row-reverse')}>
      <IconDisc className={clsx('mt-0.5 size-4 shrink-0', e.side === 'home' ? 'text-home' : 'text-away')} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{nameEl(e.scorer) ?? 'Ismeretlen'}</div>
        <div className="truncate text-xs muted">
          {e.callahan ? <Badge tone="warning">Callahan</Badge> : e.assist ? <>assz.: {nameEl(e.assist)}</> : null}
        </div>
      </div>
      <span className="ml-1 shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold tabular dark:bg-zinc-800">
        {e.home}–{e.away}
      </span>
    </div>
  )
}

function LineupTable({ title, entries, side }: { title: string; entries: LineupEntry[]; side: 'home' | 'away' }) {
  const sorted = [...entries].sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999))
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <span className={clsx('size-2.5 rounded-full', side === 'home' ? 'bg-home' : 'bg-away')} />
        <span className="font-semibold">{title}</span>
        <span className="ml-auto text-xs muted">{entries.length} játékos</span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50/60 dark:bg-zinc-900/60">
          <tr>
            <th className="th w-12 text-center">#</th>
            <th className="th text-left">Játékos</th>
            <th className="th w-12 text-center" title="Pont">
              P
            </th>
            <th className="th w-12 text-center" title="Assziszt">
              A
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sorted.map((e, i) => (
            <tr key={e.id ?? `${e.name}-${i}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <td className="td text-center font-semibold tabular muted">{e.jerseyNumber ?? '–'}</td>
              <td className="td font-medium">
                {e.playerId ? (
                  <Link
                    to={`/players/${e.playerId}`}
                    className="hover:text-accent-600 hover:underline dark:hover:text-accent-400"
                  >
                    {e.name}
                  </Link>
                ) : (
                  e.name
                )}
              </td>
              <td className={clsx('td text-center tabular', (e.points ?? 0) > 0 && 'font-semibold')}>
                {e.points ?? 0}
              </td>
              <td className={clsx('td text-center tabular', (e.assists ?? 0) > 0 && 'font-semibold')}>
                {e.assists ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
