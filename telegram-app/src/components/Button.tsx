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
        'rounded-lg font-medium transition-all active:scale-95',
        {
          'bg-gradient-to-r from-primary-light to-primary text-white': variant === 'primary',
          'bg-gray-200 text-text-primary': variant === 'secondary',
          'border-2 border-primary text-primary bg-transparent': variant === 'outline',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
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
