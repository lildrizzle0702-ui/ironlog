import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal>
        <div className="sheet-grabber" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </>
  )
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} className={`seg-item${value === o.value ? ' active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
    </label>
  )
}

/** 自定义大数字键盘。value 为字符串（允许小数点），confirm 时解析。 */
export function Numpad({
  value,
  onChange,
  onConfirm,
  quickAdds,
  onQuickAdd,
}: {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  quickAdds?: number[]
  onQuickAdd?: (delta: number) => void
}) {
  const press = (k: string) => {
    if (k === 'back') {
      onChange(value.slice(0, -1))
    } else if (k === '.') {
      if (!value.includes('.')) onChange(value + '.')
    } else if (k === 'ok') {
      onConfirm()
    } else {
      if (value.replace('.', '').length >= 5) return
      if (value === '0') onChange(k)
      else onChange(value + k)
    }
  }
  return (
    <div>
      {quickAdds && onQuickAdd && (
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <span className="small dim">快捷加重</span>
          <div className="grow" />
          {quickAdds.map((q) => (
            <button key={q} className="btn btn-sm" onClick={() => onQuickAdd(q)}>
              +{q}
            </button>
          ))}
        </div>
      )}
      <div className="numpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map((k) => (
          <button key={k} className="numpad-key" onClick={() => press(k)}>
            {k === 'back' ? '⌫' : k}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Empty({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 13 }}>{text}</div>
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  )
}

export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <span style={{ width: size, height: size, borderRadius: '50%', border: '2px solid var(--line-strong)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function useCountUp(from: number, intervalMs = 1000): number {
  const [, force] = useState(0)
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return Date.now() - from
}

export function useLongPress(cb: () => void, ms = 400) {
  const timer = useRef<number | null>(null)
  const start = () => { timer.current = window.setTimeout(cb, ms) }
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  return { onTouchStart: start, onTouchEnd: cancel, onMouseDown: start, onMouseUp: cancel, onMouseLeave: cancel }
}
