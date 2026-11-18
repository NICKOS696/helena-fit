import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { recipesApi, analyticsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ErrorState } from '@/components/ErrorState'
import { HeaderBack } from '@/components/HeaderBack'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { haptic } from '@/lib/telegram'
import { isInShoppingList, toggleShoppingList } from '@/lib/shoppingList'
import { Clock, Flame, ShoppingBag, Check } from 'lucide-react'
import clsx from 'clsx'

export const RecipeDetailPage = () => {
  const { collectionId, recipeId } = useParams<{ collectionId: string; recipeId: string }>()
  const navigate = useNavigate()
  useTelegramBackButton()
  const [nutritionMode, setNutritionMode] = useState<'serving' | '100g'>('serving')

  // Общий список покупок (сквозной для всех сборников)
  const shoppingEnabled = true
  const [inList, setInList] = useState(false)
  useEffect(() => {
    setInList(!!recipeId && isInShoppingList(recipeId))
  }, [recipeId])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recipe', collectionId, recipeId],
    queryFn: () => recipesApi.getRecipe(collectionId!, recipeId!),
  })

  const toggleInList = () => {
    const recipe = data?.data
    if (!recipe || !recipeId) return
    haptic.selection()
    toggleShoppingList({
      id: recipe.id,
      collectionId: collectionId || recipe.collectionId,
      title: recipe.title,
      coverImage: recipe.coverImage,
      ingredients: recipe.ingredients,
    })
    setInList(isInShoppingList(recipeId))
  }

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

  // Ингредиенты: поддержка разделов. Старый формат — плоский [{name,amount}],
  // новый — [{title, items:[{name,amount}]}]. Нормализуем в группы.
  const rawIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const ingredientGroups =
    rawIngredients.length && rawIngredients[0] && Array.isArray(rawIngredients[0].items)
      ? rawIngredients
      : [{ title: '', items: rawIngredients }]

  // Шаги приготовления: делим по переносам строк, срезаем ведущую нумерацию.
  const steps = (recipe.instructions || '')
    .split(/\r?\n/)
    .map((s: string) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter((s: string) => s.length > 0)

  return (
    <div>
      {/* Фото во всю ширину; контент «наезжает» на него скруглённым листом */}
      <div className="relative">
        {recipe.coverImage ? (
          <img
            src={recipe.coverImage}
            alt={recipe.title}
            className="w-full h-[22rem] object-cover bg-gray-100"
            style={{ objectPosition: recipe.coverImagePosition || 'center' }}
          />
        ) : (
          <div className="w-full h-28 bg-gray-100" />
        )}
        {/* В Telegram «назад» — нативная кнопка; в браузере — эта */}
        <HeaderBack
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/95 shadow-md flex items-center justify-center"
        />
        <div className="absolute top-3 right-3">
          <FavoriteButton recipeId={recipe.id} isFavorite={recipe.isFavorite || false} size="md" />
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-[28px] bg-background px-4 pt-5 pb-4 space-y-4">
        {/* Название и краткие факты */}
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-text-primary">{recipe.title}</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.cookingTime && (
              <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm text-text-primary shadow-card">
                <Clock className="w-4 h-4 text-primary" />
                {recipe.cookingTime} мин
              </span>
            )}
            {!!recipe.caloriesPerServing && (
              <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm text-text-primary shadow-card">
                <Flame className="w-4 h-4 text-primary" />
                {recipe.caloriesPerServing} ккал
              </span>
            )}
          </div>
        </div>

        {/* Пищевая ценность: переключатель — компактно в шапке карточки */}
        <Card>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-text-primary">Пищевая ценность</h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium shrink-0">
              <button
                onClick={() => setNutritionMode('serving')}
                className={clsx(
                  'px-2.5 py-1.5 rounded-md transition-colors',
                  nutritionMode === 'serving'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary',
                )}
              >
                Все блюдо
              </button>
              <button
                onClick={() => setNutritionMode('100g')}
                className={clsx(
                  'px-2.5 py-1.5 rounded-md transition-colors',
                  nutritionMode === '100g'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary',
                )}
              >
                100 г
              </button>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-bold text-text-primary">{nutrition.calories || 0}</span>
            <span className="text-sm text-text-secondary">ккал</span>
          </div>

          {macroTotal > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
              <div className="bg-primary rounded-full" style={{ width: `${macroPct(p)}%` }} />
              <div className="bg-amber-400 rounded-full" style={{ width: `${macroPct(f)}%` }} />
              <div className="bg-[#C4936F] rounded-full" style={{ width: `${macroPct(c)}%` }} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Белки', value: p, dot: 'bg-primary' },
              { label: 'Жиры', value: f, dot: 'bg-amber-400' },
              { label: 'Углеводы', value: c, dot: 'bg-[#C4936F]' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-0.5">
                  <span className={clsx('w-2 h-2 rounded-full', m.dot)} />
                  {m.label}
                </div>
                <div className="text-base font-semibold text-text-primary">{m.value} г</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Ингредиенты + кнопка «в список покупок» */}
        <Card>
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-base font-semibold text-text-primary">Ингредиенты</h2>
            {shoppingEnabled && !recipe.locked && (
              <button
                onClick={toggleInList}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0',
                  inList ? 'bg-primary text-white' : 'bg-primary/10 text-primary-dark',
                )}
              >
                {inList ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                {inList ? 'В списке покупок' : 'В список покупок'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {ingredientGroups.map((group: any, gi: number) => (
              <div key={gi}>
                {group.title && (
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mt-3 mb-0.5">
                    {group.title}
                  </h3>
                )}
                <div>
                  {(group.items || []).map((ing: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-baseline gap-3 py-2.5 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-[15px] text-text-primary">{ing.name}</span>
                      <span className="text-sm font-medium text-text-secondary text-right whitespace-nowrap">
                        {ing.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Способ приготовления — нумерованные шаги. Скрываем, если пусто
            (например, у напитков/смузи способа приготовления нет). */}
        {steps.length > 0 && (
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-4">Приготовление</h2>
            <ol className="space-y-4">
              {steps.map((step: string, i: number) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary-dark text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-[15px] text-text-primary leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* Польза — для смузи и напитков вместо способа приготовления */}
        {recipe.benefits && recipe.benefits.trim() && (
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-3">Польза</h2>
            <div className="whitespace-pre-line text-[15px] text-text-primary leading-relaxed">
              {recipe.benefits}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
