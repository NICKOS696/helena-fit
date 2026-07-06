interface PriceDisplayProps {
  price: number
  discount?: number
  discountType?: 'PERCENTAGE' | 'FIXED'
  finalPrice?: number
  discountEndDate?: string | null
}

export const PriceDisplay = ({
  price,
  discount,
  discountType,
  finalPrice,
  discountEndDate,
}: PriceDisplayProps) => {
  // Скидка с датой окончания после этой даты не действует
  const end = discountEndDate ? new Date(discountEndDate) : null
  const now = new Date()
  const expired = !!end && end.getTime() <= now.getTime()

  // Вычисляем finalPrice если он не передан (с учётом истечения скидки)
  const calculatedFinalPrice =
    finalPrice ??
    (discount && discount > 0 && !expired
      ? discountType === 'PERCENTAGE'
        ? Math.round(price * (1 - discount / 100))
        : Math.max(0, price - discount)
      : price)

  const hasDiscount = !!discount && discount > 0 && !expired && calculatedFinalPrice < price
  const savings = price - calculatedFinalPrice

  // Срок акции: показываем, если задан и ещё не прошёл
  const showDeadline = hasDiscount && end && end.getTime() > now.getTime()
  let deadlineText = ''
  if (showDeadline && end) {
    const msLeft = end.getTime() - now.getTime()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
    const dateStr = end.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    if (daysLeft <= 1) {
      const hoursLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60)))
      deadlineText = `Только сегодня! Осталось ~${hoursLeft} ч`
    } else if (daysLeft <= 5) {
      deadlineText = `Скидка действует до ${dateStr} — осталось ${daysLeft} дн.`
    } else {
      deadlineText = `Скидка действует до ${dateStr}`
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {hasDiscount && (
          <>
            <span className="text-text-secondary line-through text-sm">
              {price.toLocaleString()} сум
            </span>
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
              -{discount}
              {discountType === 'PERCENTAGE' ? '%' : ' сум'}
            </span>
          </>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary">
          {calculatedFinalPrice.toLocaleString()} сум
        </span>
      </div>
      {hasDiscount && savings > 0 && (
        <p className="text-sm text-green-600">Вы экономите {savings.toLocaleString()} сум</p>
      )}
      {deadlineText && (
        <p className="text-sm font-medium text-red-600 flex items-center gap-1">
          <span aria-hidden>⏳</span>
          {deadlineText}
        </p>
      )}
    </div>
  )
}
