import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { recipesApi, analyticsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ErrorState } from '@/components/ErrorState'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { ArrowLeft, Clock } from 'lucide-react'
import clsx from 'clsx'

export const RecipeDetailPage = () => {
  const { collectionId, recipeId } = useParams<{ collectionId: string; recipeId: string }>()
  const navigate = useNavigate()
  useTelegramBackButton()
  const [nutritionMode, setNutritionMode] = useState<'serving' | '100g'>('serving')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recipe', collectionId, recipeId],
    queryFn: () => recipesApi.getRecipe(collectionId!, recipeId!),
  })

  // Отправляем просмотр при загрузке страницы
  useEffect(() => {
    if (recipeId) {
      analyticsApi.trackView({
        itemType: 'RECIPE',
        itemId: recipeId,
      }).catch(() => {
        // Игнорируем ошибки трекинга
      })
    }
  }, [recipeId])

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="bg-white rounded-card h-64" />
          <div className="bg-white rounded-card h-32" />
        </div>
      </div>
    )
  }

  const recipe = data?.data

  // Защита от белого экрана при сбое API/отсутствии рецепта.
  if (isError || !recipe) {
    return (
      <ErrorState
        message="Не удалось загрузить рецепт."
        onBack={() => navigate(-1)}
        onRetry={() => refetch()}
      />
    )
  }

  const nutrition = nutritionMode === 'serving'
    ? {
        calories: recipe.caloriesPerServing,
        protein: recipe.proteinPerServing,
        fat: recipe.fatPerServing,
        carbs: recipe.carbsPerServing,
      }
    : {
        calories: recipe.caloriesPer100g,
        protein: recipe.proteinPer100g,
        fat: recipe.fatPer100g,
        carbs: recipe.carbsPer100g,
      }

  // Пропорции Б/Ж/У (по граммам) для визуальной полосы
  const p = Number(nutrition.protein) || 0
  const f = Number(nutrition.fat) || 0
  const c = Number(nutrition.carbs) || 0
  const macroTotal = p + f + c
  const macroPct = (v: number) => (macroTotal > 0 ? (v / macroTotal) * 100 : 0)

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-[var(--app-safe-top)] bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">Рецепт</h1>
      </div>

      {/* Cover Image */}
      {recipe.coverImage && (
        <div className="relative">
          <img
            src={recipe.coverImage}
            alt={recipe.title}
            className={clsx(
              'w-full h-96',
              recipe.coverImageFit === 'contain'
                ? 'object-contain bg-gray-50'
                : 'object-cover'
            )}
          />
          {/* Favorite Button */}
          <div className="absolute top-4 right-4">
            <FavoriteButton 
              recipeId={recipe.id} 
              isFavorite={recipe.isFavorite || false}
              size="md"
            />
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Nutrition Toggle */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setNutritionMode('serving')}
            className={clsx(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              nutritionMode === 'serving'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary'
            )}
          >
            на 1 порцию
          </button>
          <button
            onClick={() => setNutritionMode('100g')}
            className={clsx(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              nutritionMode === '100g'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary'
            )}
          >
            на 100 грамм
          </button>
        </div>

        {/* КБЖУ: калорийность крупно + пропорция Б/Ж/У */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm text-text-secondary">Калорийность</span>
            <span className="text-2xl font-bold text-text-primary">
              {nutrition.calories || 0}{' '}
              <span className="text-base font-medium text-text-secondary">ккал</span>
            </span>
          </div>

          {macroTotal > 0 && (
            <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
              <div className="bg-primary" style={{ width: `${macroPct(p)}%` }} />
              <div className="bg-amber-400" style={{ width: `${macroPct(f)}%` }} />
              <div className="bg-violet-400" style={{ width: `${macroPct(c)}%` }} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mb-0.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Белки
              </div>
              <div className="text-base font-bold text-text-primary">{p} г</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mb-0.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Жиры
              </div>
              <div className="text-base font-bold text-text-primary">{f} г</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mb-0.5">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                Углеводы
              </div>
              <div className="text-base font-bold text-text-primary">{c} г</div>
            </div>
          </div>
        </div>

        {/* Recipe Title */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{recipe.title}</h2>
          {recipe.cookingTime && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Время приготовления: {recipe.cookingTime} мин</span>
            </div>
          )}
        </div>

        {/* Ingredients & Instructions - Combined */}
        <Card>
          <h3 className="text-base font-bold text-gray-800 mb-3">Ингредиенты:</h3>
          <ul className="space-y-2 mb-6">
            {(Array.isArray(recipe.ingredients) ? recipe.ingredients : []).map((ingredient: any, index: number) => (
              <li key={index} className="flex items-center gap-2 text-gray-700">
                <span className="text-primary flex-shrink-0">•</span>
                <span className="flex-1">
                  {ingredient.name} - {ingredient.amount}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="text-base font-bold text-gray-800 mb-3">Способ приготовления:</h3>
          <div className="whitespace-pre-line text-gray-700 leading-relaxed">
            {recipe.instructions}
          </div>
        </Card>
      </div>
    </div>
  )
}
