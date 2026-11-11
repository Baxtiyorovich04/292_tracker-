import { useEffect, useRef, useState } from 'react'

export function ChartBox({ height = 220, children }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const update = () => setWidth(Math.floor(node.clientWidth))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ height }} className="w-full min-w-0">
      {width > 0 ? children(width, height) : null}
    </div>
  )
}
