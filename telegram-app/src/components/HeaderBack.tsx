import { ArrowLeft } from 'lucide-react'
import { tg } from '@/lib/telegram'

/**
 * Стрелка «назад» в шапке детальных экранов. Внутри Telegram её роль выполняет
 * нативная кнопка «Назад» (см. useTelegramBackButton) — там стрелку не рисуем,
 * чтобы не было двух кнопок. В браузере и на старых клиентах стрелка остаётся.
 */
/** Внутри Telegram есть своя кнопка «Назад» — свои стрелки/ссылки там не нужны. */
export const hasNativeBack = (): boolean => {
  const w = tg as any
  return !!w?.initData && !!w?.BackButton && (w.isVersionAtLeast?.('6.1') ?? false)
}

export const HeaderBack = ({
  onClick,
  className = '-ml-1 p-1',
}: {
  onClick: () => void
  className?: string
}) => {
  if (hasNativeBack()) return null
  return (
    <button onClick={onClick} aria-label="Назад" className={className}>
      <ArrowLeft className="w-6 h-6" />
    </button>
  )
}
