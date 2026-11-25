import { useSyncExternalStore } from 'react'

/** Tiny localStorage-backed store shared across components and tabs. */
export function createStoredValue<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>()
  let cache: { raw: string | null; value: T } | null = null

  const read = (): T => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
    } catch {
      /* storage disabled */
    }
    if (cache && cache.raw === raw) return cache.value
    let value = fallback
    if (raw !== null) {
      try {
        value = JSON.parse(raw) as T
      } catch {
        value = fallback
      }
    }
    cache = { raw, value }
    return value
  }

  const write = (value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l())
  }

  const subscribe = (l: () => void) => {
    listeners.add(l)
    const onStorage = (e: StorageEvent) => e.key === key && l()
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(l)
      window.removeEventListener('storage', onStorage)
    }
  }

  return {
    get: read,
    set: write,
    use: () => useSyncExternalStore(subscribe, read, () => fallback),
  }
}

export interface FavoriteTeam {
  name: string
  picture?: string
}
export interface FavoritePlayer {
  id: number
  name: string
  imageURL?: string
}

export const favoriteTeams = createStoredValue<FavoriteTeam[]>('mrksz-fav-teams', [])
export const favoritePlayers = createStoredValue<FavoritePlayer[]>('mrksz-fav-players', [])
