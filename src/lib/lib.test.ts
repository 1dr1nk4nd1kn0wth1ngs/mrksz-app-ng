import { describe, expect, it } from 'vitest'
import type { BracketNode, Match } from '../api/types'
import {
  formTable,
  lineupStats,
  playerGames,
  standingsFromMatches,
  teamPlayerStats,
  teamRecord,
  teamsFromMatches,
  totals,
} from './aggregate'
import { bracketDepth, bracketMatches, bracketRounds } from './bracket'
import { matchesToIcs } from './ics'
import { buildTimeline, isUnsetDate, matchStatus, sameName } from './match'
import { email, settlementsForPostcode, streetName } from './validation'

const UNSET = '0001-01-01T00:00:00'
let nextId = 1
function match(p: Partial<Match>): Match {
  return {
    id: nextId++,
    homeTeam: 'A',
    awayTeam: 'B',
    homeScore: 0,
    awayScore: 0,
    date: '2026-05-01T10:00:00',
    startTime: UNSET,
    endTime: UNSET,
    competition: { id: 1, name: 'NB1' },
    ...p,
  }
}
const played = (home: string, away: string, hs: number, as: number, date = '2026-05-01T10:00:00') =>
  match({
    homeTeam: home,
    awayTeam: away,
    homeScore: hs,
    awayScore: as,
    date,
    startTime: date,
    endTime: date.replace('10:', '11:'),
  })

describe('match status', () => {
  it('treats DateTime.MinValue as unset', () => {
    expect(isUnsetDate(UNSET)).toBe(true)
    expect(isUnsetDate(undefined)).toBe(true)
    expect(isUnsetDate('2026-05-01T10:00:00')).toBe(false)
  })
  it('derives scheduled / live / finished', () => {
    expect(matchStatus(match({}))).toBe('scheduled')
    expect(matchStatus(match({ startTime: '2026-05-01T10:00:00' }))).toBe('live')
    expect(matchStatus(match({ startTime: '2026-05-01T10:00:00', endTime: '2026-05-01T11:30:00' }))).toBe('finished')
    // score entered without the live scorekeeping flow
    expect(matchStatus(match({ homeScore: 13, awayScore: 9 }))).toBe('finished')
  })
  it('compares names ignoring case and accents', () => {
    expect(sameName('Kovács  Ádám', 'kovacs adam')).toBe(true)
    expect(sameName('', '')).toBe(false)
  })
})

describe('timeline', () => {
  it('merges goals and timeouts with a running score and detects Callahans', () => {
    const m = match({
      homeTeam: 'Hazai',
      awayTeam: 'Vendég',
      homeGoals: [
        { id: 1, scorer: 'X', assist: 'Y', minute: 3 },
        { id: 3, scorer: 'Z', assist: 'Z', minute: 9 },
      ],
      awayGoals: [{ id: 2, scorer: 'Q', assist: 'W', minute: 5 }],
      timeouts: [{ id: 1, minute: 7, team: 'Vendég' }],
    })
    const t = buildTimeline(m)
    expect(t.map((e) => [e.kind, e.minute, e.side, e.home, e.away])).toEqual([
      ['goal', 3, 'home', 1, 0],
      ['goal', 5, 'away', 1, 1],
      ['timeout', 7, 'away', 1, 1],
      ['goal', 9, 'home', 2, 1],
    ])
    expect(t[3]!.callahan).toBe(true)
    expect(t[0]!.callahan).toBe(false)
  })
})

describe('teams', () => {
  const ms = [
    played('A', 'B', 15, 10, '2026-05-01T10:00:00'),
    played('B', 'A', 15, 12, '2026-05-08T10:00:00'),
    played('A', 'C', 15, 3, '2026-05-15T10:00:00'),
    match({ homeTeam: 'C', awayTeam: 'A', date: '2026-06-01T10:00:00' }),
  ]
  it('lists teams from matches', () => {
    expect(teamsFromMatches(ms).map((t) => t.name)).toEqual(['A', 'B', 'C'])
  })
  it('computes a record, form and streak', () => {
    const r = teamRecord(ms, 'A')
    expect(r).toMatchObject({ played: 3, win: 2, loss: 1, pointsFor: 42, pointsAgainst: 28 })
    expect(r.form).toEqual(['W', 'L', 'W'])
    expect(r.streak).toEqual({ kind: 'W', count: 1 })
  })
  it('computes standings and form tables', () => {
    const s = standingsFromMatches(ms)
    expect(s[0]).toMatchObject({ name: 'A', win: 2, loss: 1 })
    expect(s.map((r) => r.name)).toEqual(['A', 'B', 'C'])
    expect(formTable(ms).get('c')).toEqual(['L'])
  })
})

