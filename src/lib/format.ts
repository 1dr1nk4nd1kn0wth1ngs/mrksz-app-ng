const locale = 'hu-HU'

const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' })
const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
const shortFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })

function valid(d: string | number | Date | undefined | null): Date | null {
  if (d === undefined || d === null || d === '') return null
  const x = new Date(d)
  return Number.isNaN(x.getTime()) || x.getFullYear() <= 1 ? null : x
}

export const fmtDate = (d: string | Date | undefined | null) => (valid(d) ? dateFmt.format(valid(d)!) : '–')
export const fmtDay = (d: string | Date | undefined | null) => (valid(d) ? dayFmt.format(valid(d)!) : '–')
export const fmtTime = (d: string | Date | undefined | null) => (valid(d) ? timeFmt.format(valid(d)!) : '')
export const fmtShort = (d: string | Date | undefined | null) => (valid(d) ? shortFmt.format(valid(d)!) : '–')
export const fmtDateTime = (d: string | Date | undefined | null) =>
  valid(d) ? `${dateFmt.format(valid(d)!)} ${timeFmt.format(valid(d)!)}` : '–'

/** Local calendar day key, e.g. 2026-05-17, for grouping. */
export function dayKey(d: string | Date): string {
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return 'unknown'
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function isToday(d: string | Date): boolean {
  return dayKey(d) === dayKey(new Date())
}

export function relativeDay(d: string | Date): string {
  const k = dayKey(d)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 864e5)
  const yesterday = new Date(today.getTime() - 864e5)
  if (k === dayKey(today)) return 'Ma'
  if (k === dayKey(tomorrow)) return 'Holnap'
  if (k === dayKey(yesterday)) return 'Tegnap'
  return fmtDay(d)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** Birth "date" is shown as a year, as the API sometimes returns just the year. */
export function birthYear(b: string | number | undefined): string {
  if (b === undefined || b === null || b === '') return ''
  if (typeof b === 'number') return b > 1000 && b < 3000 ? String(b) : ''
  const m = /^(\d{4})/.exec(b)
  return m && Number(m[1]) > 1 ? m[1]! : ''
}

export const playerName = (p: { lastname?: string; firstname?: string }) =>
  `${p.lastname ?? ''} ${p.firstname ?? ''}`.trim()

export const sportName = (s: number) => ['Ultimate', 'Disc golf', 'Freestyle'][s] ?? 'Egyéb'

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
