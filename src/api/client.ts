export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '')
export const HUB_URL: string =
  import.meta.env.VITE_HUB_URL ?? 'https://mrksz-webapp-appserver-od67o.ondigitalocean.app/matchhub'

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** The backend reports errors as plain (Hungarian) strings, sometimes JSON-quoted. */
async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return res.status === 404 ? 'Nem található.' : `Hiba történt (${res.status}).`
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed === 'string') return parsed
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>
      if (typeof o.title === 'string') return o.title
      if (typeof o.message === 'string') return o.message
    }
  } catch {
    /* plain text */
  }
  return text.length > 300 ? `Hiba történt (${res.status}).` : text
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError('A szolgáltatás nem érhető el. Ellenőrizd az internetkapcsolatot.', 0)
  }
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status)
  const text = await res.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
}

/** Run async tasks with bounded concurrency so the backend is not flooded. */
export function createLimiter(max: number) {
  let active = 0
  const queue: (() => void)[] = []
  const next = () => {
    if (active >= max) return
    const run = queue.shift()
    if (run) {
      active++
      run()
    }
  }
  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--
            next()
          })
      })
      next()
    })
  }
}
