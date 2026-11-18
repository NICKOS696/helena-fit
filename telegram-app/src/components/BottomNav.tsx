import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, UtensilsCrossed, User } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/workouts', icon: Dumbbell, label: 'Тренировки' },
  { path: '/recipes', icon: UtensilsCrossed, label: 'Рецепты' },
  { path: '/profile', icon: User, label: 'Профиль' },
]

export const BottomNav = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[480px] bg-white/95 backdrop-blur border-t border-gray-100 z-50"
      style={{ paddingBottom: 'var(--app-safe-bottom)' }}
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive ? 'text-primary-dark' : 'text-text-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Активный таб — иконка в мягкой «пилюле» */}
                <span
                  className={clsx(
                    'flex items-center justify-center w-14 h-8 rounded-full mb-0.5 transition-colors',
                    isActive && 'bg-primary/15'
                  )}
                >
                  <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                </span>
                <span className={clsx('text-[11px]', isActive && 'font-semibold')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
