import { Link, useSearchParams } from 'react-router'
import { useCompetitions, useSeasonMatches } from '../api/hooks'
import { CompetitionType } from '../api/types'
import { IconChevronRight, IconTrophy } from '../components/icons'
import { EmptyState, ErrorState, PageHeader, ProgressBar, Select, Skeleton } from '../components/ui'
import { teamsFromMatches } from '../lib/aggregate'
import { matchStatus } from '../lib/match'
import { parseSeason, seasons } from '../lib/season'

export default function CompetitionsPage() {
  const [params, setParams] = useSearchParams()
  const season = parseSeason(params.get('season'))
  const comps = useCompetitions(season)
  const matches = useSeasonMatches(season)

  const statsFor = (id: number, name: string) => {
    const ms = (matches.data ?? []).filter((m) =>
      m.competition?.id !== undefined ? m.competition.id === id : m.competition?.name === name,
    )
    return {
      total: ms.length,
      played: ms.filter((m) => matchStatus(m) === 'finished').length,
      live: ms.some((m) => matchStatus(m) === 'live'),
      teams: teamsFromMatches(ms).length,
    }
  }

  return (
    <div>
      <PageHeader
        title="Versenyek"
        subtitle="Ligák és tornák, csoportkörrel és rájátszással."
        actions={
          <Select
            label="Szezon"
            value={season}
            onChange={(v) => setParams({ season: String(v) })}
            options={seasons().map((s) => ({ value: s, label: `${s}-es szezon` }))}
          />
        }
      />
      {comps.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : comps.isError ? (
        <ErrorState error={comps.error} onRetry={() => comps.refetch()} />
      ) : !comps.data?.length ? (
        <EmptyState title="Ebben a szezonban nincs verseny." icon={<IconTrophy className="size-8" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {comps.data.map((c) => {
            const s = statsFor(c.id, c.name)
            return (
              <Link key={c.id} to={`/competitions/${c.id}`} className="card card-hover flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
                    <IconTrophy className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold">{c.name}</div>
                    <div className="text-sm muted">
                      {c.season}
                      {c.competitionType === CompetitionType.Tournament && ' · Torna (csoportkör + rájátszás)'}
                      {c.competitionType === CompetitionType.League && ' · Liga'}
                    </div>
                  </div>
                  {s.live && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
                      Élő
                    </span>
                  )}
                  <IconChevronRight className="size-5 text-zinc-400" />
                </div>
                {s.total > 0 && (
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs muted">
                      <span>{s.teams} csapat</span>
                      <span className="tabular">
                        {s.played}/{s.total} mérkőzés lejátszva
                      </span>
                    </div>
                    <ProgressBar value={s.played} max={s.total} />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
