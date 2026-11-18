import { Button } from './Button'

interface Props {
  price: number
  oldPrice?: number
  label: string
  disabled?: boolean
  onClick: () => void
}

/** Закреплённая над нижним меню панель покупки на продающей странице сборника. */
export const StickyBuyBar = ({ price, oldPrice, label, disabled, onClick }: Props) => (
  <div
    className="fixed left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[480px] z-40 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-2.5"
    style={{ bottom: 'calc(4rem + var(--app-safe-bottom))' }}
  >
    <div className="flex items-center gap-4">
      <div className="shrink-0 leading-tight">
        {oldPrice && oldPrice > price ? (
          <div className="text-xs text-text-secondary line-through">
            {oldPrice.toLocaleString()} сум
          </div>
        ) : (
          <div className="text-xs text-text-secondary">Цена</div>
        )}
        <div className="text-lg font-bold text-text-primary">{price.toLocaleString()} сум</div>
      </div>
      <Button fullWidth onClick={onClick} disabled={disabled}>
        {label}
      </Button>
    </div>
  </div>
)
