import { useState } from 'react'
import { Link } from 'react-router'
import { useAssociations } from '../api/hooks'
import { IconBuilding } from '../components/icons'
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui'
import { normalizeName } from '../lib/match'

export default function AssociationsPage() {
  const q = useAssociations()
  const [text, setText] = useState('')
  const list = (q.data ?? [])
    .filter((a) => normalizeName(a.name).includes(normalizeName(text)))
    .sort((a, b) => a.name.localeCompare(b.name, 'hu'))

  return (
    <div>
      <PageHeader title="Egyesületek" subtitle="Az MRKSZ tagegyesületei." />
      <input
        className="input mb-5 max-w-md"
        placeholder="Egyesület keresése…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="Nincs egyesület." icon={<IconBuilding className="size-8" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <Link key={a.id} to={`/associations/${a.id}`} className="card card-hover flex items-center gap-4 p-5">
              <Avatar src={a.imageURL} name={a.name} size={56} rounded="xl" />
              <div className="min-w-0">
                <div className="font-semibold">{a.name}</div>
                {a.founded ? <div className="text-sm muted">Alapítva {a.founded}</div> : null}
                {a.address?.settlement && <div className="text-sm muted">{a.address.settlement}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
