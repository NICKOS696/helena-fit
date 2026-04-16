import { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export const Card = ({ children, className, onClick }: CardProps) => {
  return (
    <div
      className={clsx(
        'bg-background-card rounded-card shadow-card p-4',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
