import type { ReactNode } from 'react'
import { ActiveProvider } from './store/active'
import { useRoute } from './router'
import { TabBar } from './chrome'
import LogHome from './pages/LogHome'
import WorkoutSession from './pages/WorkoutSession'
import CalendarPage from './pages/CalendarPage'
import StatsPage from './pages/StatsPage'
import MePage from './pages/MePage'
import ExercisesPage from './pages/ExercisesPage'
import ExerciseDetailPage from './pages/ExerciseDetailPage'
import TemplatesPage from './pages/TemplatesPage'
import HistoryPage from './pages/HistoryPage'
import WorkoutDetailPage from './pages/WorkoutDetailPage'
import SummaryPage from './pages/SummaryPage'

export default function App() {
  const route = useRoute()
  let page: ReactNode
  let tabbed = true
  switch (route.name) {
    case 'workout':
      page = <WorkoutSession />
      break
    case 'calendar':
      page = <CalendarPage />
      break
    case 'stats':
      page = <StatsPage />
      break
    case 'me':
      page = <MePage />
      break
    case 'exercises':
      page = <ExercisesPage />
      tabbed = false
      break
    case 'exercise-detail':
      page = <ExerciseDetailPage id={route.id} />
      tabbed = false
      break
    case 'templates':
      page = <TemplatesPage />
      tabbed = false
      break
    case 'history':
      page = <HistoryPage />
      tabbed = false
      break
    case 'workout-detail':
      page = <WorkoutDetailPage id={route.id} />
      tabbed = false
      break
    case 'summary':
      page = <SummaryPage id={route.id} />
      tabbed = false
      break
    default:
      page = <LogHome />
  }
  return (
    <ActiveProvider>
      {page}
      {tabbed && <TabBar routeName={route.name} />}
    </ActiveProvider>
  )
}
