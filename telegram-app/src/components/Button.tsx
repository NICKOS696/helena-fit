import { ReactNode } from 'react'
import clsx from 'clsx'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  className?: string
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className,
}: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-xl font-semibold transition-all active:scale-[0.97]',
        {
          'bg-primary text-white': variant === 'primary',
          'bg-gray-100 text-text-primary': variant === 'secondary',
          'border border-primary/40 text-primary bg-primary/5': variant === 'outline',
          'px-3.5 py-2 text-sm': size === 'sm',
          'px-4 py-3 text-[15px]': size === 'md',
          'px-6 py-3.5 text-base': size === 'lg',
          'w-full': fullWidth,
          'opacity-50 cursor-not-allowed': disabled,
        },
        className
      )}
    >
      {children}
    </button>
  )
}
