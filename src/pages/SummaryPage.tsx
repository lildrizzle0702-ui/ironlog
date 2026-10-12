import { useEffect, useState } from 'react'
import { getDB } from '../db/db'
import type { PersonalRecord, WorkSet, Workout } from '../db/types'
import { navigate } from '../router'
import { Page } from '../chrome'
import { IconTrophy } from '../components/icons'
import { fmtDuration } from '../lib/date'
import { trimNum } from '../lib/plates'
import { PR_LABEL } from '../lib/pr'
import './pages-extra.css'

export default function SummaryPage({ id }: { id: string }) {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [sets, setSets] = useState<WorkSet[]>([])
  const [prs, setPrs] = useState<PersonalRecord[]>([])
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined)
  const [bw, setBw] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    void (async () => {
      const db = await getDB()
      const w = await db.get('workouts', id)
      if (!w) return
      const s = await db.getAllFromIndex('sets', 'by-workout', id)
      const allPrs = await db.getAll('prs')
      setWorkout(w)
      setSets(s)
      setFeeling(w.feeling)
      setBw(w.bodyWeightKg !== undefined ? `${w.bodyWeightKg}` : '')
      setNote(w.note ?? '')
      const exIds = new Set(s.map((x) => x.exerciseId))
      setPrs(allPrs.filter((p) => p.date === w.date && exIds.has(p.exerciseId)))
    })()
  }, [id])

  if (!workout) return <Page title="训练总结" />

  const doneSets = sets.filter((s) => s.done && s.type !== '热身')
  const volume = doneSets.reduce((a, s) => a + s.weightKg * s.reps, 0)
  const duration = workout.endTime ? workout.endTime - workout.startTime : 0

  const save = async () => {
    const db = await getDB()
    const next: Workout = {
      ...workout,
      feeling,
      bodyWeightKg: bw ? parseFloat(bw) : undefined,
      note: note || undefined,
    }
    await db.put('workouts', next)
    setWorkout(next)
  }

  return (
    <Page title="训练总结">
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <div className="card grow" style={{ textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>{fmtDuration(duration)}</div>
          <div className="small dim">时长</div>
        </div>
        <div className="card grow" style={{ textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>{doneSets.length}</div>
          <div className="small dim">正式组</div>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <div className="card grow" style={{ textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>{trimNum(Math.round(volume))}</div>
          <div className="small dim">总容量 kg</div>
        </div>
        <div className="card grow" style={{ textAlign: 'center' }}>
          <div className="num gold" style={{ fontSize: 24, fontWeight: 800 }}>{prs.length}</div>
          <div className="small dim">PR</div>
        </div>
      </div>

      {prs.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          {prs.map((p, i) => (
            <div key={p.id} className="row" style={{ gap: 8, padding: '6px 0' }}>
              <IconTrophy size={14} />
              <span className="small gold">{PR_LABEL[p.type]}</span>
              <span className="grow" />
              <span className="num" style={{ fontWeight: 700 }}>{trimNum(p.value)}</span>
              {i < prs.length - 1 ? null : null}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field-label">感受</div>
        <div className="row" style={{ gap: 10, justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setFeeling(n as 1 | 2 | 3 | 4 | 5)}
              style={{
                width: 48, height: 48, borderRadius: '50%', cursor: 'pointer',
                border: feeling === n ? '2px solid var(--accent)' : '1px solid var(--line-strong)',
                background: feeling === n ? 'var(--accent-dim)' : 'var(--card-2)',
                color: feeling === n ? 'var(--accent)' : 'var(--text-3)',
                fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-num)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="field-label" style={{ marginTop: 14 }}>当天体重（kg，选填）</div>
        <input className="input num" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="—" />
        <div className="field-label" style={{ marginTop: 12 }}>备注</div>
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="睡眠、状态、下次注意…" />
        <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => void save()}>保存</button>
      </div>

      <button className="btn btn-accent btn-block" onClick={() => navigate('#/log')}>完成</button>
    </Page>
  )
}
