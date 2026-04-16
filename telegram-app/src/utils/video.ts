/**
 * Конвертирует обычную ссылку Rutube в embed формат
 * @param url - URL видео Rutube
 * @returns Embed URL для iframe
 */
export function getRutubeEmbedUrl(url: string): string {
  if (!url) return ''

  // Если уже embed URL, возвращаем как есть
  if (url.includes('/play/embed/')) {
    return url
  }

  try {
    // Извлекаем video ID из различных форматов URL
    // Формат 1: https://rutube.ru/video/VIDEO_ID/
    // Формат 2: https://rutube.ru/video/private/VIDEO_ID/?p=TOKEN
    const videoIdMatch = url.match(/\/video\/(?:private\/)?([a-f0-9]+)/i)
    
    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1]
      
      // Извлекаем токен для приватных видео
      const tokenMatch = url.match(/[?&]p=([^&]+)/)
      const token = tokenMatch ? tokenMatch[1] : null
      
      // Формируем embed URL
      let embedUrl = `https://rutube.ru/play/embed/${videoId}/`
      
      if (token) {
        embedUrl += `?p=${token}`
      }
      
      return embedUrl
    }
  } catch (error) {
    console.error('Error parsing Rutube URL:', error)
  }

  // Если не удалось распарсить, возвращаем оригинальный URL
  return url
}
