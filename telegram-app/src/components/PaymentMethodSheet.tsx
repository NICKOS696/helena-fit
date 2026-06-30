import { useState } from 'react'
import { ArrowLeft, X, Copy, Check, CreditCard } from 'lucide-react'
import {
  RUBLE_CARD,
  RUBLE_CARD_HOLDER,
  SUPPORT_URL,
  rubFromSum,
} from '@/lib/payments'
import { tg, haptic } from '@/lib/telegram'

interface Props {
  open: boolean
  onClose: () => void
  finalPriceSum: number
  collectionTitle: string
  isPaymeLoading: boolean
  onPayme: () => void
}

export const PaymentMethodSheet = ({
  open,
  onClose,
  finalPriceSum,
  collectionTitle,
  isPaymeLoading,
  onPayme,
}: Props) => {
  const [view, setView] = useState<'choose' | 'ruble'>('choose')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const rub = rubFromSum(finalPriceSum)

  const close = () => {
    setView('choose')
    onClose()
  }

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(RUBLE_CARD)
      haptic.notify('success')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* no-op */
    }
  }

  const openSupport = () => {
    haptic.impact('medium')
    const url = SUPPORT_URL
    const w = tg as any
    if (w?.openTelegramLink) w.openTelegramLink(url)
    else if (w?.openLink) w.openLink(url)
    else window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      {/* затемнение */}
      <div className="absolute inset-0 bg-black/50" onClick={close} />

      {/* шторка */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl p-5 animate-fadein"
        style={{ paddingBottom: 'calc(1.25rem + var(--app-safe-bottom))' }}
      >
        {view === 'choose' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Способ оплаты</h3>
              <button onClick={close} aria-label="Закрыть">
                <X className="w-6 h-6 text-text-secondary" />
              </button>
            </div>

            <button
              onClick={() => {
                onPayme()
              }}
              disabled={isPaymeLoading}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 mb-3 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <div className="text-left">
                <p className="font-semibold text-text-primary">Payme</p>
                <p className="text-sm text-text-secondary">
                  Картой UZS · {finalPriceSum.toLocaleString()} сум
                </p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {isPaymeLoading ? '...' : 'Онлайн'}
              </span>
            </button>

            <button
              onClick={() => setView('ruble')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 active:scale-[0.98] transition-transform"
            >
              <div className="text-left">
                <p className="font-semibold text-text-primary">Карта МИР</p>
                <p className="text-sm text-text-secondary">Рублёвой картой · {rub} ₽</p>
              </div>
              <CreditCard className="w-5 h-5 text-text-secondary" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setView('choose')} aria-label="Назад">
                <ArrowLeft className="w-6 h-6 text-text-primary" />
              </button>
              <h3 className="text-lg font-bold text-text-primary flex-1">Оплата картой МИР</h3>
              <button onClick={close} aria-label="Закрыть">
                <X className="w-6 h-6 text-text-secondary" />
              </button>
            </div>

            {/* Сумма */}
            <div className="bg-gray-50 rounded-xl p-4 mb-3 text-center">
              <p className="text-sm text-text-secondary">Сумма к оплате</p>
              <p className="text-2xl font-bold text-text-primary">{rub} ₽</p>
            </div>

            {/* Реквизиты */}
            <div className="border border-gray-200 rounded-xl p-4 mb-3">
              <p className="text-xs text-text-secondary mb-1">Карта МИР</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold tracking-wide text-text-primary">
                  {RUBLE_CARD.replace(/(\d{4})(?=\d)/g, '$1 ')}
                </span>
                <button
                  onClick={copyCard}
                  className="flex items-center gap-1 text-sm text-primary"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
              <p className="text-sm text-text-secondary mt-2">{RUBLE_CARD_HOLDER}</p>
            </div>

            {/* Инструкция */}
            <div className="text-sm text-text-secondary space-y-1 mb-4">
              <p>1. Переведите <b className="text-text-primary">{rub} ₽</b> на карту выше.</p>
              <p>2. Нажмите кнопку ниже и пришлите чек в поддержку.</p>
              <p>3. Мы проверим оплату и откроем доступ вручную.</p>
            </div>

            <button
              onClick={openSupport}
              className="w-full bg-primary text-white py-3 rounded-xl font-medium active:scale-95 transition-transform"
            >
              Я оплатил — написать в поддержку
            </button>
            <p className="text-[11px] text-text-secondary/80 text-center mt-2">
              Сборник: {collectionTitle}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
