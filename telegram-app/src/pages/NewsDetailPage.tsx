import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { newsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { ErrorState } from '@/components/ErrorState'
import { ArrowLeft, Calendar, Dumbbell, UtensilsCrossed } from 'lucide-react'

export const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['news', id],
    queryFn: () => newsApi.getNewsById(id!),
  })

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="bg-white rounded-card h-48" />
          <div className="bg-white rounded-card h-32" />
        </div>
      </div>
    )
  }

  const item = data?.data

  if (isError || !item) {
    return (
      <ErrorState
        message="Не удалось загрузить новость."
        onBack={() => navigate(-1)}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="pb-4">
      {/* Header в едином стиле с остальными детальными экранами */}
      <div className="sticky top-[var(--app-safe-top)] bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">Новость</h1>
      </div>

      {/* Баннер */}
      {item.bannerImage && (
        <img
          src={item.bannerImage}
          alt={item.title}
          className="w-full h-56 object-cover"
        />
      )}

      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">{item.title}</h2>
          {item.publishedAt && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Calendar className="w-4 h-4" />
              <span>{new Date(item.publishedAt).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>

        {/* Текст новости (rich-text из админки) */}
        {item.content && item.content.trim() && (
          <Card>
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          </Card>
        )}

        {/* Кнопки на связанные сборники, если есть */}
        {(item.workoutLinks?.length > 0 || item.recipeLinks?.length > 0) && (
          <div className="space-y-2">
            {item.workoutLinks?.map((link: any) => (
              <Button
                key={link.id}
                fullWidth
                onClick={() => navigate(`/workouts/${link.collectionId}`)}
                className="flex items-center justify-center gap-2"
              >
                <Dumbbell className="w-4 h-4" />
                Открыть сборник тренировок
              </Button>
            ))}
            {item.recipeLinks?.map((link: any) => (
              <Button
                key={link.id}
                fullWidth
                onClick={() => navigate(`/recipes/${link.collectionId}`)}
                className="flex items-center justify-center gap-2"
              >
                <UtensilsCrossed className="w-4 h-4" />
                Открыть сборник рецептов
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
