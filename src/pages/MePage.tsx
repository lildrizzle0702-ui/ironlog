import { useEffect, useRef, useState } from 'react'
import { getDB, getSettings, saveSettings, todayStr, uid } from '../db/db'
import type { BodyMetric, Settings } from '../db/types'
import { navigate } from '../router'
import { Page } from '../chrome'
import { Sheet, Seg, Switch } from '../components/ui'
import { IconChevron } from '../components/icons'
import { dateInputValue } from '../lib/date'
import './pages-extra.css'

interface Backup {
  exercises?: unknown[]
  workouts?: unknown[]
  sets?: unknown[]
  bodyMetrics?: unknown[]
  prs?: unknown[]
  templates?: unknown[]
  settings?: Settings
}

export default function MePage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [metricOpen, setMetricOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importData, setImportData] = useState<Backup | null>(null)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const patch = async (p: Partial<Settings>) => {
    if (!settings) return
    const next = { ...settings, ...p }
    setSettings(next)
    await saveSettings(p)
  }

  if (!settings) return <Page title="我的" />

  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = async () => {
    const db = await getDB()
    const data: Backup = {
      exercises: await db.getAll('exercises'),
      workouts: await db.getAll('workouts'),
      sets: await db.getAll('sets'),
      bodyMetrics: await db.getAll('bodyMetrics'),
      prs: await db.getAll('prs'),
      templates: await db.getAll('templates'),
      settings,
    }
    download(`ironlog-backup-${todayStr().replace(/-/g, '')}.json`, JSON.stringify(data, null, 2), 'application/json')
    showToast('已导出 JSON')
  }

  const exportCSV = async () => {
    const db = await getDB()
    const [sets, workouts, exercises] = await Promise.all([db.getAll('sets'), db.getAll('workouts'), db.getAll('exercises')])
    const wDate = new Map(workouts.map((w) => [w.id, w.date]))
    const exMap = new Map(exercises.map((e) => [e.id, e]))
    const esc = (v: unknown) => {
      const s = v === undefined || v === null ? '' : `${v}`
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = 'date,exercise_zh,exercise_en,set_no,type,weight_kg,reps,rir,rpe,tempo,volume_kg,note'
    const lines = sets.map((s) => {
      const ex = exMap.get(s.exerciseId)
      return [
        wDate.get(s.workoutId) ?? '', ex?.nameZh ?? '', ex?.nameEn ?? '',
        s.setNo + 1, s.type, s.weightKg, s.reps, s.rir ?? '', s.rpe ?? '', s.tempo ?? '',
        Math.round(s.weightKg * s.reps * 100) / 100, s.note ?? '',
      ].map(esc).join(',')
    })
    download(`ironlog-sets-${todayStr().replace(/-/g, '')}.csv`, '﻿' + [header, ...lines].join('\n'), 'text/csv;charset=utf-8')
    showToast('已导出 CSV')
  }

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Backup
      if (typeof data !== 'object' || data === null || (!Array.isArray(data.workouts) && !Array.isArray(data.sets))) {
        showToast('文件格式不正确')
        return
      }
      setImportData(data)
      setImportOpen(true)
    } catch {
      showToast('无法解析 JSON 文件')
    }
  }

  const doImport = async () => {
    if (!importData) return
    const db = await getDB()
    const putAll = async <S extends 'exercises' | 'workouts' | 'sets' | 'bodyMetrics' | 'prs' | 'templates'>(store: S, rows: unknown[]) => {
      const tx = db.transaction(store, 'readwrite')
      for (const r of rows) await tx.store.put(r as never)
      await tx.done
    }
    if (Array.isArray(importData.exercises)) await putAll('exercises', importData.exercises)
    if (Array.isArray(importData.workouts)) await putAll('workouts', importData.workouts)
    if (Array.isArray(importData.sets)) await putAll('sets', importData.sets)
    if (Array.isArray(importData.bodyMetrics)) await putAll('bodyMetrics', importData.bodyMetrics)
    if (Array.isArray(importData.prs)) await putAll('prs', importData.prs)
    if (Array.isArray(importData.templates)) await putAll('templates', importData.templates)
    if (importData.settings) await saveSettings(importData.settings)
    setImportOpen(false)
    setImportData(null)
    showToast('导入完成')
  }

  const importCount = importData
    ? ['exercises', 'workouts', 'sets', 'bodyMetrics', 'prs', 'templates'].reduce((a, k) => a + (Array.isArray((importData as Record<string, unknown>)[k]) ? ((importData as Record<string, unknown>)[k] as unknown[]).length : 0), 0)
    : 0

  return (
    <Page title="我的">
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row-between" style={{ padding: '10px 0' }}>
          <span>重量单位</span>
          <div style={{ width: 140 }}>
            <Seg options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={settings.unit} onChange={(v) => void patch({ unit: v })} />
          </div>
        </div>
        <hr className="divider" />
        <div className="row-between" style={{ padding: '10px 0' }}>
          <span>杠铃杆重</span>
          <div style={{ width: 160 }}>
            <Seg options={[{ value: '20', label: '20 kg' }, { value: '15', label: '15 kg' }]} value={settings.barWeightKg === 20 ? '20' : '15'} onChange={(v) => void patch({ barWeightKg: v === '20' ? 20 : 15 })} />
          </div>
        </div>
        <hr className="divider" />
        <div className="row-between" style={{ padding: '10px 0' }}>
          <span>默认组间休息</span>
          <div style={{ width: 220 }}>
            <Seg
              options={[{ value: '60', label: '60' }, { value: '90', label: '90' }, { value: '120', label: '120' }, { value: '180', label: '180' }]}
              value={`${settings.defaultRestSec}`}
              onChange={(v) => void patch({ defaultRestSec: Number(v) })}
            />
          </div>
        </div>
        <hr className="divider" />
        <div className="row-between" style={{ padding: '10px 0' }}>
          <span>记录 RIR</span>
          <Switch checked={settings.rirEnabled} onChange={(v) => void patch({ rirEnabled: v })} />
        </div>
        <hr className="divider" />
        <div className="row-between" style={{ padding: '10px 0' }}>
          <span>记录 RPE</span>
          <Switch checked={settings.rpeEnabled} onChange={(v) => void patch({ rpeEnabled: v })} />
        </div>
        <hr className="divider" />
        <div className="row-between" style={{ padding: '10px 0' }}>
          <span>e1RM 公式</span>
          <div style={{ width: 220 }}>
            <Seg
              options={[{ value: 'epley', label: 'Epley' }, { value: 'brzycki', label: 'Brzycki' }, { value: 'lombardi', label: 'Lombardi' }]}
              value={settings.e1rmFormula}
              onChange={(v) => void patch({ e1rmFormula: v })}
            />
          </div>
        </div>
      </div>

      <button className="card row-between" style={{ width: '100%', cursor: 'pointer', marginBottom: 12, color: 'var(--text)' }} onClick={() => setMetricOpen(true)}>
        <span style={{ fontWeight: 600 }}>记录身体数据</span>
        <span className="row small muted">体重 / 围度 <IconChevron size={14} /></span>
      </button>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="small dim" style={{ marginBottom: 8 }}>数据管理</div>
        <button className="btn btn-block" style={{ marginBottom: 8 }} onClick={() => void exportJSON()}>导出 JSON 备份</button>
        <button className="btn btn-block" style={{ marginBottom: 8 }} onClick={() => fileRef.current?.click()}>导入 JSON 备份</button>
        <button className="btn btn-block" onClick={() => void exportCSV()}>导出训练明细 CSV</button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.target.value = '' }} />
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 4 }}>
        {[
          { label: '动作库', hash: '#/exercises' },
          { label: '训练模板', hash: '#/templates' },
          { label: '训练历史', hash: '#/history' },
        ].map((l) => (
          <button key={l.hash} className="list-row" style={{ width: '100%', textAlign: 'left', border: 0, borderRadius: 'var(--r-md)' }} onClick={() => navigate(l.hash)}>
            <span className="grow" style={{ fontWeight: 600 }}>{l.label}</span>
            <IconChevron size={16} />
          </button>
        ))}
      </div>

      <div className="small dim" style={{ textAlign: 'center', marginTop: 8 }}>
        IRONLOG v0.1 · 数据仅保存在本机<br />iOS：Safari 分享 → 添加到主屏幕，可离线使用
      </div>

      <MetricSheet open={metricOpen} onClose={() => setMetricOpen(false)} onSaved={() => showToast('已保存身体数据')} />

      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title="导入备份">
        <p className="muted" style={{ marginTop: 0 }}>将合并写入 {importCount} 条记录（同 id 覆盖）。此操作不可撤销，建议先导出当前数据。</p>
        <button className="btn btn-accent btn-block" onClick={() => void doImport()}>确认导入 {importCount} 条</button>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setImportOpen(false)}>取消</button>
      </Sheet>

      {toast && (
        <div className="fade-in" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(96px + var(--sab))', background: 'var(--bg-elev)', border: '1px solid var(--line-strong)', borderRadius: 12, padding: '10px 18px', zIndex: 90, fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}
    </Page>
  )
}

function MetricSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(dateInputValue(new Date()))
  const [fields, setFields] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setDate(dateInputValue(new Date()))
    setFields({})
    void (async () => {
      const db = await getDB()
      const existing = await db.getAllFromIndex('bodyMetrics', 'by-date', date)
      if (existing[0]) {
        const m = existing[0]
        setFields({
          weightKg: m.weightKg !== undefined ? `${m.weightKg}` : '',
          bodyFatPct: m.bodyFatPct !== undefined ? `${m.bodyFatPct}` : '',
          waistCm: m.waistCm !== undefined ? `${m.waistCm}` : '',
          chestCm: m.chestCm !== undefined ? `${m.chestCm}` : '',
          armCm: m.armCm !== undefined ? `${m.armCm}` : '',
          legCm: m.legCm !== undefined ? `${m.legCm}` : '',
        })
      }
    })()
  }, [open, date])

  const FIELDS: { key: keyof BodyMetric & string; label: string; unit: string }[] = [
    { key: 'weightKg', label: '体重', unit: 'kg' },
    { key: 'bodyFatPct', label: '体脂率', unit: '%' },
    { key: 'waistCm', label: '腰围', unit: 'cm' },
    { key: 'chestCm', label: '胸围', unit: 'cm' },
    { key: 'armCm', label: '臂围', unit: 'cm' },
    { key: 'legCm', label: '腿围', unit: 'cm' },
  ]

  const save = async () => {
    const db = await getDB()
    const existing = await db.getAllFromIndex('bodyMetrics', 'by-date', date)
    const cur: BodyMetric = existing[0] ?? { id: uid(), date }
    const next: BodyMetric = { ...cur }
    for (const f of FIELDS) {
      const v = fields[f.key]
      ;(next as unknown as Record<string, unknown>)[f.key] = v && v !== '' ? parseFloat(v) : undefined
    }
    await db.put('bodyMetrics', next)
    onSaved()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="身体数据">
      <div className="field">
        <label className="field-label">日期</label>
        <input className="input num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {FIELDS.map((f) => (
        <div key={f.key} className="field row-between" style={{ gap: 12 }}>
          <label className="field-label" style={{ margin: 0 }}>{f.label}</label>
          <div className="row" style={{ gap: 6 }}>
            <input className="input num" style={{ width: 110, textAlign: 'right' }} inputMode="decimal" value={fields[f.key] ?? ''} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
            <span className="small dim" style={{ width: 28 }}>{f.unit}</span>
          </div>
        </div>
      ))}
      <button className="btn btn-accent btn-block" style={{ marginTop: 6 }} onClick={() => void save()}>保存</button>
    </Sheet>
  )
}
