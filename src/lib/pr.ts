import { e1rm } from './e1rm'
import type { Formula } from './e1rm'
import type { PrType, WorkSet } from '../db/types'

export const PR_LABEL: Record<PrType, string> = {
  weight: '重量 PR',
  reps: '次数 PR',
  volume: '容量 PR',
  e1rm: 'e1RM PR',
}

export interface PrHit {
  type: PrType
  value: number
  prevBest: number | null
}

/** compare one completed set against previous completed sets of the same exercise; returns new PRs */
export function detectPRs(
  allSets: WorkSet[],
  candidate: WorkSet,
  formula: Formula = 'epley',
): PrHit[] {
  const prev = allSets.filter(
    (s) => s.exerciseId === candidate.exerciseId && s.id !== candidate.id && s.done && s.type !== '热身',
  )
  const hits: PrHit[] = []
  const consider = (type: PrType, value: number, prevBest: number | null) => {
    if (prevBest === null || value > prevBest + 1e-9) {
      hits.push({ type, value, prevBest })
    }
  }
  const bw = Math.max(...prev.map((s) => s.weightKg), -Infinity)
  const breps = Math.max(...prev.map((s) => s.reps), -Infinity)
  const bvol = Math.max(...prev.map((s) => s.weightKg * s.reps), -Infinity)
  const be1 = Math.max(...prev.map((s) => e1rm(s.weightKg, s.reps, formula)), -Infinity)
  if (prev.length > 0) {
    if (candidate.weightKg > bw) consider('weight', candidate.weightKg, bw)
    if (candidate.reps > breps) consider('reps', candidate.reps, breps)
  }
  consider('volume', candidate.weightKg * candidate.reps, prev.length ? bvol : null)
  consider('e1rm', Math.round(e1rm(candidate.weightKg, candidate.reps, formula) * 10) / 10, prev.length ? be1 : null)
  return hits
}

/** true when prevBest exists and candidate does not exceed it */
export function isNotPR(prevBest: number | null, value: number): boolean {
  return prevBest !== null && value <= prevBest + 1e-9
}
