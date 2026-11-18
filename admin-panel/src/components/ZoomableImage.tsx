import { useRef, useState } from 'react'
import { AuthImage } from './AuthImage'

/**
 * Фото с приближением (как у клиента в Mini App): двойной клик/тап — приблизить
 * или сбросить, колесо мыши — плавный масштаб, перетаскивание — сдвиг
 * увеличенного фото, щипок двумя пальцами — на планшете/телефоне.
 */
export const ZoomableImage = ({ src, caption }: { src: string; caption?: string }) => {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{
    dist: number
    s: number
    x: number
    y: number
    mx: number
    my: number
  } | null>(null)
  const lastTap = useRef(0)

  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as Element
    el.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      start.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        s: t.s,
        x: t.x,
        y: t.y,
        mx: (pts[0].x + pts[1].x) / 2,
        my: (pts[0].y + pts[1].y) / 2,
      }
    } else if (pts.length === 1) {
      start.current = { dist: 0, s: t.s, x: t.x, y: t.y, mx: e.clientX, my: e.clientY }
      const now = Date.now()
      if (now - lastTap.current < 300) {
        setT(t.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 })
        start.current = null
      }
      lastTap.current = now
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const st = start.current
    if (!st) return
    const pts = [...pointers.current.values()]
    if (pts.length === 2 && st.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const s = Math.min(5, Math.max(1, (st.s * dist) / st.dist))
      const mx = (pts[0].x + pts[1].x) / 2
      const my = (pts[0].y + pts[1].y) / 2
      setT({ s, x: st.x + (mx - st.mx), y: st.y + (my - st.my) })
    } else if (pts.length === 1 && t.s > 1) {
      setT((cur) => ({ s: cur.s, x: st.x + (e.clientX - st.mx), y: st.y + (e.clientY - st.my) }))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      start.current = { dist: 0, s: t.s, x: t.x, y: t.y, mx: pts[0].x, my: pts[0].y }
    } else {
      start.current = null
    }
    setT((cur) => (cur.s <= 1.02 ? { s: 1, x: 0, y: 0 } : cur))
  }

  // Колесо мыши — масштаб
  const onWheel = (e: React.WheelEvent) => {
    setT((cur) => {
      const s = Math.min(5, Math.max(1, cur.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
      return s <= 1.02 ? { s: 1, x: 0, y: 0 } : { ...cur, s }
    })
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div
        className={`flex-1 min-h-0 overflow-hidden ${t.s > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="w-full h-full"
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`,
            transition: start.current ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <AuthImage
            src={src}
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>
      </div>
      {caption && <p className="text-center text-white/80 text-xs py-1.5">{caption}</p>}
    </div>
  )
}
