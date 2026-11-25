import clsx from 'clsx'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useMatchDetails, usePlayer, useSeasonMatches } from '../api/hooks'
import { FavoritePlayerButton } from '../components/FavoriteButton'
import { IconBuilding, IconChevronLeft, IconId, IconShield } from '../components/icons'
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  FormPill,
  PageHeader,
  ProgressBar,
  Section,
  Select,
  Skeleton,
  StatTile,
  TeamLink,
} from '../components/ui'
import { playerGames, totals, type PlayerGame } from '../lib/aggregate'
import { birthYear, fmtDate, fmtShort, playerName, sportName } from '../lib/format'
import { matchStatus } from '../lib/match'
import { parseSeason, seasons } from '../lib/season'

export default function PlayerPage() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const season = parseSeason(params.get('season'))
  const player = usePlayer(id)
  const seasonMatches = useSeasonMatches(season)
  const details = useMatchDetails(player.data ? seasonMatches.data : undefined, !!player.data)

  const games = useMemo(
    () =>
      player.data
        ? playerGames(details.details, { id, firstname: player.data.firstname, lastname: player.data.lastname })
        : [],
    [details.details, player.data, id],
  )
  const t = useMemo(() => totals(games), [games])
  const byCompetition = useMemo(() => {
    const map = new Map<string, { id?: number; name: string; games: PlayerGame[] }>()
    for (const g of games) {
      const key = String(g.match.competition?.id ?? g.match.competition?.name ?? '')
      const e = map.get(key) ?? { id: g.match.competition?.id, name: g.match.competition?.name ?? 'Egyéb', games: [] }
      e.games.push(g)
      map.set(key, e)
    }
    return [...map.values()].map((c) => ({ ...c, totals: totals(c.games) }))
  }, [games])
  const best = useMemo(() => [...games].sort((a, b) => b.points + b.assists - (a.points + a.assists))[0], [games])

  if (player.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    )
  if (player.isError || !player.data) return <ErrorState error={player.error} onRetry={() => player.refetch()} />

  const p = player.data
  const name = playerName(p)
  const teams = [...new Set(games.map((g) => g.team))]
  const licences = [...(p.licences ?? [])].sort((a, b) => +new Date(b.validity) - +new Date(a.validity))
  const thisYear = new Date().getFullYear()

  return (
    <div>
      <Link
        to="/players"
        className="mb-3 inline-flex items-center gap-1 text-sm muted hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <IconChevronLeft className="size-4" /> Játékosok
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <Avatar src={p.imageURL} name={name} size={72} />
            <span className="min-w-0">
              {name}
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-normal muted">
                {birthYear(p.birthdate) && <span>Született: {birthYear(p.birthdate)}</span>}
                {p.association && (
                  <Link
                    to={`/associations/${p.association.id}`}
                    className="inline-flex items-center gap-1 text-accent-600 hover:underline dark:text-accent-400"
                  >
                    <IconBuilding className="size-4" /> {p.association.name}
                  </Link>
                )}
                {teams.map((team) => (
                  <TeamLink
                    key={team}
                    name={team}
                    season={season}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    <IconShield className="size-4" /> {team}
                  </TeamLink>
                ))}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <Select
              label="Szezon"
              value={season}
              onChange={(v) => setParams({ season: String(v) })}
              options={seasons().map((s) => ({ value: s, label: `${s}-es szezon` }))}
            />
            <FavoritePlayerButton player={{ id, name, imageURL: p.imageURL }} />
          </>
        }
      />

      {licences.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm muted">
            <IconId className="size-4" /> Versenyengedélyek:
          </span>
          {licences.map((l) => {
            const year = new Date(l.validity).getFullYear()
            const valid = new Date(l.validity).getTime() >= Date.now() || year >= thisYear
            return (
              <Badge key={l.id} tone={valid ? 'success' : 'neutral'}>
                {sportName(l.sport)} {year}
                {valid && ' ✓'}
              </Badge>
            )
          })}
        </div>
      )}

      {details.isLoading && (
        <div className="card mb-6 p-4">
          <div className="mb-2 flex justify-between gap-4 text-sm">
            <span>A szezon jegyzőkönyveinek átnézése…</span>
            <span className="tabular muted">
              {details.loaded}/{details.total}
            </span>
          </div>
          <ProgressBar value={details.loaded} max={details.total} />
          <p className="mt-2 text-xs muted">
            Az API nem ad játékosonkénti listát, ezért a lejátszott mérkőzéseket egyenként töltjük be. Következő
            alkalommal ez gyorsítótárból azonnali.
          </p>
        </div>
      )}

      {seasonMatches.isError ? (
        <ErrorState error={seasonMatches.error} onRetry={() => seasonMatches.refetch()} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Mérkőzés" value={t.games} hint={t.games ? `${t.wins}–${t.losses} mérleg` : undefined} />
            <StatTile
              label="Pont"
              value={t.points}
              hint={t.games ? `${(t.points / t.games).toFixed(1)} / meccs` : undefined}
            />
            <StatTile
              label="Assziszt"
              value={t.assists}
              hint={t.games ? `${(t.assists / t.games).toFixed(1)} / meccs` : undefined}
            />
            <StatTile
              label="Legjobb meccs"
              value={best && best.points + best.assists > 0 ? `${best.points}P ${best.assists}A` : '–'}
              hint={
                best && best.points + best.assists > 0 ? `vs ${best.opponent}, ${fmtShort(best.match.date)}` : undefined
              }
            />
          </div>

          {byCompetition.length > 1 && (
            <Section title="Versenyenként">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byCompetition.map((c) => (
                  <Link key={c.name} to={c.id ? `/competitions/${c.id}` : '#'} className="card card-hover p-4">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="mt-1 text-sm tabular muted">
                      {c.totals.games} meccs · {c.totals.points} pont · {c.totals.assists} assziszt
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <Section title="Mérkőzései">
            {games.length === 0 && !details.isLoading ? (
              <EmptyState title={`Nincs rögzített mérkőzés a ${season}-es szezonban.`}>
                A játékos neve egyik leadott keretben sem szerepel. Próbálj másik szezont.
              </EmptyState>
            ) : (
              games.length > 0 && <GameLog games={games} />
            )}
            {details.errors > 0 && (
              <p className="mt-2 text-xs muted">{details.errors} mérkőzés adatait nem sikerült betölteni.</p>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function GameLog({ games }: { games: PlayerGame[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/60">
            <tr>
              <th className="th text-left">Dátum</th>
              <th className="th text-left">Ellenfél</th>
              <th className="th text-center">Eredmény</th>
              <th className="th hidden text-left md:table-cell">Verseny</th>
              <th className="th text-center" title="Mezszám">
                #
              </th>
              <th className="th text-center" title="Pont">
                P
              </th>
              <th className="th text-center" title="Assziszt">
                A
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {games.map((g) => {
              const m = g.match
              const own = g.side === 'home' ? m.homeScore : m.awayScore
              const opp = g.side === 'home' ? m.awayScore : m.homeScore
              const status = matchStatus(m)
              return (
                <tr key={`${m.id}-${g.side}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="td whitespace-nowrap tabular muted">{fmtDate(m.date)}</td>
                  <td className="td">
                    <Link
                      to={`/match/${m.id}`}
                      className="flex items-center gap-2 font-medium hover:text-accent-600 dark:hover:text-accent-400"
                    >
                      <span className="text-xs muted">{g.side === 'home' ? 'vs' : '@'}</span>
                      <Avatar src={g.side === 'home' ? m.awayPicture : m.homePicture} name={g.opponent} size={22} />
                      <span className="truncate">{g.opponent}</span>
                    </Link>
                  </td>
                  <td className="td">
                    <Link to={`/match/${m.id}`} className="flex items-center justify-center gap-1.5 tabular">
                      {status === 'scheduled' ? (
                        <span className="muted">–</span>
                      ) : (
                        <>
                          {g.outcome && <FormPill o={g.outcome} />}
                          <span className={clsx(status === 'live' && 'text-red-600 dark:text-red-400')}>
                            {own}:{opp}
                          </span>
                        </>
                      )}
                    </Link>
                  </td>
                  <td className="td hidden truncate md:table-cell muted">{m.competition?.name}</td>
                  <td className="td text-center tabular muted">{g.jerseyNumber ?? '–'}</td>
                  <td className={clsx('td text-center tabular', g.points > 0 && 'font-semibold')}>{g.points}</td>
                  <td className={clsx('td text-center tabular', g.assists > 0 && 'font-semibold')}>{g.assists}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
