// Local mock of the MRKSZ backend, for offline development and UI testing.
// Shapes follow docs/API.md. Data is fictional.
//   node mock/server.mjs            (listens on :4010)
//   MRKSZ_UPSTREAM=http://localhost:4010 npm run dev
import http from 'node:http'

const PORT = Number(process.env.PORT || 4010)
const UNSET = '0001-01-01T00:00:00'
const pad = (n) => String(n).padStart(2, '0')
const local = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
const now = new Date()
const year = now.getFullYear()

const firstNames = [
  'Ádám',
  'Bence',
  'Csaba',
  'Dóra',
  'Eszter',
  'Flóra',
  'Gergő',
  'Hanna',
  'Írisz',
  'János',
  'Kata',
  'Levente',
  'Míra',
  'Noémi',
]
const lastNames = [
  'Kovács',
  'Nagy',
  'Szabó',
  'Tóth',
  'Varga',
  'Kiss',
  'Molnár',
  'Farkas',
  'Balogh',
  'Papp',
  'Takács',
  'Juhász',
]

const associations = [
  { id: 1, name: 'Budapest Hurricanes SE', founded: 2006, settlement: 'Budapest' },
  { id: 2, name: 'Szegedi Korongozók', founded: 2010, settlement: 'Szeged' },
  { id: 3, name: 'Debreceni Szél', founded: 2012, settlement: 'Debrecen' },
  { id: 4, name: 'Pécsi Repülők', founded: 2015, settlement: 'Pécs' },
  { id: 5, name: 'Győri Frizbi Klub', founded: 2009, settlement: 'Győr' },
  { id: 6, name: 'Miskolci Vihar', founded: 2018, settlement: 'Miskolc' },
].map((a) => ({
  ...a,
  description: `A ${a.name} ${a.founded} óta foglalkozik ultimate frizbivel ${a.settlement} városában.`,
  imageURL: '',
  webaddress: `www.${a.name.split(' ')[0].toLowerCase()}-ultimate.hu`,
  phonenumber: '+36 30 123 4567',
  email: `info@${a.name.split(' ')[0].toLowerCase()}.hu`,
  address: {
    postcode: 1111,
    settlement: a.settlement,
    streetname: 'Sport',
    streetsuffix: 'utca',
    streetnumber: '1',
    additional: '',
  },
}))

// Players: 12 per association.
const players = []
let pid = 1
for (const a of associations)
  for (let i = 0; i < 12; i++) {
    const firstname = firstNames[(pid * 7) % firstNames.length]
    const lastname = lastNames[(pid * 5 + a.id) % lastNames.length]
    players.push({
      id: pid,
      firstname,
      lastname,
      birthdate: `${1985 + ((pid * 3) % 20)}`,
      imageURL: '',
      association: associations.find((x) => x.id === a.id),
      licences: [
        { id: pid * 10, validity: `${year}-12-31T00:00:00`, sport: 0 },
        { id: pid * 10 + 1, validity: `${year - 1}-12-31T00:00:00`, sport: 0 },
      ],
      teamOf: a.id,
    })
    pid++
  }

