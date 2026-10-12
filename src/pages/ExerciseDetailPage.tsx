import { useCallback, useEffect, useState } from 'react'
import { getDB, getSettings } from '../db/db'
import type { Exercise, PersonalRecord, Settings, WorkSet } from '../db/types'
import { navigate, goBack } from '../router'
import { Page } from '../chrome'
import { Empty, Sheet, Spinner } from '../components/ui'
import { IconCheck, IconChevron, IconTrophy } from '../components/icons'
import { e1rmAll } from '../lib/e1rm'
import { trimNum } from '../lib/plates'
import { daysAgoStr } from '../lib/date'
import { todayStr } from '../db/db'
import { PR_LABEL } from '../lib/pr'
import { useActive } from '../store/active'
import './pages-extra.css'

const PR_ORDER: PersonalRecord['type'][] = ['weight', 'reps', 'volume', 'e1rm']

export default function ExerciseDetailPage({ id }: { id: string }) {
  const [ex, setEx] = useState<Exercise | null>(null)
  const [sets, setSets] = useState<WorkSet[]>([])
  const [prs, setPrs] = useState<PersonalRecord[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showFormulas, setShowFormulas] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const active = useActive()
  const today = todayStr()

  const load = useCallback(async () => {
    const db = await getDB()
    const [e, s, p, st] = await Promise.all([
      db.get('exercises', id),
      db.getAllFromIndex('sets', 'by-exercise', id),
      db.getAllFromIndex('prs', 'by-exercise', id),
      getSettings(),
    ])
    setEx(e ?? null)
    setSets(s.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)))
    setPrs(p.sort((a, b) => (a.date < b.date ? 1 : -1)))
    setSettings(st)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (!ex || !settings) return <Page title="动作详情"><Spinner /></Page>

  const doneSets = sets.filter((s) => s.done && s.type !== '热身')
  const bestSet = doneSets.reduce<(typeof doneSets)[number] | null>(
    (best, s) => (best === null || s.weightKg * s.reps > best.weightKg * best.reps ? s : best),
    null,
  )
  const formulas = bestSet ? e1rmAll(bestSet.weightKg, bestSet.reps) : null
  const bestE = formulas ? formulas[settings.e1rmFormula] : null

  const startWith = async () => {
    if (!active.workoutId) await active.startEmpty()
    active.addEntry(ex.id)
    navigate('#/workout')
  }

  const del = async () => {
    const db = await getDB()
    await db.delete('exercises', ex.id)
    navigate('#/exercises')
  }

  return (
    <Page title="">
      <button className="link-btn row" style={{ marginBottom: 8 }} onClick={goBack}>
        <IconChevron size={14} dir="left" /> 动作库
      </button>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row-between">
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{ex.nameZh}</div>
            <div className="small muted">{ex.nameEn}</div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {ex.custom && <button className="btn btn-sm btn-ghost" onClick={() => setEditOpen(true)}>编辑</button>}
            {ex.custom && <button className="btn btn-sm btn-ghost red" onClick={() => setDelOpen(true)}>删除</button>}
          </div>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="tag">{ex.equipment}</span>
          {ex.primaryMuscles.map((m) => <span key={m} className="tag" style={{ color: 'var(--text)' }}>{m}</span>)}
          {ex.secondaryMuscles.map((m) => <span key={m} className="tag">次 · {m}</span>)}
          {ex.unilateral && <span className="tag">单侧</span>}
          {ex.custom && <span className="tag" style={{ color: 'var(--accent)' }}>自定义</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row-between">
          <div>
            <div className="small dim">最佳组 e1RM（{settings.e1rmFormula}）</div>
            <div className="num" style={{ fontSize: 36, fontWeight: 800 }}>{bestE !== null ? trimNum(Math.round(bestE * 10) / 10) : '—'}</div>
            {bestSet && <div className="small dim num">{trimNum(bestSet.weightKg)}kg × {bestSet.reps}</div>}
          </div>
          {formulas && (
            <button className="link-btn" onClick={() => setShowFormulas(!showFormulas)}>
              三公式 {showFormulas ? '▴' : '▾'}
            </button>
          )}
        </div>
        {showFormulas && formulas && (
          <div style={{ marginTop: 10 }}>
            {(['epley', 'brzycki', 'lombardi'] as const).map((f) => (
              <div key={f} className="row-between" style={{ padding: '5px 0' }}>
                <span className="small" style={{ textTransform: 'capitalize', color: f === settings.e1rmFormula ? 'var(--accent)' : 'var(--text-2)', fontWeight: f === settings.e1rmFormula ? 700 : 400 }}>
                  {f}{f === settings.e1rmFormula && ' ·默认'}
                </span>
                <span className="num" style={{ fontWeight: 700 }}>{trimNum(Math.round(formulas[f] * 10) / 10)} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={() => void startWith()}>
        加入当前训练
      </button>

      <h2 style={{ fontSize: 17, margin: '16px 0 8px' }}>PR 历史</h2>
      {prs.length === 0 ? (
        <Empty text="还没有 PR，去完成一组吧" />
      ) : (
        PR_ORDER.map((type) => {
          const list = prs.filter((p) => p.type === type)
          if (list.length === 0) return null
          return (
            <div key={type} className="card" style={{ marginBottom: 8 }}>
              <div className="small dim" style={{ marginBottom: 6 }}>{PR_LABEL[type]}</div>
              {list.map((p, i) => (
                <div key={p.id} className="row" style={{ gap: 8, padding: '5px 0' }}>
                  <span className={`num ${i === 0 ? 'gold' : ''}`} style={{ fontWeight: i === 0 ? 800 : 500, width: 76 }}>
                    {trimNum(p.value)}{type === 'e1rm' ? ' kg' : type === 'weight' ? ' kg' : type === 'volume' ? ' kg' : ' 次'}
                  </span>
                  <span className="small muted grow">
                    {p.weightKg !== undefined && `${trimNum(p.weightKg)}kg × ${p.reps}`}
                  </span>
                  {i === 0 && <IconTrophy size={14} />}
                  <span className="small dim">{daysAgoStr(p.date, today)}</span>
                </div>
              ))}
            </div>
          )
        })
      )}

      <h2 style={{ fontSize: 17, margin: '16px 0 8px' }}>近期记录</h2>
      {sets.length === 0 ? (
        <Empty text="还没有记录" />
      ) : (
        <div className="card" style={{ padding: 4 }}>
          {sets.slice(0, 20).map((s) => (
            <div key={s.id} className="row" style={{ gap: 8, padding: '8px 10px' }}>
              <span className="small dim num" style={{ width: 44 }}>{s.setNo + 1}</span>
              <span className="num" style={{ fontWeight: 700 }}>{trimNum(s.weightKg)}×{s.reps}</span>
              <span className="small dim">{s.type}</span>
              {s.rir !== undefined && <span className="small dim num">RIR{s.rir}</span>}
              {s.rpe !== undefined && <span className="small dim num">RPE{s.rpe}</span>}
              <span className="grow" />
              {s.done && <span className="accent"><IconCheck size={12} /></span>}
            </div>
          ))}
        </div>
      )}

      <EditSheet open={editOpen} onClose={() => setEditOpen(false)} ex={ex} onSaved={() => void load()} />
      <Sheet open={delOpen} onClose={() => setDelOpen(false)} title={`删除 ${ex.nameZh}`}>
        <p className="muted" style={{ marginTop: 0 }}>将删除该动作（历史组记录保留但不再关联）。</p>
        <button className="btn btn-danger btn-block" onClick={() => void del()}>确认删除</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setDelOpen(false)}>取消</button>
      </Sheet>
    </Page>
  )
}

const MUSCLES = ['胸', '背', '肩', '腿', '二头', '三头', '核心', '臀', '斜方', '小腿'] as const
const EQUIPMENTS = ['杠铃', '哑铃', '器械', '绳索', '自重'] as const

export function EditSheet({ open, onClose, ex, onSaved }: { open: boolean; onClose: () => void; ex: Exercise | null; onSaved: () => void }) {
  const [zh, setZh] = useState('')
  const [en, setEn] = useState('')
  const [primary, setPrimary] = useState<string[]>([])
  const [secondary, setSecondary] = useState<string[]>([])
  const [equip, setEquip] = useState<(typeof EQUIPMENTS)[number]>('杠铃')
  const [unilateral, setUnilateral] = useState(false)

  useEffect(() => {
    if (open && ex) {
      setZh(ex.nameZh)
      setEn(ex.nameEn)
      setPrimary([...ex.primaryMuscles])
      setSecondary([...ex.secondaryMuscles])
      setEquip(ex.equipment)
      setUnilateral(ex.unilateral)
    }
  }, [open, ex])

  const toggle = (list: string[], set: (v: string[]) => void, m: string) =>
    set(list.includes(m) ? list.filter((x) => x !== m) : [...list, m])

  const save = async () => {
    if (!ex || !zh.trim()) return
    const db = await getDB()
    await db.put('exercises', {
      ...ex,
      nameZh: zh.trim(),
      nameEn: en.trim(),
      primaryMuscles: primary as Exercise['primaryMuscles'],
      secondaryMuscles: secondary as Exercise['secondaryMuscles'],
      equipment: equip,
      unilateral,
    })
    onSaved()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={ex && ex.custom && ex.id.startsWith('ex-') ? '编辑动作' : '编辑自定义动作'}>
      <div className="field"><label className="field-label">中文名</label><input className="input" value={zh} onChange={(e) => setZh(e.target.value)} /></div>
      <div className="field"><label className="field-label">英文名</label><input className="input" value={en} onChange={(e) => setEn(e.target.value)} /></div>
      <div className="field">
        <label className="field-label">主肌群</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {MUSCLES.map((m) => (
            <button key={m} className={`tag${primary.includes(m) ? ' tag-on' : ''}`} onClick={() => toggle(primary, setPrimary, m)}>{m}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">次要肌群</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {MUSCLES.map((m) => (
            <button key={m} className={`tag${secondary.includes(m) ? ' tag-on' : ''}`} onClick={() => toggle(secondary, setSecondary, m)}>{m}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">器械</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {EQUIPMENTS.map((e) => (
            <button key={e} className={`tag${equip === e ? ' tag-on' : ''}`} onClick={() => setEquip(e)}>{e}</button>
          ))}
        </div>
      </div>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <span className="field-label" style={{ margin: 0 }}>单侧动作</span>
        <button className={`tag${unilateral ? ' tag-on' : ''}`} onClick={() => setUnilateral(!unilateral)}>{unilateral ? '是' : '否'}</button>
      </div>
      <button className="btn btn-accent btn-block" onClick={() => void save()}>保存</button>
    </Sheet>
  )
}
