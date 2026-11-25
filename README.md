# Goal

I want a better frontend for the MRKSZ app, available at https://app.mrksz.hu

The current frontend could be improved in many ways.

## Design, aesthetics

- The frontend should have a dark mode.
- It should have a more modern design, something that current modern apps use. I don't know how to put this better into words, it should look nicer :)

## Features

- The current views are designed for a simple league format. More complicated formats (such as round robin, then elimination) should be better supported.
- It should be possible to list all the games of a single team.
- It should be possible to list all the games of a single player, with the number of goals/assists made at each game.
- Basically anything else that comes to your mind and sounds useful.

# Scope

It's possible to log in to the app, which would unlock more features. But since I don't have credentials, anything that requires a login is out of scope.

# Implementation plan

## Discovery

- Explore the app, find all the subpages.
- The app uses a json API. Explore this API by reading the subpages' code.

## Implementation

- Implement the json API explored during discovery.
- Build the frontend around the API.

---

# Implementation

A new public frontend for the MRKSZ backend: Vite + React 19 + TypeScript, Tailwind CSS v4, TanStack Query, React Router. The UI is in Hungarian, like the original.

- **API discovery:** [`docs/API.md`](docs/API.md) lists every subpage of the original app, every endpoint, and the response shapes, all reverse-engineered from the production bundle.
- **API client:** `src/api/` contains the typed endpoints, query hooks, live match updates over SignalR, and an IndexedDB cache for finished matches.

## Features

| | |
|---|---|
| Design | Dark / light / system theme (no flash on load), responsive layout with a mobile tab bar, skeleton loading states |
| Competitions | League view: table with form guide, rounds, player stats. Tournament view: stage tracker, group tables (teams that reached the playoffs are highlighted), knockout bracket with 3rd-place game |
| Games of a team | `/teams/:name`: every game of the season, W/L record, point difference, form and streak, per-competition breakdown, roster stats, `.ics` calendar export |
| Games of a player | `/players/:id`: every game with jersey number, points and assists, season totals, per-competition split, best game, licences |
| Matches | Season list filtered by competition, team, status and text. Match page: live clock, real-time updates (SignalR with polling fallback), two-sided timeline with running score and Callahans, lineups, score-flow chart |
| Other | Global search (Ctrl/⌘K or `/`) across players, teams, competitions and clubs; favourite teams and players on the home page; club pages linked to their teams; registration and licence-request forms; the original app's URLs (`/leaguetable`, `/results`) redirect |

There is no "games of a player" endpoint. The player page therefore loads the season's played matches one by one (at most 4 requests at a time, with a progress bar). Finished matches are cached in IndexedDB, so repeat visits load instantly.

## Running

```sh
npm install
npm run dev          # http://localhost:5173, proxies /api to the real backend
npm run mock & npm run dev:mock   # offline: local mock backend with sample league + tournament data
npm test             # unit tests (domain logic)
npm run build        # production build in dist/
```

## Deployment

The app calls the API under `/api` on its own origin, which avoids depending on the backend's CORS policy:

- **Netlify:** `public/_redirects` already proxies `/api/*` to the backend and adds the SPA fallback.
- **Other hosts:** proxy `/api/*` to `https://mrksz-webapp-appserver-od67o.ondigitalocean.app/*`, or build with `VITE_API_BASE=<backend URL>` if the backend allows your origin.

Live updates connect straight to the backend's SignalR hub (`VITE_HUB_URL`). If the socket fails, the match page polls every 30 seconds instead.

Login-only features (scorekeeping, match submission, admin) are out of scope.
