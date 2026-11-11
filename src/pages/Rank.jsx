import { useState } from 'react'
import { motion } from 'framer-motion'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../context/Store.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { lastNDays, todayKey } from '../lib/dates.js'
import { summarize } from '../lib/metrics.js'
import { PRACTICE_CREW, crewBenchmark } from '../lib/practice.js'
import { useTitle } from '../components/ui.jsx'

function byRank(a, b) {
  return b.score - a.score || b.streak - a.streak || String(a.displayName).localeCompare(String(b.displayName))
}

export function Rank() {
  const { state, user, demo, board, friends, addFriend, removeFriend } = useStore()
  const { theme } = useTheme()
  const [tab, setTab] = useState('global')
  const [tag, setTag] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useTitle('Rank')

  const today = todayKey()
  const summary = summarize(state, today)
  const you = {
    uid: user?.uid || 'you',
    displayName: state?.profile?.displayName || 'You',
    handle: state?.profile?.handle || '',
    score: summary.score,
    streak: summary.streak,
    trend: (state?.history || []).slice(-14),
    you: true,
  }

  const globalRows = !state
    ? []
    : !user
      ? [...PRACTICE_CREW, you].sort(byRank)
      : (() => {
          const merged = (board || []).map((row) => (row.uid === user.uid ? { ...row, ...you, you: true } : row))
          if (!merged.some((row) => row.uid === user.uid)) merged.push(you)
          return merged.sort(byRank)
        })()

  const friendRows = !state
    ? []
    : [
        ...friends.filter((person) => person.uid !== user?.uid).map((person) => ({ ...person, you: false })),
        you,
      ].sort(byRank)

  const rows = tab === 'friends' && user ? friendRows : globalRows
  const days = lastNDays(14, today)
  const chart = days.map((date) => {
    const yours = (state?.history || []).find((point) => point.date === date)?.score
    let crew = null
    if (!user) crew = crewBenchmark(date)
    else {
      const values = friends
        .map((person) => (person.trend || []).find((point) => point.date === date)?.score)
        .filter((value) => typeof value === 'number')
      if (values.length) crew = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    }
    return { label: date.slice(5), you: typeof yours === 'number' ? yours : null, crew }
  })

  const tip = {
    background: theme === 'light' ? '#ffffff' : '#141414',
    border: theme === 'light' ? '1px solid rgba(20,20,20,0.1)' : '1px solid rgba(250,250,250,0.12)',
    borderRadius: 16,
    color: theme === 'light' ? '#141414' : '#fafafa',
  }

  async function submitFriend(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const result = await addFriend(tag)
    setBusy(false)
    if (!result.ok) setMessage(result.message)
    else setTag('')
  }

  if (!state) return null

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid items-start gap-4 lg:grid-cols-12">
      <section className="space-y-4 lg:col-span-5">
        <header>
          <p className="label">{user ? 'Live board' : 'Practice board'}</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">Rank</h1>
        </header>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-soft p-1">
          {[
            ['global', user ? 'Global' : 'Practice'],
            ['friends', 'Friends'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${tab === id ? 'bg-ember text-ink' : 'text-muted'}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'friends' && (
          <form onSubmit={submitFriend} className="card space-y-3 rounded-3xl p-4">
            {user ? (
              <>
                <label className="block">
                  <span className="label">Add by tag</span>
                  <input className="field mt-2" value={tag} placeholder="amina" onChange={(event) => setTag(event.target.value)} />
                </label>
                {message && <p className="text-sm text-ember">{message}</p>}
                <button className="btn btn-ember w-full" type="submit" disabled={busy}>
                  {busy ? 'Looking…' : 'Add friend'}
                </button>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                {demo ? 'This board is a practice crew.' : 'Sign in from You to climb a real board and add friends by tag.'}
              </p>
            )}
          </form>
        )}

        {user && tab === 'global' && board === null ? (
          <p className="text-sm text-muted">Loading the board…</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, index) => (
              <li key={row.uid} className={`card flex items-center gap-3 rounded-2xl px-3 py-3 ${row.you ? 'ring-1 ring-ember' : ''}`}>
                <span className="w-8 font-display nums text-lg text-muted">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.you ? 'You' : row.displayName}</span>
                  <span className="block truncate text-xs text-muted">
                    {row.handle ? `@${row.handle}` : row.practice ? 'Practice' : 'Player'}
                    {row.you && state.profile.displayName ? ` · ${state.profile.displayName}` : ''}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display nums text-2xl leading-none">{row.score}</span>
                  <span className="text-[11px] text-muted">{row.streak}d streak</span>
                </span>
                {user && tab === 'friends' && !row.you && (
                  <button className="text-xs text-muted" type="button" onClick={() => removeFriend(row.uid)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
        {!user && (
          <p className="text-sm leading-relaxed text-muted">
            Practice crew is sample data so the board isn’t empty. A signed-in board only lists people in your Firebase project.
          </p>
        )}
      </section>

      <section className="card rounded-3xl p-5 lg:col-span-7">
        <h2 className="font-display text-2xl">14-day trend</h2>
        <p className="mt-1 text-sm text-muted">
          {user
            ? 'Orange is you. The dashed line is the average of friends who already have a saved trend.'
            : 'Orange is your real score. The dashed line is the practice crew benchmark.'}
        </p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} width={32} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip contentStyle={tip} />
              <Line type="monotone" dataKey="you" name="You" stroke="#FF5100" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0, fill: '#FF5100' }} connectNulls />
              <Line type="monotone" dataKey="crew" name={user ? 'Friends' : 'Practice'} stroke={theme === 'light' ? '#292524' : '#FAFAFA'} strokeOpacity={0.55} strokeDasharray="4 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </motion.div>
  )
}
