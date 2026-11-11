import { useEffect, useState } from 'react'
import { HABIT_ICONS } from '../lib/catalog.js'
import { todayKey } from '../lib/dates.js'
import { useStore } from '../context/Store.jsx'
import { Glyph } from './icons.jsx'
import { Sheet } from './ui.jsx'

const DAYS = [
  { id: 1, label: 'M' },
  { id: 2, label: 'T' },
  { id: 3, label: 'W' },
  { id: 4, label: 'T' },
  { id: 5, label: 'F' },
  { id: 6, label: 'S' },
  { id: 0, label: 'S' },
]

export function HabitSheet({ open, habit, defaultDue, onClose }) {
  const { saveHabit, deleteHabit } = useStore()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [type, setType] = useState('main')
  const [icon, setIcon] = useState('dumbbell')
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6])
  const [due, setDue] = useState(todayKey())
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(habit?.title || '')
    setNote(habit?.note || '')
    setType(habit?.type === 'side' ? 'side' : 'main')
    setIcon(habit?.icon || 'dumbbell')
    setDays(habit?.days?.length ? habit.days : [0, 1, 2, 3, 4, 5, 6])
    setDue(habit?.due || defaultDue || todayKey())
    setError('')
    setConfirming(false)
  }, [open, habit, defaultDue])

  function toggleDay(day) {
    setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]))
  }

  function save() {
    const clean = title.trim()
    if (!clean) {
      setError('Give it a name.')
      return
    }
    if (type === 'main' && days.length === 0) {
      setError('Pick at least one day.')
      return
    }
    if (type === 'side' && !due) {
      setError('Pick a date.')
      return
    }
    saveHabit({
      id: habit?.id || crypto.randomUUID(),
      title: clean,
      note: note.trim(),
      type,
      icon,
      days: type === 'main' ? days : [],
      due: type === 'side' ? due : '',
      createdOn: habit?.createdOn || todayKey(),
      completedDates: habit?.completedDates || [],
    })
    onClose()
  }

  return (
    <Sheet open={open} title={habit ? 'Edit' : type === 'side' ? 'Side quest' : 'Main habit'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-soft p-1">
          {[
            ['main', 'Main habit'],
            ['side', 'Side quest'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${type === id ? 'bg-ember text-ink' : 'text-muted'}`}
              onClick={() => setType(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="label">Name</span>
          <input className="field mt-2" value={title} maxLength={48} onChange={(event) => setTitle(event.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="label">Note</span>
          <input className="field mt-2" value={note} maxLength={80} placeholder="Optional" onChange={(event) => setNote(event.target.value)} />
        </label>
        <div>
          <span className="label">Icon</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {HABIT_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={icon === name}
                className={`grid h-11 w-11 place-items-center rounded-2xl ${icon === name ? 'bg-ember text-ink' : 'bg-soft'}`}
                onClick={() => setIcon(name)}
              >
                <Glyph name={name} />
              </button>
            ))}
          </div>
        </div>
        {type === 'main' ? (
          <div>
            <span className="label">Repeats</span>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  aria-label={day.label}
                  aria-pressed={days.includes(day.id)}
                  className={`h-11 rounded-2xl text-sm font-semibold ${days.includes(day.id) ? 'bg-ember text-ink' : 'bg-soft text-muted'}`}
                  onClick={() => toggleDay(day.id)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <label className="block">
            <span className="label">Due</span>
            <input className="field mt-2" type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          </label>
        )}
        {error && (
          <p className="text-sm text-ember" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-ember w-full" type="button" onClick={save}>
          Save
        </button>
        {habit && !confirming && (
          <button className="btn btn-line w-full" type="button" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
        {habit && confirming && (
          <button
            className="btn btn-line w-full"
            type="button"
            onClick={() => {
              deleteHabit(habit.id)
              onClose()
            }}
          >
            Confirm delete
          </button>
        )}
      </div>
    </Sheet>
  )
}
