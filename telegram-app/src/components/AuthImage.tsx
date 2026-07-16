import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// Картинка из приватного API: обычный <img> не может передать токен,
// поэтому качаем blob через axios (с Bearer) и показываем через object URL.
export const AuthImage = ({
  src,
  className,
  alt,
  onClick,
}: {
  src: string
  className?: string
  alt?: string
  onClick?: () => void
}) => {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    setFailed(false)
    api
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(res.data)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (failed) {
    return <div className={`${className} bg-gray-100 flex items-center justify-center text-gray-300 text-xs`}>—</div>
  }
  if (!url) {
    return <div className={`${className} bg-gray-100 animate-pulse`} />
  }
  return <img src={url} className={className} alt={alt || ''} onClick={onClick} />
}
