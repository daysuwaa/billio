import { useEffect, useRef, type PointerEvent as RPE, type ReactNode } from 'react'
import { useUI } from '../lib/ui'

export function Sheet({ children, label }: { children: ReactNode; label: string }) {
  const close = useUI((s) => s.close)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [close])
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const down = (e: RPE) => { drag.current = { y: e.clientY, dy: 0 }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
  const move = (e: RPE) => {
    if (!drag.current || !ref.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.y)
    ref.current.style.transition = 'none'
    ref.current.style.transform = 'translateY(' + drag.current.dy + 'px)'
  }
  const up = () => {
    if (!drag.current || !ref.current) return
    const dy = drag.current.dy
    drag.current = null
    ref.current.style.transition = 'transform .2s ease'
    if (dy > 110) close()
    else ref.current.style.transform = ''
  }
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        <div className="grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><i /></div>
        {children}
      </div>
    </div>
  )
}
