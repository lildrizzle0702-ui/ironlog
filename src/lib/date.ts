export function fmtDateCN(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日`
}

export function fmtDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export function fmtClock(ts: number): string {
  const d = new Date(ts)
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`
}

export function fmtDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  const h = Math.floor(min / 60)
  if (h > 0) return `${h}小时${min % 60}分`
  return `${min}分钟`
}

/** monday-first week key: e.g. 2026-W41 */
export function weekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = (dt.getDay() + 6) % 7 // 0 = Monday
  dt.setDate(dt.getDate() - day)
  const start = new Date(dt.getFullYear(), 0, 1)
  const week = Math.ceil(((dt.getTime() - start.getTime()) / 86400000 + 1) / 7)
  return `${dt.getFullYear()}-W${week}`
}

export function weekLabel(wk: string): string {
  return wk.replace('-W', ' 第') + '周'
}

export function daysAgoStr(dateStr: string, today: string): string {
  if (dateStr === today) return '今天'
  const t = new Date(today).getTime()
  const d = new Date(dateStr).getTime()
  const diff = Math.round((t - d) / 86400000)
  if (diff === 1) return '昨天'
  if (diff > 1 && diff < 30) return `${diff}天前`
  return fmtDateCN(dateStr)
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, '0')}-${`${dt.getDate()}`.padStart(2, '0')}`
}

export function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${`${month + 1}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export function dateInputValue(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}
