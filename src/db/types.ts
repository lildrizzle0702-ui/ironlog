// IRONLOG data model

export type Muscle =
  | '胸' | '背' | '肩' | '腿' | '二头' | '三头' | '核心' | '臀' | '斜方' | '小腿'

export type Equipment = '杠铃' | '哑铃' | '器械' | '绳索' | '自重'

export interface Exercise {
  id: string
  nameZh: string
  nameEn: string
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  equipment: Equipment
  unilateral: boolean
  custom: boolean
  /** remembered per-exercise default rest seconds */
  restSec?: number
  /** best-known 1RM estimate, updated from e1RM calcs */
  e1rm?: number
}

export type SetType = '热身' | '正式' | '递减组' | '力竭组'

export interface WorkSet {
  id: string
  workoutId: string
  exerciseId: string
  /** 0-based index within the exercise block in this workout */
  setNo: number
  weightKg: number
  reps: number
  rir?: number
  rpe?: number
  tempo?: string
  type: SetType
  supersetGroupId?: string
  note?: string
  done: boolean
  completedAt?: number
  createdAt: number
}

export interface Workout {
  id: string
  /** yyyy-MM-dd, editable, defaults to today */
  date: string
  startTime: number
  endTime?: number
  bodyWeightKg?: number
  templateId?: string
  templateName?: string
  note?: string
  feeling?: 1 | 2 | 3 | 4 | 5
}

export interface BodyMetric {
  id: string
  date: string
  weightKg?: number
  bodyFatPct?: number
  waistCm?: number
  chestCm?: number
  armCm?: number
  legCm?: number
}

export type PrType = 'weight' | 'reps' | 'volume' | 'e1rm'

export interface PersonalRecord {
  id: string
  exerciseId: string
  type: PrType
  value: number
  date: string
  /** kg when relevant */
  weightKg?: number
  reps?: number
}

export interface TemplateExercise {
  exerciseId: string
  targetSets: number
  targetReps: string
  restSec?: number
  supersetGroupId?: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: TemplateExercise[]
  builtin: boolean
  sort: number
}

export interface Settings {
  unit: 'kg' | 'lb'
  barWeightKg: 20 | 15
  defaultRestSec: number
  rirEnabled: boolean
  rpeEnabled: boolean
  e1rmFormula: 'epley' | 'brzycki' | 'lombardi'
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  barWeightKg: 20,
  defaultRestSec: 90,
  rirEnabled: true,
  rpeEnabled: true,
  e1rmFormula: 'epley',
}
