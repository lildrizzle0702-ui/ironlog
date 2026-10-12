import { useEffect, useMemo, useState } from 'react'
import { getDB, uid } from '../db/db'
import type { Equipment, Exercise, Muscle } from '../db/types'
import { navigate } from '../router'
import { Page } from '../chrome'
import { Sheet, Seg, Switch, Empty, Spinner } from '../components/ui'
import { IconPlus, IconTrash } from '../components/icons'
import './pages-extra.css'

const MUSCLES: Muscle[] = ['胸', '背', '肩', '腿', '二头', '三头', '核心', '臀', '斜方', '小腿']
const EQUIPMENTS: Equipment[] = ['杠铃', '哑铃', '器械', '绳索', '自重']
type EquipFilter = '全部' | Equipment
const EQUIP_OPTS: { value: EquipFilter; label: string }[] = [
  { value: '全部', label: '全部' },
  ...EQUIPMENTS.map((e) => ({ value: e as EquipFilter, label: e })),
]

const toggleMuscle = (arr: Muscle[], m: Muscle): Muscle[] =>
  arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m]

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null)
  const [search, setSearch] = useState('')
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [equip, setEquip] = useState<EquipFilter>('全部')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleting, setDeleting] = useState<Exercise | null>(null)

  useEffect(() => {
    let alive = true
    getDB()
      .then((db) => db.getAll('exercises'))
      .then((all) => {
        if (alive) setExercises(all)
      })
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!exercises) return []
    const q = search.trim().toLowerCase()
    return exercises.filter((e) => {
      if (q && !e.nameZh.toLowerCase().includes(q) && !e.nameEn.toLowerCase().includes(q)) return false
      if (muscles.length > 0) {
        const all = [...e.primaryMuscles, ...e.secondaryMuscles]
        if (!muscles.some((m) => all.includes(m))) return false
      }
      if (equip !== '全部' && e.equipment !== equip) return false
      return true
    })
  }, [exercises, search, muscles, equip])

  const saveNew = async (draft: Exercise) => {
    const db = await getDB()
    await db.put('exercises', draft)
    setExercises((prev) => (prev ? [...prev, draft] : [draft]))
  }

  const doDelete = async () => {
    if (!deleting) return
    const target = deleting
    const db = await getDB()
    await db.delete('exercises', target.id)
    setExercises((prev) => (prev ? prev.filter((x) => x.id !== target.id) : prev))
    setDeleting(null)
  }

  return (
    <Page title="动作库">
      <input
        className="input"
        placeholder="搜索动作（中文或英文）"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <div className="et-chips" style={{ marginBottom: 10 }}>
        <button className={`et-chip${muscles.length === 0 ? ' on' : ''}`} onClick={() => setMuscles([])}>
          全部
        </button>
        {MUSCLES.map((m) => (
          <button
            key={m}
            className={`et-chip${muscles.includes(m) ? ' on' : ''}`}
            onClick={() => setMuscles((prev) => toggleMuscle(prev, m))}
          >
            {m}
          </button>
        ))}
      </div>
      <Seg options={EQUIP_OPTS} value={equip} onChange={setEquip} />
      <div style={{ height: 14 }} />
      {!exercises ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty text="没有符合条件的动作" />
      ) : (
        <div className="et-list">
          {filtered.map((e) => (
            <div key={e.id} className="list-row" onClick={() => navigate('#/exercise/' + e.id)}>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {e.nameZh}
                  {e.unilateral ? <span className="small dim"> · 单侧</span> : null}
                </div>
                <div className="small dim">{e.nameEn}</div>
              </div>
              <div className="et-tags">
                {e.primaryMuscles.slice(0, 2).map((m) => (
                  <span key={m} className="tag">
                    {m}
                  </span>
                ))}
                <span className="tag">{e.equipment}</span>
              </div>
              {e.custom ? (
                <button
                  className="icon-btn et-icon-btn"
                  aria-label="删除"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setDeleting(e)
                  }}
                >
                  <IconTrash size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => setSheetOpen(true)}>
        <IconPlus size={18} /> 自定义动作
      </button>
      {sheetOpen ? <ExerciseFormSheet onClose={() => setSheetOpen(false)} onSave={saveNew} /> : null}
      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="删除动作">
        <p className="muted" style={{ margin: 0 }}>
          确定删除「{deleting?.nameZh}」吗？历史训练记录会保留。
        </p>
        <div className="et-actions">
          <button className="btn grow" onClick={() => setDeleting(null)}>
            取消
          </button>
          <button className="btn btn-danger grow" onClick={doDelete}>
            删除
          </button>
        </div>
      </Sheet>
    </Page>
  )
}

function ExerciseFormSheet({
  initial,
  onClose,
  onSave,
}: {
  initial?: Exercise
  onClose: () => void
  onSave: (draft: Exercise) => Promise<void>
}) {
  const [nameZh, setNameZh] = useState(initial?.nameZh ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [primary, setPrimary] = useState<Muscle[]>(initial?.primaryMuscles ?? [])
  const [secondary, setSecondary] = useState<Muscle[]>(initial?.secondaryMuscles ?? [])
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? '杠铃')
  const [unilateral, setUnilateral] = useState(initial?.unilateral ?? false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!nameZh.trim() || saving) return
    setSaving(true)
    try {
      await onSave({
        id: initial?.id ?? uid(),
        nameZh: nameZh.trim(),
        nameEn: nameEn.trim(),
        primaryMuscles: primary,
        secondaryMuscles: secondary,
        equipment,
        unilateral,
        custom: true,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={initial ? '编辑动作' : '自定义动作'}>
      <div className="field">
        <label className="field-label">中文名</label>
        <input className="input" value={nameZh} onChange={(e) => setNameZh(e.target.value)} placeholder="如：海豹划船" />
      </div>
      <div className="field">
        <label className="field-label">英文名</label>
        <input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="如：Seal Row" />
      </div>
      <div className="field">
        <label className="field-label">主肌群（可多选）</label>
        <div className="et-chips">
          {MUSCLES.map((m) => (
            <button
              key={m}
              className={`et-chip${primary.includes(m) ? ' on' : ''}`}
              onClick={() => setPrimary((p) => toggleMuscle(p, m))}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">次要肌群（可多选）</label>
        <div className="et-chips">
          {MUSCLES.map((m) => (
            <button
              key={m}
              className={`et-chip${secondary.includes(m) ? ' on' : ''}`}
              onClick={() => setSecondary((p) => toggleMuscle(p, m))}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">器械</label>
        <Seg options={EQUIPMENTS.map((v) => ({ value: v, label: v }))} value={equipment} onChange={setEquipment} />
      </div>
      <div className="field row-between">
        <label className="field-label" style={{ margin: 0 }}>
          单侧动作
        </label>
        <Switch checked={unilateral} onChange={setUnilateral} />
      </div>
      <button className="btn btn-accent btn-block" disabled={!nameZh.trim() || saving} onClick={save}>
        {saving ? '保存中…' : '保存'}
      </button>
    </Sheet>
  )
}
