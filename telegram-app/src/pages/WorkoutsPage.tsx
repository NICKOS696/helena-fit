import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { workoutsApi, paymeApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PriceDisplay } from '@/components/PriceDisplay'
import { Lock } from 'lucide-react'
import { useState } from 'react'

export const WorkoutsPage = () => {
  const navigate = useNavigate()
  const [loadingCollectionId, setLoadingCollectionId] = useState<string | null>(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => workoutsApi.getCollections(),
  })

  const handlePurchase = async (collection: any) => {
    try {
      setLoadingCollectionId(collection.id)
      const response = await paymeApi.createPayment({
        collectionId: collection.id,
        collectionType: 'WORKOUT',
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
      setLoadingCollectionId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-card h-64" />
          ))}
        </div>
      </div>
    )
  }

  const collections = data?.data || []

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Тренировки</h1>

      <div className="space-y-4">
        {collections.map((collection: any) => (
          <Card key={collection.id} className="overflow-hidden p-0">
            {/* Большая картинка */}
            {collection.coverImage && (
              <div className="relative h-64">
                <img
                  src={collection.coverImage}
                  alt={collection.title}
                  className="w-full h-full object-cover"
                />
                {/* Заголовок поверх картинки */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <h3 className="text-xl font-bold text-white">{collection.title}</h3>
                </div>
              </div>
            )}
            
            <div className="p-4">
              {/* Описание */}
              {collection.description && (
                <p className="text-text-secondary mb-4 leading-relaxed text-sm whitespace-pre-line">
                  {collection.description}
                </p>
              )}

              {/* Информация */}
              <div className="flex items-center gap-4 mb-4 text-sm text-text-secondary">
                <span>📋 {collection.workoutCount} тренировок</span>
                {!collection.hasAccess && collection.discount > 0 && (
                  <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium">
                    -{collection.discount}{collection.discountType === 'PERCENTAGE' ? '%' : ' сум'}
                  </span>
                )}
              </div>

              {/* Цена и кнопка */}
              {collection.hasAccess ? (
                <Button fullWidth onClick={() => navigate(`/workouts/${collection.id}`)}>
                  Открыть сборник
                </Button>
              ) : (
                <div className="space-y-3">
                  {/* Цена крупно */}
                  <div className="flex items-baseline gap-2">
                    {collection.discount > 0 && (
                      <span className="text-lg text-gray-400 line-through">
                        {collection.price.toLocaleString()} сум
                      </span>
                    )}
                    <span className="text-2xl font-bold text-primary">
                      {collection.finalPrice.toLocaleString()} сум
                    </span>
                  </div>

                  {/* Кнопки */}
                  <div className="flex gap-2">
                    <Button
                      fullWidth
                      variant="outline"
                      onClick={() => navigate(`/workouts/${collection.id}`)}
                    >
                      <Lock className="w-4 h-4 mr-2 inline" />
                      Просмотр
                    </Button>
                    <Button 
                      fullWidth 
                      className="bg-primary"
                      onClick={() => handlePurchase(collection)}
                      disabled={loadingCollectionId === collection.id}
                    >
                      {loadingCollectionId === collection.id ? 'Загрузка...' : 'Купить'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
