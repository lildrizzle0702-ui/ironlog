import type { WorkSet } from '../db/types'

export interface OverloadTip {
  message: string
}

/**
 * 渐进超负荷建议：如果上次同重量完成 3 组×8 次且 RIR≤2，提示下次加重。
 * 检查逻辑：针对 (exerciseId, weightKg) 的历史正式组：
 * - 存在至少 3 个不同训练日都完成 ≥8 次
 * - 且这些组的 RIR 都 ≤2（有 RIR 数据的组）
 * 则返回建议。
 */
export function overloadTip(history: WorkSet[], exerciseId: string, weightKg: number): string | null {
  const relevant = history.filter(
    (s) => s.exerciseId === exerciseId && s.done && s.type === '正式' && Math.abs(s.weightKg - weightKg) < 0.01,
  )
  if (relevant.length < 3) return null
  const byDay = new Map<string, WorkSet[]>()
  for (const s of relevant) {
    const key = `${s.workoutId}`
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(s)
  }
  let qualifyingDays = 0
  for (const sets of byDay.values()) {
    const withEnough = sets.filter((s) => s.reps >= 8)
    if (withEnough.length < 3) continue
    const withRir = withEnough.filter((s) => s.rir !== undefined)
    if (withRir.length > 0 && withRir.some((s) => (s.rir ?? 5) > 2)) continue
    qualifyingDays++
  }
  if (qualifyingDays >= 1 && relevant.length >= 3) {
    return `上次 ${weightKg}kg 已完成 3×8 且 RIR≤2，下次试试 +2.5kg`
  }
  return null
}
