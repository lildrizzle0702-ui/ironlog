import { useEffect, useMemo, useState } from 'react'
import { getDB, getSettings, todayStr } from '../db/db'
import type { BodyMetric, Exercise, Settings, WorkSet, Workout } from '../db/types'
import { Page } from '../chrome'
import { Seg, Sheet } from '../components/ui'
import { LineChart, HeatGrid, StatCard, type ChartPoint, type LineSeries } from '../components/charts'
import { e1rm } from '../lib/e1rm'
import { trimNum } from '../lib/plates'
import { addDays, weekKey } from '../lib/date'
import './pages-extra.css'

const MUSCLES = ['胸', '背', '肩', '腿', '二头', '三头', '核心', '臀', '斜方', '小腿'] as const
type Muscle = (typeof MUSCLES)[number]

export default function StatsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [sets, setSets] = useState<WorkSet[]>([])
  const [exMap, setExMap] = useState<Record<string, Exercise>>({})
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [range, setRange] = useState<'4' | '12' | 'all'>('12')

  const [selEx, setSelEx] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickSearch, setPickSearch] = useState('')
  const [selMuscles, setSelMuscles] = useState<Muscle[]>(['胸', '背', '肩', '腿'])

  useEffect(() => {
    void (async () => {
      const db = await getDB()
      const [w, s, e, m, st] = await Promise.all([
        db.getAll('workouts'), db.getAll('sets'), db.getAll('exercises'), db.getAll('bodyMetrics'), getSettings(),
      ])
      setWorkouts(w)
      setSets(s)
      setMetrics(m.sort((a, b) => (a.date < b.date ? -1 : 1)))
      setSettings(st)
      const map: Record<string, Exercise> = {}
      for (const x of e) map[x.id] = x
      setExMap(map)
    })()
  }, [])

  const wDate = useMemo(() => {
    const m = new Map<string, string>()
    for (const w of workouts) m.set(w.id, w.date)
    return m
  }, [workouts])

  const cutoff = useMemo(() => {
    if (range === 'all') return ''
    const days = range === '4' ? 28 : 84
    return addDays(todayStr(), -days)
  }, [range])

  const fSets = useMemo(() => sets.filter((s) => cutoff === '' || (wDate.get(s.workoutId) ?? '') >= cutoff), [sets, cutoff, wDate])
  const fWorkouts = useMemo(() => workouts.filter((w) => cutoff === '' || w.date >= cutoff), [workouts, cutoff])

  // 1. exercise e1RM curve
  const exWithHistory = useMemo(() => {
    const ids = new Set(fSets.map((s) => s.exerciseId))
    return [...ids].map((id) => exMap[id]).filter(Boolean)
  }, [fSets, exMap])

  useEffect(() => {
    if (!selEx && exWithHistory.length > 0) setSelEx(exWithHistory[0].id)
  }, [exWithHistory, selEx])

  const e1rmPoints: ChartPoint[] = useMemo(() => {
    if (!selEx || !settings) return []
    const byWeek = new Map<string, number>()
    for (const s of fSets) {
      if (s.exerciseId !== selEx || !s.done) continue
      const wk = weekKey(wDate.get(s.workoutId) ?? todayStr())
      const v = e1rm(s.weightKg, s.reps, settings.e1rmFormula)
      byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, v))
    }
    return [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([x, y]) => ({ x: x.replace(/^\d+-W/, 'W'), y: Math.round(y * 10) / 10 }))
  }, [selEx, fSets, wDate, settings])

  // 2. muscle weekly sets
  const muscleSeries: LineSeries[] = useMemo(() => {
    if (!settings) return []
    return selMuscles.slice(0, 4).map((muscle) => {
      const byWeek = new Map<string, number>()
      for (const s of fSets) {
        const ex = exMap[s.exerciseId]
        if (!ex || !ex.primaryMuscles.includes(muscle)) continue
        const wk = weekKey(wDate.get(s.workoutId) ?? todayStr())
        byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1)
      }
      return {
        name: muscle,
        points: [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([x, y]) => ({ x: x.replace(/^\d+-W/, 'W'), y })),
      }
    })
  }, [selMuscles, fSets, exMap, wDate, settings])

  // 3. weekly volume
  const volPoints: ChartPoint[] = useMemo(() => {
    const byWeek = new Map<string, number>()
    for (const s of fSets) {
      if (s.type === '热身') continue
      const wk = weekKey(wDate.get(s.workoutId) ?? todayStr())
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + s.weightKg * s.reps)
    }
    return [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([x, y]) => ({ x: x.replace(/^\d+-W/, 'W'), y: Math.round(y / 100) / 10 }))
  }, [fSets, wDate])

  // 4. heatmap: last 15 weeks, columns Mon-Sun
  const { heatWeeks, heatLabels } = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const w of workouts) byDate.set(w.date, (byDate.get(w.date) ?? 0) + 1)
    const today = todayStr()
    const monday = addDays(today, -((new Date(today).getDay() + 6) % 7))
    const cols: (number | null)[][] = []
    const labels: string[] = []
    for (let i = 14; i >= 0; i--) {
      const wkStart = addDays(monday, -i * 7)
      const col: (number | null)[] = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(wkStart, d)
        col.push(date > today ? null : byDate.get(date) ?? 0)
      }
      cols.push(col)
      labels.push(`${Number(wkStart.slice(5, 7))}/${Number(wkStart.slice(8))}`)
    }
    return { heatWeeks: cols, heatLabels: labels }
  }, [workouts])

  // 5. body metrics
  const weightPoints: ChartPoint[] = metrics.filter((m) => m.weightKg !== undefined && (cutoff === '' || m.date >= cutoff)).map((m) => ({ x: m.date.slice(5), y: m.weightKg! }))
  const waistPoints: ChartPoint[] = metrics.filter((m) => m.waistCm !== undefined && (cutoff === '' || m.date >= cutoff)).map((m) => ({ x: m.date.slice(5), y: m.waistCm! }))
  const latestWeight = [...metrics].reverse().find((m) => m.weightKg !== undefined)
  const latestWaist = [...metrics].reverse().find((m) => m.waistCm !== undefined)

  if (!settings) return <Page title="统计" />

  const curE1rm = e1rmPoints.length > 0 ? e1rmPoints[e1rmPoints.length - 1].y : null
  const curVol = volPoints.length > 0 ? volPoints[volPoints.length - 1].y : null
  const filteredPick = exWithHistory.filter((e) => e.nameZh.includes(pickSearch) || e.nameEn.toLowerCase().includes(pickSearch.toLowerCase()))

  return (
    <Page title="统计">
      <div style={{ marginBottom: 16 }}>
        <Seg
          options={[{ value: '4', label: '近4周' }, { value: '12', label: '近12周' }, { value: 'all', label: '全部' }]}
          value={range}
          onChange={setRange}
        />
      </div>

      <h2 style={{ fontSize: 17, margin: '4px 0 8px' }}>e1RM 曲线</h2>
      <button className="card row-between" style={{ width: '100%', cursor: 'pointer', marginBottom: 8, color: 'var(--text)' }} onClick={() => { setPickSearch(''); setPickerOpen(true) }}>
        <span style={{ fontWeight: 700 }}>{selEx ? exMap[selEx]?.nameZh ?? '—' : '选择动作'}</span>
        {curE1rm !== null && <span className="num accent" style={{ fontSize: 22, fontWeight: 800 }}>{trimNum(curE1rm)} kg</span>}
      </button>
      <div className="card" style={{ marginBottom: 20 }}>
        {e1rmPoints.length > 1 ? <LineChart points={e1rmPoints} unit="kg" /> : <div className="small dim" style={{ textAlign: 'center', padding: 20 }}>该动作数据不足（{settings.e1rmFormula} 公式）</div>}
      </div>

      <h2 style={{ fontSize: 17, margin: '4px 0 8px' }}>每肌群每周组数</h2>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {MUSCLES.map((m) => (
          <button
            key={m}
            className={`tag${selMuscles.includes(m) ? ' tag-on' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setSelMuscles((v) => v.includes(m) ? v.filter((x) => x !== m) : v.length >= 4 ? [...v.slice(1), m] : [...v, m])}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        {muscleSeries.some((s) => s.points.length > 1) ? <LineChart series={muscleSeries} /> : <div className="small dim" style={{ textAlign: 'center', padding: 20 }}>数据不足</div>}
      </div>

      <h2 style={{ fontSize: 17, margin: '4px 0 8px' }}>每周总容量</h2>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <div className="grow"><StatCard label="本周" value={curVol !== null ? `${trimNum(curVol)} t` : '—'} /></div>
        <div className="grow"><StatCard label="训练次数" value={`${fWorkouts.length}`} sub={range === 'all' ? '全部' : `近${range}周`} /></div>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        {volPoints.length > 1 ? <LineChart points={volPoints} unit="t" /> : <div className="small dim" style={{ textAlign: 'center', padding: 20 }}>数据不足</div>}
      </div>

      <h2 style={{ fontSize: 17, margin: '4px 0 8px' }}>训练频率（近15周）</h2>
      <div className="card" style={{ marginBottom: 20 }}>
        <HeatGrid weeks={heatWeeks} labels={heatLabels} />
        <div className="row" style={{ gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
          <span className="small dim">少</span>
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heat-cell heat-${l}`} style={{ width: 12, height: 12 }} />)}
          <span className="small dim">多</span>
        </div>
      </div>

      <h2 style={{ fontSize: 17, margin: '4px 0 8px' }}>体重 / 腰围</h2>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <div className="grow"><StatCard label="最新体重" value={latestWeight ? `${trimNum(latestWeight.weightKg!)} kg` : '—'} sub={latestWeight?.date ?? ''} /></div>
        <div className="grow"><StatCard label="最新腰围" value={latestWaist ? `${trimNum(latestWaist.waistCm!)} cm` : '—'} sub={latestWaist?.date ?? ''} /></div>
      </div>
      <div className="card" style={{ marginBottom: 8 }}>
        {weightPoints.length > 1 || waistPoints.length > 1 ? (
          <LineChart series={[
            { name: '体重 kg', points: weightPoints, color: 'var(--accent)' },
            { name: '腰围 cm', points: waistPoints, dashed: true, color: '#98989D' },
          ]} />
        ) : (
          <div className="small dim" style={{ textAlign: 'center', padding: 20 }}>在「我的 → 记录身体数据」中添加</div>
        )}
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="选择动作">
        <input className="input" placeholder="搜索" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} autoFocus />
        <div style={{ display: 'grid', gap: 6, marginTop: 12, maxHeight: '50dvh', overflowY: 'auto' }}>
          {filteredPick.map((e) => (
            <button key={e.id} className="list-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setSelEx(e.id); setPickerOpen(false) }}>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{e.nameZh}</div>
                <div className="small dim">{e.nameEn}</div>
              </div>
              <span className="tag">{e.equipment}</span>
            </button>
          ))}
          {filteredPick.length === 0 && <div className="small dim" style={{ textAlign: 'center', padding: 16 }}>该范围内没有记录</div>}
        </div>
      </Sheet>
    </Page>
  )
}
