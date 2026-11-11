import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Moon, Sun, Upload } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { CURRENCIES, firebaseConfigured } from '../lib/catalog.js'
import { AuthForm } from '../components/AuthForm.jsx'
import { useTitle } from '../components/ui.jsx'

export function You() {
  const {
    state,
    user,
    demo,
    sync,
    offline,
    updateProfile,
    signOutUser,
    deleteCloud,
    resetVault,
    importVault,
    retrySync,
    claimHandle,
  } = useStore()
  const { theme, toggle } = useTheme()
  const fileRef = useRef(null)
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleNote, setHandleNote] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [installEvent, setInstallEvent] = useState(() => window.__pwaInstall || null)
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  )
  useTitle('You')

  useEffect(() => {
    if (!state) return
    setName(state.profile.displayName || '')
    setHandle(state.profile.handle || '')
  }, [state])

  useEffect(() => {
    const syncPrompt = () => setInstallEvent(window.__pwaInstall || null)
    const onInstalled = () => setInstalled(true)
    window.addEventListener('pwa-install-ready', syncPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('pwa-install-ready', syncPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!state) return null
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const cloud = !user ? 'On this device only' : sync === 'saving' ? 'Saving to cloud…' : sync === 'error' ? 'Cloud sync failed' : 'Cloud vault up to date'

  async function saveHandle(event) {
    event.preventDefault()
    setHandleNote('')
    const result = await claimHandle(handle)
    setHandleNote(result.ok ? 'Tag saved.' : result.message)
  }

  function exportVault() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '292-vault.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function onImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importVault(String(reader.result))
      } catch {
        setHandleNote('That file could not be read as a 292 vault.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl space-y-4">
      <header>
        <p className="label">You</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">{state.profile.displayName || 'Your vault'}</h1>
        <p className="mt-2 text-sm text-muted">{offline ? 'Offline · ' : ''}{cloud}</p>
      </header>

      <section className="card space-y-4 rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Appearance</h2>
            <p className="text-sm text-muted">Dark is the default.</p>
          </div>
          <button className="btn btn-line" type="button" onClick={toggle} aria-pressed={theme === 'light'}>
            {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'light' ? 'Light' : 'Dark'}
          </button>
        </div>
        <label className="block">
          <span className="label">Display name</span>
          <input
            className="field mt-2"
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => updateProfile({ displayName: name.trim() })}
          />
        </label>
        <label className="block">
          <span className="label">Currency</span>
          <select
            className="field mt-2"
            value={state.profile.currency}
            onChange={(event) => updateProfile({ currency: event.target.value })}
          >
            {CURRENCIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card space-y-3 rounded-3xl p-5">
        <h2 className="font-display text-2xl">Install</h2>
        {installed ? (
          <p className="text-sm text-muted">292 is already installed on this device.</p>
        ) : installEvent ? (
          <button
            className="btn btn-ember"
            type="button"
            onClick={async () => {
              installEvent.prompt()
              await installEvent.userChoice
              window.__pwaInstall = null
              setInstallEvent(null)
            }}
          >
            Add to Home Screen
          </button>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            {ios
              ? 'In Safari, open Share, then Add to Home Screen.'
              : 'From the browser menu, choose Install app or Add to Home Screen. On Android, 292 also adds shortcuts for Today, Plan, and Wallet.'}
          </p>
        )}
      </section>

      <section className="card space-y-4 rounded-3xl p-5">
        <h2 className="font-display text-2xl">Account</h2>
        {user ? (
          <>
            <p className="text-sm text-muted">{user.email || 'Signed in'}</p>
            <form onSubmit={saveHandle} className="space-y-2">
              <label className="block">
                <span className="label">Player tag</span>
                <input
                  className="field mt-2"
                  value={handle}
                  maxLength={12}
                  placeholder="yourtag"
                  onChange={(event) => setHandle(event.target.value.toLowerCase())}
                />
              </label>
              <button className="btn btn-line" type="submit">
                Save tag
              </button>
            </form>
            {sync === 'error' && (
              <button className="btn btn-line" type="button" onClick={retrySync}>
                Retry cloud sync
              </button>
            )}
            <button className="btn btn-ghost" type="button" onClick={signOutUser}>
              Sign out
            </button>
            {!confirmDelete ? (
              <button className="text-sm text-muted" type="button" onClick={() => setConfirmDelete(true)}>
                Delete cloud vault
              </button>
            ) : (
              <button className="btn btn-line w-full" type="button" onClick={deleteCloud}>
                Confirm delete
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              {demo ? 'This vault is stored on the device.' : 'Sign in to sync habits, money, and your score.'}{' '}
              {firebaseConfigured ? 'Signing in keeps this device’s vault if the account is new.' : ''}
            </p>
            <AuthForm compact />
          </>
        )}
        {handleNote && <p className="text-sm text-muted">{handleNote}</p>}
      </section>

      <section className="card space-y-3 rounded-3xl p-5">
        <h2 className="font-display text-2xl">Vault</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-line" type="button" onClick={exportVault}>
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-line" type="button" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            Import
          </button>
          <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={onImport} />
        </div>
        {!confirmReset ? (
          <button className="text-sm text-muted" type="button" onClick={() => setConfirmReset(true)}>
            Reset vault
          </button>
        ) : (
          <button className="btn btn-line" type="button" onClick={resetVault}>
            Confirm reset
          </button>
        )}
      </section>
    </motion.div>
  )
}
