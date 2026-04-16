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
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/:id" element={<WorkoutCollectionEditPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/:id" element={<RecipeCollectionEditPage />} />
        <Route path="news" element={<NewsPage />} />
      </Route>
    </Routes>
  )
}
