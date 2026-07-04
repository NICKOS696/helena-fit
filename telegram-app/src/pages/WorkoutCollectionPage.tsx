import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { workoutsApi, paymeApi, analyticsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PriceDisplay } from '@/components/PriceDisplay'
import { PaymentMethodSheet } from '@/components/PaymentMethodSheet'
import { ErrorState } from '@/components/ErrorState'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { haptic } from '@/lib/telegram'
import { ArrowLeft, Flame, Clock, Lock, ChevronDown, Check } from 'lucide-react'
import { RutubeVideo } from '@/components/RutubeVideo'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

export const WorkoutCollectionPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useTelegramBackButton()
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  const [showPayMethods, setShowPayMethods] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  // Опрос статуса оплаты переживает перезагрузку Mini App (после возврата
  // из браузера Payme): флаг хранится в sessionStorage по id сборника.
  const pollKey = id ? `payment_polling_${id}` : ''
  const [isPollingPayment, setIsPollingPayment] = useState(
    () => !!pollKey && sessionStorage.getItem(pollKey) === '1',
  )

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workout-collection', id],
    queryFn: () => workoutsApi.getCollection(id!),
  })

  // Отметки «выполнено»: сидируются с сервера, переключаются оптимистично.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    const c = data?.data
    if (!c) return
    const ids = new Set<string>()
    c.sections?.forEach((s: any) =>
      s.items?.forEach((i: any) => i.completed && ids.add(i.id)),
    )
    c.workouts?.forEach((w: any) => w.completed && ids.add(w.id))
    setCompletedIds(ids)
  }, [data])

  const toggleCompleted = (itemId: string) => {
    const wasCompleted = completedIds.has(itemId)
    if (wasCompleted) {
      haptic.selection()
    } else {
      haptic.notify('success')
    }
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (wasCompleted) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
    workoutsApi.toggleProgress(itemId).catch(() => {
      // Откат при ошибке сети
      setCompletedIds((prev) => {
        const next = new Set(prev)
        if (wasCompleted) {
          next.add(itemId)
        } else {
          next.delete(itemId)
        }
        return next
      })
    })
  }

  // После клика "Купить" запускаем прямой опрос API каждые 2 сек.
  // Когда hasAccess становится true — чистим флаг и перезагружаем страницу.
  useEffect(() => {
    if (!isPollingPayment || !id) return
    const stopPolling = () => {
      sessionStorage.removeItem(pollKey)
      setIsPollingPayment(false)
    }
    const interval = setInterval(async () => {
      try {
        const res = await workoutsApi.getCollection(id)
        if (res.data?.hasAccess) {
          sessionStorage.removeItem(pollKey)
          window.location.reload()
        }
      } catch {}
    }, 2000)
    // Автостоп через 10 минут
    const stopTimeout = setTimeout(stopPolling, 10 * 60 * 1000)
    return () => {
      clearInterval(interval)
      clearTimeout(stopTimeout)
    }
  }, [isPollingPayment, id, pollKey])

  // Отправляем просмотр при загрузке страницы
  useEffect(() => {
    if (id) {
      analyticsApi.trackView({
        itemType: 'WORKOUT_COLLECTION',
        itemId: id,
      }).catch(() => {
        // Игнорируем ошибки трекинга
      })
    }
  }, [id])

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

  const handlePurchase = async () => {
    try {
      haptic.impact('medium')
      setIsPaymentLoading(true)
      const response = await paymeApi.createPayment({
        collectionId: id!,
        collectionType: 'WORKOUT',
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
      alert('Не удалось создать платёж. Попробуйте ещё раз, а если не поможет — закройте приложение полностью и откройте заново.')
    } finally {
      setIsPaymentLoading(false)
    }
  }

  return (
    <div className="pb-4">
      <div className="sticky top-[var(--app-safe-top)] bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">{collection.title}</h1>
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
            После покупки пользователь сразу видит разделы тренировок. */}
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

        {!collection.hasAccess && (
          <Card>
            <PriceDisplay
              price={collection.price}
              discount={collection.discount}
              discountType={collection.discountType}
              finalPrice={collection.finalPrice}
              discountEndDate={collection.discountEndDate}
            />
            <Button
              fullWidth
              className="mt-4"
              onClick={() => setShowPayMethods(true)}
              disabled={isPaymentLoading}
            >
              {isPaymentLoading ? 'Создание платежа...' : 'Купить сборник'}
            </Button>
          </Card>
        )}

        {/* Выбор способа оплаты (Payme / Карта МИР) */}
        <PaymentMethodSheet
          open={showPayMethods}
          onClose={() => setShowPayMethods(false)}
          finalPriceSum={collection.finalPrice}
          collectionTitle={collection.title}
          isPaymeLoading={isPaymentLoading}
          onPayme={() => {
            setShowPayMethods(false)
            handlePurchase()
          }}
        />

        {/* Что входит - только если нет доступа */}
        {!collection.hasAccess && collection.sections && collection.sections.length > 0 && (
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

        {/* Разделы - показываем если есть доступ */}
        {collection.hasAccess && collection.sections && collection.sections.length > 0 && (
          <div className="space-y-3">
            {collection.sections.map((section: any) => {
              // Прогресс по видеоразделу: сколько тренировок отмечено выполненными
              const isVideoSection = section.type === 'VIDEO'
              const totalItems = section.items?.length || 0
              const doneItems = isVideoSection
                ? (section.items || []).filter((i: any) => completedIds.has(i.id)).length
                : 0
              const allDone = isVideoSection && totalItems > 0 && doneItems === totalItems

              return (
              <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Заголовок раздела - кликабельный */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full bg-white p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left min-w-0">
                    <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
                    {isVideoSection && totalItems > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(doneItems / totalItems) * 100}%` }}
                          />
                        </div>
                        <span
                          className={clsx(
                            'text-xs',
                            allDone ? 'text-primary font-semibold' : 'text-text-secondary',
                          )}
                        >
                          {doneItems} из {totalItems}
                        </span>
                        {allDone && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                      expandedSections.has(section.id) ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {/* Контент раздела - показываем только если развёрнут */}
                {expandedSections.has(section.id) && (
                  <div className="p-4 bg-gray-50">
                    {section.type === 'VIDEO' ? (
                  // Видео тренировки
                  <div className="space-y-3">
                    {section.items.map((item: any) => (
                      <Card key={item.id}>
                        {/* Обложка = плеер: видео загружается по тапу */}
                        {item.rutubeUrl ? (
                          <div className="mb-3">
                            <RutubeVideo
                              rutubeUrl={item.rutubeUrl}
                              poster={item.coverImage}
                              title={item.title}
                            />
                          </div>
                        ) : item.coverImage ? (
                          <img
                            src={item.coverImage}
                            alt={item.title}
                            className="w-full h-40 object-cover object-top rounded-lg mb-3"
                          />
                        ) : null}
                        <h3 className="text-lg font-bold text-text-primary mb-2">{item.title}</h3>
                        {item.description && (
                          <p className="text-text-secondary mb-3 text-sm">{item.description}</p>
                        )}

                        <div className="flex gap-4">
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

                        {/* Отметка «выполнено» */}
                        <button
                          onClick={() => toggleCompleted(item.id)}
                          className={clsx(
                            'mt-3 w-full py-2.5 rounded-xl text-sm font-medium border flex items-center justify-center gap-2 transition-colors',
                            completedIds.has(item.id)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-text-secondary border-gray-200',
                          )}
                        >
                          <Check className="w-4 h-4" />
                          {completedIds.has(item.id) ? 'Выполнено' : 'Отметить выполненной'}
                        </button>
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
                )}
              </div>
              )
            })}
          </div>
        )}

        {/* Старые тренировки (для обратной совместимости) - показываем только если нет разделов */}
        {collection.workouts && collection.workouts.length > 0 && (!collection.sections || collection.sections.length === 0) && (
          <div className="space-y-3">
            {collection.workouts.map((workout: any) => (
            <Card key={workout.id}>
              {/* Обложка = плеер: видео загружается по тапу */}
              {!workout.locked && workout.rutubeUrl ? (
                <div className="mb-3">
                  <RutubeVideo
                    rutubeUrl={workout.rutubeUrl}
                    poster={workout.coverImage}
                    title={workout.title}
                  />
                </div>
              ) : workout.coverImage ? (
                <img
                  src={workout.coverImage}
                  alt={workout.title}
                  className="w-full h-40 object-cover object-top rounded-lg mb-3"
                />
              ) : null}
              <h3 className="text-lg font-bold text-text-primary mb-2">{workout.title}</h3>
              {workout.description && (
                <p className="text-text-secondary mb-3 text-sm">{workout.description}</p>
              )}

              <div className="flex gap-4">
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
                <div className="mt-3 bg-gray-100 rounded-lg p-4 flex items-center justify-center gap-2 text-text-secondary">
                  <Lock className="w-5 h-5" />
                  <span>Купите сборник для доступа</span>
                </div>
              ) : (
                <button
                  onClick={() => toggleCompleted(workout.id)}
                  className={clsx(
                    'mt-3 w-full py-2.5 rounded-xl text-sm font-medium border flex items-center justify-center gap-2 transition-colors',
                    completedIds.has(workout.id)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-secondary border-gray-200',
                  )}
                >
                  <Check className="w-4 h-4" />
                  {completedIds.has(workout.id) ? 'Выполнено' : 'Отметить выполненной'}
                </button>
              )}
            </Card>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}
