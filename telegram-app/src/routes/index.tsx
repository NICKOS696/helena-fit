import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { WorkoutCollectionPage } from '@/pages/WorkoutCollectionPage'
import { SectionItemPage } from '@/pages/SectionItemPage'
import { RecipesPage } from '@/pages/RecipesPage'
import { RecipeCollectionPage } from '@/pages/RecipeCollectionPage'
import { RecipeDetailPage } from '@/pages/RecipeDetailPage'
import { ProfilePage } from '@/pages/ProfilePage'

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/:id" element={<WorkoutCollectionPage />} />
        <Route path="workouts/:id/section-item/:itemId" element={<SectionItemPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/:id" element={<RecipeCollectionPage />} />
        <Route path="recipes/:collectionId/recipe/:recipeId" element={<RecipeDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
