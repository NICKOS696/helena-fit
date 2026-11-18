/**
 * Лёгкая миниатюра (540px) для сеток карточек: /uploads/x.jpg → /uploads/thumbs/x.jpg.
 * Миниатюры создаёт серверный скрипт раз в 5 минут; если её ещё нет,
 * <img onError> переключается на оригинал (см. thumbFallback).
 */
export const thumbUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined
  const m = url.match(/^(.*\/uploads\/)([^/]+\.jpe?g)$/i)
  return m ? `${m[1]}thumbs/${m[2]}` : url
}

export const thumbFallback =
  (original?: string | null) => (e: { currentTarget: HTMLImageElement }) => {
    const img = e.currentTarget
    if (original && !img.dataset.fallback) {
      img.dataset.fallback = '1'
      img.src = original
    }
  }
