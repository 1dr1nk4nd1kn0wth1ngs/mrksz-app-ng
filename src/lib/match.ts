import type { Goal, Match } from '../api/types'

export type MatchStatus = 'scheduled' | 'live' | 'finished'

/** The backend uses 0001-01-01T00:00:00 (C# DateTime.MinValue) as "not set". */
export function isUnsetDate(d: string | undefined | null): boolean {
  if (!d) return true
  const t = new Date(d)
  return Number.isNaN(t.getTime()) || t.getFullYear() <= 1
}

export function matchStatus(m: Pick<Match, 'startTime' | 'endTime' | 'homeScore' | 'awayScore' | 'date'>): MatchStatus {
  const started = !isUnsetDate(m.startTime)
  const ended = !isUnsetDate(m.endTime)
  if (started && !ended) return 'live'
  if (started && ended) return 'finished'
  // Results entered without the live scorekeeper flow still count as played.
  if ((m.homeScore ?? 0) + (m.awayScore ?? 0) > 0) return 'finished'
  return 'scheduled'
}

/** Minute of play, counted the way the original app did (1-based, whole minutes). */
export function liveMinute(m: Pick<Match, 'startTime'>, now = Date.now()): number | null {
  if (isUnsetDate(m.startTime)) return null
  return Math.max(1, Math.floor((now - new Date(m.startTime!).getTime()) / 60000) + 1)
}

export function matchDuration(m: Pick<Match, 'startTime' | 'endTime'>): number | null {
  if (isUnsetDate(m.startTime) || isUnsetDate(m.endTime)) return null
  return Math.floor((new Date(m.endTime!).getTime() - new Date(m.startTime!).getTime()) / 60000) + 1
}

export function matchTime(m: Pick<Match, 'date'>): number {
  const t = new Date(m.date).getTime()
  return Number.isNaN(t) ? 0 : t
}

export type Side = 'home' | 'away'

export function sideOf(m: Pick<Match, 'homeTeam' | 'awayTeam'>, team: string): Side | null {
  if (sameName(m.homeTeam, team)) return 'home'
  if (sameName(m.awayTeam, team)) return 'away'
  return null
}

export type Outcome = 'W' | 'L' | 'D'

export function outcomeFor(m: Match, team: string): Outcome | null {
  const side = sideOf(m, team)
  if (!side || matchStatus(m) !== 'finished') return null
  const own = side === 'home' ? m.homeScore : m.awayScore
  const opp = side === 'home' ? m.awayScore : m.homeScore
  return own > opp ? 'W' : own < opp ? 'L' : 'D'
}

export function normalizeName(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeName(a) === normalizeName(b) && normalizeName(a) !== ''
}

export interface TimelineEvent {
  kind: 'goal' | 'timeout'
  id: string
  minute: number
  side: Side
  scorer?: string
  assist?: string
  callahan?: boolean
  /** Score after this event (goals only change it). */
  home: number
  away: number
}

/** Goals and timeouts of both teams merged into one chronological list with running score. */
export function buildTimeline(m: Match): TimelineEvent[] {
  type Raw = { kind: 'goal' | 'timeout'; id: string; minute: number; side: Side; goal?: Goal; order: number }
  const raw: Raw[] = []
  const push = (goals: Goal[] | undefined, side: Side) =>
    (goals ?? []).forEach((g) =>
      raw.push({ kind: 'goal', id: `g${g.id}`, minute: g.minute ?? 0, side, goal: g, order: g.id ?? 0 }),
    )
  push(m.homeGoals, 'home')
  push(m.awayGoals, 'away')
  for (const t of m.timeouts ?? []) {
    raw.push({
      kind: 'timeout',
      id: `t${t.id}`,
      minute: t.minute ?? 0,
      side: sameName(t.team, m.homeTeam) ? 'home' : 'away',
      order: t.id ?? 0,
    })
  }
  raw.sort((a, b) => a.minute - b.minute || (a.kind === b.kind ? a.order - b.order : a.kind === 'goal' ? -1 : 1))
  let home = 0
  let away = 0
  return raw.map((r) => {
    if (r.kind === 'goal') {
      if (r.side === 'home') home++
      else away++
    }
    const scorer = r.goal?.scorer ?? undefined
    const assist = r.goal?.assist ?? undefined
    return {
      kind: r.kind,
      id: r.id,
      minute: r.minute,
      side: r.side,
      scorer,
      assist,
      callahan: !!scorer && !!assist && sameName(scorer, assist),
      home,
      away,
    }
  })
}

export function competitionLabel(m: Match): string {
  return m.competition?.name ?? ''
}
