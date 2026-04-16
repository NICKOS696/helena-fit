import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { recipesApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { ArrowLeft, Clock } from 'lucide-react'
import clsx from 'clsx'

export const RecipeDetailPage = () => {
  const { collectionId, recipeId } = useParams<{ collectionId: string; recipeId: string }>()
  const navigate = useNavigate()
  const [nutritionMode, setNutritionMode] = useState<'serving' | '100g'>('serving')

  const { data, isLoading } = useQuery({
    queryKey: ['recipe', collectionId, recipeId],
    queryFn: () => recipesApi.getRecipe(collectionId!, recipeId!),
  })

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

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
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
            className="w-full h-64 object-cover"
          />
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

        {/* КБЖУ Cards - smaller */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
            <div className="text-xs text-text-secondary mb-0.5">Белки</div>
            <div className="text-lg font-bold text-primary">{nutrition.protein || 0} г</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
            <div className="text-xs text-text-secondary mb-0.5">Жиры</div>
            <div className="text-lg font-bold text-primary">{nutrition.fat || 0} г</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
            <div className="text-xs text-text-secondary mb-0.5">Углеводы</div>
            <div className="text-lg font-bold text-primary">{nutrition.carbs || 0} г</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center shadow-card">
            <div className="text-xs text-text-secondary mb-0.5">Ккал</div>
            <div className="text-lg font-bold text-primary">{nutrition.calories || 0}</div>
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
            {recipe.ingredients.map((ingredient: any, index: number) => (
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
