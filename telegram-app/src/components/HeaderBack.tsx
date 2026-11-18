import { ArrowLeft } from 'lucide-react'
import { tg } from '@/lib/telegram'

/**
 * Стрелка «назад» в шапке детальных экранов. Внутри Telegram её роль выполняет
 * нативная кнопка «Назад» (см. useTelegramBackButton) — там стрелку не рисуем,
 * чтобы не было двух кнопок. В браузере и на старых клиентах стрелка остаётся.
 */
export const HeaderBack = ({ onClick }: { onClick: () => void }) => {
  const w = tg as any
  const hasNativeBack =
    !!w?.initData && !!w?.BackButton && (w.isVersionAtLeast?.('6.1') ?? false)
  if (hasNativeBack) return null
  return (
    <button onClick={onClick} aria-label="Назад" className="-ml-1 p-1">
      <ArrowLeft className="w-6 h-6" />
    </button>
  )
}
