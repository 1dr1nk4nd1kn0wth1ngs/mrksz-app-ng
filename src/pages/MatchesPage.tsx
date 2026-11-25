import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useSeasonMatches } from '../api/hooks'
import type { Match } from '../api/types'
import { IconCalendar } from '../components/icons'
import { MatchList } from '../components/matches'
import { EmptyState, ErrorState, PageHeader, Select, SkeletonList, Tabs } from '../components/ui'
import { teamsFromMatches } from '../lib/aggregate'
import { matchStatus, normalizeName, sideOf } from '../lib/match'
import { parseSeason, seasons } from '../lib/season'

type Status = 'all' | 'upcoming' | 'finished' | 'live'

/** Competition id when the list provides it, else its name. */
const compKey = (m: Match) => String(m.competition?.id ?? m.competition?.name ?? '')

export default function MatchesPage() {
  const [params, setParams] = useSearchParams()
  const season = parseSeason(params.get('season'))
  const competition = params.get('competition') ?? ''
  const team = params.get('team') ?? ''
  const status = (params.get('status') as Status) || 'all'
  const text = params.get('q') ?? ''
  const q = useSeasonMatches(season)

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v && v !== 'all') next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const all = q.data ?? []
  const competitions = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of all) if (compKey(m)) map.set(compKey(m), m.competition?.name ?? '')
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'hu'))
  }, [all])
  const teams = useMemo(
    () => teamsFromMatches(competition ? all.filter((m) => compKey(m) === competition) : all),
    [all, competition],
  )

  const filtered = useMemo(() => {
    const n = normalizeName(text)
    return all.filter((m) => {
      if (competition && compKey(m) !== competition) return false
      if (team && !sideOf(m, team)) return false
      const s = matchStatus(m)
      if (status === 'upcoming' && s !== 'scheduled') return false
      if (status === 'finished' && s !== 'finished') return false
      if (status === 'live' && s !== 'live') return false
      if (n && !normalizeName(`${m.homeTeam} ${m.awayTeam} ${m.venue ?? ''}`).includes(n)) return false
      return true
    })
  }, [all, competition, team, status, text])

  const counts = useMemo(
    () => ({
      live: all.filter((m) => matchStatus(m) === 'live').length,
      upcoming: all.filter((m) => matchStatus(m) === 'scheduled').length,
      finished: all.filter((m) => matchStatus(m) === 'finished').length,
    }),
    [all],
  )

  return (
    <div>
      <PageHeader
        title="Mérkőzések"
        subtitle="A szezon összes mérkőzése, szűrhetően."
        actions={
          <Select
            label="Szezon"
            value={season}
            onChange={(v) => setParams({ season: String(v) })}
            options={seasons().map((s) => ({ value: s, label: `${s}-es szezon` }))}
          />
        }
      />
      <div className="mb-5 flex flex-col gap-3">
        <Tabs
          value={status}
          onChange={(v) => set('status', v)}
          items={[
            { value: 'all', label: 'Mind', count: all.length },
            ...(counts.live ? [{ value: 'live' as const, label: 'Élő', count: counts.live }] : []),
            { value: 'upcoming', label: 'Közelgő', count: counts.upcoming },
            { value: 'finished', label: 'Eredmények', count: counts.finished },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Verseny"
            value={competition}
            onChange={(v) => {
              const next = new URLSearchParams(params)
              if (v) next.set('competition', v)
              else next.delete('competition')
              next.delete('team')
              setParams(next, { replace: true })
            }}
            options={[
              { value: '', label: 'Minden verseny' },
              ...competitions.map(([id, name]) => ({ value: id, label: name })),
            ]}
          />
          <Select
            label="Csapat"
            value={team}
            onChange={(v) => set('team', v)}
            options={[{ value: '', label: 'Minden csapat' }, ...teams.map((t) => ({ value: t.name, label: t.name }))]}
          />
          <input
            className="input"
            placeholder="Keresés csapatra, helyszínre…"
            value={text}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
      </div>
      {q.isLoading ? (
        <SkeletonList rows={8} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nincs a szűrésnek megfelelő mérkőzés." icon={<IconCalendar className="size-8" />} />
      ) : (
        <MatchList matches={filtered} order={status === 'finished' ? 'desc' : 'asc'} highlight={team || undefined} />
      )}
    </div>
  )
}
