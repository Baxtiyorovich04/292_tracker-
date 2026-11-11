import { todayKey } from './dates.js'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const MEMORY = '292-reminded'

function remembered() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY) || '[]')
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function remember(key) {
  const keys = remembered()
  keys.add(key)
  const today = todayKey()
  const fresh = [...keys].filter((item) => String(item).includes(`:${today}:`)).slice(-200)
  localStorage.setItem(MEMORY, JSON.stringify(fresh))
}

export function allowReminders() {
  if (typeof Notification === 'undefined') return Promise.resolve(false)
  if (Notification.permission === 'granted') return Promise.resolve(true)
  if (Notification.permission === 'denied') return Promise.resolve(false)
  return Notification.requestPermission().then((result) => result === 'granted')
}

const GRACE_MINUTES = 20

function scheduledToday(habit, now) {
  const date = todayKey(now)
  if (habit.type === 'side') {
    if (habit.due !== date) return false
    return !(habit.completedDates || []).includes(habit.due)
  }
  if (!(habit.days || []).includes(now.getDay())) return false
  return !(habit.completedDates || []).includes(date)
}

function dueNow(habit, now) {
  if (!TIME.test(habit?.remindAt || '')) return false
  const [hour, minute] = habit.remindAt.split(':').map(Number)
  const at = hour * 60 + minute
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < at || minutes - at > GRACE_MINUTES) return false
  return scheduledToday(habit, now)
}

function waitUntil(habit, now) {
  if (!TIME.test(habit?.remindAt || '') || !scheduledToday(habit, now)) return null
  const [hour, minute] = habit.remindAt.split(':').map(Number)
  const at = new Date(now)
  at.setHours(hour, minute, 0, 0)
  const delta = at.getTime() - now.getTime()
  return delta >= 0 ? delta : null
}

let armed = 0

export function armReminderClock(habits, onFire) {
  window.clearTimeout(armed)
  const now = new Date()
  let soonest = null
  for (const habit of habits || []) {
    const wait = waitUntil(habit, now)
    if (wait == null) continue
    if (soonest == null || wait < soonest) soonest = wait
  }
  if (soonest == null) return
  armed = window.setTimeout(() => onFire(), Math.min(soonest + 500, 2_000_000_000))
}

async function notify(habit, key) {
  const title = habit.title || '292'
  const body = habit.note ? habit.note : `Time for ${title}.`
  const options = { body, tag: key, icon: '/icon-192.png', data: { url: '/' } }
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
  if (registration) {
    await registration.showNotification(title, options)
    return
  }
  new Notification(title, options)
}

export async function fireDueReminders(habits, now = new Date()) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const date = todayKey(now)
  for (const habit of habits || []) {
    if (!dueNow(habit, now)) continue
    const key = `${habit.id}:${date}:${habit.remindAt}`
    if (remembered().has(key)) continue
    remember(key)
    try {
      await notify(habit, key)
    } catch {
      // A blocked notification should not break the rest of the list.
    }
  }
}
