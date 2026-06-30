// Реквизиты и настройки оплаты. Здесь же можно менять карту/курс/поддержку.

// Рублёвая оплата (полу-ручная: перевод на карту, доступ открывается вручную)
export const RUBLE_RATE = 155 // 1 ₽ = 155 сум
export const RUBLE_CARD = '2204120139653410'
export const RUBLE_CARD_HOLDER = 'NIKOLAY FILIPPOV'
export const SUPPORT_URL = 'https://t.me/Ioca_uz'

// Цена в рублях из цены в сумах (округление до целого)
export const rubFromSum = (sum: number) => Math.round((sum || 0) / RUBLE_RATE)
