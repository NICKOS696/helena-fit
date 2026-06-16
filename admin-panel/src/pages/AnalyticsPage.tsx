import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'
import { BarChart3, Eye, Users, TrendingUp, ChevronDown } from 'lucide-react'

const typeLabel: Record<string, string> = {
  WORKOUT_COLLECTION: '🏋️ Сборник тренировок',
  RECIPE_COLLECTION: '🍽️ Сборник рецептов',
  RECIPE: '🍽️ Рецепт',
  WORKOUT: '🏋️ Тренировка',
  NEWS: '📰 Новость',
}

const formatDate = (d?: string) => {
  if (!d) return ''
  return new Date(d).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Строка активного пользователя с кнопкой «Подробно».
// Список открытого контента грузится лениво — только при раскрытии.
const ActiveUserRow = ({ item, index }: { item: any; index: number }) => {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['user-views', item.userId],
    queryFn: () => analyticsApi.getUserViews(item.userId),
    enabled: open, // запрос уходит только после нажатия «Подробно»
  })
  const views = data?.data || []

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-4 hover:bg-gray-50">
        <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
        {item.user?.photoUrl ? (
          <img
            src={item.user.photoUrl}
            alt={item.user.firstName}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-light to-primary flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold">
            {item.user?.firstName || 'Пользователь'} {item.user?.lastName || ''}
          </h3>
          {item.user?.username && (
            <p className="text-sm text-gray-600">@{item.user.username}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{item.views}</p>
          <p className="text-sm text-gray-600">просмотров</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-2 flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
        >
          Подробно
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">Загрузка…</p>
          ) : views.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Нет открытого контента</p>
          ) : (
            <div className="space-y-2">
              {views.map((v: any) => (
                <div
                  key={`${v.itemType}-${v.itemId}`}
                  className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100"
                >
                  {v.coverImage ? (
                    <img
                      src={v.coverImage}
                      alt={v.title}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{v.title}</p>
                    <p className="text-xs text-gray-500">
                      {typeLabel[v.itemType] || v.itemType}
                      {' · '}
                      открыто {formatDate(v.lastViewedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{v.views}</p>
                    <p className="text-xs text-gray-500">раз</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const AnalyticsPage = () => {
  const { data: overallData } = useQuery({
    queryKey: ['analytics-overall'],
    queryFn: () => analyticsApi.getOverallStats(),
  })

  const { data: collectionsData } = useQuery({
    queryKey: ['analytics-collections'],
    queryFn: () => analyticsApi.getCollectionStats(),
  })

  const { data: recipesData } = useQuery({
    queryKey: ['analytics-recipes'],
    queryFn: () => analyticsApi.getRecipeStats(),
  })

  const { data: activityData } = useQuery({
    queryKey: ['analytics-activity'],
    queryFn: () => analyticsApi.getUserActivity(),
  })

  const overall = overallData?.data
  const collections = collectionsData?.data || []
  const recipes = recipesData?.data || []
  const activity = activityData?.data || []

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">📊 Статистика</h1>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Всего просмотров</p>
              <p className="text-2xl font-bold">{overall?.totalViews || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Уникальных пользователей</p>
              <p className="text-2xl font-bold">{overall?.uniqueUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Средний просмотр</p>
              <p className="text-2xl font-bold">
                {overall?.uniqueUsers
                  ? Math.round((overall.totalViews / overall.uniqueUsers) * 10) / 10
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Популярный контент (коллекции) */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Популярный контент
          </h2>
        </div>
        <div className="p-6">
          {collections.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Пока нет данных</p>
          ) : (
            <div className="space-y-4">
              {collections.map((item: any, index: number) => (
                <div
                  key={item.itemId}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="text-2xl font-bold text-gray-400 w-8">
                    #{index + 1}
                  </div>
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-sm text-gray-600">
                      {item.itemType === 'WORKOUT_COLLECTION' && '🏋️ Тренировка'}
                      {item.itemType === 'RECIPE_COLLECTION' && '🍽️ Рецепт'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{item.views}</p>
                    <p className="text-sm text-gray-600">просмотров</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Популярные рецепты */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Популярные рецепты
          </h2>
        </div>
        <div className="p-6">
          {recipes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Пока нет данных</p>
          ) : (
            <div className="space-y-4">
              {recipes.map((item: any, index: number) => (
                <div
                  key={item.itemId}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="text-2xl font-bold text-gray-400 w-8">
                    #{index + 1}
                  </div>
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-sm text-gray-600">🍽️ Рецепт</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{item.views}</p>
                    <p className="text-sm text-gray-600">просмотров</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Активность пользователей */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Активные пользователи
          </h2>
        </div>
        <div className="p-6">
          {activity.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Пока нет данных</p>
          ) : (
            <div className="space-y-4">
              {activity.map((item: any, index: number) => (
                <ActiveUserRow key={item.userId} item={item} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
