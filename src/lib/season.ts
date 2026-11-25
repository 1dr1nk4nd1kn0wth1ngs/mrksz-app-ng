/** The original app only offers seasons from 2025 (the first season it has data for). */
export const FIRST_SEASON = 2025

export function currentSeason(): number {
  return Math.max(FIRST_SEASON, new Date().getFullYear())
}

export function seasons(): number[] {
  const out: number[] = []
  for (let y = currentSeason(); y >= FIRST_SEASON; y--) out.push(y)
  return out
}

export function parseSeason(v: string | null): number {
  const n = v ? parseInt(v, 10) : NaN
  return Number.isFinite(n) && n >= FIRST_SEASON && n <= currentSeason() + 1 ? n : currentSeason()
}