let mid = 1000
let gid = 1
function makeMatch({ home, away, date, state, comp, round, hs = 0, as = 0 }) {
  const homePlayers = players.filter((p) => p.teamOf === home.id)
  const awayPlayers = players.filter((p) => p.teamOf === away.id)
  const lineup = (ps) =>
    ps
      .slice(0, 10)
      .map((p, i) => ({
        id: p.id * 100 + mid,
        playerId: p.id,
        name: `${p.lastname} ${p.firstname}`,
        jerseyNumber: (i * 7 + 3) % 99,
        points: 0,
        assists: 0,
      }))
  const m = {
    id: mid++,
    round,
    season: year,
    homeTeam: home.name,
    awayTeam: away.name,
    homeScore: 0,
    awayScore: 0,
    homePicture: '',
    awayPicture: '',
    date: local(date),
    venue: ['Kincsem Park', 'Tüskecsarnok', 'Ligeti pálya', 'Egyetemi sportpálya'][mid % 4],
    startTime: UNSET,
    endTime: UNSET,
    homeLineUp: state === 'scheduled' ? [] : lineup(homePlayers),
    awayLineUp: state === 'scheduled' ? [] : lineup(awayPlayers),
    homeGoals: [],
    awayGoals: [],
    timeouts: [],
    firstPointsGender: 0,
    competition: { id: comp.id, name: comp.name, season: year, competitionType: comp.competitionType },
  }
  if (state !== 'scheduled') {
    const start = state === 'live' ? new Date(Date.now() - 38 * 60000) : date
    m.startTime = local(start)
    if (state === 'finished') m.endTime = local(new Date(start.getTime() + 95 * 60000))
    const total = hs + as
    const len = state === 'live' ? 38 : 92
    let h = 0
    let a = 0
    for (let i = 0; i < total; i++) {
      const homeScores = h < hs && (a >= as || (i * 7 + mid) % 2 === 0)
      const side = homeScores ? m.homeLineUp : m.awayLineUp
      const scorer = side[(i * 3 + 1) % side.length]
      const assist = (i + mid) % 11 === 0 ? scorer : side[(i * 7 + 4) % side.length]
      scorer.points++
      if (assist !== scorer) assist.assists++
      const goal = {
        id: gid++,
        scorer: scorer.name,
        assist: assist.name,
        minute: Math.round(((i + 1) / (total + 1)) * len),
      }
      if (homeScores) {
        m.homeGoals.push(goal)
        h++
      } else {
        m.awayGoals.push(goal)
        a++
      }
    }
    m.homeScore = h
    m.awayScore = a
    m.timeouts = [{ id: gid++, minute: Math.round(len * 0.4), team: home.name }]
  }
  return m
}

const day = (offset, hour = 10) => {
  const d = new Date(now)
  d.setDate(d.getDate() + offset)
  d.setHours(hour, 0, 0, 0)
  return d
}

// League: NB1, double round robin among 4 teams, half played.
const nb1 = { id: 1, name: 'NB1', season: year, competitionType: 0 }
const nb1Teams = associations.slice(0, 4)
const nb1Matches = []
const pairs = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
  [1, 0],
  [3, 2],
  [2, 0],
  [3, 1],
  [3, 0],
  [2, 1],
]
pairs.forEach(([h, a], i) => {
  const round = Math.floor(i / 2) + 1
  const offset = (round - 4) * 7
  const state = offset < 0 ? 'finished' : offset === 0 && i % 2 === 0 ? 'live' : 'scheduled'
  const hs = state === 'scheduled' ? 0 : 9 + ((i * 5) % 7)
  const as = state === 'scheduled' ? 0 : 15 - ((i * 3) % 6)
  nb1Matches.push(
    makeMatch({
      home: nb1Teams[h],
      away: nb1Teams[a],
      date: day(offset, 10 + (i % 2) * 2),
      state,
      comp: nb1,
      round,
      hs: state === 'live' ? 7 : hs,
      as: state === 'live' ? 6 : as,
    }),
  )
})

