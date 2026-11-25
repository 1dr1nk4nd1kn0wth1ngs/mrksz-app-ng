import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from './endpoints'
import type { Match, PlayerStatType } from './types'
import { matchStatus } from '../lib/match'

const MIN = 60_000

export const useAssociations = () =>
  useQuery({ queryKey: ['associations'], queryFn: ({ signal }) => api.associations(signal), staleTime: 30 * MIN })

export const useAssociation = (id: number) =>
  useQuery({ queryKey: ['association', id], queryFn: ({ signal }) => api.association(id, signal), staleTime: 30 * MIN })

export const useAssociationPlayers = (id: number, page: number) =>
  useQuery({
    queryKey: ['association', id, 'players', page],
    queryFn: ({ signal }) => api.associationPlayers(id, page, signal),
    placeholderData: keepPreviousData,
    staleTime: 10 * MIN,
  })

export const usePlayers = (page: number, search: string, enabled = true) =>
  useQuery({
    queryKey: ['players', page, search.trim()],
    queryFn: ({ signal }) => api.players(page, search, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * MIN,
  })

export const usePlayer = (id: number) =>
  useQuery({ queryKey: ['player', id], queryFn: ({ signal }) => api.player(id, signal), staleTime: 10 * MIN })

export const useCompetitions = (season: number) =>
  useQuery({
    queryKey: ['competitions', season],
    queryFn: ({ signal }) => api.competitions(season, signal),
    staleTime: 10 * MIN,
  })

export const useCompetition = (id: number | undefined) =>
  useQuery({
    queryKey: ['competition', id],
    queryFn: ({ signal }) => api.competition(id!, signal),
    enabled: id !== undefined && Number.isFinite(id),
    staleTime: MIN,
  })

export const usePlayerStats = (id: number | undefined, type: PlayerStatType, enabled = true) =>
  useQuery({
    queryKey: ['playerStats', id, type],
    queryFn: ({ signal }) => api.playerStats(id!, type, signal),
    enabled: enabled && id !== undefined && Number.isFinite(id),
    staleTime: MIN,
  })

export const useSeasonMatches = (season: number | undefined, enabled = true) =>
  useQuery({
    queryKey: ['seasonMatches', season],
    queryFn: ({ signal }) => api.seasonMatches(season!, signal),
    enabled: enabled && season !== undefined,
    staleTime: MIN,
  })

export const useTodaysMatches = () =>
  useQuery({
    queryKey: ['todaysMatches'],
    queryFn: ({ signal }) => api.todaysMatches(signal),
    staleTime: 30_000,
    refetchInterval: (q) => (q.state.data?.some((m) => matchStatus(m) === 'live') ? 30_000 : 5 * MIN),
  })

export const useMatch = (id: number) =>
  useQuery({
    queryKey: ['match', id],
    queryFn: ({ signal }) => api.match(id, signal),
    // Fallback polling while live, in case the SignalR socket cannot connect.
    refetchInterval: (q) => (q.state.data && matchStatus(q.state.data) === 'live' ? 30_000 : false),
  })

function hasLineups(ms: Match[]) {
  return ms.some((m) => (m.homeLineUp?.length ?? 0) + (m.awayLineUp?.length ?? 0) > 0)
}

/**
 * Full details (lineups, goals) for a set of matches. If the list endpoint already
 * includes lineups they are used as-is; otherwise each match is fetched (throttled,
 * finished ones cached in IndexedDB).
 */
export function useMatchDetails(matches: Match[] | undefined, enabled = true) {
  const needFetch = !!matches && !hasLineups(matches)
  const targets = useMemo(
    () => (needFetch ? matches!.filter((m) => matchStatus(m) !== 'scheduled') : []),
    [matches, needFetch],
  )
  const results = useQueries({
    queries: targets.map((m) => ({
      queryKey: ['matchDetail', m.id],
      queryFn: () => api.matchDetailCached(m.id),
      enabled,
      staleTime: matchStatus(m) === 'finished' ? Infinity : MIN,
      retry: 1,
    })),
  })
  // `results` is a new array every render; key the memo on what actually changed.
  const signature = results.map((r) => `${r.dataUpdatedAt}:${r.isError ? 1 : 0}`).join(',')
  return useMemo(() => {
    if (!matches) return { details: [] as Match[], loaded: 0, total: 0, isLoading: true, errors: 0 }
    if (!needFetch)
      return { details: matches, loaded: matches.length, total: matches.length, isLoading: false, errors: 0 }
    const details = results.flatMap((r) => (r.data ? [r.data] : []))
    const errors = results.filter((r) => r.isError).length
    const loaded = details.length + errors
    return { details, loaded, total: targets.length, isLoading: loaded < targets.length, errors }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, needFetch, targets, signature])
}
