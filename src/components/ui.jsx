import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · 292` : '292'
    return () => {
      document.title = '292'
    }
  }, [title])
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <div className="font-display text-6xl tracking-tight">292</div>
        <div className="mx-auto mt-5 h-0.5 w-16 overflow-hidden rounded-full bg-soft">
          <div className="load-bar h-full w-1/2 bg-ember" />
        </div>
      </div>
    </div>
  )
}

export function Sheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="card relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="sheet-title" className="font-display text-2xl tracking-tight">
            {title}
          </h2>
          <button className="btn btn-ghost h-11 w-11 rounded-full p-0" onClick={onClose} aria-label="Close dialog" type="button">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>,
    document.body,
  )
}
