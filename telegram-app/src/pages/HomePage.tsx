import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { newsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Sparkles, ChevronRight } from 'lucide-react'
import { optUrl, thumbFallback } from '@/utils/thumb'

// Куда ведёт новость: связанный сборник, иначе — страница новости (если есть текст)
const newsTarget = (item: any): string | null => {
  if (item.workoutLinks?.[0]) return `/workouts/${item.workoutLinks[0].collectionId}`
  if (item.recipeLinks?.[0]) return `/recipes/${item.recipeLinks[0].collectionId}`
  if (item.content && item.content.trim()) return `/news/${item.id}`
  return null
}

export const HomePage = () => {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: () => newsApi.getNews(1, 20),
  })

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 rounded-2xl h-32" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-48" />
          ))}
        </div>
      </div>
    )
  }

  const news = data?.data?.items || []

  return (
    <div className="pb-4">
      {/* Hero Section - Логотип */}
      <div className="mb-5">
        <img
          src="/uploads/opt/logo.jpg"
          onError={thumbFallback('/uploads/logo.png')}
          alt="Helena Fit"
          className="w-full h-auto object-cover"
        />
      </div>

      <div className="px-4 space-y-4">
        {/* Section Title */}
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-xl font-bold text-text-primary">Новости и акции</h2>
        </div>

        {/* News Cards */}
        {news.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-text-secondary">Новостей пока нет</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {news.map((item: any) => {
              const target = newsTarget(item)
              return (
                // Карточка нажимается целиком
                <Card
                  key={item.id}
                  className="!p-0 overflow-hidden"
                  onClick={target ? () => navigate(target) : undefined}
                >
                  {item.bannerImage && (
                    <img
                      src={optUrl(item.bannerImage)}
                      onError={thumbFallback(item.bannerImage)}
                      alt={item.title}
                      className="w-full h-48 object-cover bg-gray-100"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-[17px] font-bold leading-snug text-text-primary line-clamp-2">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="text-sm text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-text-secondary">
                        {new Date(item.publishedAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      {target && (
                        <span className="flex items-center gap-0.5 text-sm font-semibold text-primary">
                          Подробнее
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
