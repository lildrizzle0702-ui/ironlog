import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BodyMetric, Exercise, PersonalRecord, Workout, WorkSet, WorkoutTemplate, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { seedIfEmpty } from './seed'

interface IronlogDB extends DBSchema {
  exercises: { key: string; value: Exercise }
  workouts: { key: string; value: Workout; indexes: { 'by-date': string } }
  sets: { key: string; value: WorkSet; indexes: { 'by-workout': string; 'by-exercise': string } }
  bodyMetrics: { key: string; value: BodyMetric; indexes: { 'by-date': string } }
  prs: { key: string; value: PersonalRecord; indexes: { 'by-exercise': string } }
  templates: { key: string; value: WorkoutTemplate }
  settings: { key: string; value: Settings }
}

let dbPromise: Promise<IDBPDatabase<IronlogDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<IronlogDB>('ironlog', 1, {
      upgrade(db) {
        db.createObjectStore('exercises', { keyPath: 'id' })
        const workouts = db.createObjectStore('workouts', { keyPath: 'id' })
        workouts.createIndex('by-date', 'date')
        const sets = db.createObjectStore('sets', { keyPath: 'id' })
        sets.createIndex('by-workout', 'workoutId')
        sets.createIndex('by-exercise', 'exerciseId')
        const bodyMetrics = db.createObjectStore('bodyMetrics', { keyPath: 'id' })
        bodyMetrics.createIndex('by-date', 'date')
        const prs = db.createObjectStore('prs', { keyPath: 'id' })
        prs.createIndex('by-exercise', 'exerciseId')
        db.createObjectStore('templates', { keyPath: 'id' })
        db.createObjectStore('settings', { keyPath: undefined as unknown as string })
      },
    }).then(async (db) => {
      await seedIfEmpty(db)
      return db
    })
  }
  return dbPromise
}

export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  const s = await db.get('settings', 'main')
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const db = await getDB()
  const cur = await getSettings()
  await db.put('settings', { ...cur, ...patch }, 'main')
}

export function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}
