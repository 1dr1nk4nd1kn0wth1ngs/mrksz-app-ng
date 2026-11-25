// Types for the MRKSZ backend, see docs/API.md.
// Every field is treated as possibly missing: the API is undocumented, and the
// UI degrades instead of crashing when a field is absent.

export interface Address {
  postcode: number
  settlement: string
  streetsuffix: string
  streetname: string
  streetnumber: string
  additional: string
}

export interface Association {
  id: number
  name: string
  founded?: number
  description?: string
  imageURL?: string
  webaddress?: string
  phonenumber?: string
  email?: string
  address?: Partial<Address> | null
}

export interface PlayerCard {
  id: number
  firstname: string
  lastname: string
  birthdate?: string | number
  imageURL?: string
  association?: Association | null
}

export interface Paged<T> {
  players: T[]
  pages: number
}

export const Sport = {
  Ultimate: 0,
  DiscGolf: 1,
  Freestyle: 2,
} as const
export type Sport = (typeof Sport)[keyof typeof Sport]

export interface Licence {
  id: number
  validity: string
  sport: Sport
}

export interface PlayerDetail extends PlayerCard {
  licences?: Licence[]
}

export const CompetitionType = {
  League: 0,
  Tournament: 1,
} as const
export type CompetitionType = (typeof CompetitionType)[keyof typeof CompetitionType]

export interface CompetitionSummary {
  id: number
  name: string
  season: number
  competitionType?: CompetitionType
}

export interface StandingRow {
  name: string
  picture?: string
  played: number
  win: number
  loss: number
  pointsFor?: number
  pointsAgainst?: number
}

export interface PlayerStat {
  name: string
  played: number
  points: number
  assists: number
  id?: number
  playerId?: number
}

export interface Group {
  teams: StandingRow[]
  matches: Match[]
  name?: string
}

export interface BracketNode {
  match: Match | null
  homeSide: BracketNode | null
  awaySide: BracketNode | null
  eliminatedItem?: { match: Match | null } | null
}

export interface Competition extends CompetitionSummary {
  teams?: unknown[]
  groups?: Group[] | null
  final?: BracketNode | null
  matches?: Match[]
}

export interface CompetitionDetail {
  competition: Competition
  matches: Match[]
  leagueTable: StandingRow[]
  playerStats: PlayerStat[]
}

export interface LineupEntry {
  id?: number
  playerId?: number
  name: string
  jerseyNumber?: number
  points?: number
  assists?: number
}

export interface Goal {
  id: number
  scorer: string | null
  assist: string | null
  minute: number
}

export interface Timeout {
  id: number
  minute: number
  team: string
}

export interface Match {
  id: number
  round?: number
  season?: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homePicture?: string
  awayPicture?: string
  date: string
  venue?: string
  startTime?: string
  endTime?: string
  homeLineUp?: LineupEntry[]
  awayLineUp?: LineupEntry[]
  homeGoals?: Goal[]
  awayGoals?: Goal[]
  timeouts?: Timeout[]
  /** 0 not assigned, 1 male, 2 female */
  firstPointsGender?: number
  competition?: Partial<CompetitionSummary> | null
}

export type PlayerStatType = 'score' | 'assist' | 'all'

export interface RegistrationPayload {
  firstname: string
  lastname: string
  birthdate: string
  birthplace: string
  gender: 'male' | 'female' | ''
  mothersfirstname: string
  motherslastname: string
  licences: Sport[]
  address: Address
  association: number
  emailaddress: string
}

export interface LicenceRequestPayload {
  firstName: string
  lastName: string
  mothersFirstName: string
  mothersLastName: string
  birthdate: string
  birthplace: string
  sport: Sport
}
