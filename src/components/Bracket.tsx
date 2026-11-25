import clsx from 'clsx'
import { Link } from 'react-router'
import type { BracketNode, Match } from '../api/types'
import { bracketRounds } from '../lib/bracket'
import { fmtShort, fmtTime } from '../lib/format'
import { matchStatus } from '../lib/match'
import { Avatar, LiveDot } from './ui'

function SlotCard({ m, label }: { m: Match | null; label?: string }) {
  if (!m) {
    return (
      <div className="flex h-[76px] w-56 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-xs muted dark:border-zinc-700">
        Még nem ismert
      </div>
    )
  }
  const status = matchStatus(m)
  const rows = [
    {
      name: m.homeTeam,
      pic: m.homePicture,
      score: m.homeScore,
      win: status === 'finished' && m.homeScore > m.awayScore,
    },
    {
      name: m.awayTeam,
      pic: m.awayPicture,
      score: m.awayScore,
      win: status === 'finished' && m.awayScore > m.homeScore,
    },
  ]
  return (
    <Link
      to={`/match/${m.id}`}
      className={clsx('card card-hover block w-56 overflow-hidden', status === 'live' && 'ring-2 ring-red-500/50')}
    >
      {label && (
        <div className="border-b border-zinc-100 px-3 py-1 text-[11px] font-semibold tracking-wide text-accent-600 uppercase dark:border-zinc-800 dark:text-accent-400">
          {label}
        </div>
      )}
      {rows.map((r, i) => (
        <div
          key={i}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5',
            i === 0 && 'border-b border-zinc-100 dark:border-zinc-800',
            status === 'finished' && !r.win && 'text-zinc-400 dark:text-zinc-500',
          )}
        >
          <Avatar src={r.pic} name={r.name || '?'} size={20} />
          <span className={clsx('flex-1 truncate text-sm', r.win ? 'font-semibold' : 'font-medium')}>
            {r.name || 'TBD'}
          </span>
          {status !== 'scheduled' ? (
            <span className={clsx('text-sm tabular', r.win && 'font-semibold')}>{r.score}</span>
          ) : i === 0 ? (
            <span className="text-[11px] tabular muted">{fmtShort(m.date)}</span>
          ) : (
            <span className="text-[11px] tabular muted">{fmtTime(m.date)}</span>
          )}
        </div>
      ))}
      {status === 'live' && (
        <div className="flex items-center gap-1.5 bg-red-50 px-3 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <LiveDot /> Élő
        </div>
      )}
    </Link>
  )
}

/**
 * Knockout bracket drawn as columns (earliest round left). Each slot's vertical
 * space doubles per round, so connectors line up without measuring the DOM.
 */
export function Bracket({ root }: { root: BracketNode }) {
  const rounds = bracketRounds(root)
  const third = root.eliminatedItem?.match ?? null
  if (rounds.length === 0) return null
  const SLOT = 96 // px per first-round slot
  const firstCount = rounds[0]!.slots.length
  const height = firstCount * SLOT

  return (
    <div className="card overflow-x-auto p-4">
      <div className="flex min-w-max gap-10">
        {rounds.map((round, ri) => {
          const slotH = height / round.slots.length
          return (
            <div key={round.name} className="flex w-56 shrink-0 flex-col">
              <div className="mb-3 text-center text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {round.name}
              </div>
              <div className="relative" style={{ height }}>
                {round.slots.map((slot, si) => (
                  <div
                    key={slot.key}
                    className="absolute inset-x-0 flex items-center"
                    style={{ top: si * slotH, height: slotH }}
                  >
                    <SlotCard m={slot.match} />
                    {/* connector to next round */}
                    {ri < rounds.length - 1 && (
                      <span
                        aria-hidden
                        className={clsx(
                          'absolute -right-5 w-5 border-zinc-300 dark:border-zinc-700',
                          si % 2 === 0
                            ? 'top-1/2 border-t border-r rounded-tr-md'
                            : 'bottom-1/2 border-b border-r rounded-br-md',
                        )}
                        style={{ height: slotH / 2 }}
                      />
                    )}
                    {ri > 0 && (
                      <span
                        aria-hidden
                        className="absolute top-1/2 -left-5 w-5 border-t border-zinc-300 dark:border-zinc-700"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {third && (
          <div className="flex w-56 shrink-0 flex-col">
            <div className="mb-3 text-center text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Bronzmérkőzés
            </div>
            <div className="flex items-center" style={{ height }}>
              <SlotCard m={third} label="3. helyért" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
