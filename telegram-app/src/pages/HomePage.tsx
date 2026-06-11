import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { newsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Sparkles, Calendar, ChevronRight } from 'lucide-react'

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
          <div className="bg-gradient-to-r from-primary-light to-primary rounded-2xl h-32" />
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
      <div className="mb-6">
        <img 
          src="https://helena-fit.ru/uploads/logo.png" 
          alt="Helena Fit" 
          className="w-full h-auto object-cover"
        />
      </div>

      <div className="px-4 space-y-4">
        {/* Section Title */}
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary-light rounded-full" />
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
            {news.map((item: any) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {item.bannerImage && (
                  <div className="relative -m-4 mb-4">
                    <img
                      src={item.bannerImage}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                )}
                <h3 className="text-lg font-bold text-text-primary mb-2 line-clamp-2">
                  {item.title}
                </h3>
                {item.excerpt && (
                  <p className="text-text-secondary mb-4 line-clamp-2 leading-relaxed">
                    {item.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(item.publishedAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {(item.workoutLinks?.[0] || item.recipeLinks?.[0] || (item.content && item.content.trim())) && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (item.workoutLinks?.[0]) {
                          navigate(`/workouts/${item.workoutLinks[0].collectionId}`)
                        } else if (item.recipeLinks?.[0]) {
                          navigate(`/recipes/${item.recipeLinks[0].collectionId}`)
                        } else if (item.content && item.content.trim()) {
                          navigate(`/news/${item.id}`)
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      Подробнее
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
