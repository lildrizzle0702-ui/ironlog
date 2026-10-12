import { useCallback, useEffect, useState } from 'react'
import { getDB, todayStr } from '../db/db'
import type { Exercise, WorkSet, Workout } from '../db/types'
import { navigate } from '../router'
import { Page } from '../chrome'
import { Sheet } from '../components/ui'
import { IconChevron } from '../components/icons'
import { fmtClock, fmtDuration, monthMatrix } from '../lib/date'
import { trimNum } from '../lib/plates'
import './pages-extra.css'

export default function CalendarPage() {
  const today = todayStr()
  const [ym, setYm] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }))
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [sets, setSets] = useState<WorkSet[]>([])
  const [exMap, setExMap] = useState<Record<string, Exercise>>({})
  const [selDate, setSelDate] = useState<string | null>(null)

  const load = useCallback(async () => {
    const db = await getDB()
    const [w, s, e] = await Promise.all([db.getAll('workouts'), db.getAll('sets'), db.getAll('exercises')])
    setWorkouts(w)
    setSets(s)
    const m: Record<string, Exercise> = {}
    for (const x of e) m[x.id] = x
    setExMap(m)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const byDate = new Map<string, Workout[]>()
  for (const w of workouts) {
    if (!byDate.has(w.date)) byDate.set(w.date, [])
    byDate.get(w.date)!.push(w)
  }

  const wSets = (id: string) => sets.filter((s) => s.workoutId === id)
  const musclesOf = (id: string) => {
    const ms = new Set<string>()
    for (const s of wSets(id)) {
      const ex = exMap[s.exerciseId]
      if (ex) ex.primaryMuscles.forEach((m) => ms.add(m))
    }
    return [...ms].slice(0, 3)
  }

  const matrix = monthMatrix(ym.y, ym.m)
  const DOW = ['一', '二', '三', '四', '五', '六', '日']
  const selWorkouts = selDate ? (byDate.get(selDate) ?? []) : []

  return (
    <Page title="日历">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{ym.y}年{ym.m + 1}月</h2>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn" onClick={() => setYm((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}><IconChevron size={18} dir="left" /></button>
          <button className="btn btn-sm btn-ghost" onClick={() => setYm({ y: new Date().getFullYear(), m: new Date().getMonth() })}>今天</button>
          <button className="icon-btn" onClick={() => setYm((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}><IconChevron size={18} /></button>
        </div>
      </div>

      <div className="card" style={{ padding: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DOW.map((d) => <div key={d} className="small dim" style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
        </div>
        {matrix.map((week, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {week.map((date, j) => {
              if (!date) return <div key={j} />
              const dayW = byDate.get(date) ?? []
              const has = dayW.length > 0
              const isToday = date === today
              return (
                <button
                  key={j}
                  onClick={() => has && setSelDate(date)}
                  style={{
                    appearance: 'none', border: isToday ? '1px solid var(--accent)' : '1px solid transparent', background: 'transparent',
                    borderRadius: 10, padding: '6px 2px', cursor: has ? 'pointer' : 'default', minHeight: 52,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}
                >
                  <span className="num" style={{ fontSize: 14, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent)' : has ? 'var(--text)' : 'var(--text-3)' }}>
                    {Number(date.slice(8))}
                  </span>
                  {has && (
                    <span className="row" style={{ gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {musclesOf(dayW[0].id).map((m) => (
                        <span key={m} style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 700 }}>{m}</span>
                      ))}
                    </span>
                  )}
                  {has && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <Sheet open={!!selDate} onClose={() => setSelDate(null)} title={selDate ? `${Number(selDate.slice(5, 7))}月${Number(selDate.slice(8))}日` : ''}>
        <div style={{ display: 'grid', gap: 8 }}>
          {selWorkouts.map((w) => {
            const ss = wSets(w.id)
            const vol = ss.filter((s) => s.type !== '热身').reduce((a, s) => a + s.weightKg * s.reps, 0)
            return (
              <button key={w.id} className="list-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setSelDate(null); navigate(`#/workout/${w.id}`) }}>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{w.templateName ?? '自由训练'}</div>
                  <div className="small dim num">
                    {fmtClock(w.startTime)}{w.endTime ? `–${fmtClock(w.endTime)}` : ''} · {fmtDuration((w.endTime ?? w.startTime) - w.startTime)} · {ss.length} 组
                  </div>
                </div>
                <div className="small muted num">{trimNum(Math.round(vol))} kg</div>
                <IconChevron size={16} />
              </button>
            )
          })}
        </div>
      </Sheet>
    </Page>
  )
}
