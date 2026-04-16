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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive ? 'text-primary' : 'text-text-secondary'
              )
            }
          >
            <Icon className="w-6 h-6 mb-1" strokeWidth={1.5} />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
