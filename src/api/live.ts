import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { HUB_URL } from './client'
import type { Match } from './types'

export type LiveState = 'off' | 'connecting' | 'connected' | 'failed'

/**
 * Subscribes to the backend's SignalR hub; the server pushes the full match DTO on
 * method `match{id}` whenever a point, timeout, start or end is recorded.
 * The SignalR client is loaded lazily so it only costs bytes on live match pages.
 */
export function useLiveMatch(id: number, enabled: boolean): LiveState {
  const qc = useQueryClient()
  const [state, setState] = useState<LiveState>('off')

  useEffect(() => {
    if (!enabled) {
      setState('off')
      return
    }
    let cancelled = false
    let stop: (() => Promise<void>) | undefined
    setState('connecting')
    import('@microsoft/signalr')
      .then(async (signalR) => {
        if (cancelled) return
        const conn = new signalR.HubConnectionBuilder()
          .withUrl(HUB_URL, { skipNegotiation: true, transport: signalR.HttpTransportType.WebSockets })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.None)
          .build()
        conn.on(`match${id}`, (m: Match) => {
          qc.setQueryData(['match', id], m)
          qc.invalidateQueries({ queryKey: ['todaysMatches'] })
        })
        conn.onreconnecting(() => !cancelled && setState('connecting'))
        conn.onreconnected(() => !cancelled && setState('connected'))
        conn.onclose(() => !cancelled && setState('failed'))
        stop = () => conn.stop()
        await conn.start()
        if (cancelled) await conn.stop()
        else setState('connected')
      })
      .catch(() => !cancelled && setState('failed'))
    return () => {
      cancelled = true
      void stop?.()
    }
  }, [id, enabled, qc])

  return state
}

/** Re-renders every `ms` so live clocks tick. */
export function useNow(ms: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms, enabled])
  return now
}
