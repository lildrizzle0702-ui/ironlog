import type { ReactNode } from 'react'

export function IconDumbbell({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 9v6M7.5 7v10M16.5 7v10M20 9v6M7.5 12h9" />
    </svg>
  )
}
export function IconCalendar({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}
export function IconChart({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
    </svg>
  )
}
export function IconUser({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" />
    </svg>
  )
}
export function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
export function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.5l5 5L19.5 7" />
    </svg>
  )
}
export function IconChevron({ size = 18, dir = 'right' }: { size?: number; dir?: 'right' | 'left' | 'down' }) {
  const deg = dir === 'right' ? 0 : dir === 'left' ? 180 : 90
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${deg}deg)` }}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}
export function IconTimer({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.5 1.5M9.5 2.5h5M12 2.5V6" />
    </svg>
  )
}
export function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </svg>
  )
}
export function IconTrophy({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 01-8 0V4zM8 5H4.5v2A3.5 3.5 0 008 10.5M16 5h3.5v2A3.5 3.5 0 0116 10.5M12 13v3M8.5 20h7M10 16h4l.8 4H9.2L10 16z" />
    </svg>
  )
}
export function IconFlame({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c1 3-2.5 4.5-2.5 7.5a4.5 4.5 0 109 0C18.5 7 15 5.5 12 3z" />
    </svg>
  )
}
export function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z" />
    </svg>
  )
}
export function IconCopy({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 5.5v-1a2 2 0 00-2-2h-9a2 2 0 00-2 2v9a2 2 0 002 2h1" />
    </svg>
  )
}
export type { ReactNode }
