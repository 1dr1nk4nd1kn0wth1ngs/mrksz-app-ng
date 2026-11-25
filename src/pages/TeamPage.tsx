import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAssociations, useMatchDetails, useSeasonMatches } from '../api/hooks'
import { FavoriteTeamButton } from '../components/FavoriteButton'
import { IconBuilding, IconChevronLeft, IconDownload } from '../components/icons'
import { MatchList } from '../components/matches'
import { PlayerStatsTable } from '../components/tables'
import {
  Avatar,
  EmptyState,
  ErrorState,
  FormPill,
  PageHeader,
  ProgressBar,
  Section,
  Select,
  Skeleton,
  StatTile,
  Tabs,
} from '../components/ui'
import { teamMatches, teamPlayerStats, teamRecord, teamsFromMatches } from '../lib/aggregate'
import { pct } from '../lib/format'
import { downloadText, matchesToIcs } from '../lib/ics'
import { matchStatus, normalizeName } from '../lib/match'
import { parseSeason, seasons } from '../lib/season'

type Tab = 'matches' | 'players' | 'competitions'

export default function TeamPage() {
  // React Router already decodes params; decoding again would throw on names containing '%'.
  const name = useParams().name ?? ''
  const [params, setParams] = useSearchParams()
  const season = parseSeason(params.get('season'))
  const [tab, setTab] = useState<Tab>('matches')
  const q = useSeasonMatches(season)
  const assocs = useAssociations()

  const data = useMemo(() => {
    const all = q.data ?? []
    const ms = teamMatches(all, name)
    const info = teamsFromMatches(ms).find((t) => normalizeName(t.name) === normalizeName(name))
    const byComp = new Map<string, { id?: number; name: string; matches: typeof ms }>()
    for (const m of ms) {
      const key = String(m.competition?.id ?? m.competition?.name ?? '')
      const e = byComp.get(key) ?? { id: m.competition?.id, name: m.competition?.name ?? 'Egyéb', matches: [] }
      e.matches.push(m)
      byComp.set(key, e)
    }
    return {
      matches: ms,
      info,
      record: teamRecord(ms, name),
      upcoming: ms.filter((m) => matchStatus(m) !== 'finished'),
      results: ms.filter((m) => matchStatus(m) === 'finished'),
      competitions: [...byComp.values()].map((c) => ({ ...c, record: teamRecord(c.matches, name) })),
    }
  }, [q.data, name])

  const details = useMatchDetails(tab === 'players' ? data.matches : undefined, tab === 'players')
  const playerStats = useMemo(() => teamPlayerStats(details.details, name), [details.details, name])

  // Clubs and teams share names in most cases ("X SE" / "X SE 2"): offer the club link.
  const association = useMemo(() => {
    const n = normalizeName(name)
    return (assocs.data ?? [])
      .filter((a) => n === normalizeName(a.name) || n.startsWith(normalizeName(a.name) + ' '))
      .sort((a, b) => b.name.length - a.name.length)[0]
  }, [assocs.data, name])

  if (q.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    )
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />

  const { record, info } = data
  const picture = info?.picture

  return (
    <div>
      <Link
        to={`/teams?season=${season}`}
        className="mb-3 inline-flex items-center gap-1 text-sm muted hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <IconChevronLeft className="size-4" /> Csapatok
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <Avatar src={picture} name={name} size={56} rounded="xl" />
            <span className="min-w-0">{info?.name ?? name}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {info?.competitions.join(' · ')}
            {association && (
              <Link
                to={`/associations/${association.id}`}
                className="inline-flex items-center gap-1 font-medium text-accent-600 hover:underline dark:text-accent-400"
              >
                <IconBuilding className="size-4" /> {association.name}
              </Link>
            )}
          </span>
        }
        actions={
          <>
            <Select
              label="Szezon"
              value={season}
              onChange={(v) => setParams({ season: String(v) })}
              options={seasons().map((s) => ({ value: s, label: `${s}` }))}
            />
            <FavoriteTeamButton team={{ name: info?.name ?? name, picture }} />
            {data.upcoming.length > 0 && (
              <button
                className="btn-secondary"
                title="Közelgő mérkőzések naptárfájlként"
                onClick={() =>
                  downloadText(`${name}-${season}.ics`, matchesToIcs(data.upcoming, `${name} – MRKSZ ${season}`))
                }
              >
                <IconDownload className="size-4" />
                <span className="hidden sm:inline">Naptár</span>
              </button>
            )}
          </>
        }
      />

      {data.matches.length === 0 ? (
        <EmptyState title={`${name} nem játszott mérkőzést a ${season}-es szezonban.`}>
          Próbálj másik szezont választani.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="Mérleg"
              value={`${record.win}–${record.loss}${record.draw ? `–${record.draw}` : ''}`}
              hint={`${pct(record.win, record.played)}% győzelem`}
            />
            <StatTile
              label="Pontkülönbség"
              value={`${record.pointsFor - record.pointsAgainst > 0 ? '+' : ''}${record.pointsFor - record.pointsAgainst}`}
              hint={`${record.pointsFor} szerzett · ${record.pointsAgainst} kapott`}
            />
            <StatTile
              label="Átlag / meccs"
              value={record.played ? (record.pointsFor / record.played).toFixed(1) : '–'}
              hint={record.played ? `${(record.pointsAgainst / record.played).toFixed(1)} kapott` : undefined}
            />
            <div className="card p-4">
              <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Forma</div>
              <div className="mt-2 flex gap-1">
                {record.form.length ? (
                  record.form.map((o, i) => <FormPill key={i} o={o} />)
                ) : (
                  <span className="muted">–</span>
                )}
              </div>
              {record.streak && record.streak.count > 1 && (
                <div className="mt-1.5 text-xs muted">
                  {record.streak.count}{' '}
                  {record.streak.kind === 'W' ? 'győzelem' : record.streak.kind === 'L' ? 'vereség' : 'döntetlen'}{' '}
                  sorozatban
                </div>
              )}
            </div>
          </div>

          <Tabs
            className="mb-5"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'matches', label: 'Mérkőzések', count: data.matches.length },
              { value: 'players', label: 'Játékosok' },
              { value: 'competitions', label: 'Versenyek', count: data.competitions.length },
            ]}
          />

          {tab === 'matches' && (
            <>
              {data.upcoming.length > 0 && (
                <Section title="Közelgő">
                  <MatchList matches={data.upcoming} highlight={name} />
                </Section>
              )}
              {data.results.length > 0 && (
                <Section title="Eredmények">
                  <MatchList matches={data.results} order="desc" highlight={name} />
                </Section>
              )}
            </>
          )}

          {tab === 'players' && (
            <>
              {details.isLoading && (
                <div className="card mb-4 p-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Mérkőzések jegyzőkönyveinek betöltése…</span>
                    <span className="tabular muted">
                      {details.loaded}/{details.total}
                    </span>
                  </div>
                  <ProgressBar value={details.loaded} max={details.total} />
                </div>
              )}
              {!details.isLoading && playerStats.length === 0 ? (
                <EmptyState title="Nincs elérhető kerettag-statisztika." />
              ) : (
                playerStats.length > 0 && (
                  <PlayerStatsTable
                    stats={playerStats}
                    linkFor={(s) =>
                      s.playerId ? `/players/${s.playerId}` : `/players?q=${encodeURIComponent(s.name)}`
                    }
                  />
                )
              )}
              {details.errors > 0 && (
                <p className="mt-2 text-xs muted">{details.errors} mérkőzés adatait nem sikerült betölteni.</p>
              )}
            </>
          )}

          {tab === 'competitions' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.competitions.map((c) => (
                <Link
                  key={c.name}
                  to={c.id ? `/competitions/${c.id}?tab=matches&team=${encodeURIComponent(name)}` : '#'}
                  className="card card-hover p-4"
                >
                  <div className="font-semibold">{c.name}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="text-lg font-semibold tabular">{c.matches.length}</div>
                      <div className="text-xs muted">mérkőzés</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold tabular">
                        {c.record.win}–{c.record.loss}
                      </div>
                      <div className="text-xs muted">mérleg</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold tabular">
                        {c.record.pointsFor}:{c.record.pointsAgainst}
                      </div>
                      <div className="text-xs muted">pontok</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
