import { useEffect, useState } from 'react'
import { firebaseConfigured } from '../lib/catalog.js'
import { useStore } from '../context/Store.jsx'

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.3 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

export function AuthForm({ compact = false }) {
  const { signInEmail, signUpEmail, signInGoogle, sendReset } = useStore()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setError('')
    setInfo('')
  }, [mode])

  if (!firebaseConfigured) {
    return (
      <div className="card rounded-3xl p-4 text-sm leading-relaxed text-muted">
        Cloud sync stays off until Firebase web keys are in <span className="text-fg">.env</span>. The vault on this device still keeps your habits, score, and spending.
      </div>
    )
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const result = mode === 'create' ? await signUpEmail(email, password) : await signInEmail(email, password)
    setBusy(false)
    if (!result.ok) setError(result.message)
  }

  async function google() {
    setBusy(true)
    setError('')
    const result = await signInGoogle()
    setBusy(false)
    if (!result.ok) setError(result.message)
  }

  async function forgot() {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Enter your email first.')
      return
    }
    setBusy(true)
    const result = await sendReset(email)
    setBusy(false)
    if (result.ok) setInfo(result.message)
    else setError(result.message)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {!compact && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-soft p-1">
          {[
            ['signin', 'Sign in'],
            ['create', 'Create account'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === id ? 'bg-ember text-ink' : 'text-muted'}`}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <label className="block">
        <span className="label">Email</span>
        <input
          className="field mt-2"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <span className="relative mt-2 block">
          <input
            className="field pr-20"
            type={show ? 'text' : 'password'}
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted"
            onClick={() => setShow((value) => !value)}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>
      {error && (
        <p className="text-sm text-ember" role="alert">
          {error}
        </p>
      )}
      {info && <p className="text-sm text-muted">{info}</p>}
      <button className="btn btn-ember w-full" type="submit" disabled={busy}>
        {busy ? 'Working…' : mode === 'create' ? 'Create account' : 'Sign in'}
      </button>
      <button className="btn btn-line w-full" type="button" onClick={google} disabled={busy}>
        <GoogleMark />
        Continue with Google
      </button>
      {mode === 'signin' && (
        <button className="w-full text-center text-sm text-muted" type="button" onClick={forgot} disabled={busy}>
          Forgot password
        </button>
      )}
    </form>
  )
}
