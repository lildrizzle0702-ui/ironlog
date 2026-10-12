import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDB, uid, todayStr } from '../db/db'
import type { Exercise, PersonalRecord, Settings, WorkSet, WorkoutTemplate } from '../db/types'
import { getSettings } from '../db/db'
import { useActive } from '../store/active'
import { navigate } from '../router'
import { Numpad, Seg, Sheet, useCountUp } from '../components/ui'
import { IconCheck, IconChevron, IconPlus, IconTimer, IconTrash, IconTrophy } from '../components/icons'
import { e1rm } from '../lib/e1rm'
import { calcPlates, pctWeight, trimNum } from '../lib/plates'
import { detectPRs, PR_LABEL, type PrHit } from '../lib/pr'
import { overloadTip } from '../lib/overload'
import { vibrate } from '../utils/haptics'
import './pages-extra.css'

const SET_TYPES: WorkSet['type'][] = ['热身', '正式', '递减组', '力竭组']

export default function WorkoutSession() {
  const active = useActive()
  const { workoutId, workout, entries } = active
  const elapsed = useCountUp(workout?.startTime ?? Date.now())

  const [exMap, setExMap] = useState<Record<string, Exercise>>({})
  const [setsByEx, setSetsByEx] = useState<Record<string, WorkSet[]>>({})
  const [lastPerf, setLastPerf] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState<Settings | null>(null)
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  const [edit, setEdit] = useState<{ set: WorkSet; field: 'weightKg' | 'reps'; value: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickSearch, setPickSearch] = useState('')
  const [allEx, setAllEx] = useState<Exercise[]>([])
  const [pctFor, setPctFor] = useState<Exercise | null>(null)
  const [pctValue, setPctValue] = useState('80')
  const [platesOpen, setPlatesOpen] = useState(false)
  const [plateTarget, setPlateTarget] = useState('100')
  const [plateBar, setPlateBar] = useState<20 | 15>(20)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmDelEx, setConfirmDelEx] = useState<Exercise | null>(null)
  const [prOverlay, setPrOverlay] = useState<{ hits: PrHit[]; exName: string } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tips, setTips] = useState<Record<string, string>>({})
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null)
  const touchStart = useMemo(() => ({ x: 0, id: '' }), [])

  const reload = useCallback(async () => {
    if (!workoutId) return
    const db = await getDB()
    const exs = await db.getAll('exercises')
    const map: Record<string, Exercise> = {}
    for (const e of exs) map[e.id] = e
    setExMap(map)
    setAllEx(exs.sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh')))
    const byEx: Record<string, WorkSet[]> = {}
    const perf: Record<string, string> = {}
    const workoutSets = await db.getAllFromIndex('sets', 'by-workout', workoutId)
    const allSets = await db.getAll('sets')
    const allWorkouts = await db.getAll('workouts')
    const prevWorkouts = allWorkouts.filter((w) => w.id !== workoutId && w.date < todayStr()).sort((a, b) => (a.date < b.date ? 1 : -1))
    for (const e of active.entries) {
      const list = workoutSets.filter((s) => s.exerciseId === e.exerciseId).sort((a, b) => a.setNo - b.setNo)
      byEx[e.exerciseId] = list
      const prevW = prevWorkouts.find((w) => allSets.some((s) => s.workoutId === w.id && s.exerciseId === e.exerciseId))
      if (prevW) {
        const prevSets = allSets.filter((s) => s.workoutId === prevW.id && s.exerciseId === e.exerciseId).sort((a, b) => a.setNo - b.setNo)
        perf[e.exerciseId] = `${prevW.date.slice(5).replace('-', '/')}：` + prevSets.map((s) => `${trimNum(s.weightKg)}×${s.reps}`).join(' / ')
      }
    }
    setSetsByEx(byEx)
    setLastPerf(perf)
    setLoading(false)
  }, [workoutId, active.entries])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  useEffect(() => {
    if (!workout?.templateId) return
    getDB().then((db) => db.get('templates', workout.templateId!)).then((t) => setTemplate(t ?? null))
  }, [workout?.templateId])

  // PR overlay auto-dismiss
  useEffect(() => {
    if (!prOverlay) return
    const t = setTimeout(() => setPrOverlay(null), 1500)
    return () => clearTimeout(t)
  }, [prOverlay])

  if (!workoutId) {
    return (
      <main className="app-main">
        <h1 className="page-title">记训</h1>
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>没有进行中的训练</div>
        <button className="btn btn-accent btn-block" style={{ marginTop: 16 }} onClick={() => navigate('#/log')}>回到记训</button>
      </main>
    )
  }
  if (loading || !settings) return <main className="app-main" />

  const db = () => getDB()

  const restSecFor = (ex: Exercise): number => {
    const tplEx = template?.exercises.find((t) => t.exerciseId === ex.id)
    return ex.restSec ?? tplEx?.restSec ?? settings.defaultRestSec
  }

  async function addSet(exerciseId: string) {
    const d = await db()
    const list = setsByEx[exerciseId] ?? []
    const last = list[list.length - 1]
    const s: WorkSet = {
      id: uid(), workoutId: workoutId!, exerciseId, setNo: list.length,
      weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 8,
      type: last?.type && last.type !== '热身' ? last.type : '正式',
      done: false, createdAt: Date.now(),
      rir: last?.rir, rpe: last?.rpe, tempo: last?.tempo,
    }
    await d.put('sets', s)
    await reload()
    if (s.weightKg > 0) await maybeTip(s)
  }

  async function maybeTip(s: WorkSet) {
    const d = await db()
    const hist = await d.getAllFromIndex('sets', 'by-exercise', s.exerciseId)
    const tip = overloadTip(hist, s.exerciseId, s.weightKg)
    setTips((t) => (tip ? { ...t, [s.id]: tip } : t))
  }

  async function saveSet(set: WorkSet, patch: Partial<WorkSet>) {
    const d = await db()
    const next = { ...set, ...patch }
    await d.put('sets', next)
    await reload()
    if (patch.weightKg !== undefined && next.weightKg > 0) await maybeTip(next)
  }

  async function deleteSet(id: string) {
    const d = await db()
    await d.delete('sets', id)
    await reload()
  }

  async function toggleDone(set: WorkSet) {
    if (set.done) {
      await saveSet(set, { done: false, completedAt: undefined })
      return
    }
    await saveSet(set, { done: true, completedAt: Date.now() })
    vibrate(30)
    const d = await db()
    const all = await d.getAllFromIndex('sets', 'by-exercise', set.exerciseId)
    const hits = detectPRs(all, { ...set, done: true }, settings!.e1rmFormula)
    if (hits.length > 0) {
      const date = workout?.date ?? todayStr()
      const tx = d.transaction('prs', 'readwrite')
      for (const h of hits) {
        const rec: PersonalRecord = {
          id: uid(), exerciseId: set.exerciseId, type: h.type,
          value: Math.round(h.value * 10) / 10, date,
          weightKg: set.weightKg, reps: set.reps,
        }
        await tx.store.put(rec)
        const ex = exMap[set.exerciseId]
        if (h.type === 'e1rm' && ex) {
          await d.put('exercises', { ...ex, e1rm: Math.max(ex.e1rm ?? 0, rec.value) })
        }
      }
      await tx.done
      setPrOverlay({ hits, exName: exMap[set.exerciseId]?.nameZh ?? '' })
    }
    const ex = exMap[set.exerciseId]
    if (ex) active.startTimer(restSecFor(ex))
  }

  async function removeExercise(ex: Exercise) {
    const d = await db()
    const sets = setsByEx[ex.id] ?? []
    const tx = d.transaction('sets', 'readwrite')
    for (const s of sets) await tx.store.delete(s.id)
    await tx.done
    active.removeEntry(ex.id)
    setConfirmDelEx(null)
    await reload()
  }

  const ssLetters = useMemo(() => {
    const m = new Map<string, string>()
    let i = 0
    for (const e of entries) {
      if (e.supersetGroupId && !m.has(e.supersetGroupId)) {
        m.set(e.supersetGroupId, String.fromCharCode(65 + i++))
      }
    }
    return m
  }, [entries])

  const totalSets = Object.values(setsByEx).reduce((a, l) => a + l.filter((s) => s.done).length, 0)
  const totalVol = Object.values(setsByEx).flat().filter((s) => s.done && s.type !== '热身').reduce((a, s) => a + s.weightKg * s.reps, 0)

  const finish = async () => {
    setConfirmFinish(false)
    const w = await active.finish()
    if (w) navigate(`#/summary/${w.id}`)
  }

  const filteredPick = allEx.filter((e) => !entries.some((x) => x.exerciseId === e.id) &&
    (e.nameZh.includes(pickSearch) || e.nameEn.toLowerCase().includes(pickSearch.toLowerCase())))

  const openEdit = (set: WorkSet, field: 'weightKg' | 'reps') =>
    setEdit({ set, field, value: field === 'weightKg' ? trimNum(set.weightKg) : `${set.reps}` })

  const commitEdit = async () => {
    if (!edit) return
    const v = parseFloat(edit.value)
    if (!Number.isNaN(v)) {
      await saveSet(edit.set, edit.field === 'weightKg' ? { weightKg: v } : { reps: Math.round(v) })
    }
    setEdit(null)
  }

  const exForPct = pctFor
  const pctBase = exForPct ? (exForPct.e1rm ?? bestE1rm(setsByEx[exForPct.id] ?? [], settings.e1rmFormula)) : 0
  const pctResult = pctBase > 0 ? pctWeight(pctBase, parseFloat(pctValue || '0') / 100) : 0

  const plates = calcPlates(parseFloat(plateTarget || '0') || 0, plateBar)

  return (
    <main className="app-main" style={{ paddingBottom: 120 }}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div>
          <div className="small dim">{workout?.templateName ?? '自由训练'}</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 800 }}>{fmtHMS(elapsed)}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDiscard(true)}>放弃</button>
          <button className="btn btn-accent" onClick={() => setConfirmFinish(true)}>结束</button>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>
          点击下方「添加动作」开始记录
        </div>
      )}

      {entries.map((entry, idx) => {
        const ex = exMap[entry.exerciseId]
        if (!ex) return null
        const sets = setsByEx[ex.id] ?? []
        const ss = entry.supersetGroupId ? ssLetters.get(entry.supersetGroupId) : null
        return (
          <section key={ex.id} className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div className="row-between">
              <div className="row" style={{ gap: 8, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{ex.nameZh}</span>
                    {ss && <span className="tag" style={{ color: 'var(--accent)', borderColor: 'rgba(212,255,63,0.35)' }}>超级组 {ss}</span>}
                  </div>
                  <div className="small dim" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.nameEn}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 2 }}>
                {idx > 0 && (
                  <button className="icon-btn" title="%1RM" onClick={() => { setPctFor(ex); setPctValue('80') }}>
                    <span className="small" style={{ fontWeight: 800 }}>%</span>
                  </button>
                )}
                {ex.equipment === '杠铃' && (
                  <button className="icon-btn" title="配片" onClick={() => setPlatesOpen(true)}>⊟</button>
                )}
                <button className="icon-btn" onClick={() => setConfirmDelEx(ex)}><IconTrash size={16} /></button>
              </div>
            </div>
            <div className="row" style={{ gap: 6, margin: '6px 0 10px' }}>
              <span className="tag">{ex.equipment}</span>
              {ex.primaryMuscles.map((m) => <span key={m} className="tag">{m}</span>)}
              {lastPerf[ex.id] && <span className="small dim" style={{ marginLeft: 'auto' }}>上次 {lastPerf[ex.id]}</span>}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {sets.map((s) => {
                const er = s.done ? e1rm(s.weightKg, s.reps, settings.e1rmFormula) : null
                const dx = swipe?.id === s.id ? swipe.dx : 0
                return (
                  <div key={s.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 72, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 14 }}>
                      <button
                        className="icon-btn"
                        style={{ color: 'var(--red)' }}
                        onClick={() => void deleteSet(s.id)}
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                    <div
                      className="set-row"
                      style={{ position: 'relative', transform: `translateX(${dx}px)`, transition: swipe?.id === s.id ? 'none' : 'transform 200ms ease-out', touchAction: 'pan-y' }}
                      onTouchStart={(e) => { touchStart.x = e.touches[0].clientX; touchStart.id = s.id }}
                      onTouchMove={(e) => {
                        if (touchStart.id !== s.id) return
                        const dx = Math.min(0, e.touches[0].clientX - touchStart.x)
                        setSwipe({ id: s.id, dx: dx < -12 ? dx : 0 })
                      }}
                      onTouchEnd={() => {
                        if (swipe?.id === s.id && swipe.dx < -64) void deleteSet(s.id)
                        setSwipe(null)
                      }}
                    >
                      <button className={`set-check${s.done ? ' done' : ''}`} onClick={() => void toggleDone(s)}>
                        <IconCheck size={14} />
                      </button>
                      <span className="small dim num" style={{ width: 18 }}>{s.setNo + 1}</span>
                      <button className="grow row" style={{ gap: 4, background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--text)' }} onClick={() => openEdit(s, 'weightKg')}>
                        <span className="num" style={{ fontSize: 24, fontWeight: 800 }}>{trimNum(s.weightKg)}</span>
                        <span className="small dim">{settings.unit === 'lb' ? 'lb' : 'kg'}</span>
                      </button>
                      <span className="dim">×</span>
                      <button className="row" style={{ gap: 4, background: 'none', border: 0, padding: '0 4px', cursor: 'pointer', color: 'var(--text)' }} onClick={() => openEdit(s, 'reps')}>
                        <span className="num" style={{ fontSize: 24, fontWeight: 800 }}>{s.reps}</span>
                        <span className="small dim">次</span>
                      </button>
                      <button
                        className="tag"
                        style={{ cursor: 'pointer', color: s.type === '热身' ? 'var(--text-3)' : s.type === '正式' ? undefined : 'var(--accent)' }}
                        onClick={() => {
                          const i = SET_TYPES.indexOf(s.type)
                          void saveSet(s, { type: SET_TYPES[(i + 1) % SET_TYPES.length] })
                        }}
                      >
                        {s.type}
                      </button>
                      {er !== null && s.type !== '热身' && (
                        <span className="small dim num" style={{ whiteSpace: 'nowrap' }}>e{Math.round(er)}</span>
                      )}
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32, color: expanded === s.id ? 'var(--accent)' : undefined }}
                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      >
                        <IconChevron size={12} dir="down" />
                      </button>
                    </div>
                    {expanded === s.id && (
                      <div className="fade-in" style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {settings.rirEnabled && (
                          <label className="small dim">RIR
                            <select className="input num" style={{ minHeight: 36, marginLeft: 4, width: 64, display: 'inline-block' }} value={s.rir ?? ''} onChange={(e) => void saveSet(s, { rir: e.target.value === '' ? undefined : (Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5) })}>
                            <option value="">—</option>
                            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        )}
                        {settings.rpeEnabled && (
                          <label className="small dim">RPE
                            <select className="input num" style={{ minHeight: 36, marginLeft: 4, width: 64, display: 'inline-block' }} value={s.rpe ?? ''} onChange={(e) => void saveSet(s, { rpe: e.target.value === '' ? undefined : (Number(e.target.value) as 6 | 7 | 8 | 9 | 10) })}>
                            <option value="">—</option>
                            {[6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        )}
                        <label className="small dim">节奏
                          <input className="input num" style={{ minHeight: 36, marginLeft: 4, width: 76, display: 'inline-block' }} placeholder="3-1-1" value={s.tempo ?? ''} onChange={(e) => void saveSet(s, { tempo: e.target.value || undefined })} />
                        </label>
                      </div>
                    )}
                    {tips[s.id] && <div className="small accent" style={{ marginTop: 6 }}>↗ {tips[s.id]}</div>}
                  </div>
                )
              })}
            </div>
            <button className="btn btn-block btn-ghost" style={{ marginTop: 8, minHeight: 44 }} onClick={() => void addSet(ex.id)}>
              <IconPlus size={14} /> 添加一组
            </button>
          </section>
        )
      })}

      <button className="btn btn-block" style={{ marginTop: 4 }} onClick={() => { setPickSearch(''); setPickerOpen(true) }}>
        <IconPlus size={16} /> 添加动作
      </button>

      {/* weight / reps sheet */}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.field === 'weightKg' ? `重量（${settings.unit}）` : '次数'}>
        {edit && (
          <>
            <div className="num" style={{ fontSize: 40, fontWeight: 800, textAlign: 'center', margin: '4px 0 14px', minHeight: 48 }}>
              {edit.value || '0'}{edit.field === 'reps' ? <span className="small dim" style={{ fontSize: 16 }}> 次</span> : null}
            </div>
            <Numpad
              value={edit.value}
              onChange={(v) => setEdit({ ...edit, value: v })}
              onConfirm={() => void commitEdit()}
              quickAdds={edit.field === 'weightKg' ? [2.5, 5] : [1, 2]}
              onQuickAdd={edit.field === 'weightKg' ? (d) => {
                const cur = parseFloat(edit.value || '0') || 0
                setEdit({ ...edit, value: trimNum(Math.round((cur + d) * 100) / 100) })
              } : (d) => {
                const cur = parseInt(edit.value || '0', 10) || 0
                setEdit({ ...edit, value: `${cur + d}` })
              }}
            />
            <button className="btn btn-accent btn-block" style={{ marginTop: 10 }} onClick={() => void commitEdit()}>确定</button>
          </>
        )}
      </Sheet>

      {/* exercise picker */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="添加动作">
        <input className="input" placeholder="搜索动作（中文/英文）" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} autoFocus />
        <div style={{ display: 'grid', gap: 6, marginTop: 12, maxHeight: '50dvh', overflowY: 'auto' }}>
          {filteredPick.map((e) => (
            <button key={e.id} className="list-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => { active.addEntry(e.id); setPickerOpen(false) }}>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{e.nameZh}</div>
                <div className="small dim">{e.nameEn}</div>
              </div>
              <span className="tag">{e.equipment}</span>
            </button>
          ))}
          {filteredPick.length === 0 && <div className="small dim" style={{ textAlign: 'center', padding: 20 }}>无匹配动作</div>}
        </div>
      </Sheet>

      {/* %1RM */}
      <Sheet open={!!pctFor} onClose={() => setPctFor(null)} title={`%1RM — ${pctFor?.nameZh ?? ''}`}>
        {exForPct && (
          <>
            <div className="small muted">当前 1RM 估计：<span className="num" style={{ fontWeight: 800, color: 'var(--text)' }}>{trimNum(Math.round(pctBase * 10) / 10)} kg</span>（可在动作详情查看三公式）</div>
            <div className="num" style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', margin: '8px 0' }}>{pctValue}%</div>
            <Numpad value={pctValue} onChange={(v) => setPctValue(v)} onConfirm={() => {}} />
            {pctResult > 0 && (
              <>
                <div className="card" style={{ textAlign: 'center', margin: '12px 0' }}>
                  <div className="small dim">目标重量</div>
                  <div className="num" style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent)' }}>{trimNum(pctResult)} kg</div>
                </div>
                <button
                  className="btn btn-accent btn-block"
                  onClick={async () => {
                    await addSetPct(exForPct.id, pctResult)
                    setPctFor(null)
                  }}
                >
                  按此重量添加一组
                </button>
              </>
            )}
          </>
        )}
      </Sheet>

      {/* plates */}
      <Sheet open={platesOpen} onClose={() => setPlatesOpen(false)} title="杠铃配片">
        <div className="field-label">目标总重（含杆）</div>
        <div className="num" style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 10 }}>{plateTarget || '0'} kg</div>
        <Numpad value={plateTarget} onChange={setPlateTarget} onConfirm={() => {}} />
        <div style={{ margin: '12px 0 8px' }}>
          <Seg options={[{ value: '20' as const, label: '杆 20kg' }, { value: '15' as const, label: '杆 15kg' }]} value={plateBar === 20 ? '20' : '15'} onChange={(v) => setPlateBar(v === '20' ? 20 : 15)} />
        </div>
        <div className="card" style={{ marginTop: 10 }}>
          <div className="small dim" style={{ marginBottom: 8 }}>每侧装载</div>
          {plates.perSide.length === 0 ? (
            <div className="small dim">空杆</div>
          ) : (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {plates.perSide.map((p, i) => (
                <span key={i} className="tag num" style={{ fontSize: 13, padding: '4px 10px', fontWeight: 700 }}>{trimNum(p)}</span>
              ))}
            </div>
          )}
          <hr className="divider" style={{ margin: '10px 0' }} />
          <div className="row-between">
            <span className="small muted">合计</span>
            <span className="num" style={{ fontSize: 22, fontWeight: 800 }}>{trimNum(plates.exact ? parseFloat(plateTarget || '0') : plates.achievedTotal ?? plateBar)} kg</span>
          </div>
          {!plates.exact && plates.perSide.length > 0 && <div className="small accent" style={{ marginTop: 6 }}>片库无法精确配出，以上为最接近的重量</div>}
        </div>
      </Sheet>

      {/* finish confirm */}
      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="结束训练">
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <div className="card grow" style={{ textAlign: 'center' }}><div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{totalSets}</div><div className="small dim">完成组数</div></div>
          <div className="card grow" style={{ textAlign: 'center' }}><div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{trimNum(Math.round(totalVol))}</div><div className="small dim">总容量 kg</div></div>
        </div>
        <button className="btn btn-accent btn-block" onClick={() => void finish()}>完成训练</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setConfirmFinish(false)}>继续练</button>
      </Sheet>

      {/* discard */}
      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="放弃训练">
        <p className="muted" style={{ marginTop: 0 }}>将删除本次训练及全部记录，不可恢复。</p>
        <button className="btn btn-danger btn-block" onClick={() => { setConfirmDiscard(false); void active.discard().then(() => navigate('#/log')) }}>确认放弃</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setConfirmDiscard(false)}>取消</button>
      </Sheet>

      {/* delete exercise */}
      <Sheet open={!!confirmDelEx} onClose={() => setConfirmDelEx(null)} title={`移除 ${confirmDelEx?.nameZh ?? ''}`}>
        <p className="muted" style={{ marginTop: 0 }}>将同时删除该动作本次训练的所有组。</p>
        <button className="btn btn-danger btn-block" onClick={() => confirmDelEx && void removeExercise(confirmDelEx)}>移除</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setConfirmDelEx(null)}>取消</button>
      </Sheet>

      {/* PR overlay */}
      {prOverlay && (
        <div className="pr-overlay">
          <IconTrophy size={44} />
          <div className="pr-big">NEW PR</div>
          <div style={{ fontWeight: 700 }}>{prOverlay.exName}</div>
          {prOverlay.hits.map((h) => (
            <div key={h.type} className="pr-value num">{PR_LABEL[h.type]} · {trimNum(h.value)}</div>
          ))}
        </div>
      )}

      {/* rest timer */}
      {active.timerRemaining !== null && <TimerOverlay />}
    </main>
  )

  async function addSetPct(exerciseId: string, weight: number) {
    const d = await db()
    const list = setsByEx[exerciseId] ?? []
    const s: WorkSet = {
      id: uid(), workoutId: workoutId!, exerciseId, setNo: list.length,
      weightKg: weight, reps: list[list.length - 1]?.reps ?? 5, type: '正式',
      done: false, createdAt: Date.now(),
    }
    await d.put('sets', s)
    await reload()
  }
}

