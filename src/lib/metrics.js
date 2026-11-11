import { monthToDate, parseKey, shiftDay, shortDate, todayKey } from './dates.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/

export function isDue(habit, date) {
  if (!habit || !DATE.test(date || '')) return false
  if (habit.createdOn && date < habit.createdOn) return false
  if (habit.type === 'side') return habit.due === date
  return (habit.days || []).includes(parseKey(date).getDay())
}

export function dayProgress(habits, date) {
  const due = (habits || []).filter((habit) => habit.type !== 'side' && isDue(habit, date))
  if (!due.length) return 'off'
  const done = due.filter((habit) => (habit.completedDates || []).includes(date)).length
  if (done === 0) return 'none'
  if (done === due.length) return 'full'
  return 'partial'
}

export function dayHeat(habits, date) {
  const list = habits || []
  const dueHabits = list.filter((habit) => isDue(habit, date))
  const done = dueHabits.filter((habit) => (habit.completedDates || []).includes(habit.type === 'side' ? habit.due : date)).length
  if (!dueHabits.length) return { due: 0, done: 0, level: -1 }
  return { due: dueHabits.length, done, level: Math.min(4, done) }
}

export function isComplete(habit, date) {
  if (!habit) return false
  const when = habit.type === 'side' ? habit.due : date
  return Boolean(when && (habit.completedDates || []).includes(when))
}

export function disciplineScore(habits, today = todayKey()) {
  const window = monthToDate(today)
  const ratios = []

  for (const day of window) {
    const due = (habits || []).filter((habit) => habit.type !== 'side' && isDue(habit, day))
    if (!due.length) continue
    const done = due.filter((habit) => (habit.completedDates || []).includes(day)).length
    ratios.push(done / due.length)
  }

  const sideDone = (habits || []).filter(
    (habit) =>
      habit.type === 'side' &&
      habit.due &&
      window.includes(habit.due) &&
      (habit.completedDates || []).includes(habit.due),
  ).length
  const bonus = Math.min(12, sideDone * 3)

  if (!ratios.length) {
    return {
      score: Math.min(100, sideDone * 20),
      days: 0,
      bonus,
      consistency: 0,
    }
  }

  const consistency = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
  return {
    score: Math.min(100, Math.round(consistency * 100 + bonus)),
    days: ratios.length,
    bonus,
    consistency,
  }
}

function earliestMain(habits) {
  const dates = (habits || []).map((habit) => habit.createdOn).filter(Boolean).sort()
  return dates[0] || ''
}

export function currentStreak(habits, today = todayKey()) {
  const mains = (habits || []).filter((habit) => habit.type !== 'side')
  const earliest = earliestMain(mains)
  if (!mains.length || !earliest) return 0

  let cursor = today
  if (dayProgress(mains, cursor) !== 'full') cursor = shiftDay(cursor, -1)

  let count = 0
  for (let guard = 0; guard < 5000; guard += 1) {
    if (cursor < earliest) break
    const status = dayProgress(mains, cursor)
    if (status === 'off') {
      cursor = shiftDay(cursor, -1)
      continue
    }
    if (status !== 'full') break
    count += 1
    cursor = shiftDay(cursor, -1)
  }
  return count
}

export function habitStreak(habit, today = todayKey()) {
  if (!habit || habit.type === 'side' || !habit.createdOn) return 0
  let cursor = today
  const doneToday = isDue(habit, cursor) && (habit.completedDates || []).includes(cursor)
  if (!doneToday) cursor = shiftDay(cursor, -1)

  let count = 0
  for (let guard = 0; guard < 5000; guard += 1) {
    if (cursor < habit.createdOn) break
    if (!isDue(habit, cursor)) {
      cursor = shiftDay(cursor, -1)
      continue
    }
    if (!(habit.completedDates || []).includes(cursor)) break
    count += 1
    cursor = shiftDay(cursor, -1)
  }
  return count
}

export function completionCount(habits) {
  return (habits || []).reduce((sum, habit) => sum + (habit.completedDates?.length || 0), 0)
}

