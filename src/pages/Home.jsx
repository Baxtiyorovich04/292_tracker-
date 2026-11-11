import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { formatPretty, greeting, todayKey } from '../lib/dates.js'
import { itemsForDay } from '../lib/metrics.js'
import { CheckList } from '../components/CheckRow.jsx'
import { HabitSheet } from '../components/HabitSheet.jsx'
import { ScoreCard } from '../components/ScoreCard.jsx'
import { useTitle } from '../components/ui.jsx'

export function Home() {
  const { state, updateProfile } = useStore()
  const [open, setOpen] = useState(false)
  useTitle('Today')
  if (!state) return null

  const today = todayKey()
  const { mains, sides } = itemsForDay(state.habits, today, today)
  const name = state.profile.displayName
  const hasMains = state.habits.some((habit) => habit.type !== 'side')

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid items-start gap-4 lg:grid-cols-12">
      <div className="order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-6">
        <ScoreCard />
      </div>
      <div className="order-2 space-y-5 lg:order-1 lg:col-span-7">
        <header>
          <p className="label">{formatPretty(today)}</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            {greeting()}
            {name ? `, ${name}` : ''}
          </h1>
        </header>

        {!state.profile.seenIntro && (
          <div className="card flex items-start gap-3 rounded-2xl px-4 py-3 text-sm">
            <p className="flex-1 text-muted">A starter routine is on today. Keep what fits, and edit the rest in Plan.</p>
            <button className="text-muted" type="button" aria-label="Dismiss" onClick={() => updateProfile({ seenIntro: true })}>
              Close
            </button>
          </div>
        )}

        <CheckList
          title="Main habits"
          items={mains}
          selected={today}
          empty={hasMains ? 'Rest day. Nothing scheduled, so the streak can hold.' : 'Add a main habit to start a streak.'}
        />
        <CheckList
          title="Side quests"
          items={sides}
          selected={today}
          empty="No open quests. One-off tasks land here."
        />
        <button className="btn btn-ember w-full sm:w-auto" type="button" onClick={() => setOpen(true)}>
          <Plus size={18} />
          Add habit or quest
        </button>
      </div>
      <HabitSheet open={open} habit={null} defaultDue={today} onClose={() => setOpen(false)} />
    </motion.div>
  )
}
