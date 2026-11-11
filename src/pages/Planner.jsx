import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { formatPretty, monthMatrix, monthTitle, parseKey, todayKey } from '../lib/dates.js'
import { dayProgress, itemsForDay } from '../lib/metrics.js'
import { CheckList } from '../components/CheckRow.jsx'
import { HabitSheet } from '../components/HabitSheet.jsx'
import { useTitle } from '../components/ui.jsx'

const HEADS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function dayMark(habits, day) {
  const status = dayProgress(habits, day)
  const sides = habits.filter((habit) => habit.type === 'side' && habit.due === day)
  if (!sides.length) return status
  const sideDone = sides.every((habit) => (habit.completedDates || []).includes(habit.due))
  if (status === 'off') return sideDone ? 'full' : 'partial'
  if (status === 'full' && !sideDone) return 'partial'
  return status
}

function dotClass(status, selected) {
  if (status === 'off') return 'opacity-0'
  if (selected) return 'bg-ink'
  if (status === 'full') return 'bg-ember'
  if (status === 'partial') return 'bg-ember/50'
  return 'bg-fg/30'
}

export function Planner() {
  const { state } = useStore()
  const today = todayKey()
  const now = parseKey(today)
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [sheet, setSheet] = useState(null)
  useTitle('Plan')
  if (!state) return null

  const cells = monthMatrix(cursor.year, cursor.month)
  const { mains, sides } = itemsForDay(state.habits, selected, today)
  const future = selected > today

  function shiftMonth(delta) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid items-start gap-4 lg:grid-cols-12">
      <section className="card rounded-3xl p-4 lg:col-span-7 lg:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl tracking-tight">{monthTitle(cursor.year, cursor.month)}</h1>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost h-11 w-11 p-0" type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button
              className="btn btn-ghost px-3"
              type="button"
              onClick={() => {
                const fresh = todayKey()
                const date = parseKey(fresh)
                setSelected(fresh)
                setCursor({ year: date.getFullYear(), month: date.getMonth() })
              }}
            >
              Today
            </button>
            <button className="btn btn-ghost h-11 w-11 p-0" type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] tracking-wider text-muted">
          {HEADS.map((label, index) => (
            <div key={`${label}-${index}`} className="py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />
            const status = dayMark(state.habits, day)
            const isSelected = day === selected
            const isToday = day === today
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={`relative flex h-11 items-center justify-center rounded-2xl pb-1 text-sm nums ${isSelected ? 'bg-ember text-ink' : isToday ? 'ring-1 ring-ember' : ''}`}
              >
                {Number(day.slice(-2))}
                <span className={`absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${dotClass(status, isSelected)}`} />
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-4 lg:col-span-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label">{selected === today ? 'Today' : future ? 'Upcoming' : 'Logged day'}</p>
            <h2 className="mt-1 font-display text-3xl tracking-tight">{formatPretty(selected)}</h2>
          </div>
          <button className="btn btn-ember h-11 w-11 p-0" type="button" aria-label="Add to this day" onClick={() => setSheet({ habit: null })}>
            <Plus size={18} />
          </button>
        </div>
        {future && <p className="text-sm text-muted">You can see the plan now. Logging opens when the day arrives.</p>}
        <CheckList
          title="Main habits"
          items={mains}
          selected={selected}
          onEdit={(habit) => setSheet({ habit })}
          empty="Nothing repeats on this day."
        />
        <CheckList
          title="Side quests"
          items={sides}
          selected={selected}
          onEdit={(habit) => setSheet({ habit })}
          empty="No quest on this date."
        />
      </section>

      <HabitSheet
        open={Boolean(sheet)}
        habit={sheet?.habit || null}
        defaultDue={selected}
        onClose={() => setSheet(null)}
      />
    </motion.div>
  )
}
