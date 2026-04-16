import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminNewsApi, adminWorkoutsApi, adminRecipesApi } from '@/lib/api'
import { Plus, Edit, Trash2, X } from 'lucide-react'

export const NewsPage = () => {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingNews, setEditingNews] = useState<any>(null)
  const [newsForm, setNewsForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    bannerImage: '',
    status: 'DRAFT',
    publishedAt: '',
    linkType: 'none', // none, workout, recipe
    workoutCollectionId: '',
    recipeCollectionId: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-news'],
    queryFn: () => adminNewsApi.getNews(),
  })

  const { data: workoutCollections } = useQuery({
    queryKey: ['admin-workout-collections'],
    queryFn: () => adminWorkoutsApi.getCollections(),
  })

  const { data: recipeCollections } = useQuery({
    queryKey: ['admin-recipe-collections'],
    queryFn: () => adminRecipesApi.getCollections(),
  })

  const createNewsMutation = useMutation({
    mutationFn: (data: any) => adminNewsApi.createNews(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      setShowModal(false)
      resetForm()
    },
  })

  const updateNewsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminNewsApi.updateNews(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      setShowModal(false)
      resetForm()
    },
  })

  const deleteNewsMutation = useMutation({
    mutationFn: (id: string) => adminNewsApi.deleteNews(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] })
    },
  })

  const resetForm = () => {
    setNewsForm({
      title: '',
      excerpt: '',
      content: '',
      bannerImage: '',
      status: 'DRAFT',
      publishedAt: '',
      linkType: 'none',
      workoutCollectionId: '',
      recipeCollectionId: '',
    })
    setEditingNews(null)
  }

  const handleOpenModal = (newsItem?: any) => {
    if (newsItem) {
      setEditingNews(newsItem)
      setNewsForm({
        title: newsItem.title,
        excerpt: newsItem.excerpt || '',
        content: newsItem.content || '',
        bannerImage: newsItem.bannerImage || '',
        status: newsItem.status,
        publishedAt: newsItem.publishedAt
          ? new Date(newsItem.publishedAt).toISOString().slice(0, 16)
          : '',
        linkType: newsItem.workoutLinks?.[0]
          ? 'workout'
          : newsItem.recipeLinks?.[0]
          ? 'recipe'
          : 'none',
        workoutCollectionId: newsItem.workoutLinks?.[0]?.collectionId || '',
        recipeCollectionId: newsItem.recipeLinks?.[0]?.collectionId || '',
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = {
      title: newsForm.title,
      excerpt: newsForm.excerpt || null,
      content: newsForm.content || null,
      bannerImage: newsForm.bannerImage || null,
      status: newsForm.status,
      publishedAt: newsForm.publishedAt ? new Date(newsForm.publishedAt) : null,
    }

    // Добавляем ссылки на сборники
    if (newsForm.linkType === 'workout' && newsForm.workoutCollectionId) {
      data.workoutCollectionIds = [newsForm.workoutCollectionId]
    } else if (newsForm.linkType === 'recipe' && newsForm.recipeCollectionId) {
      data.recipeCollectionIds = [newsForm.recipeCollectionId]
    }

    if (editingNews) {
      updateNewsMutation.mutate({ id: editingNews.id, data })
    } else {
      createNewsMutation.mutate(data)
    }
  }

  const news = data?.data || []

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Новости и акции</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
        >
          <Plus className="w-5 h-5" />
          Добавить новость
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Заголовок
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Дата публикации
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {news.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.bannerImage && (
                        <img
                          src={item.bannerImage}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {item.excerpt}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        item.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleDateString('ru-RU')
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="text-primary hover:text-primary-dark"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Удалить эту новость?')) {
                            deleteNewsMutation.mutate(item.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingNews ? 'Редактировать новость' : 'Новая новость'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заголовок *
                </label>
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Краткое описание
                </label>
                <textarea
                  value={newsForm.excerpt}
                  onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Краткое описание для превью"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Полное содержание
                </label>
                <textarea
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={6}
                  placeholder="Полный текст новости"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ссылка на баннер
                </label>
                <input
                  type="url"
                  value={newsForm.bannerImage}
                  onChange={(e) => setNewsForm({ ...newsForm, bannerImage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://i.imgur.com/example.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Статус *
                  </label>
                  <select
                    value={newsForm.status}
                    onChange={(e) => setNewsForm({ ...newsForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="DRAFT">Черновик</option>
                    <option value="PUBLISHED">Опубликовано</option>
                    <option value="ARCHIVED">В архиве</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата публикации
                  </label>
                  <input
                    type="datetime-local"
                    value={newsForm.publishedAt}
                    onChange={(e) => setNewsForm({ ...newsForm, publishedAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ссылка на сборник (опционально)
                </label>
                
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="none"
                        checked={newsForm.linkType === 'none'}
                        onChange={(e) => setNewsForm({ ...newsForm, linkType: e.target.value })}
                      />
                      <span>Без ссылки</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        value="workout"
                        checked={newsForm.linkType === 'workout'}
                        onChange={(e) => setNewsForm({ ...newsForm, linkType: e.target.value })}
                      />
                      <span>Ссылка на сборник тренировок</span>
                    </label>
                    {newsForm.linkType === 'workout' && (
                      <select
                        value={newsForm.workoutCollectionId}
                        onChange={(e) =>
                          setNewsForm({ ...newsForm, workoutCollectionId: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg ml-6"
                      >
                        <option value="">Выберите сборник</option>
                        {workoutCollections?.data?.map((collection: any) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        value="recipe"
                        checked={newsForm.linkType === 'recipe'}
                        onChange={(e) => setNewsForm({ ...newsForm, linkType: e.target.value })}
                      />
                      <span>Ссылка на сборник рецептов</span>
                    </label>
                    {newsForm.linkType === 'recipe' && (
                      <select
                        value={newsForm.recipeCollectionId}
                        onChange={(e) =>
                          setNewsForm({ ...newsForm, recipeCollectionId: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg ml-6"
                      >
                        <option value="">Выберите сборник</option>
                        {recipeCollections?.data?.map((collection: any) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={createNewsMutation.isPending || updateNewsMutation.isPending}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {createNewsMutation.isPending || updateNewsMutation.isPending
                    ? 'Сохранение...'
                    : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
