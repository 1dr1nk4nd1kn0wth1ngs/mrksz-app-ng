import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAssociation, useAssociationPlayers, useSeasonMatches } from '../api/hooks'
import { IconChevronLeft, IconGlobe, IconMail, IconMapPin, IconPhone } from '../components/icons'
import { Avatar, EmptyState, ErrorState, Pagination, Section, Skeleton } from '../components/ui'
import { teamsFromMatches } from '../lib/aggregate'
import { normalizeName } from '../lib/match'
import { currentSeason } from '../lib/season'
import { PlayerGrid, PlayerGridSkeleton } from './PlayersPage'

export default function AssociationPage() {
  const id = Number(useParams().id)
  const [page, setPage] = useState(1)
  const a = useAssociation(id)
  const players = useAssociationPlayers(id, page)
  const season = currentSeason()
  const matches = useSeasonMatches(season)

  // Teams of this club: team names equal to, or starting with, the club name.
  const teams = useMemo(() => {
    if (!a.data) return []
    const n = normalizeName(a.data.name)
    return teamsFromMatches(matches.data ?? []).filter((t) => {
      const tn = normalizeName(t.name)
      return tn === n || tn.startsWith(n + ' ')
    })
  }, [a.data, matches.data])

  if (a.isLoading) return <Skeleton className="h-48" />
  if (a.isError || !a.data) return <ErrorState error={a.error} onRetry={() => a.refetch()} />
  const c = a.data
  const addr = c.address
  const address = addr
    ? [
        addr.postcode || '',
        addr.settlement,
        [addr.streetname, addr.streetsuffix, addr.streetnumber].filter(Boolean).join(' '),
        addr.additional,
      ]
        .filter(Boolean)
        .join(', ')
    : ''
  const web = c.webaddress ? (/^https?:\/\//.test(c.webaddress) ? c.webaddress : `https://${c.webaddress}`) : ''

  return (
    <div>
      <Link
        to="/associations"
        className="mb-3 inline-flex items-center gap-1 text-sm muted hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <IconChevronLeft className="size-4" /> Egyesületek
      </Link>
      <div className="card mb-8 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <Avatar src={c.imageURL} name={c.name} size={96} rounded="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.name}</h1>
          {c.founded ? <p className="mt-1 muted">Alapítva {c.founded}</p> : null}
          {c.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{c.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {web && (
              <a
                href={web}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-accent-600 hover:underline dark:text-accent-400"
              >
                <IconGlobe className="size-4" /> {c.webaddress}
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex items-center gap-1.5 text-accent-600 hover:underline dark:text-accent-400"
              >
                <IconMail className="size-4" /> {c.email}
              </a>
            )}
            {c.phonenumber && (
              <a
                href={`tel:${c.phonenumber}`}
                className="flex items-center gap-1.5 muted hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <IconPhone className="size-4" /> {c.phonenumber}
              </a>
            )}
            {address && (
              <span className="flex items-center gap-1.5 muted">
                <IconMapPin className="size-4" /> {address}
              </span>
            )}
          </div>
        </div>
      </div>

      {teams.length > 0 && (
        <Section title={`Csapatok (${season})`}>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <Link
                key={t.name}
                to={`/teams/${encodeURIComponent(t.name)}?season=${season}`}
                className="card card-hover flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <Avatar src={t.picture} name={t.name} size={28} />
                <span className="font-medium">{t.name}</span>
                <span className="text-xs muted">{t.competitions.join(', ')}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="Játékosok">
        {players.isLoading ? (
          <PlayerGridSkeleton />
        ) : players.isError ? (
          <ErrorState error={players.error} onRetry={() => players.refetch()} />
        ) : !players.data?.players?.length ? (
          <EmptyState title="Nincs nyilvántartott játékos." />
        ) : (
          <>
            <PlayerGrid players={players.data.players} />
            <Pagination page={page} pages={players.data.pages} onChange={setPage} />
          </>
        )}
      </Section>
    </div>
  )
}
