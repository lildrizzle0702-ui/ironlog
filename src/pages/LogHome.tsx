import { useEffect, useState } from 'react'
import { getDB } from '../db/db'
import type { WorkoutTemplate } from '../db/types'
import { useActive } from '../store/active'
import { navigate } from '../router'
import { Page } from '../chrome'
import { Sheet } from '../components/ui'
import { IconChevron } from '../components/icons'
import { fmtDuration } from '../lib/date'

export default function LogHome() {
  const active = useActive()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [confirmNew, setConfirmNew] = useState(false)

  useEffect(() => {
    getDB().then((db) => db.getAll('templates')).then((t) => setTemplates(t.sort((a, b) => a.sort - b.sort)))
  }, [])

  const [, force] = useState(0)
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const startEmpty = async () => {
    if (active.workoutId) {
      setConfirmNew(true)
      return
    }
    await active.startEmpty()
    navigate('#/workout')
  }

  return (
    <Page title="记训">
      {active.workoutId && active.workout && (
        <button className="card fade-in" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 16 }} onClick={() => navigate('#/workout')}>
          <div className="row-between">
            <div>
              <div className="small accent" style={{ fontWeight: 700 }}>进行中</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{active.workout.templateName ?? '自由训练'}</div>
              <div className="small muted num" style={{ marginTop: 4 }}>
                {fmtDuration(Date.now() - active.workout.startTime)} · {active.entries.length} 个动作
              </div>
            </div>
            <IconChevron size={22} />
          </div>
        </button>
      )}

      <button className="btn btn-accent btn-block" style={{ marginBottom: 20 }} onClick={startEmpty}>
        开始空手训练
      </button>

      <div className="row-between" style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 17 }}>从模板开始</h2>
        <button className="link-btn" onClick={() => navigate('#/templates')}>管理模板 →</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {templates.map((t) => (
          <div key={t.id} className="list-row">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div className="small dim">{t.exercises.length} 个动作 · {t.exercises.reduce((a, e) => a + e.targetSets, 0)} 组</div>
            </div>
            <button
              className="btn btn-sm"
              onClick={async () => {
                await active.startFromTemplate(t)
                navigate('#/workout')
              }}
            >
              开始
            </button>
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 20 }}>
        <button className="btn grow" onClick={() => navigate('#/exercises')}>动作库</button>
        <button className="btn grow" onClick={() => navigate('#/history')}>训练历史</button>
      </div>

      <Sheet open={confirmNew} onClose={() => setConfirmNew(false)} title="已有进行中的训练">
        <p className="muted" style={{ marginTop: 0 }}>开始新训练会覆盖当前进度（当前训练仍保留在历史中）。</p>
        <button
          className="btn btn-accent btn-block"
          onClick={async () => {
            setConfirmNew(false)
            await active.startEmpty()
            navigate('#/workout')
          }}
        >
          仍要开始
        </button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setConfirmNew(false)}>取消</button>
      </Sheet>
    </Page>
  )
}
