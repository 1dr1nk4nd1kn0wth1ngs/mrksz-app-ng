import type { Match } from '../api/types'
import { matchTime } from './match'

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}00Z`
const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/[,;]/g, (c) => '\\' + c)
    .replace(/\n/g, '\\n')

/** iCalendar file with one event per match (assumes ~100 minute games). */
export function matchesToIcs(matches: Match[], calName: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MRKSZ//better-mrksz-app//HU',
    `X-WR-CALNAME:${esc(calName)}`,
  ]
  const now = stamp(new Date())
  for (const m of matches) {
    const t = matchTime(m)
    if (!t) continue
    const start = new Date(t)
    const end = new Date(t + 100 * 60000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:mrksz-match-${m.id}@mrksz`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`${m.homeTeam} – ${m.awayTeam}`)}`,
      ...(m.venue ? [`LOCATION:${esc(m.venue)}`] : []),
      ...(m.competition?.name ? [`DESCRIPTION:${esc(m.competition.name)}`] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadText(filename: string, text: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
