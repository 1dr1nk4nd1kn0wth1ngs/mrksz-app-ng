import { createStore, get, set } from 'idb-keyval'
import type { Match } from './types'

// Finished match details are immutable, so they are kept in IndexedDB. The version
// lets a shape change invalidate old entries.
const VERSION = 1
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30

interface Entry {
  v: number
  savedAt: number
  match: Match
}

let store: ReturnType<typeof createStore> | null | undefined
function getStore() {
  if (store === undefined) {
    try {
      store = typeof indexedDB === 'undefined' ? null : createStore('mrksz-cache', 'matches')
    } catch {
      store = null
    }
  }
  return store
}

export async function getCachedMatch(id: number): Promise<Match | undefined> {
  const s = getStore()
  if (!s) return undefined
  try {
    const e = await get<Entry>(id, s)
    if (!e || e.v !== VERSION || Date.now() - e.savedAt > MAX_AGE_MS) return undefined
    return e.match
  } catch {
    return undefined
  }
}

export async function putCachedMatch(match: Match): Promise<void> {
  const s = getStore()
  if (!s) return
  try {
    await set(match.id, { v: VERSION, savedAt: Date.now(), match } satisfies Entry, s)
  } catch {
    /* quota or private mode: caching is best effort */
  }
}