function TimerOverlay() {
  const { timerRemaining, timerTotalSec, startTimer, stopTimer } = useActive()
  const R = 130
  const C = 2 * Math.PI * R
  const frac = timerRemaining !== null && timerTotalSec > 0 ? timerRemaining / timerTotalSec : 0
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(10,10,11,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
      <div className="timer-ring-wrap">
        <svg width="300" height="300" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r={R} fill="none" stroke="var(--card-2)" strokeWidth="10" />
          <circle cx="150" cy="150" r={R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: 'stroke-dashoffset 250ms linear' }} />
        </svg>
        <div className={`timer-seconds num${timerRemaining !== null && timerRemaining <= 3 ? ' pulse' : ''}`}>{timerRemaining}</div>
      </div>
      <Seg
        options={[
          { value: '60', label: '60' },
          { value: '90', label: '90' },
          { value: '120', label: '120' },
          { value: '180', label: '180' },
        ]}
        value={`${timerTotalSec}`}
        onChange={(v) => startTimer(Number(v))}
      />
      <div className="row" style={{ gap: 12 }}>
        <button className="btn" onClick={() => timerRemaining !== null && startTimer(timerRemaining + 30)}>+30s</button>
        <button className="btn" onClick={stopTimer}><IconTimer /> 跳过</button>
      </div>
    </div>
  )
}

function fmtHMS(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h > 0 ? `${h}:` : ''}${`${m}`.padStart(2, '0')}:${`${sec}`.padStart(2, '0')}`
}

function bestE1rm(sets: WorkSet[], f: 'epley' | 'brzycki' | 'lombardi'): number {
  return sets.reduce((a, s) => Math.max(a, e1rm(s.weightKg, s.reps, f)), 0)
}
