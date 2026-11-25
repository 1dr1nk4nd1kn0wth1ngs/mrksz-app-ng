import type { TimelineEvent } from '../lib/match'

/** Step chart of both teams' scores over playing time. */
export function ScoreFlow({
  events,
  homeTeam,
  awayTeam,
  duration,
}: {
  events: TimelineEvent[]
  homeTeam: string
  awayTeam: string
  duration?: number | null
}) {
  const goals = events.filter((e) => e.kind === 'goal')
  if (goals.length < 2) return null
  const W = 640
  const H = 200
  const pad = { l: 28, r: 12, t: 12, b: 24 }
  const maxMin = Math.max(duration ?? 0, ...goals.map((g) => g.minute), 1)
  const maxScore = Math.max(1, ...goals.map((g) => Math.max(g.home, g.away)))
  const x = (m: number) => pad.l + (m / maxMin) * (W - pad.l - pad.r)
  const y = (s: number) => H - pad.b - (s / maxScore) * (H - pad.t - pad.b)

  const path = (side: 'home' | 'away') => {
    let d = `M${x(0)},${y(0)}`
    let prev = 0
    for (const g of goals) {
      const v = side === 'home' ? g.home : g.away
      if (v !== prev) {
        d += ` H${x(g.minute)} V${y(v)}`
        prev = v
      }
    }
    return d + ` H${x(maxMin)}`
  }
  const ticks = Array.from(new Set([0, Math.round(maxScore / 2), maxScore]))
  const minuteTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxMin / 4) * i))

  return (
    <figure className="card p-4">
      <figcaption className="mb-2 flex flex-wrap items-center gap-4 text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-home" /> {homeTeam}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-away" /> {awayTeam}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Pontok alakulása az idő függvényében"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="fill-zinc-400 text-[11px] tabular">
              {t}
            </text>
          </g>
        ))}
        {minuteTicks.map((m) => (
          <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className="fill-zinc-400 text-[11px] tabular">
            {m}'
          </text>
        ))}
        <path d={path('away')} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-away" />
        <path d={path('home')} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-home" />
      </svg>
    </figure>
  )
}
