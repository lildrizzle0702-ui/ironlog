// e1RM 三个公式
export function epley(w: number, r: number): number {
  return r <= 1 ? w : w * (1 + r / 30)
}
export function brzycki(w: number, r: number): number {
  return r <= 1 ? w : w * (36 / (37 - Math.min(r, 36)))
}
export function lombardi(w: number, r: number): number {
  return r <= 1 ? w : w * Math.pow(r, 0.1)
}

export type Formula = 'epley' | 'brzycki' | 'lombardi'

export function e1rm(w: number, r: number, f: Formula = 'epley'): number {
  switch (f) {
    case 'brzycki': return brzycki(w, r)
    case 'lombardi': return lombardi(w, r)
    default: return epley(w, r)
  }
}

export function e1rmAll(w: number, r: number) {
  return { epley: epley(w, r), brzycki: brzycki(w, r), lombardi: lombardi(w, r) }
}
