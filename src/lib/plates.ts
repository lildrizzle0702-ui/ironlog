export interface PlateCalcResult {
  perSide: number[]
  /** true if exact match with available plates */
  exact: boolean
  /** best achievable total if not exact */
  achievedTotal?: number
}

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

export function availablePlates(): number[] {
  return PLATES
}

/** target total (including bar); bar 20 or 15 */
export function calcPlates(targetTotal: number, barWeightKg: 20 | 15): PlateCalcResult {
  let perSide = (targetTotal - barWeightKg) / 2
  if (perSide < 0) return { perSide: [], exact: false, achievedTotal: barWeightKg }
  // snap to nearest 1.25
  perSide = Math.round(perSide / 1.25) * 1.25
  const chosen: number[] = []
  let remaining = perSide
  for (const p of PLATES) {
    while (remaining + 1e-9 >= p) {
      chosen.push(p)
      remaining = Math.round((remaining - p) * 100) / 100
    }
  }
  const exact = remaining < 1e-9
  const achievedTotal = Math.round((barWeightKg + 2 * (perSide - remaining)) * 100) / 100
  return { perSide: chosen, exact, achievedTotal: exact ? targetTotal : achievedTotal }
}

/** target weight for a given % of 1RM, snapped to 2.5kg */
export function pctWeight(oneRm: number, pct: number): number {
  return Math.round((oneRm * pct) / 2.5) * 2.5
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}
export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 100) / 100
}

/** format weight honoring unit setting; pass kg value + unit */
export function fmtWeight(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
  if (unit === 'lb') return `${kgToLb(kg)} lb`
  return `${trimNum(kg)} kg`
}

export function trimNum(n: number): string {
  return n % 1 === 0 ? `${n}` : `${Math.round(n * 100) / 100}`
}

export function fmtTons(volumeKg: number): string {
  return `${(volumeKg / 1000).toFixed(2)} t`
}
