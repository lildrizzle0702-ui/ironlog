import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDB, uid, todayStr } from '../db/db'
import type { Workout, WorkoutTemplate } from '../db/types'
import { timerEndAlert } from '../utils/haptics'

export interface ActiveExerciseEntry {
  exerciseId: string
  supersetGroupId?: string
}

interface ActiveState {
  workoutId: string | null
  entries: ActiveExerciseEntry[]
  timerEndAt: number | null
  timerTotalSec: number
}

const LS_KEY = 'ironlog-active-v1'

interface ActiveContextValue extends ActiveState {
  workout: Workout | null
  timerRemaining: number | null
  startEmpty: () => Promise<void>
  startFromTemplate: (tpl: WorkoutTemplate) => Promise<void>
  resume: (workoutId: string, entries: ActiveExerciseEntry[]) => Promise<void>
  addEntry: (exerciseId: string, supersetGroupId?: string) => void
  removeEntry: (exerciseId: string) => void
  finish: () => Promise<Workout | null>
  discard: () => Promise<void>
  startTimer: (sec: number) => void
  stopTimer: () => void
  tick: () => void
}

const Ctx = createContext<ActiveContextValue | null>(null)

function loadLS(): ActiveState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as ActiveState
  } catch {
    /* noop */
  }
  return { workoutId: null, entries: [], timerEndAt: null, timerTotalSec: 0 }
}

export function ActiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ActiveState>(loadLS)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    let alive = true
    if (!state.workoutId) {
      setWorkout(null)
      return
    }
    getDB()
      .then((db) => db.get('workouts', state.workoutId!))
      .then((w) => alive && setWorkout(w ?? null))
    return () => {
      alive = false
    }
  }, [state.workoutId])

  // timer tick
  useEffect(() => {
    if (!state.timerEndAt) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [state.timerEndAt])

  // fire alert when timer ends
  useEffect(() => {
    if (state.timerEndAt && now >= state.timerEndAt) {
      timerEndAlert()
      setState((s) => ({ ...s, timerEndAt: null }))
    }
  }, [now, state.timerEndAt])

  const timerRemaining = useMemo(() => {
    if (!state.timerEndAt) return null
    return Math.max(0, Math.ceil((state.timerEndAt - now) / 1000))
  }, [state.timerEndAt, now])

  const startEmpty = useCallback(async () => {
    const db = await getDB()
    const w: Workout = { id: uid(), date: todayStr(), startTime: Date.now() }
    await db.put('workouts', w)
    setState({ workoutId: w.id, entries: [], timerEndAt: null, timerTotalSec: 0 })
  }, [])

  const startFromTemplate = useCallback(async (tpl: WorkoutTemplate) => {
    const db = await getDB()
    const w: Workout = { id: uid(), date: todayStr(), startTime: Date.now(), templateId: tpl.id, templateName: tpl.name }
    await db.put('workouts', w)
    setState({
      workoutId: w.id,
      entries: tpl.exercises.map((e) => ({ exerciseId: e.exerciseId, supersetGroupId: e.supersetGroupId })),
      timerEndAt: null,
      timerTotalSec: 0,
    })
  }, [])

  const resume = useCallback(async (workoutId: string, entries: ActiveExerciseEntry[]) => {
    const db = await getDB()
    const w = await db.get('workouts', workoutId)
    if (!w) return
    await db.put('workouts', { ...w, endTime: undefined })
    setState({ workoutId, entries, timerEndAt: null, timerTotalSec: 0 })
  }, [])

  const addEntry = useCallback((exerciseId: string, supersetGroupId?: string) => {
    setState((s) =>
      s.entries.some((e) => e.exerciseId === exerciseId)
        ? s
        : { ...s, entries: [...s.entries, { exerciseId, supersetGroupId }] },
    )
  }, [])

  const removeEntry = useCallback((exerciseId: string) => {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.exerciseId !== exerciseId) }))
  }, [])

  const finish = useCallback(async (): Promise<Workout | null> => {
    if (!state.workoutId) return null
    const db = await getDB()
    const w = await db.get('workouts', state.workoutId)
    if (!w) return null
    const done: Workout = { ...w, endTime: Date.now() }
    await db.put('workouts', done)
    setState({ workoutId: null, entries: [], timerEndAt: null, timerTotalSec: 0 })
    return done
  }, [state.workoutId])

  const discard = useCallback(async () => {
    if (!state.workoutId) return
    const db = await getDB()
    const sets = await db.getAllFromIndex('sets', 'by-workout', state.workoutId)
    const tx = db.transaction(['sets', 'workouts'], 'readwrite')
    for (const s of sets) await tx.objectStore('sets').delete(s.id)
    await tx.objectStore('workouts').delete(state.workoutId)
    await tx.done
    setState({ workoutId: null, entries: [], timerEndAt: null, timerTotalSec: 0 })
  }, [state.workoutId])

  const startTimer = useCallback((sec: number) => {
    setNow(Date.now())
    setState((s) => ({ ...s, timerEndAt: Date.now() + sec * 1000, timerTotalSec: sec }))
  }, [])

  const stopTimer = useCallback(() => setState((s) => ({ ...s, timerEndAt: null })), [])

  const tick = useCallback(() => setNow(Date.now()), [])

  const value = useMemo(
    () => ({
      ...state,
      workout,
      timerRemaining,
      startEmpty,
      startFromTemplate,
      resume,
      addEntry,
      removeEntry,
      finish,
      discard,
      startTimer,
      stopTimer,
      tick,
    }),
    [state, workout, timerRemaining, startEmpty, startFromTemplate, resume, addEntry, removeEntry, finish, discard, startTimer, stopTimer, tick],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useActive(): ActiveContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useActive outside provider')
  return v
}
