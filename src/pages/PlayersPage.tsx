import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { usePlayers } from '../api/hooks'
import type { PlayerCard } from '../api/types'
import { IconSearch, IconUser } from '../components/icons'
import { Avatar, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Spinner } from '../components/ui'
import { birthYear, playerName } from '../lib/format'

export function PlayerGrid({ players }: { players: PlayerCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {players.map((p) => (
        <Link key={p.id} to={`/players/${p.id}`} className="card card-hover flex items-center gap-3 p-3.5">
          <Avatar src={p.imageURL} name={playerName(p)} size={48} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{playerName(p)}</div>
            <div className="flex items-center gap-1.5 truncate text-xs muted">
              {p.association?.imageURL && <img src={p.association.imageURL} alt="" className="size-3.5 rounded-full" />}
              <span className="truncate">{p.association?.name ?? ''}</span>
              {birthYear(p.birthdate) && <span>· {birthYear(p.birthdate)}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function PlayerGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="h-[76px]" />
      ))}
    </div>
  )
}

export default function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const urlQ = params.get('q') ?? ''
  const [text, setText] = useState(urlQ)

  useEffect(() => setText(urlQ), [urlQ])
  useEffect(() => {
    if (text === urlQ) return
    const t = setTimeout(() => setParams(text ? { q: text } : {}, { replace: true }), 300)
    return () => clearTimeout(t)
  }, [text, urlQ, setParams])

  const q = usePlayers(page, urlQ)
  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <PageHeader title="Játékosok" subtitle="Az MRKSZ nyilvántartásában szereplő játékosok." />
      <div className="relative mb-6 max-w-xl">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          className="input pl-10"
          placeholder="Keresés név alapján…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus={!!urlQ}
        />
        {q.isFetching && !q.isLoading && <Spinner className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />}
      </div>
      {q.isLoading ? (
        <PlayerGridSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.players?.length ? (
        <EmptyState title="Nincs találat." icon={<IconUser className="size-8" />}>
          {urlQ && `Nincs „${urlQ}” nevű játékos.`}
        </EmptyState>
      ) : (
        <>
          <PlayerGrid players={q.data.players} />
          <Pagination page={page} pages={q.data.pages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
