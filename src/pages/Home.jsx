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
  const [editing, setEditing] = useState(null)
  useTitle('Today')
  if (!state) return null

  const today = todayKey()
  const { mains, sides } = itemsForDay(state.habits, today, today)
  const name = state.profile.displayName
  const hasMains = state.habits.some((habit) => habit.type !== 'side')

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      <div className="order-1 min-w-0 lg:sticky lg:top-6">
        <ScoreCard />
      </div>
      <div className="order-2 min-w-0 space-y-5">
        <header className="min-w-0">
          <p className="label">{formatPretty(today)}</p>
          <h1 className="mt-2 break-words font-display text-3xl tracking-tight sm:text-4xl md:text-5xl">
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
          onEdit={setEditing}
          empty={hasMains ? 'Rest day. Nothing scheduled, so the streak can hold.' : 'Add a main habit to start a streak.'}
        />
        <CheckList
          title="Side quests"
          items={sides}
          selected={today}
          onEdit={setEditing}
          empty="No open quests. One-off tasks land here."
        />
        <button className="btn btn-ember w-full sm:w-auto" type="button" onClick={() => setOpen(true)}>
          <Plus size={18} />
          Add habit or quest
        </button>
      </div>
      <HabitSheet
        open={open || Boolean(editing)}
        habit={editing}
        defaultDue={today}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
      />
    </motion.div>
  )
}
