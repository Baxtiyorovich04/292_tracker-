import { motion } from 'framer-motion'
import { firebaseConfigured } from '../lib/catalog.js'
import { useStore } from '../context/Store.jsx'
import { AuthForm } from '../components/AuthForm.jsx'
import { useTitle } from '../components/ui.jsx'

export function Welcome() {
  const { enterDemo } = useStore()
  useTitle('')

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute -top-6 right-0 font-display text-[30vw] leading-none text-fg/[0.045] select-none">292</div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-md"
      >
        <p className="label">Personal operating system</p>
        <h1 className="mt-3 font-display text-7xl tracking-tight">292</h1>
        <p className="mt-3 max-w-sm text-lg leading-snug text-muted">Habits, a discipline score, and the money you still have.</p>
        <div className="mt-8 space-y-3">
          <AuthForm />
          <button className={`btn w-full ${firebaseConfigured ? 'btn-ghost' : 'btn-ember'}`} type="button" onClick={enterDemo}>
            Continue on this device
          </button>
        </div>
      </motion.div>
    </div>
  )
}
