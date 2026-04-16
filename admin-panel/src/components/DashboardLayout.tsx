import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { Users, Dumbbell, UtensilsCrossed, Newspaper, LogOut } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/users', icon: Users, label: 'Пользователи' },
  { path: '/workouts', icon: Dumbbell, label: 'Тренировки' },
  { path: '/recipes', icon: UtensilsCrossed, label: 'Рецепты' },
  { path: '/news', icon: Newspaper, label: 'Новости' },
]

export const DashboardLayout = () => {
  const { logout } = useAuth()

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary">Helena Fit</h1>
          <p className="text-sm text-gray-600">Админ-панель</p>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
