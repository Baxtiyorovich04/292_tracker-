import { createContext, useCallback, useContext, useState } from 'react'
import { useReducedMotion, motion } from 'framer-motion'

const ConfettiContext = createContext(() => {})

export function ConfettiProvider({ children }) {
  const reduce = useReducedMotion()
  const [pieces, setPieces] = useState([])

  const burst = useCallback(
    (x, y) => {
      if (reduce) return
      const next = Array.from({ length: 18 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 18 + Math.random() * 0.35
        const distance = 64 + Math.random() * 86
        return {
          id: `${Date.now()}-${index}-${Math.random()}`,
          x,
          y,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - 24,
          rot: Math.random() * 160 - 80,
          color: ['#FF5100', '#FFB088', '#FAFAFA'][index % 3],
          w: 6 + (index % 3) * 2,
          h: 8,
        }
      })
      setPieces((current) => [...current, ...next])
      window.setTimeout(() => {
        setPieces((current) => current.filter((piece) => !next.some((item) => item.id === piece.id)))
      }, 760)
    },
    [reduce],
  )

  return (
    <ConfettiContext.Provider value={burst}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
        {pieces.map((piece) => (
          <motion.span
            key={piece.id}
            initial={{ x: piece.x, y: piece.y, opacity: 1, scale: 1, rotate: 0 }}
            animate={{ x: piece.x + piece.dx, y: piece.y + piece.dy + 36, opacity: 0, scale: 0.55, rotate: piece.rot }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: piece.w,
              height: piece.h,
              background: piece.color,
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </ConfettiContext.Provider>
  )
}

export function useConfetti() {
  return useContext(ConfettiContext)
}
