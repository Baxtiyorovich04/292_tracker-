export function todayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shiftDay(key, delta) {
  const date = parseKey(key)
  date.setDate(date.getDate() + delta)
  return todayKey(date)
}

export function lastNDays(count, today = todayKey()) {
  const days = []
  for (let index = count - 1; index >= 0; index -= 1) days.push(shiftDay(today, -index))
  return days
}

export function monthToDate(today = todayKey()) {
  const day = Number(today.slice(8, 10)) || 1
  const prefix = today.slice(0, 8)
  const days = []
  for (let cursor = 1; cursor <= day; cursor += 1) days.push(`${prefix}${String(cursor).padStart(2, '0')}`)
  return days
}

export function monthLabel(today = todayKey()) {
  return parseKey(today).toLocaleDateString(undefined, { month: 'long' })
}

export function formatPretty(key) {
  return parseKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function shortDate(key) {
  return parseKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function monthTitle(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function weekdayInitial(key) {
  return parseKey(key).toLocaleDateString(undefined, { weekday: 'narrow' })
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'Up early'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function monthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const lead = (first.getDay() + 6) % 7
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= count; day += 1) cells.push(todayKey(new Date(year, monthIndex, day)))
  while (cells.length % 7) cells.push(null)
  return cells
}
