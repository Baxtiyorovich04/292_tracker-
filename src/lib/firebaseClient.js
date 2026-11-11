import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  query,
  setDoc,
} from 'firebase/firestore'
import { publicProfile } from './metrics.js'
import { sanitize } from './vault.js'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseApp = initializeApp(config)
export const auth = getAuth(firebaseApp)

let db
try {
  db = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() })
} catch {
  db = getFirestore(firebaseApp)
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function consumeRedirect() {
  return getRedirectResult(auth)
}

export function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export function signUpEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email.trim(), password)
}

export async function signInGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    if (error?.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw error
  }
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim())
}

export function signOutUser() {
  return signOut(auth)
}

export async function pullVault(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function pushVault(user, state) {
  const clean = sanitize(state)
  await setDoc(doc(db, 'users', user.uid), clean)
  await setDoc(doc(db, 'publicProfiles', user.uid), publicProfile(clean))
}

export function listenBoard(callback) {
  const boardQuery = query(collection(db, 'publicProfiles'), orderBy('score', 'desc'), limit(25))
  return onSnapshot(
    boardQuery,
    (snap) => callback(snap.docs.map((item) => ({ uid: item.id, ...item.data() }))),
    () => callback([]),
  )
}

export async function fetchProfiles(ids) {
  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'publicProfiles', id))))
  return snaps.filter((snap) => snap.exists()).map((snap) => ({ uid: snap.id, ...snap.data() }))
}

export async function claimHandle(user, tag, previous) {
  const clean = tag.trim().toLowerCase()
  if (!/^[a-z0-9]{3,12}$/.test(clean)) return { ok: false, message: 'Use 3–12 letters or numbers.' }
  const ref = doc(db, 'handles', clean)
  const existing = await getDoc(ref)
  if (existing.exists() && existing.data().uid !== user.uid) return { ok: false, message: 'That tag is taken.' }
  if (!existing.exists()) {
    try {
      await setDoc(ref, { uid: user.uid })
    } catch {
      return { ok: false, message: 'That tag is taken.' }
    }
  }
  if (previous && previous !== clean) {
    const oldRef = doc(db, 'handles', previous)
    const old = await getDoc(oldRef)
    if (old.exists() && old.data().uid === user.uid) await deleteDoc(oldRef).catch(() => {})
  }
  return { ok: true, handle: clean }
}

export async function lookupHandle(tag) {
  const clean = tag.trim().toLowerCase().replace(/^@/, '')
  if (!/^[a-z0-9]{3,12}$/.test(clean)) return { ok: false, message: 'Tags are 3–12 letters or numbers.' }
  const snap = await getDoc(doc(db, 'handles', clean))
  if (!snap.exists()) return { ok: false, message: 'No player uses that tag.' }
  return { ok: true, uid: snap.data().uid, handle: clean }
}

export async function deleteCloud(user, handle) {
  await deleteDoc(doc(db, 'users', user.uid)).catch(() => {})
  await deleteDoc(doc(db, 'publicProfiles', user.uid)).catch(() => {})
  if (handle) {
    const ref = doc(db, 'handles', handle)
    const snap = await getDoc(ref)
    if (snap.exists() && snap.data().uid === user.uid) await deleteDoc(ref).catch(() => {})
  }
  try {
    await deleteUser(user)
  } catch {
    // Firebase asks for a recent login before deleting the auth user. The vault is already gone.
  }
}

export function authMessage(error) {
  const code = error?.code || ''
  const messages = {
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/user-not-found': 'No account uses that email yet.',
    'auth/wrong-password': 'Wrong password.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
    'auth/weak-password': 'Use at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was closed.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/operation-not-allowed': 'Enable this sign-in method in the Firebase console.',
  }
  return messages[code] || 'Sign-in failed. Try again.'
}