describe('player games', () => {
  const m1 = played('A', 'B', 15, 10, '2026-05-01T10:00:00')
  m1.homeLineUp = [
    { id: 10, playerId: 7, name: 'Kovács Ádám', jerseyNumber: 12, points: 3, assists: 2 },
    { id: 11, playerId: 8, name: 'Nagy Béla', jerseyNumber: 4, points: 1, assists: 0 },
  ]
  const m2 = played('C', 'A', 9, 15, '2026-05-08T10:00:00')
  // entry without points/assists and without playerId: fall back to name + goal list
  m2.awayLineUp = [{ name: 'Kovacs Adam', jerseyNumber: 12 }]
  m2.awayGoals = [
    { id: 1, scorer: 'Kovacs Adam', assist: 'Nagy Béla', minute: 4 },
    { id: 2, scorer: 'Nagy Béla', assist: 'Kovacs Adam', minute: 8 },
    { id: 3, scorer: 'Kovacs Adam', assist: 'Kovacs Adam', minute: 12 },
  ]
  const m3 = played('B', 'C', 15, 2)
  const ref = { id: 7, firstname: 'Ádám', lastname: 'Kovács' }

  it('finds every game of the player with goals and assists', () => {
    const g = playerGames([m1, m2, m3], ref)
    expect(g.map((x) => [x.match.id, x.team, x.opponent, x.points, x.assists, x.outcome])).toEqual([
      [m2.id, 'A', 'C', 2, 1, 'W'], // newest first; the Callahan is not an assist
      [m1.id, 'A', 'B', 3, 2, 'W'],
    ])
    expect(totals(g)).toMatchObject({ games: 2, points: 5, assists: 3, wins: 2, losses: 0 })
  })
  it('does not match by name when the entry has a different playerId', () => {
    const m = played('A', 'B', 1, 0)
    m.homeLineUp = [{ playerId: 99, name: 'Kovács Ádám', points: 1, assists: 0 }]
    expect(playerGames([m], ref)).toEqual([])
  })
  it('aggregates every player of a competition when no team is given', () => {
    const all = lineupStats([m1, m2, m3])
    expect(all).toHaveLength(3)
    expect(all.find((s) => s.playerId === 8)).toMatchObject({ name: 'Nagy Béla', played: 1, points: 1, assists: 0 })
    expect(lineupStats([match({})])).toEqual([]) // scheduled matches do not count
  })
  it('aggregates a team roster', () => {
    const stats = teamPlayerStats([m1, m2, m3], 'A')
    const kovacs = stats.find((s) => s.playerId === 7)!
    expect(kovacs).toMatchObject({ played: 1, points: 3, assists: 2 })
    expect(stats.find((s) => s.name === 'Kovacs Adam')).toMatchObject({ played: 1, points: 2, assists: 1 })
  })
})

describe('bracket', () => {
  const leaf = (h: string, a: string): BracketNode => ({
    match: match({ homeTeam: h, awayTeam: a }),
    homeSide: null,
    awaySide: null,
  })
  const root: BracketNode = {
    match: match({ homeTeam: 'W1', awayTeam: 'W2' }),
    homeSide: { match: match({ homeTeam: 'A', awayTeam: 'D' }), homeSide: leaf('A', 'H'), awaySide: leaf('D', 'E') },
    awaySide: { match: match({ homeTeam: 'B', awayTeam: 'C' }), homeSide: leaf('B', 'G'), awaySide: leaf('C', 'F') },
    eliminatedItem: { match: match({ homeTeam: 'L1', awayTeam: 'L2' }) },
  }
  it('flattens the tree into rounds, earliest first', () => {
    expect(bracketDepth(root)).toBe(3)
    const r = bracketRounds(root)
    expect(r.map((x) => [x.name, x.slots.length])).toEqual([
      ['Negyeddöntő', 4],
      ['Elődöntő', 2],
      ['Döntő', 1],
    ])
    expect(r[0]!.slots.map((s) => s.match?.homeTeam)).toEqual(['A', 'D', 'B', 'C'])
  })
  it('keeps aligned empty slots for unbalanced trees', () => {
    const r = bracketRounds({ match: null, homeSide: leaf('A', 'B'), awaySide: null })
    expect(r.map((x) => x.slots.length)).toEqual([2, 1])
    expect(r[0]!.slots[1]!.match).toBeNull()
  })
  it('collects all bracket matches including the 3rd place game', () => {
    expect(bracketMatches(root)).toHaveLength(8)
  })
})

describe('misc', () => {
  it('builds an iCalendar file', () => {
    const ics = matchesToIcs([match({ homeTeam: 'A, B', awayTeam: 'C', venue: 'Pálya' })], 'Test')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('SUMMARY:A\\, B – C')
    expect(ics).toContain('LOCATION:Pálya')
  })
  it('validates registration fields', () => {
    expect(email('a@b.hu')).toBeNull()
    expect(email('ab.hu')).not.toBeNull()
    expect(streetName('Petőfi')).toBeNull()
    expect(streetName('Petőfi utca')).not.toBeNull()
    expect(streetName('Rózsakert')).toBeNull()
  })
  it('resolves settlements from postcodes, including city district ranges', () => {
    const table: [number, string][] = [
      [6700, 'Szeged'],
      [2000, 'Szentendre'],
      [8000, 'A'],
      [8000, 'B'],
    ]
    expect(settlementsForPostcode(6720, table)).toEqual(['Szeged'])
    expect(settlementsForPostcode(1137, table)).toEqual(['Budapest'])
    expect(settlementsForPostcode(2000, table)).toEqual(['Szentendre'])
    expect(settlementsForPostcode(8000, table)).toEqual(['A', 'B'])
    expect(settlementsForPostcode(999, table)).toEqual([])
  })
})
