import { useCallback, useEffect, useState } from 'react'
import { getDB, todayStr, uid } from '../db/db'
import type { WorkSet, Workout } from '../db/types'
import { navigate } from '../router'
import { Page } from '../chrome'
import { Sheet } from '../components/ui'
import { IconChevron, IconCopy, IconTrash } from '../components/icons'
import { fmtClock, fmtDateCN, fmtDuration } from '../lib/date'
import { trimNum } from '../lib/plates'
import { useActive } from '../store/active'
import './pages-extra.css'

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [sets, setSets] = useState<WorkSet[]>([])
  const [delTarget, setDelTarget] = useState<Workout | null>(null)
  const active = useActive()

  const load = useCallback(async () => {
    const db = await getDB()
    const [w, s] = await Promise.all([db.getAll('workouts'), db.getAll('sets')])
    setWorkouts(w.sort((a, b) => (a.date === b.date ? b.startTime - a.startTime : a.date < b.date ? 1 : -1)))
    setSets(s)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setsOf = (id: string) => sets.filter((s) => s.workoutId === id)
  const thisYear = new Date().getFullYear()

  const remove = async () => {
    if (!delTarget) return
    const db = await getDB()
    const tx = db.transaction(['sets', 'workouts'], 'readwrite')
    for (const s of setsOf(delTarget.id)) await tx.objectStore('sets').delete(s.id)
    await tx.objectStore('workouts').delete(delTarget.id)
    await tx.done
    setDelTarget(null)
    void load()
  }

  const copyAsNew = async (w: Workout) => {
    const db = await getDB()
    const newId = uid()
    const nw: Workout = { ...w, id: newId, date: todayStr(), startTime: Date.now(), endTime: undefined }
    await db.put('workouts', nw)
    const tx = db.transaction('sets', 'readwrite')
    for (const s of setsOf(w.id)) {
      await tx.store.put({ ...s, id: uid(), workoutId: newId, done: false, completedAt: undefined })
    }
    await tx.done
    const seen = new Map<string, string | undefined>()
    for (const s of setsOf(w.id)) {
      if (!seen.has(s.exerciseId)) seen.set(s.exerciseId, s.supersetGroupId)
    }
    await active.resume(newId, [...seen.entries()].map(([exerciseId, supersetGroupId]) => ({ exerciseId, supersetGroupId })))
    navigate('#/workout')
  }

  return (
    <Page title="">
      <button className="link-btn row" style={{ marginBottom: 8 }} onClick={() => navigate('#/log')}>
        <IconChevron size={14} dir="left" /> 记训
      </button>
      <h1 className="page-title">训练历史</h1>
      <div className="small muted" style={{ marginBottom: 12 }}>
        共 {workouts.length} 次 · {thisYear}年 {workouts.filter((w) => w.date.startsWith(`${thisYear}`)).length} 次
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {workouts.map((w) => {
          const ss = setsOf(w.id)
          const vol = ss.filter((s) => s.type !== '热身').reduce((a, s) => a + s.weightKg * s.reps, 0)
          return (
            <div key={w.id} className="card" style={{ padding: 0 }}>
              <button className="list-row" style={{ width: '100%', textAlign: 'left', border: 0, borderRadius: 'var(--r-lg)' }} onClick={() => navigate(`#/workout/${w.id}`)}>
                <div className="grow">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="num" style={{ fontSize: 17, fontWeight: 800 }}>{fmtDateCN(w.date)}</span>
                    <span className="small dim">{w.date.slice(0, 4)}</span>
                    {w.feeling && <span className="tag num">{w.feeling}★</span>}
                  </div>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {w.templateName ?? '自由训练'} · {fmtClock(w.startTime)} · {ss.length} 组
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700 }}>{trimNum(Math.round(vol))} <span className="small dim">kg</span></div>
                  <div className="small dim num">{fmtDuration((w.endTime ?? w.startTime) - w.startTime)}</div>
                </div>
                <IconChevron size={16} />
              </button>
              <div className="row" style={{ borderTop: '1px solid var(--line)' }}>
                <button className="btn btn-sm btn-ghost grow" onClick={() => void copyAsNew(w)}><IconCopy size={13} /> 复制为新训练</button>
                <button className="btn btn-sm btn-ghost grow red" onClick={() => setDelTarget(w)}><IconTrash size={13} /> 删除</button>
              </div>
            </div>
          )
        })}
        {workouts.length === 0 && <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>还没有训练记录</div>}
      </div>

      <Sheet open={!!delTarget} onClose={() => setDelTarget(null)} title="删除训练">
        <p className="muted" style={{ marginTop: 0 }}>将删除「{delTarget ? fmtDateCN(delTarget.date) : ''} {delTarget?.templateName ?? '自由训练'}」及其全部组记录，不可恢复。</p>
        <button className="btn btn-danger btn-block" onClick={() => void remove()}>确认删除</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setDelTarget(null)}>取消</button>
      </Sheet>
    </Page>
  )
}
