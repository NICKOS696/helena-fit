import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { recipesApi, paymeApi, analyticsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PriceDisplay } from '@/components/PriceDisplay'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ErrorState } from '@/components/ErrorState'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { haptic } from '@/lib/telegram'
import { ArrowLeft, Clock, Lock, Flame, Heart } from 'lucide-react'
import clsx from 'clsx'

const categories = [
  { value: 'all', label: 'Все' },
  { value: 'BREAKFAST', label: 'Завтраки' },
  { value: 'MAIN_COURSE', label: 'Вторые блюда' },
  { value: 'SNACK', label: 'Перекусы' },
  { value: 'SALAD', label: 'Салаты' },
]

export const RecipeCollectionPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useTelegramBackButton()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const selectCategory = (cat: string) => {
    haptic.selection()
    setSelectedCategory(cat)
  }
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  // Опрос статуса оплаты переживает перезагрузку Mini App (флаг в sessionStorage).
  const pollKey = id ? `payment_polling_${id}` : ''
  const [isPollingPayment, setIsPollingPayment] = useState(
    () => !!pollKey && sessionStorage.getItem(pollKey) === '1',
  )

  // Грузим все рецепты сборника один раз; переключение категорий —
  // мгновенная клиентская фильтрация (без повторных запросов и скелетона).
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recipe-collection', id],
    queryFn: () => recipesApi.getCollection(id!),
  })

  // После клика "Купить" опрос API каждые 2 сек
  useEffect(() => {
    if (!isPollingPayment || !id) return
    const interval = setInterval(async () => {
      try {
        const res = await recipesApi.getCollection(id)
        if (res.data?.hasAccess) {
          sessionStorage.removeItem(pollKey)
          window.location.reload()
        }
      } catch {}
    }, 2000)
    const stopTimeout = setTimeout(() => {
      sessionStorage.removeItem(pollKey)
      setIsPollingPayment(false)
    }, 10 * 60 * 1000)
    return () => {
      clearInterval(interval)
      clearTimeout(stopTimeout)
    }
  }, [isPollingPayment, id, pollKey])

  // Отправляем просмотр при загрузке страницы
  useEffect(() => {
    if (id) {
      analyticsApi.trackView({
        itemType: 'RECIPE_COLLECTION',
        itemId: id,
      }).catch(() => {
        // Игнорируем ошибки трекинга
      })
    }
  }, [id])

  const collection = data?.data

  const handlePurchase = async () => {
    try {
      haptic.impact('medium')
      setIsPaymentLoading(true)
      const response = await paymeApi.createPayment({
        collectionId: id!,
        collectionType: 'RECIPE',
        amount: collection.finalPrice,
      })
      
      // Открываем страницу оплаты Payme
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink(response.data.paymentUrl)
      } else {
        window.open(response.data.paymentUrl, '_blank')
      }

      // Запускаем опрос статуса оплаты (переживёт перезагрузку приложения)
      if (pollKey) sessionStorage.setItem(pollKey, '1')
      setIsPollingPayment(true)
    } catch (error) {
      console.error('Payment error:', error)
      alert('Ошибка при создании платежа. Попробуйте еще раз.')
    } finally {
      setIsPaymentLoading(false)
    }
  }

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

  // Защита от белого экрана: если запрос упал или данных нет — показываем ошибку.
  if (isError || !collection) {
    return (
      <ErrorState
        message="Не удалось загрузить сборник."
        onBack={() => navigate(-1)}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-[var(--app-safe-top)] bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{collection.title}</h1>
          <p className="text-sm text-text-secondary">Рецепты с расчетом КБЖУ</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Индикатор ожидания подтверждения оплаты */}
        {isPollingPayment && !collection.hasAccess && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-text-primary flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-primary animate-pulse" />
            Ожидаем подтверждение оплаты. Доступ откроется автоматически.
          </div>
        )}

        {/* Обложка и описание сборника */}
        {collection.coverImage && (
          <img
            src={collection.coverImage}
            alt={collection.title}
            className="w-full h-64 object-cover object-top rounded-lg"
          />
        )}
        
        {collection.description && (
          <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
            {collection.description}
          </p>
        )}

        {/* Price Card - только если нет доступа */}
        {!collection.hasAccess && (
          <Card>
            <PriceDisplay
              price={collection.price}
              discount={collection.discount}
              discountType={collection.discountType}
              finalPrice={collection.finalPrice}
            />
            <Button 
              fullWidth 
              className="mt-4"
              onClick={handlePurchase}
              disabled={isPaymentLoading}
            >
              {isPaymentLoading ? 'Создание платежа...' : 'Купить сборник'}
            </Button>
          </Card>
        )}

        {/* Что входит - только если нет доступа */}
        {!collection.hasAccess && (
        <Card>
          <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Что входит:</h2>
          <div className="space-y-1">
            {categories.filter(cat => cat.value !== 'all').map((cat) => {
              const count = collection.recipes?.filter((r: any) => r.category === cat.value).length || 0
              return count > 0 ? (
                <div key={cat.value} className="flex justify-between text-sm">
                  <span className="text-gray-700">{cat.label}:</span>
                  <span className="text-gray-600">{count}</span>
                </div>
              ) : null
            })}
          </div>
        </Card>
        )}

        {/* Categories - показываем если есть доступ */}
        {collection.hasAccess && (
        <div className="flex flex-col gap-2">
          {/* Первая строка: Все, Избранное, Перекусы */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => selectCategory('all')}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedCategory === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-primary border border-gray-200'
              )}
            >
              Все
            </button>
            <button
              onClick={() => selectCategory('favorites')}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedCategory === 'favorites'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-primary border border-gray-200'
              )}
            >
              Избранное
            </button>
            <button
              onClick={() => selectCategory('SNACK')}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedCategory === 'SNACK'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-primary border border-gray-200'
              )}
            >
              Перекусы
            </button>
          </div>
          {/* Вторая строка: Завтраки, Вторые блюда, Салаты */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => selectCategory('BREAKFAST')}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedCategory === 'BREAKFAST'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-primary border border-gray-200'
              )}
            >
              Завтраки
            </button>
            <button
              onClick={() => selectCategory('MAIN_COURSE')}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedCategory === 'MAIN_COURSE'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-primary border border-gray-200'
              )}
            >
              Вторые блюда
            </button>
            <button
              onClick={() => selectCategory('SALAD')}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedCategory === 'SALAD'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-primary border border-gray-200'
              )}
            >
              Салаты
            </button>
          </div>
        </div>
        )}

        {/* Recipe Cards - показываем если есть доступ */}
        {collection.hasAccess && collection.recipes && (() => {
          const filteredRecipes = collection.recipes.filter((recipe: any) => {
            // Фильтр по избранному
            if (selectedCategory === 'favorites') {
              return recipe.isFavorite
            }
            // Фильтр по категории
            if (selectedCategory !== 'all') {
              return recipe.category === selectedCategory
            }
            return true
          })

          if (filteredRecipes.length === 0 && selectedCategory === 'favorites') {
            return (
              <Card className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-600 mb-2">Нет избранных рецептов</h3>
                <p className="text-sm text-gray-500">Добавьте рецепты в избранное, нажав на ❤️</p>
              </Card>
            )
          }

          return (
            <div key={selectedCategory} className="grid grid-cols-2 gap-3 animate-fadein">
              {filteredRecipes.map((recipe: any) => (
            <div
              key={recipe.id}
              onClick={() =>
                !recipe.locked && navigate(`/recipes/${id}/recipe/${recipe.id}`)
              }
              className={clsx(
                'bg-white rounded-xl overflow-hidden shadow-card',
                !recipe.locked && 'cursor-pointer active:scale-95 transition-transform'
              )}
            >
              {/* Image */}
              <div className="relative">
                {recipe.coverImage ? (
                  <img
                    src={recipe.coverImage}
                    alt={recipe.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100" />
                )}
                {recipe.locked && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                )}
                {/* Favorite Button */}
                {!recipe.locked && (
                  <div className="absolute top-2 right-2">
                    <FavoriteButton 
                      recipeId={recipe.id} 
                      isFavorite={recipe.isFavorite || false}
                      size="sm"
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="text-sm font-bold text-text-primary mb-2 line-clamp-2 min-h-[2.5rem]">
                  {recipe.title}
                </h3>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  {recipe.caloriesPerServing && (
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{recipe.caloriesPerServing} Kcal</span>
                    </div>
                  )}
                  {recipe.cookingTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{recipe.cookingTime} мин</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
          )
        })()}
      </div>
    </div>
  )
}
