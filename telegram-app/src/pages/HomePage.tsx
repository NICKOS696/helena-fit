import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { newsApi } from '@/lib/api'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

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
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-card h-48" />
          ))}
        </div>
      </div>
    )
  }

  const news = data?.data?.items || []

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-primary-light to-primary rounded-card p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Helena Fit</h1>
        <p className="text-white/90">Ваш путь к здоровью и красоте</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Новости и акции</h2>
        {news.length === 0 ? (
          <Card>
            <p className="text-text-secondary text-center py-8">Новостей пока нет</p>
          </Card>
        ) : (
          news.map((item: any) => (
            <Card key={item.id}>
              {item.bannerImage && (
                <img
                  src={item.bannerImage}
                  alt={item.title}
                  className="w-full rounded-lg mb-3"
                />
              )}
              <h3 className="text-lg font-bold text-text-primary mb-2">{item.title}</h3>
              {item.excerpt && (
                <p className="text-text-secondary mb-3 line-clamp-2">{item.excerpt}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {new Date(item.publishedAt).toLocaleDateString('ru-RU')}
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    if (item.workoutLinks?.[0]) {
                      navigate(`/workouts/${item.workoutLinks[0].collectionId}`)
                    } else if (item.recipeLinks?.[0]) {
                      navigate(`/recipes/${item.recipeLinks[0].collectionId}`)
                    }
                  }}
                >
                  Подробнее
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
