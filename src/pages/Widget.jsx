import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { formatPretty, todayKey } from '../lib/dates.js'
import { clockLabel, money } from '../lib/format.js'
import { isComplete, itemsForDay, summarize } from '../lib/metrics.js'
import { useTitle } from '../components/ui.jsx'

function useStatsManifest() {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]')
    const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    const previous = link?.getAttribute('href')
    const previousTitle = apple?.getAttribute('content')
    link?.setAttribute('href', '/manifest-widget.json')
    apple?.setAttribute('content', 'Stats')
    return () => {
      if (previous) link?.setAttribute('href', previous)
      if (previousTitle) apple?.setAttribute('content', previousTitle)
    }
  }, [])
}

export function Widget() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const adding = params.get('add') === '1'
  const [installEvent, setInstallEvent] = useState(() => window.__pwaInstall || null)
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  )
  useTitle('Stats')
  useStatsManifest()

  useEffect(() => {
    const syncPrompt = () => setInstallEvent(window.__pwaInstall || null)
    const onInstalled = () => {
      window.__pwaInstall = null
      setInstallEvent(null)
      setInstalled(true)
    }
    window.addEventListener('pwa-install-ready', syncPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('pwa-install-ready', syncPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!state) return null

  const today = todayKey()
  const stats = summarize(state, today)
  const currency = state.profile?.currency || 'USD'
  const { mains, sides } = itemsForDay(state.habits, today, today)
  const open = [...mains, ...sides].filter((habit) => !isComplete(habit, habit.type === 'side' ? habit.due : today)).slice(0, 4)
  const left = stats.budget > 0 ? money(stats.left, currency) : money(stats.balance, currency)
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  async function install() {
    if (!installEvent) return
    installEvent.prompt()
    const choice = await installEvent.userChoice
    window.__pwaInstall = null
    setInstallEvent(null)
    if (choice?.outcome === 'accepted') setInstalled(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-between px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div>
        {adding ? <AddPanel ios={ios} installed={installed} canInstall={Boolean(installEvent)} onInstall={install} /> : null}
        <p className="label">{formatPretty(today)}</p>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-display nums text-7xl leading-none tracking-tight">{stats.score}</p>
            <p className="label mt-2">Score</p>
          </div>
          <div className="text-right">
            <p className="font-display nums text-3xl leading-none tracking-tight">{left}</p>
            <p className="label mt-2">{stats.budget > 0 ? 'Left' : 'Balance'}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="card rounded-2xl px-4 py-3">
            <p className="label">Streak</p>
            <p className="mt-1 flex items-center gap-1 font-display nums text-3xl leading-none">
              <Flame size={18} className="text-ember" aria-hidden="true" />
              {stats.streak}
            </p>
          </div>
          <div className="card rounded-2xl px-4 py-3">
            <p className="label">Done</p>
            <p className="mt-1 font-display nums text-3xl leading-none">{stats.completed}</p>
          </div>
        </div>
        <ul className="mt-6 space-y-2">
          {open.length === 0 ? (
            <li className="text-sm text-muted">Nothing left on today’s list.</li>
          ) : (
            open.map((habit) => (
              <li key={habit.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{habit.title}</span>
                {habit.remindAt ? <span className="nums text-muted">{clockLabel(habit.remindAt)}</span> : null}
              </li>
            ))
          )}
        </ul>
      </div>
      <Link className="btn btn-ember mt-8" to="/">
        Open 292
      </Link>
    </div>
  )
}

function AddPanel({ ios, installed, canInstall, onInstall }) {
  return (
    <section className="card mb-5 rounded-3xl p-4">
      <h1 className="font-display text-2xl tracking-tight">Add this screen</h1>
      {canInstall ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted">Install 292, then long-press the icon and drag Stats onto the home screen.</p>
          <button className="btn btn-ember mt-4 w-full" type="button" onClick={onInstall}>
            Install
          </button>
        </>
      ) : ios ? (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Open this page in Safari. Chrome on iPhone cannot add a home screen icon.</li>
          <li>Tap the Share button at the bottom.</li>
          <li>Tap Add to Home Screen, then Add. The icon opens these stats.</li>
        </ol>
      ) : installed ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Long-press the 292 icon and drag Stats onto the home screen. That shortcut opens this score, streak, and money.
        </p>
      ) : (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>In Chrome, open the browser menu.</li>
          <li>Tap Install app or Add to Home screen.</li>
          <li>Long-press the new 292 icon and drag Stats onto the home screen.</li>
        </ol>
      )}
    </section>
  )
}
