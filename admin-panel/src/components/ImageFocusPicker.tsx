import { useRef, useState } from 'react'

interface Props {
  imageUrl: string
  /** object-position: "50% 50%" или ключевое слово (center/top/...) */
  value: string
  onChange: (value: string) => void
}

// Ключевые слова -> проценты (обратная совместимость со старыми значениями).
const KEYWORDS: Record<string, { x: number; y: number }> = {
  center: { x: 50, y: 50 },
  top: { x: 50, y: 0 },
  bottom: { x: 50, y: 100 },
  left: { x: 0, y: 50 },
  right: { x: 100, y: 50 },
}

function parsePos(value: string): { x: number; y: number } {
  if (!value) return { x: 50, y: 50 }
  if (KEYWORDS[value]) return KEYWORDS[value]
  const m = value.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/)
  if (m) return { x: Number(m[1]), y: Number(m[2]) }
  return { x: 50, y: 50 }
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

/**
 * Интерактивный выбор фокуса обложки. Показывает живой предпросмотр кадра
 * (object-cover) — администратор перетаскивает точку, и сразу видит, как фото
 * будет выглядеть у пользователя. Сохраняет object-position в формате "x% y%".
 */
export const ImageFocusPicker = ({ imageUrl, value, onChange }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const pos = parsePos(value)

  const updateFromPoint = (clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = clamp(((clientX - r.left) / r.width) * 100)
    const y = clamp(((clientY - r.top) / r.height) * 100)
    onChange(`${Math.round(x)}% ${Math.round(y)}%`)
  }

  if (!imageUrl) {
    return (
      <p className="text-xs text-gray-400">
        Загрузите обложку выше, чтобы настроить положение кадра.
      </p>
    )
  }

  return (
    <div>
      <div
        ref={ref}
        className="relative w-full max-w-[320px] aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-move select-none touch-none"
        onMouseDown={(e) => {
          setDragging(true)
          updateFromPoint(e.clientX, e.clientY)
        }}
        onMouseMove={(e) => dragging && updateFromPoint(e.clientX, e.clientY)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(e) => updateFromPoint(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => updateFromPoint(e.touches[0].clientX, e.touches[0].clientY)}
      >
        <img
          src={imageUrl}
          alt="preview"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        />
        {/* Маркер фокуса */}
        <div
          className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-lg pointer-events-none"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            background: 'rgba(0,0,0,0.25)',
          }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Перетаскивайте по фото — так вы выбираете, какая часть будет видна у
        пользователя. Это и есть предпросмотр кадра.
      </p>
    </div>
  )
}