// Tournament: groups then playoffs.
const cup = { id: 2, name: 'Magyar Kupa', season: year, competitionType: 1 }
const ga = [associations[0], associations[2], associations[4]]
const gb = [associations[1], associations[3], associations[5]]
const groupMatches = (teams, offset) => [
  makeMatch({ home: teams[0], away: teams[1], date: day(offset, 9), state: 'finished', comp: cup, hs: 13, as: 8 }),
  makeMatch({ home: teams[1], away: teams[2], date: day(offset, 11), state: 'finished', comp: cup, hs: 13, as: 11 }),
  makeMatch({ home: teams[2], away: teams[0], date: day(offset, 13), state: 'finished', comp: cup, hs: 10, as: 13 }),
]
const gaM = groupMatches(ga, -20)
const gbM = groupMatches(gb, -20)
const standings = (teams, ms) =>
  teams
    .map((t) => {
      const r = { name: t.name, picture: '', played: 0, win: 0, loss: 0, pointsFor: 0, pointsAgainst: 0 }
      for (const m of ms) {
        const home = m.homeTeam === t.name
        if (!home && m.awayTeam !== t.name) continue
        const own = home ? m.homeScore : m.awayScore
        const opp = home ? m.awayScore : m.homeScore
        r.played++
        r.pointsFor += own
        r.pointsAgainst += opp
        if (own > opp) r.win++
        else r.loss++
      }
      return r
    })
    .sort((a, b) => b.win - a.win)
const sa = standings(ga, gaM)
const sb = standings(gb, gbM)
const byName = (n) => associations.find((a) => a.name === n)
const semi1 = makeMatch({
  home: byName(sa[0].name),
  away: byName(sb[1].name),
  date: day(-13, 10),
  state: 'finished',
  comp: cup,
  hs: 15,
  as: 12,
})
const semi2 = makeMatch({
  home: byName(sb[0].name),
  away: byName(sa[1].name),
  date: day(-13, 12),
  state: 'finished',
  comp: cup,
  hs: 11,
  as: 15,
})
const final = makeMatch({
  home: byName(semi1.homeTeam),
  away: byName(semi2.awayTeam),
  date: day(3, 15),
  state: 'scheduled',
  comp: cup,
})
const bronze = makeMatch({
  home: byName(semi1.awayTeam),
  away: byName(semi2.homeTeam),
  date: day(3, 12),
  state: 'scheduled',
  comp: cup,
})
const cupBracket = {
  match: final,
  homeSide: { match: semi1, homeSide: null, awaySide: null },
  awaySide: { match: semi2, homeSide: null, awaySide: null },
  eliminatedItem: { match: bronze },
}
const cupGroups = [
  { teams: sa, matches: gaM },
  { teams: sb, matches: gbM },
]

// Second round robin of group A: in the season list but, like the real backend does for
// some tournaments, missing from the competition payload's groups.
const ga2M = groupMatches([ga[1], ga[2], ga[0]], -16)
const allMatches = [...nb1Matches, ...gaM, ...gbM, ...ga2M, semi1, semi2, final, bronze]
const cupTop10 = () => {
  return stats(allMatches.filter((m) => m.competition?.id === 2))
    .sort((a, b) => b.points + b.assists - (a.points + a.assists))
    .slice(0, 10)
}
const summary = (m) => {
  // The list endpoint is assumed not to carry lineups/goals (worst case for the UI).
  const { homeLineUp, awayLineUp, homeGoals, awayGoals, timeouts, ...rest } = m
  return rest
}
const stats = (ms) => {
  const map = new Map()
  for (const m of ms)
    for (const e of [...m.homeLineUp, ...m.awayLineUp]) {
      const s = map.get(e.playerId) ?? { name: e.name, playerId: e.playerId, played: 0, points: 0, assists: 0 }
      s.played++
      s.points += e.points
      s.assists += e.assists
      map.set(e.playerId, s)
    }
  return [...map.values()].sort((a, b) => b.points - a.points)
}

const competitions = { 1: nb1, 2: cup }
function competitionDetail(id) {
  if (id === 1) {
    const table = standings(
      nb1Teams,
      nb1Matches.filter((m) => m.endTime !== UNSET),
    )
    return {
      competition: { ...nb1, teams: [], groups: [], final: null },
      matches: nb1Matches.map(summary),
      leagueTable: table,
      playerStats: stats(nb1Matches),
    }
  }
  if (id === 2) {
    const cupMatches = [...gaM, ...gbM, semi1, semi2, final, bronze]
    return {
      competition: {
        ...cup,
        teams: [],
        groups: cupGroups.map((g) => ({ ...g, matches: g.matches.map(summary) })),
        final: {
          ...cupBracket,
          match: summary(final),
          homeSide: { match: summary(semi1), homeSide: null, awaySide: null },
          awaySide: { match: summary(semi2), homeSide: null, awaySide: null },
          eliminatedItem: { match: summary(bronze) },
        },
      },
      matches: [],
      leagueTable: [],
      // Like the real backend appears to do for tournaments: no stats here or at /playerstats.
      playerStats: [],
    }
  }
  return null
}

