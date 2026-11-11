import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { formatPretty, todayKey } from '../lib/dates.js'
import { clockLabel, money } from '../lib/format.js'
import { isComplete, itemsForDay, summarize } from '../lib/metrics.js'
import { useTitle } from '../components/ui.jsx'

export function Widget() {
  const { state } = useStore()
  useTitle('Stats')
  if (!state) return null

  const today = todayKey()
  const stats = summarize(state, today)
  const currency = state.profile?.currency || 'USD'
  const { mains, sides } = itemsForDay(state.habits, today, today)
  const open = [...mains, ...sides].filter((habit) => !isComplete(habit, habit.type === 'side' ? habit.due : today)).slice(0, 4)
  const left = stats.budget > 0 ? money(stats.left, currency) : money(stats.balance, currency)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-between px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div>
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
