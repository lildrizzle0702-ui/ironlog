// Hand-written SVG charts — no dependencies. Apple Health minimal style.
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { trimNum } from '../lib/plates'

export interface ChartPoint {
  x: number | string
  y: number
}

export interface LineSeries {
  name?: string
  points: ChartPoint[]
  color?: string
  dashed?: boolean
}

const PALETTE = ['var(--accent)', '#98989D', '#C7C7CC', '#636366']
const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Catmull-Rom → cubic bezier smooth path */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

/** best-effort ordering key for category labels (week keys / M-D / M月D日 / numbers) */
function catTime(x: string | number): number {
  if (typeof x === 'number') return x
  const wk = /^(\d{4})-W(\d+)$/.exec(x)
  if (wk) {
    const jan1 = new Date(+wk[1], 0, 1)
    const dt = new Date(jan1.getTime() + (+wk[2] - 1) * 7 * 86400000)
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7))
    return dt.getTime()
  }
  const md = /^(\d{1,2})[月/](\d{1,2})日?$/.exec(x)
  if (md) return +md[1] * 100 + +md[2]
  return Number.NaN
}

const fy = (v: number) => trimNum(Math.round(v * 10) / 10)

export function LineChart({
  points,
  series,
  height = 180,
  unit,
  color,
}: {
  points?: ChartPoint[]
  series?: LineSeries[]
  height?: number
  unit?: string
  color?: string
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const gid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const [drawn, setDrawn] = useState(REDUCE)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (REDUCE || drawn) return
    const raf = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(raf)
  }, [drawn])

  const all: LineSeries[] = series && series.length ? series : points && points.length ? [{ points, color }] : []

  const catSet = new Map<string, true>()
  for (const s of all) for (const p of s.points) catSet.set(String(p.x), true)
  const cats = [...catSet.keys()].sort((a, b) => {
    const ta = catTime(a)
    const tb = catTime(b)
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
    if (Number.isNaN(ta)) return 1
    if (Number.isNaN(tb)) return -1
    return ta - tb
  })

  if (!all.length || !cats.length) {
    return (
      <div ref={wrapRef}>
        <div className="small dim" style={{ textAlign: 'center', padding: '28px 0' }}>暂无数据</div>
      </div>
    )
  }

  const W = width || 320
  const H = height
  const padT = 14
  const padB = 20
  const padL = 6
  const padR = 6
  const n = cats.length
  const innerW = Math.max(1, W - padL - padR)
  const innerH = Math.max(1, H - padT - padB)

  let yMin = Infinity
  let yMax = -Infinity
  for (const s of all) for (const p of s.points) {
    if (p.y < yMin) yMin = p.y
    if (p.y > yMax) yMax = p.y
  }
  if (!Number.isFinite(yMin)) {
    yMin = 0
    yMax = 1
  }
  if (yMin === yMax) {
    const d = Math.abs(yMax) || 1
    yMin -= d / 2
    yMax += d / 2
  } else {
    const pd = (yMax - yMin) * 0.12
    yMin -= pd
    yMax += pd
  }

  const xAt = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i * innerW) / (n - 1))
  const yAt = (v: number) => padT + innerH * (1 - (v - yMin) / (yMax - yMin))
  const idxOf = new Map<string, number>(cats.map((c, i) => [c, i]))

  const handleMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!n) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const idx = n <= 1 ? 0 : Math.round(((px - padL) / innerW) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, idx)))
  }

  const tipRows: { name?: string; color: string; y: number }[] = []
  if (hover !== null) {
    all.forEach((s, i) => {
      const c = s.color ?? PALETTE[i % PALETTE.length]
      const pt = s.points.find((p) => String(p.x) === cats[hover])
      if (pt) tipRows.push({ name: s.name, color: c, y: pt.y })
    })
  }
  const tipTop = tipRows.length ? Math.max(26, Math.min(...tipRows.map((r) => yAt(r.y))) - 10) : 0
  const tipLeft = hover !== null ? Math.min(Math.max(xAt(hover), 76), W - 76) : 0

  const every = Math.max(1, Math.ceil(n / 6))
  const labelIdx: number[] = []
  for (let i = 0; i < n; i += every) labelIdx.push(i)
  if (labelIdx[labelIdx.length - 1] !== n - 1) labelIdx.push(n - 1)

  const firstColor = all[0].color ?? color ?? PALETTE[0]

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        className="chart-svg"
        width={W}
        height={H}
        onPointerDown={handleMove}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`lg${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: firstColor }} stopOpacity="0.25" />
            <stop offset="100%" style={{ stopColor: firstColor }} stopOpacity="0" />
          </linearGradient>
        </defs>
        {all.map((s, i) => {
          const c = s.color ?? PALETTE[i % PALETTE.length]
          const pts = s.points
            .filter((p) => idxOf.has(String(p.x)))
            .map((p) => ({ x: xAt(idxOf.get(String(p.x))!), y: yAt(p.y) }))
          if (!pts.length) return null
          const line = smoothPath(pts)
          const single = pts.length === 1
          const area = single
            ? ''
            : `${line} L${pts[pts.length - 1].x},${padT + innerH} L${pts[0].x},${padT + innerH} Z`
          const dashAnim = !REDUCE && !s.dashed
          return (
            <g key={i}>
              {i === 0 && area && (
                <path
                  d={area}
                  style={{
                    fill: `url(#lg${gid})`,
                    ...(REDUCE ? null : { opacity: drawn ? 1 : 0, transition: 'opacity 500ms ease-out 150ms' }),
                  }}
                />
              )}
              {single ? (
                <circle cx={pts[0].x} cy={pts[0].y} r="3.5" style={{ fill: c }} />
              ) : (
                <path
                  d={line}
                  fill="none"
                  pathLength={dashAnim ? 1 : undefined}
                  strokeDasharray={s.dashed ? '5 4' : dashAnim ? 1 : undefined}
                  strokeDashoffset={dashAnim ? (drawn ? 0 : 1) : undefined}
                  style={{
                    stroke: c,
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    ...(dashAnim ? { transition: 'stroke-dashoffset 600ms ease-out' } : null),
                  }}
                />
              )}
            </g>
          )
        })}
        {hover !== null && tipRows.length > 0 && (
          <g>
            <line
              x1={xAt(hover)}
              y1={padT}
              x2={xAt(hover)}
              y2={padT + innerH}
              style={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
            />
            {tipRows.map((r, j) => (
              <circle
                key={j}
                cx={xAt(hover)}
                cy={yAt(r.y)}
                r="3.5"
                style={{ fill: r.color, stroke: 'var(--bg)', strokeWidth: 1.5 }}
              />
            ))}
          </g>
        )}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={xAt(i)}
            y={H - 5}
            textAnchor="middle"
            fontSize="10"
            style={{ fill: 'var(--text-3)', pointerEvents: 'none', userSelect: 'none' }}
          >
            {cats[i]}
          </text>
        ))}
      </svg>
      {hover !== null && tipRows.length > 0 && (
        <div className="chart-tip" style={{ left: tipLeft, top: tipTop }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{cats[hover]}</div>
          {tipRows.map((r, j) => (
            <div key={j} className="row" style={{ gap: 6, justifyContent: 'space-between', minWidth: 96 }}>
              {r.name ? (
                <span className="row" style={{ gap: 6, color: 'var(--text-2)' }}>
                  <span className="legend-line" style={{ background: r.color, borderColor: r.color }} />
                  {r.name}
                </span>
              ) : (
                <span />
              )}
              <span className="num" style={{ fontWeight: 700 }}>
                {fy(r.y)}
                {unit ? ` ${unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function HeatGrid({ weeks, labels }: { weeks: (number | null)[][]; labels?: string[] }) {
  let max = 0
  for (const col of weeks) for (const v of col) if (v != null && v > max) max = v
  const cells: ReactNode[] = []
  weeks.forEach((col, ci) => {
    for (let d = 0; d < 7; d++) {
      const v = col[d] ?? null
      const lv = !v || max === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4))
      cells.push(<div key={`${ci}-${d}`} className={`heat-cell${lv ? ` heat-${lv}` : ''}`} />)
    }
  })
  const every = Math.max(1, Math.ceil(weeks.length / 5))
  const labelRow: ReactNode[] = weeks.map((_, i) => (
    <div key={i} style={{ textAlign: 'center' }}>
      {i % every === 0 || i === weeks.length - 1 ? (labels?.[i] ?? '') : ''}
    </div>
  ))
  return (
    <div>
      <div
        className="heat-grid"
        style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoColumns: '1fr', gridAutoFlow: 'column' }}
      >
        {cells}
      </div>
      {labels && labels.length > 0 && (
        <div
          className="heat-grid heat-labels"
          style={{ gridTemplateRows: '1fr', gridAutoColumns: '1fr', gridAutoFlow: 'column' }}
        >
          {labelRow}
        </div>
      )}
    </div>
  )
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="small muted">{label}</div>
      <div className="num stat-card-value">{value}</div>
      {sub ? <div className="small dim">{sub}</div> : null}
    </div>
  )
}