const paged = (list, page, size = 12) => ({
  players: list.slice((page - 1) * size, page * size).map(({ licences, teamOf, ...p }) => p),
  pages: Math.max(1, Math.ceil(list.length / size)),
})

function route(method, url) {
  const u = new URL(url, 'http://x')
  const p = u.pathname.replace(/\/+$/, '')
  const page = Number(u.searchParams.get('pagenumber') || 1)
  let m
  if (method === 'POST' && p === '/player')
    return [200, 'Sikeres regisztráció! A megadott e-mail címre hamarosan levelet küldünk.']
  if (method === 'POST' && p === '/player/request') return [200, 'Az igénylést rögzítettük.']
  if (method !== 'GET') return [405, 'Nem támogatott']
  if (p === '/association') return [200, associations]
  if ((m = p.match(/^\/association\/(\d+)$/))) {
    const a = associations.find((x) => x.id === Number(m[1]))
    return a ? [200, a] : [404, 'Az egyesület nem található']
  }
  if ((m = p.match(/^\/association\/(\d+)\/players$/)))
    return [
      200,
      paged(
        players.filter((x) => x.teamOf === Number(m[1])),
        page,
      ),
    ]
  if (p === '/player') {
    const q = (u.searchParams.get('searchexpression') || '').toLowerCase()
    const list = q ? players.filter((x) => `${x.lastname} ${x.firstname}`.toLowerCase().includes(q)) : players
    return [200, paged(list, page)]
  }
  if ((m = p.match(/^\/player\/(\d+)$/))) {
    const x = players.find((y) => y.id === Number(m[1]))
    if (!x) return [404, 'A játékos nem található']
    const { teamOf, ...rest } = x
    return [200, rest]
  }
  if (p === '/competition')
    return [200, Number(u.searchParams.get('season')) === year ? Object.values(competitions) : []]
  if ((m = p.match(/^\/competition\/(\d+)$/))) {
    const d = competitionDetail(Number(m[1]))
    return d ? [200, d] : [404, 'A verseny nem található']
  }
  if ((m = p.match(/^\/competition\/(\d+)\/leaguetable$/)))
    return [200, competitionDetail(Number(m[1]))?.leagueTable ?? []]
  if ((m = p.match(/^\/competition\/(\d+)\/playerstats$/)))
    // Like the real backend: the cup's endpoint list stops at the top 10.
    return [200, Number(m[1]) === 2 ? cupTop10() : (competitionDetail(Number(m[1]))?.playerStats ?? [])]
  if ((m = p.match(/^\/match\/season\/(\d+)$/))) return [200, Number(m[1]) === year ? allMatches.map(summary) : []]
  if (p === '/match/today') {
    const k = local(now).slice(0, 10)
    return [200, allMatches.filter((x) => x.date.startsWith(k)).map(summary)]
  }
  if ((m = p.match(/^\/match\/(\d+)$/))) {
    const x = allMatches.find((y) => y.id === Number(m[1]))
    return x ? [200, x] : [404, 'A mérkőzés nem található']
  }
  return [404, 'Nem található']
}

http
  .createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const [status, data] = route(req.method, req.url)
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify(data))
      console.log(req.method, req.url, status)
    })
  })
  .listen(PORT, () => console.log(`MRKSZ mock API on http://localhost:${PORT}`))
