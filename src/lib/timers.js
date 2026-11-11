import { allowReminders } from './reminders.js'

const KEY = '292-timers'
const listeners = new Set()
let runs = read()
let snapshot = runs
let ticker = 0

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function emit() {
  snapshot = { ...runs }
  for (const listener of listeners) listener()
}

function publish() {
  localStorage.setItem(KEY, JSON.stringify(runs))
  emit()
}

async function ping(run) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const title = run.title || '292'
  const body = `${run.minutes} minute timer is done.`
  const options = { body, tag: `timer:${run.id}`, icon: '/icon-192.png', data: { url: '/' } }
  try {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (registration) await registration.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    // The countdown still ends on the habit row.
  }
}

function sweep() {
  const now = Date.now()
  const done = []
  for (const [id, run] of Object.entries(runs)) {
    if (now < run.endsAt) continue
    delete runs[id]
    done.push(run)
  }
  if (done.length) publish()
  else emit()
  for (const run of done) ping(run)
  if (!Object.keys(runs).length && ticker) {
    window.clearInterval(ticker)
    ticker = 0
  }
}

function watch() {
  if (ticker || !Object.keys(runs).length) return
  ticker = window.setInterval(sweep, 250)
}

export function subscribeTimers(listener) {
  listeners.add(listener)
  watch()
  return () => listeners.delete(listener)
}

export function getTimers() {
  return snapshot
}

export async function startTimer(habit) {
  const minutes = Number(habit.minutes) || 0
  if (minutes <= 0) return
  await allowReminders()
  runs[habit.id] = {
    id: habit.id,
    title: habit.title,
    minutes,
    endsAt: Date.now() + minutes * 60 * 1000,
  }
  publish()
  watch()
}

export function stopTimer(id) {
  if (!runs[id]) return
  delete runs[id]
  publish()
}

export function formatLeft(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
