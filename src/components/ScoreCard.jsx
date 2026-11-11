import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { lastNDays, todayKey, weekdayInitial } from '../lib/dates.js'
import { money } from '../lib/format.js'
import { dayProgress, summarize } from '../lib/metrics.js'

const RADIUS = 58
const CIRC = 2 * Math.PI * RADIUS

function railTone(status) {
  if (status === 'full') return 'bg-ember'
  if (status === 'partial') return 'bg-ember/45'
  if (status === 'none') return 'bg-soft'
  return 'border border-line bg-transparent'
}

export function ScoreCard() {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const today = todayKey()
  const stats = useMemo(() => summarize(state, today), [state, today])
  const days = lastNDays(7, today)
  const offset = CIRC - (stats.score / 100) * CIRC
  const currency = state?.profile?.currency || 'USD'
  const budgetLabel = stats.budget > 0 ? money(stats.left, currency) : 'Set budget'
  const windowLabel = stats.days === 0 ? 'No scored days yet' : stats.days === 1 ? 'Based on today' : `Based on ${stats.days} days`

  return (
    <section className="card rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="label">Performance</p>
        <p className="label text-ember">{windowLabel}</p>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative grid h-[148px] w-[148px] shrink-0 place-items-center">
          <div className="absolute h-24 w-24 rounded-full bg-ember/20 blur-2xl" />
          <svg viewBox="0 0 148 148" className="h-[148px] w-[148px]" aria-hidden="true">
            <circle cx="74" cy="74" r={RADIUS} fill="none" stroke="var(--line)" strokeWidth="8" />
            <circle
              className="ring-value"
              cx="74"
              cy="74"
              r={RADIUS}
              fill="none"
              stroke="#FF5100"
              strokeWidth="8"
              strokeLinecap={stats.score > 0 ? 'round' : 'butt'}
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform="rotate(-90 74 74)"
            />
          </svg>
          <div className="absolute text-center">
            <motion.div
              key={stats.score}
              initial={{ scale: 0.92, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display nums text-5xl leading-none tracking-tight"
            >
              {stats.score}
            </motion.div>
            <div className="label mt-1">Score</div>
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-3xl tracking-tight">Discipline</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {stats.delta === null
              ? 'Finish today’s list and the score starts moving.'
              : stats.delta === 0
                ? 'Level with yesterday.'
                : `${stats.delta > 0 ? '+' : ''}${stats.delta} since yesterday.`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame size={16} className="text-ember" aria-hidden="true" />{stats.streak}</span>} />
        <Stat label="Done" value={stats.completed} />
        <Stat label={stats.left < 0 && stats.budget > 0 ? 'Over' : 'Left'} value={budgetLabel} warn={stats.left < 0 && stats.budget > 0} />
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2" aria-label="Last seven days">
        {days.map((day) => (
          <div key={day} className="text-center">
            <div className={`mx-auto h-8 w-full max-w-8 rounded-full ${railTone(dayProgress(state.habits, day))}`} />
            <div className="mt-1 text-[10px] text-muted">{weekdayInitial(day)}</div>
          </div>
        ))}
      </div>

      <button className="mt-4 text-sm text-muted" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Hide how the score works' : 'How this score works'}
      </button>
      {open && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The number is your average completion of main habits across the last 14 days that had something scheduled. Each side quest you finish in that window adds 3 points, up to 12, and the total stops at 100. If you have no main habits, each finished side quest is worth 20. The streak is separate: it counts scheduled days where every main habit was done. Today does not break it until the day ends, and rest days are skipped.
        </p>
      )}
    </section>
  )
}

function Stat({ label, value, warn = false }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className={`mt-1 font-display nums text-[clamp(1rem,3.5vw,1.7rem)] leading-none tracking-tight ${warn ? 'text-[#ffb4a2]' : ''}`}>{value}</div>
    </div>
  )
}
