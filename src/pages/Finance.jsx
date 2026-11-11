import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceDot, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../context/Store.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { CATEGORIES, CATEGORY_COLORS, categoryLabel } from '../lib/catalog.js'
import { lastNDays, shortDate, todayKey, weekdayInitial } from '../lib/dates.js'
import { money } from '../lib/format.js'
import { cashBalance, flowSeries, summarize } from '../lib/metrics.js'
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
  const cash = state?.profile?.cash || 0
  const wallet = useMemo(() => cashBalance(state?.transactions, cash), [state, cash])
  const incomeSeries = useMemo(() => axisLabels(flowSeries(state?.transactions, 'income', today)), [state, today])
  const spentSeries = useMemo(() => axisLabels(flowSeries(state?.transactions, 'expense', today)), [state, today])

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
  const spentColor = theme === 'light' ? '#292524' : '#fafafa'
  const tip = {
    background: theme === 'light' ? '#ffffff' : '#141414',
    border: theme === 'light' ? '1px solid rgba(20,20,20,0.1)' : '1px solid rgba(250,250,250,0.12)',
    borderRadius: 16,
    color: theme === 'light' ? '#141414' : '#fafafa',
  }
  const hasSpend = chart.days.some((day) => day.spent > 0) || chart.slices.length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label">Wallet</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">This month</h1>
        </div>
        <button className="btn btn-ember" type="button" onClick={() => setOpen(true)}>
          <Plus size={18} />
          Log
        </button>
      </header>

      <section className="card rounded-3xl p-5">
        <div className="grid grid-cols-2 gap-3">
          <Figure label="Spent" value={money(stats.spent, currency)} />
          <Figure label="Income" value={money(stats.income, currency)} />
        </div>
        <p className="mt-2 text-sm text-muted">This calendar month.</p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="label">Balance</p>
            <p className="mt-1 font-display nums text-3xl leading-none tracking-tight">{money(wallet.balance, currency)}</p>
          </div>
          <p className="text-right text-sm leading-relaxed text-muted">
            <span className="label mb-1 block">All time</span>
            Income {money(wallet.income, currency)}
            <br />
            Spent {money(wallet.spent, currency)}
          </p>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <FlowChart title="Income" caption="Money in." points={incomeSeries} currency={currency} color="#FF5100" gradientId="income-flow" />
          <FlowChart title="Spent" caption="Money out." points={spentSeries} currency={currency} color={spentColor} gradientId="spent-flow" />
        </div>

        {!state.profile.cashSet && (
          <label className="mt-4 block max-w-xs">
            <span className="label">Money you have</span>
            <input
              className="field mt-2"
              inputMode="decimal"
              placeholder="0"
              onBlur={(event) => {
                const trimmed = event.target.value.trim()
                if (!trimmed) return
                const next = Math.round(Number(trimmed) * 100) / 100
                if (!Number.isFinite(next) || next < 0) return
                updateProfile({ cash: Math.min(100000000, next), cashSet: true })
              }}
              aria-label="Money you have"
            />
            <span className="mt-2 block text-sm text-muted">Added once. Change it anytime in You.</span>
          </label>
        )}
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

function axisLabels(points) {
  let seen = ''
  return points.map((point, index) => {
    const label = point.date === seen ? '' : shortDate(point.date)
    seen = point.date
    return { index, ...point, label }
  })
}

function FlowChart({ title, caption, points, currency, color, gradientId }) {
  const high = Math.max(1, ...points.map((point) => point.total))
  const latest = points[points.length - 1]
  return (
    <div className="min-w-0">
      <p className="label">{title}</p>
      <ChartBox height={148}>
        {(width, height) => (
          <AreaChart width={width} height={height} data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="index" tickLine={false} axisLine={false} tickFormatter={(index) => points[index]?.label || ''} tick={{ fill: 'var(--muted)', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis hide domain={[0, high * 1.18]} />
            <Tooltip content={<FlowTip currency={currency} />} cursor={{ stroke: color, strokeOpacity: 0.45, strokeWidth: 1 }} />
            <Area type="monotone" dataKey="total" stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, fill: color, stroke: '#060607', strokeWidth: 2 }} isAnimationActive={false} />
            <ReferenceDot x={latest.index} y={latest.total} r={4} fill={color} stroke="#060607" strokeWidth={2} />
          </AreaChart>
        )}
      </ChartBox>
      <p className="text-sm text-muted">{caption}</p>
    </div>
  )
}

function FlowTip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-2xl border border-line px-3 py-2 text-sm shadow-lg" style={{ background: 'var(--nav)', color: 'var(--fg)' }}>
      <div className="text-muted">{shortDate(point.date)}</div>
      <div>{point.amount ? point.name : point.name === 'Now' ? 'Holding' : 'Start'}</div>
      {point.amount ? <div className="nums">{money(point.amount, currency)}</div> : null}
      <div className="nums font-medium">{money(point.total, currency)}</div>
    </div>
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
