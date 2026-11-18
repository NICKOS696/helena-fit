import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { Users, Dumbbell, UtensilsCrossed, Newspaper, BarChart3, LogOut, Menu, X, Carrot, HeartHandshake } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/users', icon: Users, label: 'Пользователи' },
  { path: '/clients', icon: HeartHandshake, label: 'Клиенты' },
  { path: '/workouts', icon: Dumbbell, label: 'Тренировки' },
  { path: '/recipes', icon: UtensilsCrossed, label: 'Рецепты' },
  { path: '/news', icon: Newspaper, label: 'Новости' },
  { path: '/ingredients', icon: Carrot, label: 'Ингредиенты' },
  { path: '/analytics', icon: BarChart3, label: 'Статистика' },
]

// Тренеру (MODERATOR) доступны только эти разделы
export const TRAINER_PATHS = ['/users', '/clients', '/analytics']

export const DashboardLayout = () => {
  const { logout, role } = useAuth()
  // Состояние выезжающего меню на мобильных. На десктопе (lg+) меню всегда видно.
  const [menuOpen, setMenuOpen] = useState(false)

  // Тренер видит только свои разделы
  const visibleItems =
    role === 'MODERATOR'
      ? navItems.filter((i) => TRAINER_PATHS.includes(i.path))
      : navItems

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Затемнение под меню на мобильных */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Боковое меню: статичное на lg+, выезжающее на мобильных */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-dark">Helena Fit</h1>
            <p className="text-xs text-gray-500">Админ-панель</p>
          </div>
          {/* Закрыть меню (только на мобильных) */}
          <button
            onClick={() => setMenuOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-800"
            aria-label="Закрыть меню"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {visibleItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary-dark font-semibold'
                    : 'text-gray-600 hover:bg-gray-100',
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full text-[15px] text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Верхняя полоса с «гамбургером» — только на мобильных */}
        <header className="lg:hidden bg-white shadow-sm flex items-center gap-3 p-4 sticky top-0 z-20">
          <button
            onClick={() => setMenuOpen(true)}
            className="text-gray-700"
            aria-label="Открыть меню"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-primary">Helena Fit</h1>
        </header>

        <main className="flex-1 overflow-auto">
          {/* На широких мониторах контент не растягивается на всю ширину */}
          <div className="max-w-[1320px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
