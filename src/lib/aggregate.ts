import type { LineupEntry, Match, PlayerStat, StandingRow } from '../api/types'
import { matchStatus, matchTime, normalizeName, outcomeFor, sameName, sideOf, type Outcome, type Side } from './match'

/* ---------- Teams ---------- */

export interface TeamInfo {
  name: string
  picture?: string
  competitions: string[]
  matches: number
}

/** Teams are not an API resource; derive them from a season's matches. */
export function teamsFromMatches(matches: Match[]): TeamInfo[] {
  const map = new Map<string, TeamInfo>()
  const add = (name: string, picture: string | undefined, comp: string | undefined) => {
    if (!name) return
    const key = normalizeName(name)
    let t = map.get(key)
    if (!t) {
      t = { name, picture: picture || undefined, competitions: [], matches: 0 }
      map.set(key, t)
    }
    if (!t.picture && picture) t.picture = picture
    if (comp && !t.competitions.includes(comp)) t.competitions.push(comp)
    t.matches++
  }
  for (const m of matches) {
    add(m.homeTeam, m.homePicture, m.competition?.name)
    add(m.awayTeam, m.awayPicture, m.competition?.name)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'hu'))
}

export function teamMatches(matches: Match[], team: string): Match[] {
  return matches.filter((m) => sideOf(m, team) !== null).sort((a, b) => matchTime(a) - matchTime(b))
}

export interface TeamRecord {
  played: number
  win: number
  loss: number
  draw: number
  pointsFor: number
  pointsAgainst: number
  form: Outcome[]
  streak: { kind: Outcome; count: number } | null
}

export function teamRecord(matches: Match[], team: string): TeamRecord {
  const r: TeamRecord = { played: 0, win: 0, loss: 0, draw: 0, pointsFor: 0, pointsAgainst: 0, form: [], streak: null }
  const finished = matches.filter((m) => outcomeFor(m, team) !== null).sort((a, b) => matchTime(a) - matchTime(b))
  for (const m of finished) {
    const side = sideOf(m, team)!
    const o = outcomeFor(m, team)!
    r.played++
    if (o === 'W') r.win++
    else if (o === 'L') r.loss++
    else r.draw++
    r.pointsFor += side === 'home' ? m.homeScore : m.awayScore
    r.pointsAgainst += side === 'home' ? m.awayScore : m.homeScore
    r.form.push(o)
  }
  r.form = r.form.slice(-5)
  for (let i = finished.length - 1; i >= 0; i--) {
    const o = outcomeFor(finished[i]!, team)!
    if (!r.streak) r.streak = { kind: o, count: 1 }
    else if (r.streak.kind === o) r.streak.count++
    else break
  }
  return r
}

/** Last-5 form per team name, from a competition's matches. */
export function formTable(matches: Match[]): Map<string, Outcome[]> {
  const out = new Map<string, Outcome[]>()
  const sorted = [...matches].sort((a, b) => matchTime(a) - matchTime(b))
  for (const m of sorted) {
    if (matchStatus(m) !== 'finished') continue
    for (const team of [m.homeTeam, m.awayTeam]) {
      const key = normalizeName(team)
      const list = out.get(key) ?? []
      list.push(outcomeFor(m, team)!)
      out.set(key, list)
    }
  }
  for (const [k, v] of out) out.set(k, v.slice(-5))
  return out
}

/** Standings computed from matches, used when the API returns none for a group. */
export function standingsFromMatches(matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  const row = (name: string, picture?: string) => {
    const k = normalizeName(name)
    let r = rows.get(k)
    if (!r) {
      r = { name, picture, played: 0, win: 0, loss: 0, pointsFor: 0, pointsAgainst: 0 }
      rows.set(k, r)
    }
    return r
  }
  for (const m of matches) {
    const h = row(m.homeTeam, m.homePicture)
    const a = row(m.awayTeam, m.awayPicture)
    if (matchStatus(m) !== 'finished') continue
    h.played++
    a.played++
    h.pointsFor! += m.homeScore
    h.pointsAgainst! += m.awayScore
    a.pointsFor! += m.awayScore
    a.pointsAgainst! += m.homeScore
    if (m.homeScore > m.awayScore) {
      h.win++
      a.loss++
    } else if (m.homeScore < m.awayScore) {
      a.win++
      h.loss++
    }
  }
  return sortStandings([...rows.values()])
}

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      b.win - a.win ||
      a.loss - b.loss ||
      (b.pointsFor ?? 0) - (b.pointsAgainst ?? 0) - ((a.pointsFor ?? 0) - (a.pointsAgainst ?? 0)) ||
      (b.pointsFor ?? 0) - (a.pointsFor ?? 0) ||
      a.name.localeCompare(b.name, 'hu'),
  )
}

