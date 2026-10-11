import type { ReactNode } from 'react'
import { navigate } from './router'
import { useActive } from './store/active'
import { IconCalendar, IconChart, IconDumbbell, IconTimer, IconUser } from './components/icons'

const TABS = [
  { key: 'log', label: '记训', icon: IconDumbbell, hash: '#/log' },
  { key: 'calendar', label: '日历', icon: IconCalendar, hash: '#/calendar' },
  { key: 'stats', label: '统计', icon: IconChart, hash: '#/stats' },
  { key: 'me', label: '我的', icon: IconUser, hash: '#/me' },
] as const

export function TabBar({ routeName }: { routeName: string }) {
  const { timerRemaining } = useActive()
  const activeKey = ['log', 'workout'].includes(routeName) ? 'log' : routeName
  return (
    <nav className="tabbar">
      {TABS.map((t) => {
        const Icon = t.icon
        const isTimer = t.key === 'log' && timerRemaining !== null
        return (
          <button key={t.key} className={`tabbar-item${activeKey === t.key ? ' active' : ''}`} onClick={() => navigate(t.hash)}>
            {isTimer ? <IconTimer /> : <Icon />}
            <span>{t.key === 'log' && timerRemaining !== null ? `${timerRemaining}s` : t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function Page({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode; back?: () => void }) {
  return (
    <main className="app-main">
      {(title || right) && (
        <div className="row-between" style={{ marginBottom: 4 }}>
          <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
          {right}
        </div>
      )}
      {children}
    </main>
  )
}
