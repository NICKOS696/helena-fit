import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { workoutsApi, paymeApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PriceDisplay } from '@/components/PriceDisplay'
import { ArrowLeft, Flame, Clock, Lock } from 'lucide-react'
import { getRutubeEmbedUrl } from '@/utils/video'
import { useState } from 'react'

export const WorkoutCollectionPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['workout-collection', id],
    queryFn: () => workoutsApi.getCollection(id!),
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

  const collection = data?.data

  const handlePurchase = async () => {
    try {
      setIsPaymentLoading(true)
      const response = await paymeApi.createPayment({
        collectionId: id!,
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
      setIsPaymentLoading(false)
    }
  }

  return (
    <div className="pb-4">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">{collection.title}</h1>
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
        {collection.sections && collection.sections.length > 0 && (
          <Card>
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Что входит:</h2>
            
            {/* Тренировки (VIDEO разделы) */}
            {collection.sections.filter((s: any) => s.type === 'VIDEO').length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-gray-800 mb-2">Тренировки:</h3>
                <div className="space-y-1">
                  {collection.sections
                    .filter((s: any) => s.type === 'VIDEO')
                    .map((section: any) => (
                      <div key={section.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{section.title}:</span>
                        <span className="text-gray-600">{section.items?.length || 0} занятий</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Рекомендации (TEXT_FOLDER разделы) */}
            {collection.sections.filter((s: any) => s.type === 'TEXT_FOLDER').length > 0 && (
              <div>
                <h3 className="font-bold text-gray-800 mb-2">Рекомендации:</h3>
                <div className="space-y-1">
                  {collection.sections
                    .filter((s: any) => s.type === 'TEXT_FOLDER')
                    .map((section: any) => (
                      <div key={section.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{section.title}:</span>
                        <span className="text-gray-600">{section.items?.length || 0} записей</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Разделы - скрыто, показываем только "Что входит" */}
        {false && collection.sections && collection.sections.length > 0 && (
          <div className="space-y-4">
            {collection.sections.map((section: any) => (
              <div key={section.id}>
                <h2 className="text-lg font-bold text-gray-800 mb-3">{section.title}</h2>
                
                {section.type === 'VIDEO' ? (
                  // Видео тренировки
                  <div className="space-y-3">
                    {section.items.map((item: any) => (
                      <Card key={item.id}>
                        {item.coverImage && (
                          <img
                            src={item.coverImage}
                            alt={item.title}
                            className="w-full h-40 object-cover rounded-lg mb-3"
                          />
                        )}
                        <h3 className="text-lg font-bold text-text-primary mb-2">{item.title}</h3>
                        {item.description && (
                          <p className="text-text-secondary mb-3 text-sm">{item.description}</p>
                        )}

                        <div className="flex gap-4 mb-3">
                          {item.calories && (
                            <div className="flex items-center gap-1 text-sm">
                              <Flame className="w-4 h-4 text-red-500" />
                              <span className="text-text-primary">{item.calories} ккал</span>
                            </div>
                          )}
                          {item.duration && (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-4 h-4 text-primary" />
                              <span className="text-text-primary">{item.duration} мин</span>
                            </div>
                          )}
                        </div>

                        {!collection.hasAccess ? (
                          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center gap-2 text-text-secondary">
                            <Lock className="w-5 h-5" />
                            <span>Купите сборник для доступа</span>
                          </div>
                        ) : item.rutubeUrl ? (
                          <div className="aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe
                              src={getRutubeEmbedUrl(item.rutubeUrl)}
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              allow="clipboard-write; autoplay"
                              allowFullScreen
                              className="w-full h-full"
                            />
                          </div>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Текстовые материалы (питание, рекомендации)
                  <div className="space-y-2">
                    {section.items.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (collection.hasAccess) {
                            navigate(`/workouts/${id}/section-item/${item.id}`, {
                              state: { item, sectionTitle: section.title }
                            })
                          }
                        }}
                        disabled={!collection.hasAccess}
                        className="w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                      >
                        <span>{item.title}</span>
                        {!collection.hasAccess && <Lock className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Старые тренировки (для обратной совместимости) - показываем только если нет разделов */}
        {collection.workouts && collection.workouts.length > 0 && (!collection.sections || collection.sections.length === 0) && (
          <div className="space-y-3">
            {collection.workouts.map((workout: any) => (
            <Card key={workout.id}>
              {workout.coverImage && (
                <img
                  src={workout.coverImage}
                  alt={workout.title}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}
              <h3 className="text-lg font-bold text-text-primary mb-2">{workout.title}</h3>
              {workout.description && (
                <p className="text-text-secondary mb-3 text-sm">{workout.description}</p>
              )}

              <div className="flex gap-4 mb-3">
                {workout.calories && (
                  <div className="flex items-center gap-1 text-sm">
                    <Flame className="w-4 h-4 text-red-500" />
                    <span className="text-text-primary">{workout.calories} ккал</span>
                  </div>
                )}
                {workout.duration && (
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-text-primary">{workout.duration} мин</span>
                  </div>
                )}
              </div>

              {workout.locked ? (
                <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center gap-2 text-text-secondary">
                  <Lock className="w-5 h-5" />
                  <span>Купите сборник для доступа</span>
                </div>
              ) : workout.rutubeUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={getRutubeEmbedUrl(workout.rutubeUrl)}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="clipboard-write; autoplay"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : null}
            </Card>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}
