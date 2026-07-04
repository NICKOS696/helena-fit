// Реквизиты и настройки оплаты. Здесь же можно менять карту/курс/поддержку.

// Рублёвая оплата (полу-ручная: перевод на карту, доступ открывается вручную)
export const RUBLE_RATE = 155 // 1 ₽ = 155 сум
export const RUBLE_CARD = '2204120139653410'
export const RUBLE_CARD_HOLDER = 'NIKOLAY FILIPPOV'
export const SUPPORT_URL = 'https://t.me/Ioca_uz'

// Цена в рублях из цены в сумах (округление до целого)
export const rubFromSum = (sum: number) => Math.round((sum || 0) / RUBLE_RATE)

// Открыть чат тех.поддержки
export const openSupport = () => {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.openTelegramLink) tg.openTelegramLink(SUPPORT_URL)
  else if (tg?.openLink) tg.openLink(SUPPORT_URL)
  else window.open(SUPPORT_URL, '_blank')
}

// Ошибка создания платежа: нативный попап Telegram с кнопкой «Написать в поддержку».
// На старых клиентах (без showPopup) — обычный confirm с тем же выбором.
export const showPaymentError = () => {
  const msg =
    'Не удалось создать платёж. Попробуйте ещё раз, а если не поможет — закройте приложение полностью и откройте заново.'
  const tg = (window as any).Telegram?.WebApp
  if (typeof tg?.showPopup === 'function') {
    try {
      tg.showPopup(
        {
          title: 'Ошибка оплаты',
          message: msg,
          buttons: [
            { id: 'support', type: 'default', text: 'Написать в поддержку' },
            { id: 'dismiss', type: 'close' },
          ],
        },
        (buttonId: string) => {
          if (buttonId === 'support') openSupport()
        },
      )
      return
    } catch {
      /* клиент без поддержки showPopup — падаем в confirm */
    }
  }
  if (window.confirm(msg + '\n\nНаписать в тех.поддержку?')) openSupport()
}
