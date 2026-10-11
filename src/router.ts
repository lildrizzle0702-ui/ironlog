import { useEffect, useState } from 'react'

export type Route =
  | { name: 'log' }
  | { name: 'workout' }
  | { name: 'calendar' }
  | { name: 'stats' }
  | { name: 'me' }
  | { name: 'exercises' }
  | { name: 'templates' }
  | { name: 'history' }
  | { name: 'workout-detail'; id: string }
  | { name: 'exercise-detail'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'tools' }

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [seg, param] = path.split('/')
  switch (seg) {
    case '':
    case 'log':
      return { name: 'log' }
    case 'workout':
      return param ? { name: 'workout-detail', id: param } : { name: 'workout' }
    case 'calendar':
      return { name: 'calendar' }
    case 'stats':
      return { name: 'stats' }
    case 'me':
      return { name: 'me' }
    case 'exercises':
      return { name: 'exercises' }
    case 'templates':
      return { name: 'templates' }
    case 'history':
      return { name: 'history' }
    case 'exercise':
      return { name: 'exercise-detail', id: param }
    case 'summary':
      return { name: 'summary', id: param }
    case 'tools':
      return { name: 'tools' }
    default:
      return { name: 'log' }
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const h = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return route
}

export function navigate(to: string) {
  window.location.hash = to.startsWith('#') ? to : `#${to}`
}

export function goBack() {
  history.back()
}
