import { useState } from 'react'
import { Play } from 'lucide-react'
import { getRutubeEmbedUrl } from '@/utils/video'
import { haptic } from '@/lib/telegram'

interface Props {
  rutubeUrl: string
  poster?: string | null
  title?: string
}

/**
 * Ленивый плеер Rutube: вместо тяжёлого iframe сразу показываем обложку
 * с кнопкой воспроизведения, а сам плеер загружаем только по тапу.
 * Иначе при раскрытии раздела грузились бы все плееры одновременно.
 */
export const RutubeVideo = ({ rutubeUrl, poster, title }: Props) => {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    const embed = getRutubeEmbedUrl(rutubeUrl)
    const src = embed + (embed.includes('?') ? '&' : '?') + 'autoplay=1'
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={src}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="clipboard-write; autoplay"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        haptic.impact('light')
        setPlaying(true)
      }}
      aria-label={title ? `Смотреть: ${title}` : 'Смотреть видео'}
      className="relative block w-full aspect-video rounded-lg overflow-hidden bg-gray-900"
    >
      {poster && (
        <img
          src={poster}
          alt={title || ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="w-14 h-14 rounded-full bg-white/90 shadow-lg flex items-center justify-center active:scale-95 transition-transform">
          <Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" />
        </span>
      </div>
    </button>
  )
}
