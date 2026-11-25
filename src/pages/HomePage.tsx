import { useMemo } from 'react'
import { Link } from 'react-router'
import { useCompetitions, useSeasonMatches, useTodaysMatches } from '../api/hooks'
import type { Match } from '../api/types'
import { CompetitionType } from '../api/types'
import { IconChevronRight, IconStar, IconTrophy } from '../components/icons'
import { MatchCard, MatchList } from '../components/matches'
import { Avatar, Badge, EmptyState, ErrorState, LiveDot, Section, Skeleton, SkeletonList } from '../components/ui'
import { teamMatches } from '../lib/aggregate'
import { fmtShort } from '../lib/format'
import { matchStatus, matchTime } from '../lib/match'
import { currentSeason, FIRST_SEASON } from '../lib/season'
import { favoritePlayers, favoriteTeams } from '../lib/storage'

function Strip({ matches }: { matches: Match[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
      {matches.map((m) => (
        <MatchCard key={m.id} m={m} />
      ))}
    </div>
  )
}

export default function HomePage() {
  const thisSeason = currentSeason()
  const current = useSeasonMatches(thisSeason)
  // Off-season (e.g. January): fall back to last season so the page is not empty.
  const usePrev = current.isSuccess && current.data.length === 0 && thisSeason > FIRST_SEASON
  const previous = useSeasonMatches(usePrev ? thisSeason - 1 : thisSeason)
  const season = usePrev ? thisSeason - 1 : thisSeason
  const seasonQ = usePrev ? previous : current
  const today = useTodaysMatches()
  const comps = useCompetitions(season)
  const favTeams = favoriteTeams.use()
  const favPlayers = favoritePlayers.use()

  const { live, todays, upcoming, recent } = useMemo(() => {
    const all = seasonQ.data ?? []
    const now = Date.now()
    const todayList = today.data ?? []
    const liveIds = new Set<number>()
    const live = [...todayList, ...all].filter((m) => {
      if (matchStatus(m) !== 'live' || liveIds.has(m.id)) return false
      liveIds.add(m.id)
      return true
    })
    return {
      live,
      todays: todayList.filter((m) => !liveIds.has(m.id)),
      upcoming: all
        .filter((m) => matchStatus(m) === 'scheduled' && matchTime(m) > now)
        .sort((a, b) => matchTime(a) - matchTime(b))
        .slice(0, 12),
      recent: all
        .filter((m) => matchStatus(m) === 'finished')
        .sort((a, b) => matchTime(b) - matchTime(a))
        .slice(0, 8),
    }
  }, [seasonQ.data, today.data])

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-accent-600 via-accent-500 to-cyan-500 p-6 text-white shadow-lg shadow-accent-600/20 sm:p-8 dark:border-zinc-800">
        <svg aria-hidden viewBox="0 0 200 200" className="absolute -top-10 -right-10 size-64 opacity-15">
          <ellipse cx="100" cy="100" rx="90" ry="36" fill="none" stroke="white" strokeWidth="14" />
          <ellipse cx="100" cy="92" rx="90" ry="36" fill="white" />
        </svg>
        <div className="relative">
          <div className="text-sm font-medium text-white/80">Magyar Repülő Korong Szövetség</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{season}-es szezon</h1>
          <p className="mt-2 max-w-xl text-white/85">
            Élő eredmények, tabellák, rájátszások, csapat- és játékosstatisztikák egy helyen.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/competitions" className="btn bg-white text-accent-700 hover:bg-white/90">
              Versenyek
            </Link>
            <Link to="/matches" className="btn bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25">
              Összes mérkőzés
            </Link>
          </div>
        </div>
      </div>

      {usePrev && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          A {thisSeason}-es szezonban még nincs mérkőzés, ezért a {season}-es szezon adatai látszanak.
        </div>
      )}

      {live.length > 0 && (
        <Section
          title={
            <span className="flex items-center gap-2">
              <LiveDot /> Élő mérkőzések
            </span>
          }
        >
          <Strip matches={live} />
        </Section>
      )}

      {todays.length > 0 && (
        <Section title="Mai mérkőzések">
          <Strip matches={todays} />
        </Section>
      )}

      {(favTeams.length > 0 || favPlayers.length > 0) && (
        <Section
          title={
            <span className="flex items-center gap-2">
              <IconStar filled className="size-4 text-amber-500" /> Kedvenceim
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favTeams.map((t) => {
              const ms = teamMatches(seasonQ.data ?? [], t.name)
              const next = ms.find((m) => matchStatus(m) !== 'finished')
              const last = [...ms].reverse().find((m) => matchStatus(m) === 'finished')
              return (
                <Link
                  key={t.name}
                  to={`/teams/${encodeURIComponent(t.name)}`}
                  className="card card-hover flex items-center gap-3 p-4"
                >
                  <Avatar src={t.picture} name={t.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="truncate text-xs muted">
                      {next
                        ? `Következő: ${fmtShort(next.date)} – ${next.homeTeam === t.name ? next.awayTeam : next.homeTeam}`
                        : last
                          ? `Utolsó: ${last.homeTeam} ${last.homeScore}:${last.awayScore} ${last.awayTeam}`
                          : 'Nincs mérkőzés a szezonban'}
                    </div>
                  </div>
                  <IconChevronRight className="size-4 text-zinc-400" />
                </Link>
              )
            })}
            {favPlayers.map((p) => (
              <Link key={p.id} to={`/players/${p.id}`} className="card card-hover flex items-center gap-3 p-4">
                <Avatar src={p.imageURL} name={p.name} size={40} />
                <div className="min-w-0 flex-1 truncate font-medium">{p.name}</div>
                <Badge>Játékos</Badge>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Versenyek"
        action={
          <Link
            to={`/competitions?season=${season}`}
            className="text-sm font-medium text-accent-600 dark:text-accent-400"
          >
            Mind
          </Link>
        }
      >
        {comps.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : comps.isError ? (
          <ErrorState error={comps.error} onRetry={() => comps.refetch()} />
        ) : (comps.data ?? []).length === 0 ? (
          <EmptyState title="Nincs verseny ebben a szezonban." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comps.data!.map((c) => (
              <Link key={c.id} to={`/competitions/${c.id}`} className="card card-hover flex items-center gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
                  <IconTrophy className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs muted">
                    {c.season}
                    {c.competitionType !== undefined &&
                      (c.competitionType === CompetitionType.Tournament ? ' · Torna' : ' · Liga')}
                  </div>
                </div>
                <IconChevronRight className="size-4 text-zinc-400" />
              </Link>
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Közelgő mérkőzések" className="min-w-0">
          {seasonQ.isLoading ? (
            <SkeletonList rows={4} />
          ) : seasonQ.isError ? (
            <ErrorState error={seasonQ.error} onRetry={() => seasonQ.refetch()} />
          ) : upcoming.length === 0 ? (
            <EmptyState title="Nincs kiírt mérkőzés." />
          ) : (
            <MatchList matches={upcoming.slice(0, 6)} />
          )}
        </Section>
        <Section
          title="Legutóbbi eredmények"
          className="min-w-0"
          action={
            <Link
              to={`/matches?season=${season}&status=finished`}
              className="text-sm font-medium text-accent-600 dark:text-accent-400"
            >
              Mind
            </Link>
          }
        >
          {seasonQ.isLoading ? (
            <SkeletonList rows={4} />
          ) : seasonQ.isError ? null : recent.length === 0 ? (
            <EmptyState title="Még nincs lejátszott mérkőzés." />
          ) : (
            <MatchList matches={recent} order="desc" />
          )}
        </Section>
      </div>
    </div>
  )
}
