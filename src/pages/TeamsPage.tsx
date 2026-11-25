import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useSeasonMatches } from '../api/hooks'
import { IconShield } from '../components/icons'
import { Avatar, EmptyState, ErrorState, FormPill, PageHeader, Select, Skeleton } from '../components/ui'
import { teamMatches, teamRecord, teamsFromMatches } from '../lib/aggregate'
import { normalizeName } from '../lib/match'
import { parseSeason, seasons } from '../lib/season'

export default function TeamsPage() {
  const [params, setParams] = useSearchParams()
  const season = parseSeason(params.get('season'))
  const q = useSeasonMatches(season)
  const [text, setText] = useState('')

  const teams = useMemo(() => {
    const all = q.data ?? []
    return teamsFromMatches(all).map((t) => ({ ...t, record: teamRecord(teamMatches(all, t.name), t.name) }))
  }, [q.data])
  const filtered = teams.filter((t) => normalizeName(t.name).includes(normalizeName(text)))

  return (
    <div>
      <PageHeader
        title="Csapatok"
        subtitle="A szezonban szereplő csapatok, eredményeikkel."
        actions={
          <Select
            label="Szezon"
            value={season}
            onChange={(v) => setParams({ season: String(v) })}
            options={seasons().map((s) => ({ value: s, label: `${s}-es szezon` }))}
          />
        }
      />
      <input
        className="input mb-5 max-w-md"
        placeholder="Csapat keresése…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {q.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nincs csapat." icon={<IconShield className="size-8" />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link
              key={t.name}
              to={`/teams/${encodeURIComponent(t.name)}?season=${season}`}
              className="card card-hover flex items-center gap-3 p-4"
            >
              <Avatar src={t.picture} name={t.name} size={48} rounded="xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{t.name}</div>
                <div className="truncate text-xs muted">{t.competitions.join(' · ')}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs font-medium tabular">
                    {t.record.win}–{t.record.loss}
                  </span>
                  <span className="flex gap-0.5">
                    {t.record.form.map((o, i) => (
                      <FormPill key={i} o={o} />
                    ))}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
