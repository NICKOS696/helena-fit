import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { recipesApi, paymeApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PriceDisplay } from '@/components/PriceDisplay'
import { ArrowLeft, Clock, Lock, Flame } from 'lucide-react'
import clsx from 'clsx'

const categories = [
  { value: 'all', label: 'Все' },
  { value: 'BREAKFAST', label: 'Завтраки' },
  { value: 'LUNCH', label: 'Обеды' },
  { value: 'SNACK', label: 'Перекусы' },
  { value: 'DINNER', label: 'Ужины' },
  { value: 'SALAD', label: 'Салаты' },
]

export const RecipeCollectionPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['recipe-collection', id, selectedCategory],
    queryFn: () => recipesApi.getCollection(id!, selectedCategory === 'all' ? undefined : selectedCategory),
  })

  const collection = data?.data

  const handlePurchase = async () => {
    try {
      setIsPaymentLoading(true)
      const response = await paymeApi.createPayment({
        collectionId: id!,
        collectionType: 'RECIPE',
        amount: collection.finalPrice,
      })
      
      // Открываем страницу оплаты Payme через Telegram WebApp API
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink(response.data.paymentUrl)
      } else {
        window.open(response.data.paymentUrl, '_blank')
      }
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

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{collection.title}</h1>
          <p className="text-sm text-text-secondary">Рецепты с расчетом КБЖУ</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Обложка и описание сборника */}
        {collection.coverImage && (
          <img
            src={collection.coverImage}
            alt={collection.title}
            className="w-full h-48 object-cover rounded-lg"
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

        {/* Что входит */}
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

        {/* Categories - скрыто */}
        {false && (
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedCategory === cat.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-primary border border-gray-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        )}

        {/* Recipe Cards - скрыто */}
        {false && (
        <div className="grid grid-cols-2 gap-3">
          {collection.recipes.map((recipe: any) => (
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
        )}
      </div>
    </div>
  )
}
