import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { firebaseConfigured } from '../lib/catalog.js'
import { withHistory } from '../lib/metrics.js'
import { starterState } from '../lib/seed.js'
import { readVault, sanitize, writeVault } from '../lib/vault.js'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)
  const [demo, setDemo] = useState(false)
  const [state, setState] = useState(null)
  const [sync, setSync] = useState('local')
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [notice, setNotice] = useState('')
  const [board, setBoard] = useState(null)
  const [friends, setFriends] = useState([])
  const fb = useRef(null)
  const stateRef = useRef(null)
  const lastPushed = useRef('')
  const loadedFor = useRef(null)
  const booted = useRef(false)
  const noticeTimer = useRef(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  function flash(message) {
    setNotice(message)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 3200)
  }

  function commit(updater) {
    setState((current) => {
      if (!current) return current
      const next = updater(current)
      return withHistory(sanitize({ ...next, updatedAt: Date.now() }))
    })
  }

  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    let stop = () => {}
    let cancelled = false
    const giveUp = setTimeout(() => {
      if (!cancelled) setReady(true)
    }, 12000)

    async function boot() {
      if (!firebaseConfigured) {
        if (localStorage.getItem('292-demo') === '1') {
          setDemo(true)
          setState(withHistory(readVault('demo') || starterState()))
        }
        setReady(true)
        return
      }

      try {
        const mod = await import('../lib/firebaseClient.js')
        if (cancelled) return
        fb.current = mod
        await mod.consumeRedirect().catch(() => {})
        stop = mod.onAuth(async (nextUser) => {
          if (cancelled) return
          setUser(nextUser)
          if (!nextUser) {
            const useDemo = localStorage.getItem('292-demo') === '1'
            setDemo(useDemo)
            setState(useDemo ? withHistory(readVault('demo') || starterState()) : null)
            setSync('local')
            setBoard(null)
            setFriends([])
            loadedFor.current = null
            booted.current = true
            setReady(true)
            return
          }

          setDemo(false)
          try {
            await hydrateUser(mod, nextUser, booted.current)
            setSync('saved')
          } catch {
            setState(withHistory(readVault(nextUser.uid) || readVault('demo') || starterState()))
            setSync('error')
          }
          booted.current = true
          setReady(true)
        })
      } catch {
        if (!cancelled) setReady(true)
      }
    }

    boot()
    return () => {
      cancelled = true
      clearTimeout(giveUp)
      stop()
    }
  }, [])

  async function hydrateUser(mod, nextUser, announce) {
    if (loadedFor.current === nextUser.uid && stateRef.current) return
    const remote = await mod.pullVault(nextUser.uid)
    if (remote) {
      const clean = sanitize(remote)
      const next = withHistory(clean)
      lastPushed.current = JSON.stringify(clean)
      setState(next)
      if (announce) flash('Cloud vault loaded.')
    } else {
      const seeded = sanitize(readVault('demo') || readVault(nextUser.uid) || starterState())
      if (!seeded.profile.displayName && nextUser.displayName) {
        seeded.profile.displayName = String(nextUser.displayName).slice(0, 40)
      }
      setState(withHistory({ ...seeded, updatedAt: Date.now() }))
      flash('This device vault is now on your account.')
    }
    loadedFor.current = nextUser.uid
  }

  useEffect(() => {
    if (!state) return
    if (user) writeVault(user.uid, state)
    else if (demo) writeVault('demo', state)
  }, [state, user, demo])

  useEffect(() => {
    if (!state || !user || !fb.current) return undefined
    const payload = JSON.stringify(state)
    if (payload === lastPushed.current) return undefined
    setSync('saving')
    const handle = setTimeout(async () => {
      try {
        await fb.current.pushVault(user, state)
        lastPushed.current = payload
        setSync('saved')
      } catch {
        setSync('error')
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [state, user])

  useEffect(() => {
    if (!user || !fb.current) {
      setBoard(null)
      return undefined
    }
    return fb.current.listenBoard(setBoard)
  }, [user])

  const friendKey = (state?.profile?.friendIds || []).join('|')
  useEffect(() => {
    const ids = friendKey ? friendKey.split('|') : []
    if (!user || !fb.current || !ids.length) {
      setFriends([])
      return undefined
    }
    let cancel = false
    fb.current
      .fetchProfiles(ids)
      .then((rows) => {
        if (!cancel) setFriends(rows)
      })
      .catch(() => {
        if (!cancel) setFriends([])
      })
    return () => {
      cancel = true
    }
  }, [user, friendKey])

  function enterDemo() {
    localStorage.setItem('292-demo', '1')
    setDemo(true)
    setState((current) => current || withHistory(readVault('demo') || starterState()))
  }

  async function runAuth(action) {
    if (!fb.current) return { ok: false, message: 'Add Firebase keys to .env and restart the app.' }
    try {
      await action()
      return { ok: true }
    } catch (error) {
      return { ok: false, message: fb.current.authMessage(error) }
    }
  }

  function signInEmail(email, password) {
    return runAuth(() => fb.current.signInEmail(email, password))
  }

  function signUpEmail(email, password) {
    return runAuth(() => fb.current.signUpEmail(email, password))
  }

  function signInGoogle() {
    return runAuth(() => fb.current.signInGoogle())
  }

  async function sendReset(email) {
    if (!fb.current) return { ok: false, message: 'Add Firebase keys to .env and restart the app.' }
    try {
      await fb.current.resetPassword(email)
      return { ok: true, message: 'Password reset sent. Check your inbox.' }
    } catch (error) {
      return { ok: false, message: fb.current.authMessage(error) }
    }
  }

  async function signOutUser() {
    loadedFor.current = null
    lastPushed.current = ''
    if (fb.current) await fb.current.signOutUser().catch(() => {})
    localStorage.removeItem('292-demo')
    setDemo(false)
    setUser(null)
    setState(null)
    setBoard(null)
    setFriends([])
    setSync('local')
  }

  async function deleteCloud() {
    if (!user || !fb.current) return { ok: false, message: 'Sign in first.' }
    try {
      await fb.current.deleteCloud(user, stateRef.current?.profile?.handle)
      localStorage.removeItem(`292-vault-${user.uid}`)
      await signOutUser()
      flash('Cloud vault deleted.')
      return { ok: true }
    } catch {
      return { ok: false, message: 'Could not delete the cloud vault.' }
    }
  }

  function toggleHabit(id, date) {
    commit((current) => ({
      ...current,
      habits: current.habits.map((habit) => {
        if (habit.id !== id) return habit
        const when = habit.type === 'side' ? habit.due : date
        if (!when || when > currentToday()) return habit
        const has = (habit.completedDates || []).includes(when)
        return {
          ...habit,
          completedDates: has
            ? habit.completedDates.filter((item) => item !== when)
            : [...(habit.completedDates || []), when],
        }
      }),
    }))
  }

  function saveHabit(habit) {
    commit((current) => {
      const exists = current.habits.some((item) => item.id === habit.id)
      return {
        ...current,
        habits: exists ? current.habits.map((item) => (item.id === habit.id ? habit : item)) : [...current.habits, habit],
      }
    })
  }

  function deleteHabit(id) {
    commit((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id) }))
  }

  function saveTx(tx) {
    commit((current) => {
      const exists = current.transactions.some((item) => item.id === tx.id)
      return {
        ...current,
        transactions: exists
          ? current.transactions.map((item) => (item.id === tx.id ? tx : item))
          : [tx, ...current.transactions],
      }
    })
  }

  function deleteTx(id) {
    commit((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }))
  }

  function updateProfile(patch) {
    commit((current) => ({ ...current, profile: { ...current.profile, ...patch } }))
  }

  function resetVault() {
    lastPushed.current = ''
    setState(starterState())
    flash('Vault reset.')
  }

  function importVault(text) {
    const next = withHistory(sanitize(JSON.parse(text)))
    lastPushed.current = ''
    setState({ ...next, updatedAt: Date.now() })
    flash('Vault imported.')
  }

  async function retrySync() {
    if (!user || !fb.current || !stateRef.current) return
    setSync('saving')
    try {
      await fb.current.pushVault(user, stateRef.current)
      lastPushed.current = JSON.stringify(stateRef.current)
      setSync('saved')
    } catch {
      setSync('error')
    }
  }

  async function claimHandle(tag) {
    if (!user || !fb.current) return { ok: false, message: 'Sign in to claim a tag.' }
    const result = await fb.current.claimHandle(user, tag, stateRef.current?.profile?.handle || '')
    if (result.ok) updateProfile({ handle: result.handle })
    return result
  }

  async function addFriend(tag) {
    if (!user || !fb.current) return { ok: false, message: 'Sign in to add friends.' }
    const found = await fb.current.lookupHandle(tag)
    if (!found.ok) return found
    if (found.uid === user.uid) return { ok: false, message: 'That tag is yours.' }
    const friendIds = [...new Set([...(stateRef.current?.profile?.friendIds || []), found.uid])]
    updateProfile({ friendIds })
    flash(`Added @${found.handle}.`)
    return { ok: true }
  }

  function removeFriend(uid) {
    const friendIds = (stateRef.current?.profile?.friendIds || []).filter((id) => id !== uid)
    updateProfile({ friendIds })
  }

  const value = {
    ready,
    user,
    demo,
    offline,
    sync,
    state,
    notice,
    board,
    friends,
    enterDemo,
    signInEmail,
    signUpEmail,
    signInGoogle,
    sendReset,
    signOutUser,
    deleteCloud,
    toggleHabit,
    saveHabit,
    deleteHabit,
    saveTx,
    deleteTx,
    updateProfile,
    resetVault,
    importVault,
    retrySync,
    claimHandle,
    addFriend,
    removeFriend,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function currentToday() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}
