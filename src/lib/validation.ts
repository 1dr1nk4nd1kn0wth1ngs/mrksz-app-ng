// Validation rules ported from the original registration form.

const NAME_RE =
  /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöőõøùúûüűųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖŐÕØÙÚÛÜŰŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]/
const STREET_RE = /[^a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ -]/
const STREETNO_RE = /[^a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ0123456789 /.-]/
const ADDITIONAL_RE = /[^a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ0123456789 /,.-]/

export const STREET_SUFFIXES =
  'út.utca.árok.átjáró.bástya.dűlő.dűlősor.dűlőút.erdősor.fasor.forduló.gát.határsor.határút.játszótér.kert.körönd.körtér.körút.köz.lejáró.lejtő.lépcső.liget.mélyút.orom.ösvény.park.part.rakpart.sétaút.sétány.sor.sugárút.tér.udvar.üdülőpart'.split(
    '.',
  )

export type Check = (v: string) => string | null

export const required: Check = (v) => (v.trim() ? null : 'Mező kitöltése kötelező')

export const personName: Check = (v) =>
  required(v) ?? (NAME_RE.test(v) ? 'Nem megfelelő karakter' : v.length > 30 ? 'Túl hosszú név' : null)

export const email: Check = (v) => {
  const t = v.trim()
  if (!t) return 'Mező kitöltése kötelező'
  const parts = t.split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]!.includes('.') || /\s/.test(t)) return 'Nem megfelelő formátum'
  return null
}

export const postcode: Check = (v) => (/^\d{4}$/.test(v.trim()) ? null : 'Nem 4 jegyű szám.')

export const streetName: Check = (v) => {
  const r = required(v)
  if (r) return r
  if (STREET_RE.test(v)) return 'Nem megfelelő karakter'
  if (v.length > 30) return 'Túl hosszú név'
  const lower = ` ${v.toLowerCase()}`
  if (
    STREET_SUFFIXES.some((s) => lower.includes(` ${s}`)) ||
    [' u', ' krt', ' ú', ' sgt', ' rkp'].some((s) => lower.endsWith(s) || lower.includes(`${s}.`))
  )
    return 'A közterület neve ne tartalmazza a típusát (azt külön válaszd ki)'
  return null
}

export const streetNumber: Check = (v) =>
  required(v) ?? (STREETNO_RE.test(v) ? 'Nem megfelelő karakter' : v.length > 8 ? 'Túl hosszú érték' : null)

export const additional: Check = (v) =>
  ADDITIONAL_RE.test(v) ? 'Nem megfelelő karakter' : v.length > 15 ? 'Túl hosszú érték' : null

export const birthdate: Check = (v) => {
  if (!v) return 'Mező kitöltése kötelező'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return 'Érvénytelen dátum'
  if (d.getFullYear() >= new Date().getFullYear()) return 'Érvénytelen születési dátum'
  if (d.getFullYear() < 1900) return 'Érvénytelen születési dátum'
  return null
}

export function validate<T extends Record<string, string>>(values: T, rules: Partial<Record<keyof T, Check>>) {
  const errors: Partial<Record<keyof T, string>> = {}
  for (const k in rules) {
    const err = rules[k]!(values[k] ?? '')
    if (err) errors[k] = err
  }
  return errors
}

/** Lazily loaded postcode → settlement table (extracted from the original app). */
let postcodes: Promise<[number, string][]> | null = null
export function loadPostcodes() {
  postcodes ??= import('../data/postcodes.json').then((m) => m.default as [number, string][])
  return postcodes
}

/** City district postcode ranges that the table lists only once (same rules as the original app). */
const CITY_RANGES: [number, number, string][] = [
  [1000, 2000, 'Budapest'],
  [4000, 4050, 'Debrecen'],
  [6700, 6750, 'Szeged'],
  [3500, 3550, 'Miskolc'],
  [7600, 7639, 'Pécs'],
  [9000, 9050, 'Győr'],
]

export function settlementsForPostcode(pc: number, table: [number, string][]): string[] {
  if (!Number.isInteger(pc) || pc < 1000 || pc >= 10000) return []
  const city = CITY_RANGES.find(([from, to]) => pc >= from && pc < to)
  if (city) return [city[2]]
  return [...new Set(table.filter(([p]) => p === pc).map(([, s]) => s))]
}
