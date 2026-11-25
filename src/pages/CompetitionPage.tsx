import clsx from 'clsx'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useCompetition, useMatchDetails, usePlayerStats, useSeasonMatches } from '../api/hooks'
import type { CompetitionDetail, Group, Match } from '../api/types'
import { CompetitionType } from '../api/types'
import { Bracket } from '../components/Bracket'
import { IconChevronLeft } from '../components/icons'
import { MatchList } from '../components/matches'
import { playerStatLink, PlayerStatsTable, StandingsTable } from '../components/tables'
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  Section,
  Select,
  Skeleton,
  StatTile,
  Tabs,
} from '../components/ui'
import { formTable, lineupStats, sortStandings, standingsFromMatches, teamsFromMatches } from '../lib/aggregate'
import { bracketMatches } from '../lib/bracket'
import { matchStatus, matchTime, normalizeName, sideOf } from '../lib/match'

/** The backend's player stats lists stop at this many rows. */
const STATS_CAP = 10

type Tab = 'overview' | 'groups' | 'playoffs' | 'matches' | 'stats'

const groupLetter = (i: number) => String.fromCharCode(65 + i)

/**
 * Every match of the competition, de-duplicated by id. The competition payload does not
 * always contain all of them (for some tournaments only the first round robin is in its
 * groups), so the competition's matches from the season list are merged in as well.
 */
function allMatches(d: CompetitionDetail, fromSeason: Match[]): Match[] {
  const map = new Map<number, Match>()
  const add = (ms: Match[] | undefined | null) => ms?.forEach((m) => m && map.set(m.id, { ...map.get(m.id), ...m }))
  add(fromSeason)
  add(d.matches)
  add(d.competition.matches)
  d.competition.groups?.forEach((g) => add(g.matches))
  add(bracketMatches(d.competition.final))
  return [...map.values()]
}

function groupStandings(g: Group) {
  return g.teams?.length ? sortStandings(g.teams) : standingsFromMatches(g.matches ?? [])
}

