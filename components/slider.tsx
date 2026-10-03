'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

/**
 * A row of cards that slides: swipe on phones, drag or use the arrows with a mouse, the
 * keyboard's arrow keys once focused. It snaps to a card and shows how far along you are.
 */
export function Slider({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const [edges, setEdges] = useState({ start: true, end: false, progress: 0 })

  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8, progress: max > 0 ? el.scrollLeft / max : 1 })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const step = (direction: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    el.scrollBy({ left: direction * ((card?.offsetWidth ?? 300) + 20), behavior: 'smooth' })
  }

  // Mouse drag (touch already scrolls natively). A real drag doesn't open the card under it.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !track.current) return
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false }
    track.current.classList.add('is-dragging')
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !track.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 5) drag.current.moved = true
    track.current.scrollLeft = drag.current.left - dx
  }
  const endDrag = () => {
    track.current?.classList.remove('is-dragging')
    setTimeout(() => (drag.current = null), 0)
  }

  return (
    <div className={`slider ${className}`} role="region" aria-label={label}>
      <div
        ref={track}
        className="slider-track"
        tabIndex={0}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation() } }}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1) }}
      >
        {children}
      </div>
      <div className="slider-controls">
        <div className="slider-progress"><i style={{ transform: `scaleX(${Math.max(0.08, edges.progress)})` }} /></div>
        <button type="button" onClick={() => step(-1)} disabled={edges.start} aria-label="Previous"><ArrowLeft size={18} /></button>
        <button type="button" onClick={() => step(1)} disabled={edges.end} aria-label="Next"><ArrowRight size={18} /></button>
      </div>
    </div>
  )
}
