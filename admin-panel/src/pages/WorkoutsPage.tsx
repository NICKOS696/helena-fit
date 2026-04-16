import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminWorkoutsApi } from '@/lib/api'
import { Plus, Edit, Trash2, X } from 'lucide-react'

export const WorkoutsPage = () => {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImage: '',
    price: '',
    discount: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  })

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-workouts'],
    queryFn: () => adminWorkoutsApi.getCollections(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => adminWorkoutsApi.createCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workouts'] })
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminWorkoutsApi.updateCollection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workouts'] })
      setShowModal(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminWorkoutsApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workouts'] })
    },
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      coverImage: '',
      price: '',
      discount: '',
      discountType: 'PERCENTAGE',
    })
    setEditingCollection(null)
  }

  const handleOpenModal = (collection?: any) => {
    if (collection) {
      setEditingCollection(collection)
      setFormData({
        title: collection.title,
        description: collection.description || '',
        coverImage: collection.coverImage || '',
        price: collection.price.toString(),
        discount: collection.discount?.toString() || '',
        discountType: collection.discountType || 'PERCENTAGE',
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      title: formData.title,
      description: formData.description,
      coverImage: formData.coverImage || null,
      price: parseInt(formData.price),
      discount: formData.discount ? parseInt(formData.discount) : 0,
      discountType: formData.discountType,
    }

    if (editingCollection) {
      updateMutation.mutate({ id: editingCollection.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const collections = data?.data || []

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Тренировки</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
        >
          <Plus className="w-5 h-5" />
          Добавить сборник
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection: any) => (
            <div key={collection.id} className="bg-white rounded-lg shadow p-6">
              {collection.coverImage && (
                <img
                  src={collection.coverImage}
                  alt={collection.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="text-lg font-bold mb-2">{collection.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{collection.description}</p>
              <p className="text-sm text-gray-500 mb-4">
                Тренировок: {collection._count.workouts}
              </p>
              <p className="text-lg font-bold text-primary mb-4">
                {collection.price.toLocaleString()} сум
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/workouts/${collection.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
                >
                  <Edit className="w-4 h-4" />
                  Управление
                </button>
                <button
                  onClick={() => {
                    if (confirm('Удалить сборник?')) {
                      deleteMutation.mutate(collection.id)
                    }
                  }}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingCollection ? 'Редактировать сборник' : 'Новый сборник тренировок'}
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
                  Название *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ссылка на обложку
                </label>
                <input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://i.imgur.com/example.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Вставьте ссылку на изображение с IMG.ru, Imgur или другого хостинга
                </p>
                {formData.coverImage && (
                  <div className="mt-2">
                    <img
                      src={formData.coverImage}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цена (сум) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Скидка
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип скидки
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="PERCENTAGE">Процент (%)</option>
                  <option value="FIXED">Фиксированная сумма</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Сохранение...'
                    : editingCollection
                    ? 'Сохранить'
                    : 'Создать'}
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
