import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { workoutsApi, paymeApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Lock } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

export const WorkoutsPage = () => {
  const navigate = useNavigate()
  const [loadingCollectionId, setLoadingCollectionId] = useState<string | null>(null)
  const [isPollingPayment, setIsPollingPayment] = useState(false)
  
  const { data, isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => workoutsApi.getCollections(),
  })

  // После клика "Купить" опрос API каждые 2 сек
  useEffect(() => {
    if (!isPollingPayment) return
    const interval = setInterval(async () => {
      try {
        const res = await workoutsApi.getCollections()
        const items = (res.data || []) as any[]
        if (items.some((c: any) => c.hasAccess)) {
          window.location.reload()
        }
      } catch {}
    }, 2000)
    const stopTimeout = setTimeout(() => setIsPollingPayment(false), 10 * 60 * 1000)
    return () => {
      clearInterval(interval)
      clearTimeout(stopTimeout)
    }
  }, [isPollingPayment])

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

      // Запускаем опрос статуса оплаты
      setIsPollingPayment(true)
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

      <div className="space-y-6">
        {collections.map((collection: any) => (
          <Card key={collection.id} className={clsx("p-4 space-y-3", collection.isInDevelopment && "opacity-90")}>
            {/* Картинка с закругленными углами */}
            {collection.coverImage && (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={collection.coverImage}
                  alt={collection.title}
                  className={clsx("w-full h-auto object-contain", collection.isInDevelopment && "grayscale-[40%]")}
                />
                {collection.isInDevelopment && (
                  <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <span>🛠️</span>
                    <span>В разработке</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Заголовок */}
            <h3 className="text-xl font-bold text-text-primary">{collection.title}</h3>
            
            {/* Описание */}
            {collection.description && (
              <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
                {collection.description}
              </p>
            )}

            {/* Информация */}
            {!collection.isInDevelopment && (
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span>📋 {collection.workoutCount} тренировок</span>
                {!collection.hasAccess && collection.discount > 0 && (
                  <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium">
                    -{collection.discount}{collection.discountType === 'PERCENTAGE' ? '%' : ' сум'}
                  </span>
                )}
              </div>
            )}

            {/* Кнопка / статус */}
            {collection.isInDevelopment ? (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">⏳</div>
                <p className="font-bold text-yellow-900 text-sm">Скоро будет доступно</p>
                <p className="text-xs text-yellow-700 mt-1">Этот сборник готовится для вас</p>
              </div>
            ) : collection.hasAccess ? (
              <Button fullWidth onClick={() => navigate(`/workouts/${collection.id}`)}>
                Открыть
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
          </Card>
        ))}
      </div>
    </div>
  )
}
