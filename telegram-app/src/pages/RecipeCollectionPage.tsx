import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { recipesApi, paymeApi, analyticsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PriceDisplay } from '@/components/PriceDisplay'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ErrorState } from '@/components/ErrorState'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { haptic } from '@/lib/telegram'
import { ArrowLeft, Clock, Lock, Flame, Heart, Search, X } from 'lucide-react'
import clsx from 'clsx'

const categories = [
  { value: 'all', label: 'Все' },
  { value: 'BREAKFAST', label: 'Завтраки' },
  { value: 'MAIN_COURSE', label: 'Вторые блюда' },
  { value: 'SALAD', label: 'Салаты' },
  { value: 'SNACK', label: 'Перекусы' },
  { value: 'DESSERT', label: 'Десерты' },
  { value: 'SMOOTHIE', label: 'Смузи' },
]

export const RecipeCollectionPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useTelegramBackButton()
  // Категорию храним в URL (?cat=...), чтобы она сохранялась при возврате
  // с экрана рецепта — иначе фильтр каждый раз сбрасывался бы на «Все».
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCategory = searchParams.get('cat') || 'all'
  const [search, setSearch] = useState('')
  const selectCategory = (cat: string) => {
    haptic.selection()
    setSearchParams(
      (prev) => {
        if (cat === 'all') {
          prev.delete('cat')
        } else {
          prev.set('cat', cat)
        }
        return prev
      },
      { replace: true },
    )
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

        {/* Обложка и описание — только на продающей странице (до покупки).
            После покупки пользователь сразу видит поиск, категории и рецепты. */}
        {!collection.hasAccess && collection.coverImage && (
          <img
            src={collection.coverImage}
            alt={collection.title}
            className="w-full h-64 rounded-lg object-cover"
            style={{ objectPosition: collection.coverImagePosition || 'center' }}
          />
        )}

        {!collection.hasAccess && collection.description && (
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

        {/* Поиск по рецептам сборника */}
        {collection.hasAccess && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск рецепта..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary"
                aria-label="Очистить поиск"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Categories - показываем если есть доступ.
            Кнопки категорий показываем только для непустых (где есть рецепты);
            появляются автоматически, как только в категорию добавлен рецепт. */}
        {collection.hasAccess && (() => {
          const presentCategories = categories.filter(
            (c) =>
              c.value !== 'all' &&
              collection.recipes?.some((r: any) => r.category === c.value),
          )
          const filterButtons = [
            { value: 'all', label: 'Все' },
            { value: 'favorites', label: 'Избранное' },
            ...presentCategories,
          ]
          return (
            <div className="grid grid-cols-3 gap-2">
              {filterButtons.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => selectCategory(cat.value)}
                  className={clsx(
                    'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    selectedCategory === cat.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-text-primary border border-gray-200',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )
        })()}

        {/* Recipe Cards - показываем если есть доступ */}
        {collection.hasAccess && collection.recipes && (() => {
          const query = search.trim().toLowerCase()
          const filteredRecipes = collection.recipes.filter((recipe: any) => {
            // Поиск по названию (работает вместе с категорией)
            if (query && !(recipe.title || '').toLowerCase().includes(query)) {
              return false
            }
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

          if (filteredRecipes.length === 0 && query) {
            return (
              <Card className="text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-600 mb-2">Ничего не найдено</h3>
                <p className="text-sm text-gray-500">
                  Попробуйте изменить запрос или выбрать категорию «Все»
                </p>
              </Card>
            )
          }

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
                    style={{ objectPosition: recipe.coverImagePosition || 'center' }}
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
