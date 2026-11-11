import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { StoreProvider, useStore } from './context/Store.jsx'
import { ConfettiProvider } from './components/Confetti.jsx'
import { Shell } from './components/Shell.jsx'
import { Splash } from './components/ui.jsx'
import { Welcome } from './pages/Welcome.jsx'
import { Home } from './pages/Home.jsx'
import { Planner } from './pages/Planner.jsx'
import { You } from './pages/You.jsx'
import { Widget } from './pages/Widget.jsx'
import { armReminderClock, fireDueReminders } from './lib/reminders.js'

const Finance = lazy(() => import('./pages/Finance.jsx').then((module) => ({ default: module.Finance })))
const Rank = lazy(() => import('./pages/Rank.jsx').then((module) => ({ default: module.Rank })))

function Reminders() {
  const { state } = useStore()
  useEffect(() => {
    if (!state) return undefined
    const run = () => {
      fireDueReminders(state.habits).catch(() => {})
      armReminderClock(state.habits, run)
    }
    run()
    const id = window.setInterval(run, 20000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state])
  return null
}

function Screens() {
  const { ready, user, demo, notice } = useStore()
  const location = useLocation()
  if (!ready) return <Splash />

  const authed = Boolean(user || demo)
  if (!authed && location.pathname !== '/enter') return <Navigate to="/enter" replace />
  if (authed && location.pathname === '/enter') return <Navigate to="/" replace />

  const pages = (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted">Loading…</div>}>
    <Routes>
      <Route path="/enter" element={<Welcome />} />
      <Route path="/" element={<Home />} />
      <Route path="/plan" element={<Planner />} />
      <Route path="/wallet" element={<Finance />} />
      <Route path="/rank" element={<Rank />} />
      <Route path="/you" element={<You />} />
      <Route path="/widget" element={<Widget />} />
      <Route path="*" element={<Navigate to={authed ? '/' : '/enter'} replace />} />
    </Routes>
    </Suspense>
  )

  return (
    <>
      {notice ? <div className="toast">{notice}</div> : null}
      {location.pathname === '/enter' || location.pathname === '/widget' ? pages : <Shell>{pages}</Shell>}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ConfettiProvider>
        <StoreProvider>
          <BrowserRouter>
            <Reminders />
            <Screens />
          </BrowserRouter>
        </StoreProvider>
      </ConfettiProvider>
    </ThemeProvider>
  )
}
