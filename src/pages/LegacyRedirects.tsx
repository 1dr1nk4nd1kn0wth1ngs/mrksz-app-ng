import { Navigate, useSearchParams } from 'react-router'
import { useCompetitions } from '../api/hooks'
import { Spinner } from '../components/ui'
import { parseSeason } from '../lib/season'

/** Old app: /leaguetable?season=2025&competition=NB1 (competition by *name*). */
export function LeagueTableRedirect() {
  const [params] = useSearchParams()
  const season = parseSeason(params.get('season'))
  const name = params.get('competition')
  const comps = useCompetitions(season)
  if (comps.isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-7" />
      </div>
    )
  const list = comps.data ?? []
  const target =
    list.find((c) => c.name === name) ?? (name ? undefined : (list.find((c) => c.name === 'NB1') ?? list[0]))
  return <Navigate replace to={target ? `/competitions/${target.id}` : `/competitions?season=${season}`} />
}

/** Old app: /results?season=2025&competition=<id>. */
export function ResultsRedirect() {
  const [params] = useSearchParams()
  const next = new URLSearchParams()
  if (params.get('season')) next.set('season', params.get('season')!)
  if (params.get('competition')) next.set('competition', params.get('competition')!)
  return <Navigate replace to={`/matches${next.size ? `?${next}` : ''}`} />
}