export default function CompetitionPage() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const q = useCompetition(id)
  const seasonQ = useSeasonMatches(q.data?.competition.season, !!q.data)
  const tab = (params.get('tab') as Tab) || 'overview'
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    next.set('tab', t)
    setParams(next, { replace: true })
  }
  const teamFilter = params.get('team') ?? ''

  const data = useMemo(() => {
    if (!q.data) return null
    const d = q.data
    const c = d.competition
    const fromSeason = (seasonQ.data ?? []).filter((m) =>
      m.competition?.id !== undefined ? m.competition.id === c.id : m.competition?.name === c.name,
    )
    const matches = allMatches(d, fromSeason)
    const groups = (c.groups ?? []).filter((g) => (g.teams?.length ?? 0) + (g.matches?.length ?? 0) > 0)
    const hasBracket = !!c.final && bracketMatches(c.final).length > 0
    const isTournament = c.competitionType === CompetitionType.Tournament || groups.length > 0 || hasBracket
    const qualified = new Set<string>()
    if (c.final)
      for (const m of bracketMatches(c.final)) {
        qualified.add(normalizeName(m.homeTeam))
        qualified.add(normalizeName(m.awayTeam))
      }
    const standings = d.leagueTable?.length ? d.leagueTable : isTournament ? [] : standingsFromMatches(matches)
    return {
      c,
      matches,
      groups,
      hasBracket,
      isTournament,
      qualified,
      standings,
      stats: d.playerStats ?? [],
      form: formTable(matches),
      teams: teamsFromMatches(matches),
      played: matches.filter((m) => matchStatus(m) === 'finished').length,
      live: matches.filter((m) => matchStatus(m) === 'live'),
      groupMatchIds: new Set(groups.flatMap((g) => (g.matches ?? []).map((m) => m.id))),
    }
  }, [q.data, seasonQ.data])

  // Player stats: 1) embedded in the competition payload, else 2) the dedicated endpoint.
  // The backend returns at most STATS_CAP players, and nothing for some competitions, so in
  // those cases the full list is 3) summed from match lineups, if that yields more players.
  const embeddedStats = data?.stats ?? []
  const endpoint = usePlayerStats(id, 'all', !!data && embeddedStats.length === 0)
  const official = embeddedStats.length ? embeddedStats : (endpoint.data ?? [])
  const officialReady = embeddedStats.length > 0 || endpoint.isFetched
  const officialCapped = official.length === STATS_CAP
  const needLineups = !!data && officialReady && (official.length === 0 || officialCapped)
  // One request per match, so only fetch on the stats tab; cached results serve the overview too.
  const details = useMatchDetails(needLineups ? data!.matches : undefined, needLineups && tab === 'stats')
  const derivedStats = useMemo(() => (needLineups ? lineupStats(details.details) : []), [needLineups, details.details])
  // A capped official list is only replaced once every lineup is in, never by partial totals.
  const statsFromLineups = derivedStats.length > official.length && (official.length === 0 || !details.isLoading)
  const stats = statsFromLineups ? derivedStats : official
  const statsPending = !!data && (!officialReady || (needLineups && details.isLoading))

  if (q.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    )
  if (q.isError || !data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />

  const { c, matches, groups, hasBracket, isTournament, qualified, standings, form, teams, played, live } = data
  const season = c.season
  const tabs = [
    { value: 'overview' as const, label: 'Áttekintés' },
    ...(groups.length ? [{ value: 'groups' as const, label: 'Csoportok', count: groups.length }] : []),
    ...(hasBracket ? [{ value: 'playoffs' as const, label: 'Rájátszás' }] : []),
    { value: 'matches' as const, label: 'Mérkőzések', count: matches.length },
    { value: 'stats' as const, label: 'Játékosok', count: stats.length || undefined },
  ]

  const leader = isTournament ? null : standings[0]
  const topScorer = [...stats].sort((a, b) => b.points - a.points)[0]
  const topAssist = [...stats].sort((a, b) => b.assists - a.assists)[0]

  const stages = isTournament
    ? ([
        groups.length > 0 && {
          name: 'Csoportkör',
          done: groups.every((g) => (g.matches ?? []).every((m) => matchStatus(m) === 'finished')),
        },
        hasBracket && {
          name: 'Rájátszás',
          done: bracketMatches(c.final).every((m) => matchStatus(m) === 'finished'),
        },
      ].filter(Boolean) as { name: string; done: boolean }[])
    : []

  const filteredMatches = teamFilter ? matches.filter((m) => sideOf(m, teamFilter)) : matches

  return (
    <div>
      <Link
        to={`/competitions?season=${season}`}
        className="mb-3 inline-flex items-center gap-1 text-sm muted hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <IconChevronLeft className="size-4" /> Versenyek
      </Link>
      <PageHeader
        eyebrow={`${season}-es szezon`}
        title={c.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{isTournament ? 'Torna' : 'Liga'}</Badge>
            <span>{teams.length} csapat</span>
            {live.length > 0 && <Badge tone="live">{live.length} élő mérkőzés</Badge>}
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card col-span-2 p-4 md:col-span-1">
          <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Haladás</div>
          <div className="mt-1 text-2xl font-semibold tabular">
            {played}
            <span className="text-base muted">/{matches.length}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={played} max={matches.length} />
          </div>
        </div>
        {leader ? (
          <StatTile
            label="Listavezető"
            value={<span className="block truncate text-lg">{leader.name}</span>}
            hint={`${leader.win} győzelem`}
          />
        ) : (
          <StatTile
            label="Szakasz"
            value={<span className="text-lg">{stages.find((s) => !s.done)?.name ?? 'Befejezve'}</span>}
          />
        )}
        {topScorer && (
          <StatTile
            label="Legtöbb pont"
            value={<span className="block truncate text-lg">{topScorer.name}</span>}
            hint={`${topScorer.points} pont`}
          />
        )}
        {topAssist && (
          <StatTile
            label="Legtöbb assziszt"
            value={<span className="block truncate text-lg">{topAssist.name}</span>}
            hint={`${topAssist.assists} assziszt`}
          />
        )}
      </div>

      <Tabs
        items={tabs}
        value={tabs.some((t) => t.value === tab) ? tab : 'overview'}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'overview' && isTournament && (
        <>
          {stages.length > 1 && (
            <ol className="mb-6 flex items-center gap-2 text-sm">
              {stages.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2">
                  {i > 0 && <span className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" />}
                  <span
                    className={clsx(
                      'rounded-full px-3 py-1 font-medium',
                      s.done
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
                    )}
                  >
                    {i + 1}. {s.name} {s.done ? '✓' : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {hasBracket && (
            <Section title="Rájátszás">
              <Bracket root={c.final!} />
            </Section>
          )}
        </>
      )}

      {tab === 'overview' && (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="min-w-0 lg:col-span-3">
            {isTournament ? (
              <>
                {groups.length > 0 && (
                  <Section title="Csoportkör">
                    <div className="grid gap-4">
                      {groups.map((g, i) => (
                        <div key={i}>
                          <h3 className="mb-2 text-sm font-semibold">{g.name || `${groupLetter(i)} csoport`}</h3>
                          <StandingsTable
                            rows={groupStandings(g)}
                            season={season}
                            form={formTable(g.matches ?? [])}
                            qualified={qualified}
                          />
                        </div>
                      ))}
                    </div>
                    {qualified.size > 0 && (
                      <p className="mt-2 flex items-center gap-2 text-xs muted">
                        <span className="inline-block size-3 rounded bg-accent-600" /> Rájátszásba jutott
                      </p>
                    )}
                  </Section>
                )}
                {!hasBracket && groups.length === 0 && <EmptyState title="A torna szerkezete még nincs kiírva." />}
              </>
            ) : standings.length ? (
              <Section title="Tabella">
                <StandingsTable rows={standings} form={form} season={season} />
              </Section>
            ) : (
              <EmptyState title="Még nincs tabella." />
            )}
          </div>
          <div className="min-w-0 lg:col-span-2">
            {live.length > 0 && (
              <Section title="Most zajlik">
                <MatchList matches={live} showCompetition={false} groupByDay={false} />
              </Section>
            )}
            <Section
              title="Következő"
              action={
                <button
                  onClick={() => setTab('matches')}
                  className="text-sm font-medium text-accent-600 dark:text-accent-400"
                >
                  Mind
                </button>
              }
            >
              {(() => {
                const next = matches
                  .filter((m) => matchStatus(m) === 'scheduled')
                  .sort((a, b) => matchTime(a) - matchTime(b))
                  .slice(0, 5)
                const last = matches
                  .filter((m) => matchStatus(m) === 'finished')
                  .sort((a, b) => matchTime(b) - matchTime(a))
                  .slice(0, 5)
                return next.length ? (
                  <MatchList matches={next} showCompetition={false} />
                ) : last.length ? (
                  <MatchList matches={last} order="desc" showCompetition={false} />
                ) : (
                  <EmptyState title="Nincs mérkőzés." />
                )
              })()}
            </Section>
            {stats.length > 0 && (
              <Section title="Pontlista">
                <PlayerStatsTable stats={stats} limit={8} searchable={false} linkFor={playerStatLink} />
              </Section>
            )}
          </div>
        </div>
      )}

      {tab === 'groups' && (
        <div className="space-y-10">
          {groups.map((g, i) => (
            <Section key={i} title={g.name || `${groupLetter(i)} csoport`}>
              <div className="grid gap-6 lg:grid-cols-2">
                <StandingsTable
                  rows={groupStandings(g)}
                  season={season}
                  form={formTable(g.matches ?? [])}
                  qualified={qualified}
                />
                <MatchList matches={g.matches ?? []} showCompetition={false} />
              </div>
            </Section>
          ))}
        </div>
      )}

      {tab === 'playoffs' && hasBracket && (
        <div>
          <Bracket root={c.final!} />
          <Section title="Rájátszás mérkőzései" className="mt-8">
            <MatchList matches={bracketMatches(c.final)} showCompetition={false} />
          </Section>
        </div>
      )}

      {tab === 'matches' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select
              label="Csapat"
              value={teamFilter}
              onChange={(v) => {
                const next = new URLSearchParams(params)
                if (v) next.set('team', v)
                else next.delete('team')
                setParams(next, { replace: true })
              }}
              options={[{ value: '', label: 'Minden csapat' }, ...teams.map((t) => ({ value: t.name, label: t.name }))]}
            />
            <span className="text-sm muted">{filteredMatches.length} mérkőzés</span>
          </div>
          {filteredMatches.length === 0 ? (
            <EmptyState title="Nincs mérkőzés." />
          ) : (
            <MatchesByStage
              matches={filteredMatches}
              groupIds={data.groupMatchIds}
              bracketIds={new Set(bracketMatches(c.final).map((m) => m.id))}
              highlight={teamFilter || undefined}
            />
          )}
        </div>
      )}

      {tab === 'stats' && (
        <>
          {needLineups && details.isLoading && (
            <div className="card mb-4 p-4">
              <div className="mb-2 flex justify-between gap-4 text-sm">
                <span>Statisztika összesítése a mérkőzések jegyzőkönyveiből…</span>
                <span className="tabular muted">
                  {details.loaded}/{details.total}
                </span>
              </div>
              <ProgressBar value={details.loaded} max={details.total} />
            </div>
          )}
          {stats.length ? (
            <>
              <PlayerStatsTable stats={stats} linkFor={playerStatLink} />
              {statsFromLineups && (
                <p className="mt-2 text-xs muted">
                  {official.length
                    ? `A szövetség csak az első ${official.length} játékos statisztikáját közli; a teljes lista a leadott keretekből és a rögzített pontokból van összesítve.`
                    : 'A szövetség nem közöl statisztikát ehhez a versenyhez; a számok a leadott keretekből és a rögzített pontokból vannak összesítve.'}
                  {details.errors > 0 && ` ${details.errors} mérkőzés adatait nem sikerült betölteni.`}
                </p>
              )}
            </>
          ) : statsPending ? (
            !needLineups && <Skeleton className="h-80" />
          ) : (
            <EmptyState title="Még nincs játékosstatisztika.">
              {played === 0
                ? 'Még nincs lejátszott mérkőzés.'
                : 'Egyik lejátszott mérkőzéshez sincs leadott keret vagy rögzített pont.'}
            </EmptyState>
          )}
        </>
      )}
    </div>
  )
}

/** League: by round ("forduló"); tournament: group stage then playoffs; fallback by day. */
function MatchesByStage({
  matches,
  groupIds,
  bracketIds,
  highlight,
}: {
  matches: Match[]
  groupIds: Set<number>
  bracketIds: Set<number>
  highlight?: string
}) {
  const sections = useMemo(() => {
    if (groupIds.size || bracketIds.size) {
      const g = matches.filter((m) => groupIds.has(m.id))
      const b = matches.filter((m) => bracketIds.has(m.id))
      // Matches outside the payload's groups and bracket (e.g. a second round robin).
      const rest = matches.filter((m) => !groupIds.has(m.id) && !bracketIds.has(m.id))
      return [
        { title: 'Csoportkör', items: g },
        ...splitByRound(rest, 'További mérkőzések'),
        { title: 'Rájátszás', items: b },
      ].filter((s) => s.items.length)
    }
    return splitByRound(matches, '')
  }, [matches, groupIds, bracketIds])

  return (
    <div className="space-y-8">
      {sections.map((s) => (
        <Section key={s.title || 'all'} title={s.title || undefined}>
          <MatchList matches={s.items} showCompetition={false} highlight={highlight} />
        </Section>
      ))}
    </div>
  )
}

/** Sections per round ("forduló") when the matches carry round numbers, else one section. */
function splitByRound(ms: Match[], fallbackTitle: string): { title: string; items: Match[] }[] {
  const rounds = new Map<number, Match[]>()
  for (const m of ms) if (m.round) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m])
  if (rounds.size <= 1) return [{ title: fallbackTitle, items: ms }]
  const out = [...rounds.entries()].sort((a, b) => a[0] - b[0]).map(([r, items]) => ({ title: `${r}. forduló`, items }))
  const noRound = ms.filter((m) => !m.round)
  return noRound.length ? [...out, { title: fallbackTitle || 'Egyéb', items: noRound }] : out
}
