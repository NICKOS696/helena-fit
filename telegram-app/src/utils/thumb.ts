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

/**
 * Лёгкая JPEG-версия тяжёлой PNG-картинки (обложки-постеры, логотип) в полном
 * размере: /uploads/x.png → /uploads/opt/x.jpg. Создаётся тем же серверным
 * скриптом; если её ещё нет, <img onError> переключается на оригинал.
 */
export const optUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined
  const m = url.match(/^(.*\/uploads\/)([^/]+)\.png$/i)
  return m ? `${m[1]}opt/${m[2]}.jpg` : url
}
