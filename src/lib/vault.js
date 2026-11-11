import { todayKey } from './dates.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR', 'JPY'])

function sanitizeHabit(habit) {
  if (!habit || typeof habit !== 'object') return null
  const title = String(habit.title || '').trim().slice(0, 48)
  if (!title) return null
  const type = habit.type === 'side' ? 'side' : 'main'
  const days = Array.isArray(habit.days)
    ? [...new Set(habit.days.map(Number).filter((day) => day >= 0 && day <= 6))]
    : []
  return {
    id: String(habit.id || crypto.randomUUID()),
    title,
    note: String(habit.note || '').trim().slice(0, 80),
    type,
    icon: String(habit.icon || 'target').slice(0, 24),
    days: type === 'main' ? days : [],
    due: type === 'side' && DATE.test(habit.due || '') ? habit.due : '',
    createdOn: DATE.test(habit.createdOn || '') ? habit.createdOn : todayKey(),
    completedDates: Array.isArray(habit.completedDates)
      ? [...new Set(habit.completedDates.filter((date) => DATE.test(date)))].sort()
      : [],
    remindAt: TIME.test(habit.remindAt || '') ? habit.remindAt : '',
  }
}

function sanitizeTransaction(item) {
  if (!item || typeof item !== 'object') return null
  const amount = Math.round(Number(item.amount) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return null
  return {
    id: String(item.id || crypto.randomUUID()),
    amount,
    kind: item.kind === 'income' ? 'income' : 'expense',
    category: String(item.category || 'other').slice(0, 32),
    description: String(item.description || '').trim().slice(0, 80),
    date: DATE.test(item.date || '') ? item.date : todayKey(),
    createdAt: String(item.createdAt || new Date().toISOString()),
  }
}

function sanitizePoint(point) {
  if (!point || !DATE.test(point.date || '')) return null
  return {
    date: point.date,
    score: Math.max(0, Math.min(100, Math.round(Number(point.score) || 0))),
  }
}

export function sanitize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const profile = source.profile && typeof source.profile === 'object' ? source.profile : {}
  const handle = String(profile.handle || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)
  return {
    version: 1,
    updatedAt: Number(source.updatedAt) || Date.now(),
    profile: {
      displayName: String(profile.displayName || '').trim().slice(0, 40),
      currency: CURRENCIES.has(profile.currency) ? profile.currency : 'USD',
      monthlyBudget: Math.max(0, Math.min(100000000, Number(profile.monthlyBudget) || 0)),
      seenIntro: Boolean(profile.seenIntro),
      handle,
      friendIds: Array.isArray(profile.friendIds)
        ? [...new Set(profile.friendIds.map((id) => String(id)).filter(Boolean))].slice(0, 100)
        : [],
    },
    habits: Array.isArray(source.habits) ? source.habits.map(sanitizeHabit).filter(Boolean).slice(0, 200) : [],
    transactions: Array.isArray(source.transactions)
      ? source.transactions.map(sanitizeTransaction).filter(Boolean).slice(0, 2000)
      : [],
    history: Array.isArray(source.history) ? source.history.map(sanitizePoint).filter(Boolean).slice(-90) : [],
  }
}

export function readVault(id) {
  try {
    const raw = localStorage.getItem(`292-vault-${id}`)
    return raw ? sanitize(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeVault(id, state) {
  try {
    localStorage.setItem(`292-vault-${id}`, JSON.stringify(sanitize(state)))
  } catch {
    // The device can refuse storage. The in-memory session still works.
  }
}
