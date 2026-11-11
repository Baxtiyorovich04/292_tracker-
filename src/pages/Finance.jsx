import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../context/Store.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { CATEGORIES, CATEGORY_COLORS, categoryLabel } from '../lib/catalog.js'
import { lastNDays, shortDate, todayKey, weekdayInitial } from '../lib/dates.js'
import { money } from '../lib/format.js'
import { summarize } from '../lib/metrics.js'
import { TxSheet } from '../components/TxSheet.jsx'
import { ChartBox } from '../components/ChartBox.jsx'
import { useTitle } from '../components/ui.jsx'

export function Finance() {
  const { state, updateProfile, deleteTx } = useStore()
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [armed, setArmed] = useState(null)
  useTitle('Wallet')

  const today = todayKey()
  const stats = useMemo(() => (state ? summarize(state, today) : null), [state, today])
  const currency = state?.profile?.currency || 'USD'

  const chart = useMemo(() => {
    if (!state) return { slices: [], days: [], groups: [] }
    const month = today.slice(0, 7)
    const expenses = state.transactions.filter((item) => item.kind !== 'income' && item.date?.startsWith(month))
    const slices = CATEGORIES.map((category) => ({
      name: category.label,
      value: expenses.filter((item) => item.category === category.id).reduce((sum, item) => sum + item.amount, 0),
    })).filter((slice) => slice.value > 0)
    const days = lastNDays(7, today).map((date) => ({
      label: weekdayInitial(date),
      spent: state.transactions
        .filter((item) => item.kind !== 'income' && item.date === date)
        .reduce((sum, item) => sum + item.amount, 0),
    }))
    const grouped = new Map()
    ;[...state.transactions]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)))
      .forEach((item) => {
        if (!grouped.has(item.date)) grouped.set(item.date, [])
        grouped.get(item.date).push(item)
      })
    return { slices, days, groups: [...grouped.entries()] }
  }, [state, today])

  if (!state || !stats) return null
  const colors = CATEGORY_COLORS[theme] || CATEGORY_COLORS.dark
  const ratio = stats.budget > 0 ? Math.min(100, (stats.spent / stats.budget) * 100) : 0
  const tip = {
    background: theme === 'light' ? '#ffffff' : '#141414',
    border: theme === 'light' ? '1px solid rgba(20,20,20,0.1)' : '1px solid rgba(250,250,250,0.12)',
    borderRadius: 16,
    color: theme === 'light' ? '#141414' : '#fafafa',
  }
  const hasSpend = chart.days.some((day) => day.spent > 0) || chart.slices.length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Wallet</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">This month</h1>
        </div>
        <button className="btn btn-ember" type="button" onClick={() => setOpen(true)}>
          <Plus size={18} />
          Log
        </button>
      </header>

      <section className="card rounded-3xl p-5">
        <div className="grid grid-cols-3 gap-3">
          <Figure label="Budget" value={stats.budget > 0 ? money(stats.budget, currency) : '—'} />
          <Figure label="Spent" value={money(stats.spent, currency)} />
          <Figure label={stats.budget > 0 && stats.left < 0 ? 'Over' : 'Left'} value={stats.budget > 0 ? money(stats.left, currency) : '—'} warn={stats.left < 0 && stats.budget > 0} />
        </div>
        {stats.budget > 0 ? (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-soft">
              <div className="h-full rounded-full bg-ember" style={{ width: `${ratio}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">
              Daily average {money(stats.average, currency)}
              {stats.income > 0 ? ` · Income ${money(stats.income, currency)}` : ''}
              {stats.left < 0 ? ` · ${money(Math.abs(stats.left), currency)} over budget` : ''}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Set a monthly budget to track what’s left.</p>
        )}
        <label className="mt-4 block max-w-xs">
          <span className="label">Monthly budget</span>
          <input
            className="field mt-2"
            inputMode="decimal"
            defaultValue={state.profile.monthlyBudget || ''}
            key={state.profile.monthlyBudget}
            onBlur={(event) => {
              const next = Math.max(0, Math.round(Number(event.target.value) * 100) / 100)
              if (Number.isFinite(next)) updateProfile({ monthlyBudget: next })
            }}
            aria-label="Monthly budget"
          />
        </label>
      </section>

      {hasSpend ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card rounded-3xl p-5">
            <h2 className="font-display text-2xl">By category</h2>
            {chart.slices.length === 0 ? (
              <p className="py-16 text-sm text-muted">No expenses in this calendar month yet.</p>
            ) : (
            <ChartBox height={220}>
              {(width, height) => (
                <PieChart width={width} height={height}>
                  <Pie data={chart.slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={chart.slices.length > 1 ? 3 : 0} stroke="transparent" isAnimationActive={false}>
                    {chart.slices.map((slice, index) => (
                      <Cell key={slice.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value, currency)} contentStyle={tip} />
                </PieChart>
              )}
            </ChartBox>
            )}
            <ul className="space-y-2">
              {chart.slices.map((slice, index) => (
                <li key={slice.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />
                    {slice.name}
                  </span>
                  <span className="nums">{money(slice.value, currency)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card rounded-3xl p-5">
            <h2 className="font-display text-2xl">Last 7 days</h2>
            <ChartBox height={240}>
              {(width, height) => (
                <BarChart width={width} height={height} data={chart.days}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => money(value, currency)} contentStyle={tip} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="spent" fill="#FF5100" radius={[8, 8, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              )}
            </ChartBox>
          </section>
        </div>
      ) : (
        <section className="card rounded-3xl px-5 py-10 text-center">
          <p className="font-display text-2xl">No spending logged</p>
          <p className="mt-2 text-sm text-muted">Food, transport, tech — log one and the month takes shape.</p>
        </section>
      )}

      <section className="space-y-4">
        {chart.groups.map(([date, items]) => (
          <div key={date}>
            <h3 className="label mb-2">{date === today ? 'Today' : shortDate(date)}</h3>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="card flex items-center gap-3 rounded-2xl px-3 py-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(item)}>
                    <span className="block truncate font-medium">{item.description || categoryLabel(item.category)}</span>
                    <span className="text-xs text-muted">
                      {categoryLabel(item.category)}
                      {item.kind === 'income' ? ' · In' : ''}
                    </span>
                  </button>
                  <span className="nums text-sm">
                    {item.kind === 'income' ? '+' : '−'}
                    {money(item.amount, currency)}
                  </span>
                  {armed === item.id ? (
                    <button className="text-sm text-ember" type="button" onClick={() => deleteTx(item.id)}>
                      Delete
                    </button>
                  ) : (
                    <button className="grid h-11 w-11 place-items-center text-muted" type="button" aria-label={`Delete ${item.description}`} onClick={() => setArmed(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <TxSheet open={open || Boolean(editing)} tx={editing} defaultDate={today} onClose={() => { setOpen(false); setEditing(null) }} />
    </motion.div>
  )
}

function Figure({ label, value, warn = false }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mt-1 font-display nums text-[clamp(1rem,3.5vw,1.8rem)] leading-none tracking-tight ${warn ? 'text-[#ffb4a2]' : ''}`}>{value}</div>
    </div>
  )
}