export function monthSpent(transactions, today = todayKey()) {
  const month = today.slice(0, 7)
  return (transactions || [])
    .filter((item) => item.kind !== 'income' && item.date && item.date.startsWith(month))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

export function monthIncome(transactions, today = todayKey()) {
  const month = today.slice(0, 7)
  return (transactions || [])
    .filter((item) => item.kind === 'income' && item.date && item.date.startsWith(month))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

export function cashBalance(transactions) {
  let income = 0
  let spent = 0
  for (const item of transactions || []) {
    const amount = Number(item.amount) || 0
    if (item.kind === 'income') income += amount
    else spent += amount
  }
  return {
    balance: Math.round((income - spent) * 100) / 100,
    income: Math.round(income * 100) / 100,
    spent: Math.round(spent * 100) / 100,
  }
}

export function balanceSeries(transactions, today = todayKey()) {
  const items = [...(transactions || [])]
    .filter((item) => item && item.date && Number(item.amount) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.createdAt || '').localeCompare(String(b.createdAt || ''))))

  let balance = 0
  const points = items.map((item) => {
    const amount = Number(item.amount) || 0
    const income = item.kind === 'income'
    const delta = income ? amount : -amount
    balance = Math.round((balance + delta) * 100) / 100
    return {
      date: item.date,
      balance,
      delta,
      kind: income ? 'income' : 'expense',
      name: item.description || item.category || (income ? 'Income' : 'Expense'),
    }
  })

  if (!points.length) return []
  const series = [{ date: points[0].date, balance: 0, delta: 0, kind: 'start', name: 'Start' }, ...points]
  const last = series[series.length - 1]
  if (last.date < today) series.push({ date: today, balance: last.balance, delta: 0, kind: 'now', name: 'Now' })
  return series
}

export function withHistory(state, today = todayKey()) {
  const { score } = disciplineScore(state.habits || [], today)
  const history = [
    ...(state.history || []).filter((point) => point && point.date && point.date !== today),
    { date: today, score },
  ]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-90)
  return { ...state, history }
}

export function summarize(state, today = todayKey()) {
  const habits = state?.habits || []
  const transactions = state?.transactions || []
  const scored = disciplineScore(habits, today)
  const spent = monthSpent(transactions, today)
  const income = monthIncome(transactions, today)
  const wallet = cashBalance(transactions)
  const budget = Number(state?.profile?.monthlyBudget) || 0
  const yesterday = (state?.history || []).find((point) => point.date === shiftDay(today, -1))
  const day = Number(today.slice(8, 10)) || 1
  return {
    ...scored,
    streak: currentStreak(habits, today),
    completed: completionCount(habits),
    spent,
    income,
    balance: wallet.balance,
    budget,
    left: budget - spent,
    average: spent / day,
    delta: yesterday ? scored.score - yesterday.score : null,
  }
}

export function publicProfile(state, today = todayKey()) {
  const habits = state.habits || []
  const scored = disciplineScore(habits, today)
  return {
    displayName: (state.profile?.displayName || 'Player').slice(0, 40),
    handle: state.profile?.handle || '',
    score: scored.score,
    streak: currentStreak(habits, today),
    completed: completionCount(habits),
    trend: (state.history || []).slice(-14).map((point) => ({ date: point.date, score: point.score })),
    updatedAt: Date.now(),
  }
}

export function scheduleLabel(days) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const set = [...new Set(days || [])].sort((a, b) => a - b)
  if (!set.length) return 'No days picked'
  if (set.length === 7) return 'Every day'
  if (set.length === 5 && [1, 2, 3, 4, 5].every((day) => set.includes(day))) return 'Weekdays'
  if (set.length === 2 && set.includes(0) && set.includes(6)) return 'Weekends'
  return set.map((day) => names[day]).join(' · ')
}

export function dueLabel(habit, today = todayKey()) {
  if (!habit?.due) return 'No date'
  if (habit.due === today) return 'Due today'
  if (habit.due < today) return `Overdue · ${shortDate(habit.due)}`
  return `Due ${shortDate(habit.due)}`
}

export function itemsForDay(habits, selected, today = todayKey()) {
  const mains = (habits || []).filter((habit) => habit.type !== 'side' && isDue(habit, selected))
  const sides = (habits || []).filter((habit) => {
    if (habit.type !== 'side' || !habit.due) return false
    if (habit.due === selected) return true
    const open = !(habit.completedDates || []).includes(habit.due)
    return selected === today && habit.due < today && open
  })
  const rank = (habit) => (isComplete(habit, habit.type === 'side' ? habit.due : selected) ? 1 : 0)
  mains.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
  sides.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
  return { mains, sides }
}
