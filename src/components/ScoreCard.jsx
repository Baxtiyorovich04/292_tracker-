import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { Flame, Gauge, Wallet } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { monthLabel, monthMatrix, parseKey, shortDate, todayKey } from '../lib/dates.js'
import { money } from '../lib/format.js'
import { cashBalance, dayHeat, summarize } from '../lib/metrics.js'

const RADIUS = 58
const CIRC = 2 * Math.PI * RADIUS

const HEADS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const HEAT_BG = ['bg-soft', 'bg-ember/30', 'bg-ember/55', 'bg-ember/80', 'bg-ember']

function heatPaint(level) {
  const bg = HEAT_BG[level <= 0 ? 0 : Math.min(4, level)]
  const text = level >= 3 ? 'text-ink' : level >= 1 ? 'text-fg' : 'text-muted'
  const glow = level >= 4 ? 'shadow-[0_0_14px_rgba(255,81,0,0.55)]' : ''
  return `${bg} ${text} ${glow}`
}

function moneyCount(amount, currency, digits) {
  const value = Number(amount) || 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(digits)}`
  }
}

function CountFigure({ value, render }) {
  const motionValue = useMotionValue(0)
  const [current, setCurrent] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) {
      setCurrent(value)
      return undefined
    }
    motionValue.set(0)
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setCurrent(latest),
    })
    return () => controls.stop()
  }, [motionValue, reduce, value])

  return render(current)
}

export function ScoreCard() {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('score')
  const [drawnView, setDrawnView] = useState(null)
  const reduce = useReducedMotion()
  const today = todayKey()
  const stats = useMemo(() => summarize(state, today), [state, today])
  const wallet = useMemo(() => cashBalance(state?.transactions), [state])
  const showingBalance = view === 'balance'
  const hasBudget = stats.budget > 0
  const shownMoney = hasBudget ? stats.left : wallet.balance
  const ratio = showingBalance
    ? hasBudget
      ? Math.max(0, Math.min(1, stats.left / stats.budget))
      : wallet.income > 0
        ? Math.max(0, Math.min(1, wallet.balance / wallet.income))
        : 0
    : stats.score / 100
  const offset = drawnView === view ? CIRC - ratio * CIRC : CIRC
  const currency = state?.profile?.currency || 'USD'
  const budgetLabel = hasBudget ? money(stats.left, currency) : 'Set budget'
  const places = Number.isInteger(shownMoney) ? 0 : 2
  const figure = showingBalance ? moneyCount(shownMoney, currency, places) : String(stats.score)
  const month = monthLabel(today)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawnView(view))
    return () => cancelAnimationFrame(frame)
  }, [view])

  const scoreCopy =
    stats.days === 0
      ? `Nothing on the schedule in ${month} yet.`
      : stats.delta === null
        ? `Averaged across ${month}.`
        : stats.delta === 0
          ? `Level with yesterday, across ${month}.`
          : `${stats.delta > 0 ? '+' : ''}${stats.delta} since yesterday, across ${month}.`

  const balanceCopy = hasBudget
    ? stats.left < 0
      ? `${money(Math.abs(stats.left), currency)} over this month’s budget.`
      : `${money(stats.spent, currency)} spent of ${money(stats.budget, currency)} this month.`
    : wallet.income === 0 && wallet.spent === 0
      ? 'Set a monthly budget, or log income and spending.'
      : wallet.balance < 0
        ? 'Spent more than the income you’ve logged.'
        : 'Income minus every expense you’ve logged.'

  return (
    <section className="@container card min-w-0 rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label">Performance</p>
        <div className="flex rounded-full border border-line p-0.5" role="tablist" aria-label="Show score or balance">
          {[
            ['score', 'Score', Gauge],
            ['balance', 'Balance', Wallet],
          ].map(([id, label, Icon]) => {
            const selected = view === id
            return (
              <button
                key={id}
                className={`relative grid h-8 w-8 place-items-center rounded-full ${selected ? 'text-ink' : 'text-muted'}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={label}
                onClick={() => setView(id)}
              >
                {selected ? (
                  <motion.span
                    layoutId="score-card-view"
                    className="absolute inset-0 rounded-full bg-ember"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <Icon className="relative" size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 [perspective:1000px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="flex flex-col items-start gap-4 @[26rem]:flex-row @[26rem]:items-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -78, y: 8 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 78, y: -8 }}
            transition={{ duration: reduce ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="relative grid h-28 w-28 shrink-0 place-items-center @[26rem]:h-[148px] @[26rem]:w-[148px]">
              {showingBalance ? (
                <motion.div
                  className="absolute h-24 w-24 rounded-full bg-ember/25 blur-2xl"
                  animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              ) : (
                <div className="absolute h-24 w-24 rounded-full bg-ember/20 blur-2xl" />
              )}
              <svg viewBox="0 0 148 148" className="h-28 w-28 @[26rem]:h-[148px] @[26rem]:w-[148px]" aria-hidden="true">
                <circle cx="74" cy="74" r={RADIUS} fill="none" stroke="var(--line)" strokeWidth="8" />
                <circle
                  className="ring-value"
                  cx="74"
                  cy="74"
                  r={RADIUS}
                  fill="none"
                  stroke={showingBalance && shownMoney < 0 ? '#ffb4a2' : '#FF5100'}
                  strokeWidth="8"
                  strokeLinecap={ratio > 0 ? 'round' : 'butt'}
                  strokeDasharray={CIRC}
                  strokeDashoffset={offset}
                  transform="rotate(-90 74 74)"
                />
              </svg>
              <div className="absolute px-3 text-center">
                <div
                  className={`font-display nums leading-none tracking-tight ${showingBalance ? (figure.length > 8 ? 'text-lg @[26rem]:text-2xl' : 'text-2xl @[26rem]:text-3xl') : 'text-3xl @[26rem]:text-5xl'} ${showingBalance && shownMoney < 0 ? 'text-[#ffb4a2]' : ''}`}
                  aria-live="polite"
                >
                  <CountFigure
                    value={showingBalance ? shownMoney : stats.score}
                    render={(current) => (showingBalance ? moneyCount(current, currency, places) : String(Math.round(current)))}
                  />
                </div>
                <div className="label mt-1">{showingBalance ? (hasBudget && stats.left < 0 ? 'Over' : 'Balance') : 'Score'}</div>
              </div>
            </div>
            <div className="min-w-0">
              <p className="label text-ember">{month}</p>
              <h2 className="mt-1 font-display text-2xl tracking-tight @[26rem]:text-3xl">{showingBalance ? 'Wallet' : 'Discipline'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{showingBalance ? balanceCopy : scoreCopy}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame size={16} className="text-ember" aria-hidden="true" />{stats.streak}</span>} />
        <Stat label="Done" value={stats.completed} />
        <Stat label={stats.left < 0 && stats.budget > 0 ? 'Over' : 'Left'} value={budgetLabel} warn={stats.left < 0 && stats.budget > 0} />
      </div>

      <ActivityCalendar habits={state.habits} today={today} month={month} />

      <button className="mt-4 text-sm text-muted" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Hide how the score works' : 'How this score works'}
      </button>
      {open && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The number is your average completion of main habits on days scheduled this calendar month. Each side quest you finish this month adds 3 points, up to 12, and the total stops at 100. If you have no main habits, each finished side quest is worth 20. Days before a habit existed are skipped, so a habit added today only counts today until more of the month is scheduled. The calendar is this month: a day stays dark until you finish something, then burns brighter the more you complete. The streak is separate: it counts scheduled days where every main habit was done. Today does not break it until the day ends, and rest days are skipped. Balance is what remains of this month’s budget. With no budget set, it is every income entry minus every expense.
        </p>
      )}
    </section>
  )
}

function ActivityCalendar({ habits, today, month }) {
  const date = parseKey(today)
  const cells = monthMatrix(date.getFullYear(), date.getMonth())

  return (
    <div className="mt-5">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] tracking-wider text-muted" aria-hidden="true">
        {HEADS.map((label, index) => (
          <div key={`${label}-${index}`}>{label}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1" role="grid" aria-label={`${month} activity`}>
        {cells.map((day, index) => {
          if (!day) return <div key={`pad-${index}`} />
          const future = day > today
          const heat = future ? { due: 0, done: 0, level: -1 } : dayHeat(habits, day)
          const label = future
            ? `${shortDate(day)}, ahead`
            : heat.due === 0
              ? `${shortDate(day)}, nothing scheduled`
              : `${shortDate(day)}, ${heat.done} of ${heat.due} done`
          return (
            <div
              key={day}
              role="gridcell"
              title={label}
              aria-label={label}
              aria-current={day === today ? 'date' : undefined}
              className={`grid h-8 place-items-center rounded-md text-[11px] nums ${heatPaint(heat.level)} ${future ? 'opacity-40' : ''} ${day === today ? 'ring-1 ring-fg/80' : ''}`}
            >
              {Number(day.slice(8))}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.14em] text-muted">
        <span className="mr-1">Less</span>
        {HEAT_BG.map((tone) => (
          <span key={tone} className={`h-2.5 w-2.5 rounded-[3px] ${tone}`} />
        ))}
        <span className="ml-1">More</span>
      </div>
    </div>
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
