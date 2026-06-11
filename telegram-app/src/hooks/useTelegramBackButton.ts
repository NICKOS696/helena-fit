import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tg } from '@/lib/telegram'

/**
 * Показывает нативную кнопку «Назад» Telegram на детальных экранах и вяжет её
 * к navigate(-1). На экранах без вызова хука кнопка скрыта. Безопасно: если
 * BackButton недоступен (веб/старый клиент), хук ничего не делает — в шапке
 * остаётся обычная стрелка назад.
 */
export const useTelegramBackButton = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const bb = (tg as any)?.BackButton
    if (!bb) return

    const handler = () => navigate(-1)
    bb.onClick(handler)
    bb.show()

    return () => {
      bb.hide()
      bb.offClick(handler)
    }
  }, [navigate])
}
