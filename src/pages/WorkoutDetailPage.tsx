import { useCallback, useEffect, useState } from 'react'
import { getDB, todayStr, uid } from '../db/db'
import type { Exercise, WorkSet, Workout } from '../db/types'
import { navigate, goBack } from '../router'
import { Page } from '../chrome'
import { Numpad, Sheet } from '../components/ui'
import { IconCheck, IconChevron, IconPlus, IconTrash } from '../components/icons'
import { fmtClock, fmtDuration } from '../lib/date'
import { trimNum } from '../lib/plates'
import { useActive } from '../store/active'
import './pages-extra.css'

const SET_TYPES: WorkSet['type'][] = ['热身', '正式', '递减组', '力竭组']

export default function WorkoutDetailPage({ id }: { id: string }) {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [sets, setSets] = useState<WorkSet[]>([])
  const [exMap, setExMap] = useState<Record<string, Exercise>>({})
  const [edit, setEdit] = useState<{ set: WorkSet; field: 'weightKg' | 'reps'; value: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickSearch, setPickSearch] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const active = useActive()

  const load = useCallback(async () => {
    const db = await getDB()
    const [w, s, e] = await Promise.all([
      db.get('workouts', id),
      db.getAllFromIndex('sets', 'by-workout', id),
      db.getAll('exercises'),
    ])
    setWorkout(w ?? null)
    setSets(s.sort((a, b) => (a.exerciseId === b.exerciseId ? a.setNo - b.setNo : a.createdAt - b.createdAt)))
    const m: Record<string, Exercise> = {}
    for (const x of e) m[x.id] = e.find((y) => y.id === x.id) ?? x
    setExMap(m)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (!workout) return <Page title="训练明细" />

  const groups: { ex: Exercise | undefined; list: WorkSet[] }[] = []
  const seen = new Map<string, WorkSet[]>()
  for (const s of sets) {
    if (!seen.has(s.exerciseId)) seen.set(s.exerciseId, [])
    seen.get(s.exerciseId)!.push(s)
  }
  for (const [exerciseId, list] of seen) groups.push({ ex: exMap[exerciseId], list })

  const save = async (patch: Partial<Workout>) => {
    const db = await getDB()
    const next = { ...workout, ...patch }
    await db.put('workouts', next)
    setWorkout(next)
  }

  const saveSet = async (set: WorkSet, patch: Partial<WorkSet>) => {
    const db = await getDB()
    await db.put('sets', { ...set, ...patch })
    await load()
  }

  const deleteSet = async (setId: string) => {
    const db = await getDB()
    await db.delete('sets', setId)
    await load()
  }

  const addSet = async (exerciseId: string) => {
    const db = await getDB()
    const list = sets.filter((s) => s.exerciseId === exerciseId)
    const last = list[list.length - 1]
    await db.put('sets', {
      id: uid(), workoutId: id, exerciseId, setNo: list.length,
      weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 8,
      type: last?.type ?? '正式', done: false, createdAt: Date.now(),
    })
    await load()
  }

  const addExercise = async (exerciseId: string) => {
    const db = await getDB()
    await db.put('sets', {
      id: uid(), workoutId: id, exerciseId, setNo: 0,
      weightKg: 0, reps: 8, type: '正式', done: false, createdAt: Date.now(),
    })
    setPickerOpen(false)
    await load()
  }

  const copyAsNew = async () => {
    const db = await getDB()
    const newId = uid()
    await db.put('workouts', { ...workout, id: newId, date: todayStr(), startTime: Date.now(), endTime: undefined })
    const tx = db.transaction('sets', 'readwrite')
    for (const s of sets) await tx.store.put({ ...s, id: uid(), workoutId: newId, done: false, completedAt: undefined })
    await tx.done
    const entries: { exerciseId: string; supersetGroupId?: string }[] = []
    for (const s of sets) {
      if (!entries.some((e) => e.exerciseId === s.exerciseId)) entries.push({ exerciseId: s.exerciseId, supersetGroupId: s.supersetGroupId })
    }
    await active.resume(newId, entries)
    navigate('#/workout')
  }

  const removeAll = async () => {
    const db = await getDB()
    const tx = db.transaction(['sets', 'workouts'], 'readwrite')
    for (const s of sets) await tx.objectStore('sets').delete(s.id)
    await tx.objectStore('workouts').delete(id)
    await tx.done
    navigate('#/history')
  }

  const commitEdit = async () => {
    if (!edit) return
    const v = parseFloat(edit.value)
    if (!Number.isNaN(v)) {
      await saveSet(edit.set, edit.field === 'weightKg' ? { weightKg: v } : { reps: Math.round(v) })
    }
    setEdit(null)
  }

  const totalVol = sets.filter((s) => s.type !== '热身').reduce((a, s) => a + s.weightKg * s.reps, 0)
  const candidates = Object.values(exMap).filter((e) => !seen.has(e.id) &&
    (e.nameZh.includes(pickSearch) || e.nameEn.toLowerCase().includes(pickSearch.toLowerCase())))

  return (
    <Page title="">
      <button className="link-btn row" style={{ marginBottom: 8 }} onClick={goBack}>
        <IconChevron size={14} dir="left" /> 返回
      </button>
      <div className="row-between">
        <h1 className="page-title" style={{ marginBottom: 8 }}>训练明细</h1>
        <button className="btn btn-sm" onClick={() => setMoreOpen(true)}>更多</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="small dim">日期
            <input className="input num" style={{ minHeight: 40, marginLeft: 6, width: 150, display: 'inline-block' }} type="date" value={workout.date} onChange={(e) => void save({ date: e.target.value })} />
          </label>
          <span className="small muted num">{fmtClock(workout.startTime)}{workout.endTime ? `–${fmtClock(workout.endTime)}` : ''} · {fmtDuration((workout.endTime ?? Date.now()) - workout.startTime)}</span>
        </div>
        <div className="row" style={{ gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <label className="small dim num">体重
            <input className="input num" style={{ minHeight: 40, marginLeft: 6, width: 80, display: 'inline-block' }} inputMode="decimal" placeholder="kg" value={workout.bodyWeightKg ?? ''} onChange={(e) => void save({ bodyWeightKg: e.target.value ? parseFloat(e.target.value) : undefined })} />
          </label>
          <div className="row" style={{ gap: 6 }}>
            <span className="small dim">感受</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => void save({ feeling: n as 1 | 2 | 3 | 4 | 5 })} className={`tag num${workout.feeling === n ? ' tag-on' : ''}`} style={{ cursor: 'pointer' }}>{n}</button>
            ))}
          </div>
        </div>
        <textarea className="input" style={{ marginTop: 10 }} placeholder="备注" value={workout.note ?? ''} onChange={(e) => void save({ note: e.target.value || undefined })} />
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <div className="card grow" style={{ textAlign: 'center', padding: 10 }}>
          <div className="num" style={{ fontSize: 20, fontWeight: 800 }}>{sets.filter((s) => s.done).length}</div>
          <div className="small dim">组</div>
        </div>
        <div className="card grow" style={{ textAlign: 'center', padding: 10 }}>
          <div className="num" style={{ fontSize: 20, fontWeight: 800 }}>{trimNum(Math.round(totalVol))}</div>
          <div className="small dim">容量 kg</div>
        </div>
      </div>

      {groups.map(({ ex, list }) => (
        <section key={list[0].exerciseId} className="card" style={{ marginBottom: 12, padding: 12 }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{ex?.nameZh ?? '未知动作'}</span>
              <span className="small dim" style={{ marginLeft: 8 }}>{ex?.nameEn}</span>
            </div>
            <span className="tag">{ex?.equipment}</span>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {list.map((s) => (
              <div key={s.id} className="set-row" style={{ padding: '8px 10px', opacity: s.done ? 1 : 0.75 }}>
                <button className={`set-check${s.done ? ' done' : ''}`} onClick={() => void saveSet(s, { done: !s.done, completedAt: !s.done ? Date.now() : undefined })}>
                  <IconCheck size={13} />
                </button>
                <span className="small dim num" style={{ width: 16 }}>{s.setNo + 1}</span>
                <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--text)' }} onClick={() => setEdit({ set: s, field: 'weightKg', value: trimNum(s.weightKg) })}>
                  <span className="num" style={{ fontSize: 20, fontWeight: 800 }}>{trimNum(s.weightKg)}</span>
                </button>
                <span className="dim">×</span>
                <button style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--text)' }} onClick={() => setEdit({ set: s, field: 'reps', value: `${s.reps}` })}>
                  <span className="num" style={{ fontSize: 20, fontWeight: 800 }}>{s.reps}</span>
                </button>
                <button className="tag" style={{ cursor: 'pointer' }} onClick={() => { const i = SET_TYPES.indexOf(s.type); void saveSet(s, { type: SET_TYPES[(i + 1) % SET_TYPES.length] }) }}>{s.type}</button>
                {s.rir !== undefined && <span className="small dim num">RIR{s.rir}</span>}
                {s.rpe !== undefined && <span className="small dim num">RPE{s.rpe}</span>}
                <span className="grow" />
                <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--red)' }} onClick={() => void deleteSet(s.id)}><IconTrash size={14} /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-block btn-ghost" style={{ marginTop: 6, minHeight: 40 }} onClick={() => void addSet(list[0].exerciseId)}>
            <IconPlus size={13} /> 添加一组
          </button>
        </section>
      ))}

      <button className="btn btn-block" onClick={() => { setPickSearch(''); setPickerOpen(true) }}>
        <IconPlus size={15} /> 添加动作
      </button>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.field === 'weightKg' ? '重量（kg）' : '次数'}>
        {edit && (
          <>
            <div className="num" style={{ fontSize: 40, fontWeight: 800, textAlign: 'center', margin: '4px 0 14px' }}>{edit.value || '0'}</div>
            <Numpad value={edit.value} onChange={(v) => setEdit({ ...edit, value: v })} onConfirm={() => void commitEdit()} />
            <button className="btn btn-accent btn-block" style={{ marginTop: 10 }} onClick={() => void commitEdit()}>确定</button>
          </>
        )}
      </Sheet>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="添加动作">
        <input className="input" placeholder="搜索动作" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} autoFocus />
        <div style={{ display: 'grid', gap: 6, marginTop: 12, maxHeight: '50dvh', overflowY: 'auto' }}>
          {candidates.map((e) => (
            <button key={e.id} className="list-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => void addExercise(e.id)}>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{e.nameZh}</div>
                <div className="small dim">{e.nameEn}</div>
              </div>
              <span className="tag">{e.equipment}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="更多操作">
        <button className="btn btn-block" onClick={() => { setMoreOpen(false); void copyAsNew() }}>复制为新训练</button>
        <button className="btn btn-danger btn-block" style={{ marginTop: 8 }} onClick={() => { setMoreOpen(false); setDelOpen(true) }}>删除整次训练</button>
      </Sheet>

      <Sheet open={delOpen} onClose={() => setDelOpen(false)} title="删除训练">
        <p className="muted" style={{ marginTop: 0 }}>将删除本次训练及全部组记录，不可恢复。</p>
        <button className="btn btn-danger btn-block" onClick={() => void removeAll()}>确认删除</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setDelOpen(false)}>取消</button>
      </Sheet>
    </Page>
  )
}