/* ---------- Players ---------- */

export interface PlayerRef {
  id: number
  firstname: string
  lastname: string
}

export interface PlayerGame {
  match: Match
  side: Side
  team: string
  opponent: string
  jerseyNumber?: number
  points: number
  assists: number
  outcome: Outcome | null
}

function countFromGoals(m: Match, side: Side, name: string) {
  const goals = (side === 'home' ? m.homeGoals : m.awayGoals) ?? []
  let points = 0
  let assists = 0
  for (const g of goals) {
    if (sameName(g.scorer, name)) points++
    if (sameName(g.assist, name) && !sameName(g.assist, g.scorer)) assists++
  }
  return { points, assists }
}

function findEntry(lineup: LineupEntry[] | undefined, player: PlayerRef): LineupEntry | undefined {
  if (!lineup) return undefined
  const byId = lineup.find((e) => e.playerId !== undefined && e.playerId === player.id)
  if (byId) return byId
  // Fallback for entries without playerId: the API formats names as "Lastname Firstname".
  const full = `${player.lastname} ${player.firstname}`
  return lineup.find((e) => e.playerId === undefined && sameName(e.name, full))
}

/** Every game in which the player was in a lineup, with their points and assists. */
export function playerGames(details: Match[], player: PlayerRef): PlayerGame[] {
  const games: PlayerGame[] = []
  for (const m of details) {
    for (const side of ['home', 'away'] as const) {
      const entry = findEntry(side === 'home' ? m.homeLineUp : m.awayLineUp, player)
      if (!entry) continue
      const fromGoals = countFromGoals(m, side, entry.name)
      const team = side === 'home' ? m.homeTeam : m.awayTeam
      games.push({
        match: m,
        side,
        team,
        opponent: side === 'home' ? m.awayTeam : m.homeTeam,
        jerseyNumber: entry.jerseyNumber,
        points: entry.points ?? fromGoals.points,
        assists: entry.assists ?? fromGoals.assists,
        outcome: outcomeFor(m, team),
      })
    }
  }
  return games.sort((a, b) => matchTime(b.match) - matchTime(a.match))
}

export interface GameTotals {
  games: number
  points: number
  assists: number
  wins: number
  losses: number
}

export function totals(games: PlayerGame[]): GameTotals {
  return games.reduce<GameTotals>(
    (t, g) => {
      const played = matchStatus(g.match) !== 'scheduled'
      return {
        games: t.games + (played ? 1 : 0),
        points: t.points + g.points,
        assists: t.assists + g.assists,
        wins: t.wins + (g.outcome === 'W' ? 1 : 0),
        losses: t.losses + (g.outcome === 'L' ? 1 : 0),
      }
    },
    { games: 0, points: 0, assists: 0, wins: 0, losses: 0 },
  )
}

/**
 * Player stats summed from match lineups. With `team`, only that team's lineups are
 * counted (a team's season); without it, every player of every match (a competition).
 */
export function lineupStats(details: Match[], team?: string): (PlayerStat & { playerId?: number })[] {
  const map = new Map<string, PlayerStat & { playerId?: number }>()
  for (const m of details) {
    if (matchStatus(m) === 'scheduled') continue
    const sides: Side[] = team ? [sideOf(m, team)].filter((s): s is Side => s !== null) : ['home', 'away']
    for (const side of sides) {
      const lineup = (side === 'home' ? m.homeLineUp : m.awayLineUp) ?? []
      for (const e of lineup) {
        const key = e.playerId !== undefined ? `id:${e.playerId}` : `n:${normalizeName(e.name)}`
        const s = map.get(key) ?? { name: e.name, playerId: e.playerId, played: 0, points: 0, assists: 0 }
        const fromGoals = countFromGoals(m, side, e.name)
        s.played++
        s.points += e.points ?? fromGoals.points
        s.assists += e.assists ?? fromGoals.assists
        map.set(key, s)
      }
    }
  }
  return [...map.values()].sort((a, b) => b.points + b.assists - (a.points + a.assists) || b.points - a.points)
}

export const teamPlayerStats = (details: Match[], team: string) => lineupStats(details, team)
