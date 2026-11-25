# MRKSZ API — discovery notes

Reverse-engineered from the production frontend bundle at https://app.mrksz.hu
(`/assets/index-*.js`, a Vite + React + Redux + MUI app). Nothing here was
documented upstream; field names come from what the old frontend reads.

Base URL: `https://mrksz-webapp-appserver-od67o.ondigitalocean.app`
(ASP.NET Core backend — SignalR hub, `0001-01-01T00:00:00` as "null" date).

Error bodies are plain strings (Hungarian), surfaced by the old app as
`error.response.data`.

## Subpages of the original app

| Route | Auth | What it shows | Endpoints |
|---|---|---|---|
| `/` | – | redirect to `/players` | |
| `/associations` | – | cards of all clubs | `GET /association` |
| `/associations/:id` | – | club details + paginated player cards | `GET /association/{id}`, `GET /association/{id}/players?pagenumber=` |
| `/players` | – | player cards, name search, pagination | `GET /player`, `GET /player?pagenumber=&searchexpression=` |
| `/players/:id` | – | name, birth year, licences | `GET /player/{id}` |
| `/register` | – | 4-step player registration form | `GET /association`, `POST /player` |
| `/licence-request` | – | licence request form | `POST /player/request` |
| `/leaguetable` | – | `?season=&competition=<name>`; league: table + player stats + matches; tournament: bracket + groups | `GET /competition?season=`, `GET /competition/{id}`, `GET /competition/{id}/playerstats?type=` |
| `/results` | – | `?season=&competition=<id>` list of matches | `GET /match/season/{year}`, `GET /competition/{id}/results?pageNumber=&pageSize=` |
| `/match/:id` | – | scoreboard, timeline, lineups; live via SignalR | `GET /match/{id}`, hub `/matchhub` |
| `/login` | – | login form | `POST /user/signin` |
| `/dashboard`, `/cp`, `/matchcontrol/:id`, `/submittablematches`, `/matchsubmission/:id`, `reset-password` | **login** | admin / scorekeeper tools | out of scope |

## Public read endpoints

### `GET /association` → `Association[]`
### `GET /association/{id}` → `Association`
```ts
Association { id, name, founded: number /*year*/, description, imageURL, webaddress,
              phonenumber, email, address: Address }
Address { postcode: number, settlement, streetsuffix, streetname, streetnumber, additional }
```

### `GET /association/{id}/players?pagenumber={n}` → `{ players: PlayerCard[], pages: number }`
### `GET /player` and `GET /player?pagenumber={n}&searchexpression={q}` → `{ players: PlayerCard[], pages }`
```ts
PlayerCard { id, firstname, lastname, birthdate, imageURL, association?: Association }
```

### `GET /player/{id}` → `PlayerDetail`
```ts
PlayerDetail { id, firstname, lastname, birthdate /* shown as birth year */, imageURL,
               licences: { id, validity: ISODate, sport: 0 | 1 | 2 }[] }
// sport: 0 Ultimate, 1 Disc-golf, 2 Freestyle
```

### `GET /competition?season={year}` → `CompetitionSummary[]`
`{ id, name, season }` (the season picker starts in 2025).

### `GET /competition/{id}` → `{ competition, matches, leagueTable, playerStats }`
```ts
Competition { id, name, season, competitionType: 0 /*League*/ | 1 /*Tournament*/,
              teams, groups: Group[], final: BracketNode | null }
Group { teams: StandingRow[], matches: Match[] }
BracketNode { match: Match | null, homeSide: BracketNode | null, awaySide: BracketNode | null,
              eliminatedItem?: { match: Match } /* 3rd-place game, root only */ }
StandingRow { name, picture, played, win, loss, pointsFor, pointsAgainst }
PlayerStat { name, played, points, assists }
```

### `GET /competition/{id}/leaguetable` → `StandingRow[]`
### `GET /competition/{id}/playerstats?type={score|assist|all}` → `PlayerStat[]` (sorted server side)
### `GET /competition/{id}/results?pageNumber={n}&pageSize={m}` → `Match[]`

### `GET /match/season/{year}` → `Match[]` (every match of the season, with `competition`)
### `GET /match/today/` → `Match[]`
### `GET /match/{id}` → `Match`
```ts
Match { id, round, season, homeTeam: string, awayTeam: string, homeScore, awayScore,
        homePicture, awayPicture, date, venue,
        startTime, endTime,            // 0001-01-01T00:00:00 = not started / not finished
        homeLineUp: LineupEntry[], awayLineUp: LineupEntry[],
        homeGoals: Goal[], awayGoals: Goal[],
        timeouts: { id, minute, team: string /* team name */ }[],
        firstPointsGender: 0 | 1 | 2,  // NotAssigned, Male, Female
        competition: Competition }
LineupEntry { id, playerId, name /* "Lastname Firstname" */, jerseyNumber, points, assists }
Goal { id, scorer: string, assist: string /* == scorer → Callahan */, minute }
```
Match state: not started when `startTime` is year 1; live when `startTime` set
and `endTime` year 1; finished when both set.

### SignalR hub `/matchhub`
WebSockets transport, `skipNegotiation: true`. The server pushes the full `Match`
DTO on method name `match{id}` (e.g. `match123`).

## Public write endpoints (forms)
- `POST /player`: registration
  `{ firstname, lastname, birthdate: "YYYY-MM-DD", birthplace, gender: "male"|"female",
     mothersfirstname, motherslastname, licences: number[], address: Address,
     association: number /*id*/, emailaddress }`
- `POST /player/request`: licence request
  `{ firstName, lastName, mothersFirstName, mothersLastName, birthdate: Date, birthplace, sport }`

Both return a message string on success and an error string on failure.

## Gaps the new frontend fills client side
- **Games of a team**: filter `GET /match/season/{year}` by team name.
- **Games of a player, with goals/assists**: no endpoint exists, so the
  frontend fetches `GET /match/{id}` for the season's played matches (cached;
  finished matches are immutable, so they are persisted in IndexedDB) and picks
  the player's lineup entries by `playerId` (name as fallback).
