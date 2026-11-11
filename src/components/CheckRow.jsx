import { LayoutGroup, motion } from 'framer-motion'
import { Check, Pencil } from 'lucide-react'
import { useConfetti } from './Confetti.jsx'
import { Glyph } from './icons.jsx'
import { useStore } from '../context/Store.jsx'
import { todayKey } from '../lib/dates.js'
import { clockLabel } from '../lib/format.js'
import { habitStreak, isComplete, scheduleLabel, dueLabel } from '../lib/metrics.js'

export function CheckList({ title, items, selected, onEdit, empty }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        <span className="label">
          {items.filter((habit) => isComplete(habit, habit.type === 'side' ? habit.due : selected)).length}/{items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="card rounded-2xl px-4 py-5 text-sm text-muted">{empty}</p>
      ) : (
        <LayoutGroup>
          <ul className="space-y-2">
            {items.map((habit) => (
              <CheckRow key={habit.id} habit={habit} selected={selected} onEdit={onEdit} />
            ))}
          </ul>
        </LayoutGroup>
      )}
    </section>
  )
}

function CheckRow({ habit, selected, onEdit }) {
  const { toggleHabit } = useStore()
  const burst = useConfetti()
  const when = habit.type === 'side' ? habit.due : selected
  const done = isComplete(habit, when)
  const locked = !when || when > todayKey()
  const meta =
    habit.type === 'side'
      ? dueLabel(habit)
      : habitStreak(habit) > 0
        ? `${habitStreak(habit)} day streak`
        : scheduleLabel(habit.days)

  function complete(event) {
    if (locked) return
    if (!done) burst(event.clientX, event.clientY)
    toggleHabit(habit.id, selected)
  }

  return (
    <motion.li layout className="card flex w-full min-w-0 items-center gap-1 rounded-2xl pr-1 sm:pr-2">
      <button
        type="button"
        onClick={complete}
        disabled={locked}
        aria-pressed={done}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left disabled:opacity-60"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-soft">
          <Glyph name={habit.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${done ? 'text-muted line-through' : ''}`}>{habit.title}</span>
          <span className="block truncate text-xs text-muted">
            {habit.note ? `${habit.note} · ` : ''}
            {meta}
            {habit.remindAt ? ` · ${clockLabel(habit.remindAt)}` : ''}
          </span>
        </span>
        <span className={`check ${done ? 'check-done' : ''}`}>{done && <Check size={18} strokeWidth={2.5} />}</span>
      </button>
      {onEdit && (
        <button type="button" className="grid h-11 w-11 shrink-0 place-items-center text-muted" aria-label={`Edit ${habit.title}`} onClick={() => onEdit(habit)}>
          <Pencil size={16} />
        </button>
      )}
    </motion.li>
  )
}
