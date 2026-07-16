import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardLayout } from '@/components/DashboardLayout'
import { UsersPage } from '@/pages/UsersPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { WorkoutCollectionEditPage } from '@/pages/WorkoutCollectionEditPage'
import { RecipesPage } from '@/pages/RecipesPage'
import { RecipeCollectionEditPage } from '@/pages/RecipeCollectionEditPage'
import { NewsPage } from '@/pages/NewsPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { IngredientsPage } from '@/pages/IngredientsPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ClientCardPage } from '@/pages/ClientCardPage'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Разделы, закрытые для тренера (MODERATOR) — редиректим на Пользователей
const FullAccessRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuth()
  if (role === 'MODERATOR') {
    return <Navigate to="/users" replace />
  }
  return <>{children}</>
}

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/users" replace />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientCardPage />} />
        <Route path="workouts" element={<FullAccessRoute><WorkoutsPage /></FullAccessRoute>} />
        <Route path="workouts/:id" element={<FullAccessRoute><WorkoutCollectionEditPage /></FullAccessRoute>} />
        <Route path="recipes" element={<FullAccessRoute><RecipesPage /></FullAccessRoute>} />
        <Route path="recipes/:id" element={<FullAccessRoute><RecipeCollectionEditPage /></FullAccessRoute>} />
        <Route path="news" element={<FullAccessRoute><NewsPage /></FullAccessRoute>} />
        <Route path="ingredients" element={<FullAccessRoute><IngredientsPage /></FullAccessRoute>} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  )
}
