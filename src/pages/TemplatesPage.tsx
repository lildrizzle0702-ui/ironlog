import { useCallback, useEffect, useState } from 'react'
import { getDB, uid } from '../db/db'
import type { Exercise, WorkoutTemplate } from '../db/types'
import { navigate, goBack } from '../router'
import { Page } from '../chrome'
import { Sheet } from '../components/ui'
import { IconChevron, IconPlus, IconTrash } from '../components/icons'
import { useActive } from '../store/active'
import './pages-extra.css'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [exMap, setExMap] = useState<Record<string, Exercise>>({})
  const [editing, setEditing] = useState<WorkoutTemplate | 'new' | null>(null)
  const [delTarget, setDelTarget] = useState<WorkoutTemplate | null>(null)
  const [startBusy, setStartBusy] = useState(false)
  const active = useActive()

  const load = useCallback(async () => {
    const db = await getDB()
    const [ts, exs] = await Promise.all([db.getAll('templates'), db.getAll('exercises')])
    setTemplates(ts.sort((a, b) => a.sort - b.sort))
    const m: Record<string, Exercise> = {}
    for (const e of exs) m[e.id] = e
    setExMap(m)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const start = async (t: WorkoutTemplate) => {
    setStartBusy(true)
    await active.startFromTemplate(t)
    setStartBusy(false)
    navigate('#/workout')
  }

  return (
    <Page title="">
      <button className="link-btn row" style={{ marginBottom: 8 }} onClick={goBack}>
        <IconChevron size={14} dir="left" /> 记训
      </button>
      <h1 className="page-title">训练模板</h1>
      <div style={{ display: 'grid', gap: 8 }}>
        {templates.map((t) => (
          <div key={t.id} className="card">
            <div className="row-between">
              <div className="row" style={{ gap: 8, minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>{t.name}</span>
                {t.builtin && <span className="tag">内置</span>}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {!t.builtin && (
                  <button className="icon-btn" style={{ width: 36, height: 36, color: 'var(--red)' }} onClick={() => setDelTarget(t)}>
                    <IconTrash size={15} />
                  </button>
                )}
                <button className="btn btn-sm" onClick={() => setEditing(t)}>编辑</button>
                <button className="btn btn-sm btn-accent" disabled={startBusy} onClick={() => void start(t)}>开始</button>
              </div>
            </div>
            <div className="small dim" style={{ marginTop: 6 }}>
              {t.exercises.map((e) => exMap[e.exerciseId]?.nameZh ?? '?').join(' · ')}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => setEditing('new')}>
        <IconPlus size={16} /> 新建模板
      </button>

      {editing !== null && (
        <TemplateEditor
          target={editing === 'new' ? null : editing}
          exMap={exMap}
          nextSort={templates.length}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load()
          }}
        />
      )}

      <Sheet open={!!delTarget} onClose={() => setDelTarget(null)} title={`删除模板「${delTarget?.name ?? ''}」`}>
        <button className="btn btn-danger btn-block" onClick={async () => { if (delTarget) { const db = await getDB(); await db.delete('templates', delTarget.id); setDelTarget(null); void load() } }}>确认删除</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setDelTarget(null)}>取消</button>
      </Sheet>
    </Page>
  )
}

function TemplateEditor({ target, exMap, nextSort, onClose, onSaved }: {
  target: WorkoutTemplate | null
  exMap: Record<string, Exercise>
  nextSort: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(target?.name ?? '')
  const [items, setItems] = useState(target?.exercises ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const save = async () => {
    if (!name.trim()) return
    const db = await getDB()
    const id = target?.id ?? uid()
    const tpl: WorkoutTemplate = {
      id,
      name: name.trim(),
      exercises: items,
      builtin: target?.builtin ?? false,
      sort: target?.sort ?? nextSort,
    }
    await db.put('templates', tpl)
    onSaved()
  }

  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }

  const setSs = (i: number, v: 'none' | 'A' | 'B') => {
    const next = [...items]
    next[i] = { ...next[i], supersetGroupId: v === 'none' ? undefined : `ss-${v.toLowerCase()}` }
    setItems(next)
  }

  const candidates = Object.values(exMap).filter((e) => !items.some((x) => x.exerciseId === e.id) &&
    (e.nameZh.includes(search) || e.nameEn.toLowerCase().includes(search.toLowerCase())))

  return (
    <Sheet open onClose={onClose} title={target ? '编辑模板' : '新建模板'}>
      <div className="field"><label className="field-label">名称</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：胸 + 二头" /></div>
      <div className="field-label">动作（{items.length}）</div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
        {items.map((it, i) => {
          const ex = exMap[it.exerciseId]
          const ss = it.supersetGroupId === 'ss-a' ? 'A' : it.supersetGroupId === 'ss-b' ? 'B' : 'none'
          return (
            <div key={it.exerciseId} className="set-row" style={{ padding: '8px 10px' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ex?.nameZh ?? '?'}</div>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  <label className="small dim num">组
                    <input className="input num" style={{ minHeight: 30, width: 46, marginLeft: 4, display: 'inline-block', padding: '0 6px' }} type="number" value={it.targetSets} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], targetSets: Math.max(1, Number(e.target.value) || 1) }; setItems(n) }} />
                  </label>
                  <label className="small dim">次
                    <input className="input num" style={{ minHeight: 30, width: 60, marginLeft: 4, display: 'inline-block', padding: '0 6px' }} value={it.targetReps} placeholder="8-10" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], targetReps: e.target.value }; setItems(n) }} />
                  </label>
                  <label className="small dim num">休
                    <input className="input num" style={{ minHeight: 30, width: 52, marginLeft: 4, display: 'inline-block', padding: '0 6px' }} type="number" value={it.restSec ?? ''} placeholder="90" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], restSec: e.target.value ? Number(e.target.value) : undefined }; setItems(n) }} />
                  </label>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 2 }}>
                <div className="row" style={{ gap: 2 }}>
                  {(['none', 'A', 'B'] as const).map((v) => (
                    <button key={v} className={`tag${ss === v ? ' tag-on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSs(i, v)}>{v === 'none' ? '普' : v}</button>
                  ))}
                </div>
                <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => move(i, -1)}>↑</button>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => move(i, 1)}>↓</button>
                  <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--red)' }} onClick={() => setItems(items.filter((x) => x.exerciseId !== it.exerciseId))}>
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button className="btn btn-block" style={{ marginBottom: 12, minHeight: 44 }} onClick={() => { setSearch(''); setPickerOpen(true) }}>
        <IconPlus size={14} /> 添加动作
      </button>
      <button className="btn btn-accent btn-block" onClick={() => void save()}>保存模板</button>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="选择动作">
        <input className="input" placeholder="搜索" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        <div style={{ display: 'grid', gap: 6, marginTop: 12, maxHeight: '45dvh', overflowY: 'auto' }}>
          {candidates.map((e) => (
            <button key={e.id} className="list-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setItems([...items, { exerciseId: e.id, targetSets: 3, targetReps: '8-10' }]); setPickerOpen(false) }}>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{e.nameZh}</div>
                <div className="small dim">{e.nameEn}</div>
              </div>
              <span className="tag">{e.equipment}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </Sheet>
  )
}
