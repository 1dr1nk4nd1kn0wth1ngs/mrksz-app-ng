import type { BracketNode, Match } from '../api/types'

export interface BracketSlot {
  match: Match | null
  /** Stable key for React. */
  key: string
}

export interface BracketRound {
  name: string
  slots: BracketSlot[]
}

export function bracketDepth(node: BracketNode | null | undefined): number {
  if (!node) return 0
  return 1 + Math.max(bracketDepth(node.homeSide), bracketDepth(node.awaySide))
}

export function roundName(fromFinal: number, total: number): string {
  // fromFinal: 0 = final, 1 = semifinal, …
  switch (fromFinal) {
    case 0:
      return 'Döntő'
    case 1:
      return 'Elődöntő'
    case 2:
      return 'Negyeddöntő'
    case 3:
      return 'Nyolcaddöntő'
    default:
      return `${total - fromFinal}. kör`
  }
}

/**
 * Flattens the API's recursive "final" tree into columns, earliest round first.
 * Missing branches (byes / not yet drawn) keep empty slots so lines stay aligned.
 */
export function bracketRounds(root: BracketNode | null | undefined): BracketRound[] {
  const depth = bracketDepth(root)
  if (!root || depth === 0) return []
  const levels: BracketSlot[][] = Array.from({ length: depth }, () => [])
  const walk = (node: BracketNode | null, level: number, path: string) => {
    if (level >= depth) return
    levels[level]!.push({ match: node?.match ?? null, key: path })
    walk(node?.homeSide ?? null, level + 1, path + 'h')
    walk(node?.awaySide ?? null, level + 1, path + 'a')
  }
  walk(root, 0, 'r')
  // Drop slots in the earliest rounds that are wholly empty (byes): keep pairs aligned
  // by only trimming a round if every slot in it is empty.
  const rounds = levels.map((slots, i) => ({ name: roundName(i, depth), slots })).reverse()
  while (rounds.length > 1 && rounds[0]!.slots.every((s) => !s.match)) rounds.shift()
  return rounds
}

export function bracketMatches(root: BracketNode | null | undefined): Match[] {
  const out: Match[] = []
  const walk = (n: BracketNode | null | undefined) => {
    if (!n) return
    if (n.match) out.push(n.match)
    walk(n.homeSide)
    walk(n.awaySide)
  }
  walk(root)
  if (root?.eliminatedItem?.match) out.push(root.eliminatedItem.match)
  return out
}
