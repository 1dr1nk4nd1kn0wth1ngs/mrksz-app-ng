import { createLimiter, http } from './client'
import { getCachedMatch, putCachedMatch } from './matchCache'
import { matchStatus } from '../lib/match'
import type {
  Association,
  CompetitionDetail,
  CompetitionSummary,
  LicenceRequestPayload,
  Match,
  Paged,
  PlayerCard,
  PlayerDetail,
  PlayerStat,
  PlayerStatType,
  RegistrationPayload,
  StandingRow,
} from './types'

const q = encodeURIComponent
const detailLimit = createLimiter(4)

export const api = {
  associations: (signal?: AbortSignal) => http.get<Association[]>('/association', signal),
  association: (id: number, signal?: AbortSignal) => http.get<Association>(`/association/${id}`, signal),
  associationPlayers: (id: number, page: number, signal?: AbortSignal) =>
    http.get<Paged<PlayerCard>>(`/association/${id}/players?pagenumber=${page}`, signal),

  players: (page: number, search: string, signal?: AbortSignal) =>
    http.get<Paged<PlayerCard>>(
      `/player?pagenumber=${page}${search.trim() ? `&searchexpression=${q(search.trim())}` : ''}`,
      signal,
    ),
  player: (id: number, signal?: AbortSignal) => http.get<PlayerDetail>(`/player/${id}`, signal),

  competitions: (season: number, signal?: AbortSignal) =>
    http.get<CompetitionSummary[]>(`/competition?season=${season}`, signal),
  competition: (id: number, signal?: AbortSignal) => http.get<CompetitionDetail>(`/competition/${id}`, signal),
  leagueTable: (id: number, signal?: AbortSignal) => http.get<StandingRow[]>(`/competition/${id}/leaguetable`, signal),
  playerStats: (id: number, type: PlayerStatType, signal?: AbortSignal) =>
    http.get<PlayerStat[]>(`/competition/${id}/playerstats?type=${type}`, signal),
  competitionResults: (id: number, page = 1, pageSize = 100, signal?: AbortSignal) =>
    http.get<Match[]>(`/competition/${id}/results?pageNumber=${page}&pageSize=${pageSize}`, signal),

  seasonMatches: (season: number, signal?: AbortSignal) => http.get<Match[]>(`/match/season/${season}`, signal),
  todaysMatches: (signal?: AbortSignal) => http.get<Match[]>('/match/today/', signal),
  match: (id: number, signal?: AbortSignal) => http.get<Match>(`/match/${id}`, signal),

  /**
   * Match details for aggregate views (player/team game logs). Finished matches
   * cannot change, so they are cached in IndexedDB across visits; requests are
   * throttled.
   */
  matchDetailCached: async (id: number): Promise<Match> => {
    const cached = await getCachedMatch(id)
    if (cached) return cached
    const fresh = await detailLimit(() => http.get<Match>(`/match/${id}`))
    if (matchStatus(fresh) === 'finished') void putCachedMatch(fresh)
    return fresh
  },

  register: (payload: RegistrationPayload) => http.post<string>('/player', payload),
  requestLicence: (payload: LicenceRequestPayload) => http.post<string>('/player/request', payload),
}
