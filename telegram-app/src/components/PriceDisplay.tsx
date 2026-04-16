interface PriceDisplayProps {
  price: number
  discount?: number
  discountType?: 'PERCENTAGE' | 'FIXED'
  finalPrice?: number
}

export const PriceDisplay = ({ price, discount, discountType, finalPrice }: PriceDisplayProps) => {
  // Вычисляем finalPrice если он не передан
  const calculatedFinalPrice = finalPrice ?? (discount && discount > 0 
    ? (discountType === 'PERCENTAGE' 
        ? Math.round(price * (1 - discount / 100))
        : Math.max(0, price - discount))
    : price)
  
  const hasDiscount = discount && discount > 0
  const savings = price - calculatedFinalPrice

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {hasDiscount && (
          <>
            <span className="text-text-secondary line-through text-sm">
              {price.toLocaleString()} сум
            </span>
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
              -{discount}{discountType === 'PERCENTAGE' ? '%' : ' сум'}
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
        <p className="text-sm text-green-600">
          Вы экономите {savings.toLocaleString()} сум
        </p>
      )}
    </div>
  )
}
