import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminWorkoutsApi } from '@/lib/api'
import { ArrowLeft, Plus, Edit, Trash2, X } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'
import { RichTextEditor } from '@/components/RichTextEditor'

export const WorkoutCollectionEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [showSectionItemModal, setShowSectionItemModal] = useState(false)
  const [editingSection, setEditingSection] = useState<any>(null)
  const [editingSectionItem, setEditingSectionItem] = useState<any>(null)
  const [currentSection, setCurrentSection] = useState<any>(null)
  
  const [collectionForm, setCollectionForm] = useState({
    title: '',
    description: '',
    coverImage: '',
    coverImageFit: 'cover',
    price: '',
    discount: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  })
  
  const [sectionForm, setSectionForm] = useState({
    title: '',
    description: '',
    type: 'VIDEO' as 'VIDEO' | 'TEXT_FOLDER',
    order: 0,
  })
  
  const [sectionItemForm, setSectionItemForm] = useState({
    title: '',
    description: '',
    coverImage: '',
    calories: '',
    duration: '',
    rutubeUrl: '',
    content: '',
    order: '0',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-workout-collection', id],
    queryFn: () => adminWorkoutsApi.getCollection(id!),
  })

  const updateCollectionMutation = useMutation({
    mutationFn: (data: any) => adminWorkoutsApi.updateCollection(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workout-collection', id] })
      setShowCollectionModal(false)
    },
  })

  // Section mutations
  const createSectionMutation = useMutation({
    mutationFn: (data: any) => adminWorkoutsApi.createSection(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workout-collection', id] })
      setShowSectionModal(false)
      resetSectionForm()
    },
  })

  const updateSectionMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) =>
      adminWorkoutsApi.updateSection(id!, sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workout-collection', id] })
      setShowSectionModal(false)
      resetSectionForm()
    },
  })

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => adminWorkoutsApi.deleteSection(id!, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workout-collection', id] })
    },
  })

  // Section item mutations
  const createSectionItemMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) =>
      adminWorkoutsApi.createSectionItem(id!, sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workout-collection', id] })
      setShowSectionItemModal(false)
      resetSectionItemForm()
    },
  })

  const updateSectionItemMutation = useMutation({
    mutationFn: ({ sectionId, itemId, data }: { sectionId: string; itemId: string; data: any }) =>
      adminWorkoutsApi.updateSectionItem(id!, sectionId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workout-collection', id] })
      setShowSectionItemModal(false)
      resetSectionItemForm()
    },
  })

  const deleteSectionItemMutation = useMutation({
    mutationFn: ({ sectionId, itemId }: { sectionId: string; itemId: string }) =>
      adminWorkoutsApi.deleteSectionItem(id!, sectionId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workout-collection', id] })
    },
  })

  const handleOpenCollectionModal = () => {
    if (collection) {
      setCollectionForm({
        title: collection.title,
        description: collection.description || '',
        coverImage: collection.coverImage || '',
        coverImageFit: collection.coverImageFit || 'cover',
        price: collection.price.toString(),
        discount: collection.discount?.toString() || '',
        discountType: collection.discountType || 'PERCENTAGE',
      })
    }
    setShowCollectionModal(true)
  }

  const handleSubmitCollection = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      title: collectionForm.title,
      description: collectionForm.description,
      coverImage: collectionForm.coverImage || null,
      coverImageFit: collectionForm.coverImageFit,
      price: parseInt(collectionForm.price),
      discount: collectionForm.discount ? parseInt(collectionForm.discount) : 0,
      discountType: collectionForm.discountType,
    }
    updateCollectionMutation.mutate(data)
  }

  const resetSectionForm = () => {
    setSectionForm({
      title: '',
      description: '',
      type: 'VIDEO',
      order: 0,
    })
    setEditingSection(null)
  }

  const resetSectionItemForm = () => {
    setSectionItemForm({
      title: '',
      description: '',
      coverImage: '',
      calories: '',
      duration: '',
      rutubeUrl: '',
      content: '',
      order: '0',
    })
    setEditingSectionItem(null)
  }

  const handleOpenSectionModal = (section?: any) => {
    if (section) {
      setEditingSection(section)
      setSectionForm({
        title: section.title,
        description: section.description || '',
        type: section.type,
        order: section.order,
      })
    } else {
      resetSectionForm()
    }
    setShowSectionModal(true)
  }

  const handleSubmitSection = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      title: sectionForm.title,
      description: sectionForm.description || null,
      type: sectionForm.type,
      order: sectionForm.order,
    }

    if (editingSection) {
      updateSectionMutation.mutate({ sectionId: editingSection.id, data })
    } else {
      createSectionMutation.mutate(data)
    }
  }

  const handleOpenSectionItemModal = (section: any, item?: any) => {
    setCurrentSection(section)
    if (item) {
      setEditingSectionItem(item)
      setSectionItemForm({
        title: item.title,
        description: item.description || '',
        coverImage: item.coverImage || '',
        calories: item.calories?.toString() || '',
        duration: item.duration?.toString() || '',
        rutubeUrl: item.rutubeUrl || '',
        content: item.content || '',
        order: item.order?.toString() || '0',
      })
    } else {
      resetSectionItemForm()
    }
    setShowSectionItemModal(true)
  }

  const handleSubmitSectionItem = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      title: sectionItemForm.title,
      description: sectionItemForm.description || null,
      coverImage: sectionItemForm.coverImage || null,
      calories: sectionItemForm.calories ? parseInt(sectionItemForm.calories) : null,
      duration: sectionItemForm.duration ? parseInt(sectionItemForm.duration) : null,
      rutubeUrl: sectionItemForm.rutubeUrl || null,
      content: sectionItemForm.content || null,
      order: sectionItemForm.order ? parseInt(sectionItemForm.order) : 0,
    }

    if (editingSectionItem) {
      updateSectionItemMutation.mutate({
        sectionId: currentSection.id,
        itemId: editingSectionItem.id,
        data,
      })
    } else {
      createSectionItemMutation.mutate({
        sectionId: currentSection.id,
        data,
      })
    }
  }

  if (isLoading) {
    return <div className="p-8">Загрузка...</div>
  }

  const collection = data?.data

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/workouts')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Назад к сборникам
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{collection.title}</h1>
            <p className="text-gray-600 mb-4">{collection.description}</p>
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Цена: {collection.price.toLocaleString()} сум</span>
              {collection.discount > 0 && (
                <span>Скидка: {collection.discount}{collection.discountType === 'PERCENTAGE' ? '%' : ' сум'}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleOpenCollectionModal}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
          >
            <Edit className="w-4 h-4" />
            Редактировать сборник
          </button>
        </div>
      </div>

      {/* Разделы */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Разделы ({collection.sections?.length || 0})
          </h2>
          <button
            onClick={() => handleOpenSectionModal()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Plus className="w-5 h-5" />
            Добавить раздел
          </button>
        </div>

        {collection.sections?.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Разделов пока нет. Добавьте первый раздел!
          </p>
        ) : (
          <div className="space-y-4">
            {collection.sections?.map((section: any) => (
              <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500">
                      Тип: {section.type === 'VIDEO' ? 'Видео тренировки' : 'Текстовые материалы'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenSectionModal(section)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSectionMutation.mutate(section.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-600">
                    Элементов: {section.items?.length || 0}
                  </p>
                  <button
                    onClick={() => handleOpenSectionItemModal(section)}
                    className="text-sm text-primary hover:underline"
                  >
                    + Добавить элемент
                  </button>
                </div>

                {section.items?.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {section.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                        <span className="text-sm">{item.title}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenSectionItemModal(section, item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteSectionItemMutation.mutate({ sectionId: section.id, itemId: item.id })}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Редактировать сборник</h2>
              <button
                onClick={() => setShowCollectionModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  value={collectionForm.title}
                  onChange={(e) => setCollectionForm({ ...collectionForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              </div>

              <ImageUpload
                label="Обложка сборника"
                value={collectionForm.coverImage}
                onChange={(url) => setCollectionForm({ ...collectionForm, coverImage: url })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Как показывать обложку у пользователя
                </label>
                <select
                  value={collectionForm.coverImageFit}
                  onChange={(e) => setCollectionForm({ ...collectionForm, coverImageFit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="cover">Заполнять область (может обрезаться по краям)</option>
                  <option value="contain">Показывать целиком (без обрезки)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цена (сум) *
                  </label>
                  <input
                    type="number"
                    value={collectionForm.price}
                    onChange={(e) => setCollectionForm({ ...collectionForm, price: e.target.value })}
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
                    value={collectionForm.discount}
                    onChange={(e) => setCollectionForm({ ...collectionForm, discount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип скидки
                </label>
                <select
                  value={collectionForm.discountType}
                  onChange={(e) =>
                    setCollectionForm({ ...collectionForm, discountType: e.target.value as any })
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
                  disabled={updateCollectionMutation.isPending}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {updateCollectionMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingSection ? 'Редактировать раздел' : 'Новый раздел'}
              </h2>
              <button
                onClick={() => {
                  setShowSectionModal(false)
                  resetSectionForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название раздела *
                </label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={sectionForm.description}
                  onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип раздела *
                </label>
                <select
                  value={sectionForm.type}
                  onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value as 'VIDEO' | 'TEXT_FOLDER' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="VIDEO">Видео тренировки</option>
                  <option value="TEXT_FOLDER">Текстовые материалы (питание, рекомендации)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={createSectionMutation.isPending || updateSectionMutation.isPending}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {createSectionMutation.isPending || updateSectionMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSectionModal(false)
                    resetSectionForm()
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

      {/* Section Item Modal */}
      {showSectionItemModal && currentSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingSectionItem ? 'Редактировать элемент' : 'Новый элемент'} - {currentSection.title}
              </h2>
              <button
                onClick={() => {
                  setShowSectionItemModal(false)
                  resetSectionItemForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitSectionItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  value={sectionItemForm.title}
                  onChange={(e) => setSectionItemForm({ ...sectionItemForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <input
                  type="text"
                  value={sectionItemForm.description}
                  onChange={(e) => setSectionItemForm({ ...sectionItemForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {currentSection.type === 'VIDEO' ? (
                <>
                  <ImageUpload
                    label="Обложка тренировки"
                    value={sectionItemForm.coverImage}
                    onChange={(url) => setSectionItemForm({ ...sectionItemForm, coverImage: url })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Калории
                      </label>
                      <input
                        type="number"
                        value={sectionItemForm.calories}
                        onChange={(e) => setSectionItemForm({ ...sectionItemForm, calories: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Длительность (мин)
                      </label>
                      <input
                        type="number"
                        value={sectionItemForm.duration}
                        onChange={(e) => setSectionItemForm({ ...sectionItemForm, duration: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ссылка на Rutube видео
                    </label>
                    <input
                      type="url"
                      value={sectionItemForm.rutubeUrl}
                      onChange={(e) => setSectionItemForm({ ...sectionItemForm, rutubeUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://rutube.ru/video/..."
                    />
                  </div>
                </>
              ) : (
                <RichTextEditor
                  label="Содержимое (текст)"
                  value={sectionItemForm.content}
                  onChange={(value) => setSectionItemForm({ ...sectionItemForm, content: value })}
                  placeholder="Введите текст рекомендаций, плана питания и т.д."
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Порядок отображения
                </label>
                <input
                  type="number"
                  value={sectionItemForm.order || 0}
                  onChange={(e) => setSectionItemForm({ ...sectionItemForm, order: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Чем меньше число, тем выше в списке</p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={createSectionItemMutation.isPending || updateSectionItemMutation.isPending}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {createSectionItemMutation.isPending || updateSectionItemMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSectionItemModal(false)
                    resetSectionItemForm()
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
