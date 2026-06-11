import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminRecipesApi } from '@/lib/api'
import { ArrowLeft, Plus, Edit, Trash2, X } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'
import { ImageFocusPicker } from '@/components/ImageFocusPicker'

const categories = [
  { value: 'BREAKFAST', label: 'Завтраки' },
  { value: 'MAIN_COURSE', label: 'Вторые блюда' },
  { value: 'SNACK', label: 'Перекусы' },
  { value: 'SALAD', label: 'Салаты' },
]

export const RecipeCollectionEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<any>(null)
  // Ингредиенты с разделами: [{ title, items: [{name, amount}] }]
  type IngItem = { name: string; amount: string }
  type IngGroup = { title: string; items: IngItem[] }
  const [ingredientGroups, setIngredientGroups] = useState<IngGroup[]>([
    { title: '', items: [{ name: '', amount: '' }] },
  ])

  const updateGroupTitle = (gi: number, title: string) =>
    setIngredientGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, title } : g)))
  const updateItem = (gi: number, ii: number, field: keyof IngItem, value: string) =>
    setIngredientGroups((gs) =>
      gs.map((g, i) =>
        i === gi
          ? { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, [field]: value } : it)) }
          : g,
      ),
    )
  const addItem = (gi: number) =>
    setIngredientGroups((gs) =>
      gs.map((g, i) => (i === gi ? { ...g, items: [...g.items, { name: '', amount: '' }] } : g)),
    )
  const removeItem = (gi: number, ii: number) =>
    setIngredientGroups((gs) =>
      gs.map((g, i) => (i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g)),
    )
  const addGroup = () =>
    setIngredientGroups((gs) => [...gs, { title: '', items: [{ name: '', amount: '' }] }])
  const removeGroup = (gi: number) =>
    setIngredientGroups((gs) => gs.filter((_, i) => i !== gi))
  const [collectionForm, setCollectionForm] = useState({
    title: '',
    description: '',
    coverImage: '',
    coverImageFit: 'cover',
    coverImagePosition: 'center',
    price: '',
    discount: '',
    discountType: 'PERCENTAGE',
  })
  const [recipeForm, setRecipeForm] = useState({
    title: '',
    category: 'BREAKFAST',
    coverImage: '',
    coverImageFit: 'cover',
    coverImagePosition: 'center',
    cookingTime: '',
    instructions: '',
    caloriesPer100g: '',
    proteinPer100g: '',
    fatPer100g: '',
    carbsPer100g: '',
    caloriesPerServing: '',
    proteinPerServing: '',
    fatPerServing: '',
    carbsPerServing: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-recipe-collection', id],
    queryFn: () => adminRecipesApi.getCollection(id!),
  })

  const updateCollectionMutation = useMutation({
    mutationFn: (data: any) => adminRecipesApi.updateCollection(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipe-collection', id] })
      setShowCollectionModal(false)
    },
  })

  const createRecipeMutation = useMutation({
    mutationFn: (data: any) => adminRecipesApi.createRecipe(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipe-collection', id] })
      setShowRecipeModal(false)
      resetRecipeForm()
    },
  })

  const updateRecipeMutation = useMutation({
    mutationFn: ({ recipeId, data }: { recipeId: string; data: any }) =>
      adminRecipesApi.updateRecipe(recipeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipe-collection', id] })
      setShowRecipeModal(false)
      resetRecipeForm()
    },
  })

  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => adminRecipesApi.deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipe-collection', id] })
    },
  })

  const handleOpenCollectionModal = () => {
    const collection = data?.data
    if (collection) {
      setCollectionForm({
        title: collection.title,
        description: collection.description || '',
        coverImage: collection.coverImage || '',
        coverImageFit: collection.coverImageFit || 'cover',
        coverImagePosition: collection.coverImagePosition || 'center',
        price: collection.price?.toString() || '',
        discount: collection.discount?.toString() || '',
        discountType: collection.discountType || 'PERCENTAGE',
      })
    }
    setShowCollectionModal(true)
  }

  const handleSubmitCollection = (e: React.FormEvent) => {
    e.preventDefault()
    updateCollectionMutation.mutate({
      title: collectionForm.title,
      description: collectionForm.description || null,
      coverImage: collectionForm.coverImage || null,
      coverImageFit: collectionForm.coverImageFit,
      coverImagePosition: collectionForm.coverImagePosition,
      price: collectionForm.price ? parseFloat(collectionForm.price) : null,
      discount: collectionForm.discount ? parseFloat(collectionForm.discount) : null,
      discountType: collectionForm.discountType,
    })
  }

  const resetRecipeForm = () => {
    setRecipeForm({
      title: '',
      category: 'BREAKFAST',
      coverImage: '',
      coverImageFit: 'cover',
      coverImagePosition: 'center',
      cookingTime: '',
      instructions: '',
      caloriesPer100g: '',
      proteinPer100g: '',
      fatPer100g: '',
      carbsPer100g: '',
      caloriesPerServing: '',
      proteinPerServing: '',
      fatPerServing: '',
      carbsPerServing: '',
    })
    setIngredientGroups([{ title: '', items: [{ name: '', amount: '' }] }])
    setEditingRecipe(null)
  }

  const handleOpenRecipeModal = (recipe?: any) => {
    if (recipe) {
      setEditingRecipe(recipe)
      setRecipeForm({
        title: recipe.title,
        category: recipe.category,
        coverImage: recipe.coverImage || '',
        coverImageFit: recipe.coverImageFit || 'cover',
        coverImagePosition: recipe.coverImagePosition || 'center',
        cookingTime: recipe.cookingTime?.toString() || '',
        instructions: recipe.instructions || '',
        caloriesPer100g: recipe.caloriesPer100g?.toString() || '',
        proteinPer100g: recipe.proteinPer100g?.toString() || '',
        fatPer100g: recipe.fatPer100g?.toString() || '',
        carbsPer100g: recipe.carbsPer100g?.toString() || '',
        caloriesPerServing: recipe.caloriesPerServing?.toString() || '',
        proteinPerServing: recipe.proteinPerServing?.toString() || '',
        fatPerServing: recipe.fatPerServing?.toString() || '',
        carbsPerServing: recipe.carbsPerServing?.toString() || '',
      })
      const ing = recipe.ingredients
      if (Array.isArray(ing) && ing.length > 0 && ing[0] && Array.isArray(ing[0].items)) {
        // Новый формат: разделы
        setIngredientGroups(
          ing.map((g: any) => ({
            title: g.title || '',
            items: g.items && g.items.length > 0 ? g.items : [{ name: '', amount: '' }],
          })),
        )
      } else if (Array.isArray(ing) && ing.length > 0) {
        // Старый формат: плоский список -> одна группа без заголовка
        setIngredientGroups([{ title: '', items: ing }])
      } else {
        setIngredientGroups([{ title: '', items: [{ name: '', amount: '' }] }])
      }
    } else {
      resetRecipeForm()
    }
    setShowRecipeModal(true)
  }

  const handleSubmitRecipe = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Чистим разделы: убираем пустые ингредиенты и пустые группы
    const cleanedGroups = ingredientGroups
      .map((g) => ({
        title: g.title.trim(),
        items: g.items.filter((it) => it.name.trim() !== ''),
      }))
      .filter((g) => g.items.length > 0)
    // Обратная совместимость: один раздел без заголовка -> плоский список
    const ingredientsPayload =
      cleanedGroups.length <= 1 && (!cleanedGroups[0] || !cleanedGroups[0].title)
        ? cleanedGroups[0]?.items || []
        : cleanedGroups

    const data = {
      title: recipeForm.title,
      category: recipeForm.category,
      coverImage: recipeForm.coverImage || null,
      coverImageFit: recipeForm.coverImageFit,
      coverImagePosition: recipeForm.coverImagePosition,
      cookingTime: recipeForm.cookingTime ? parseInt(recipeForm.cookingTime) : null,
      ingredients: ingredientsPayload,
      instructions: recipeForm.instructions,
      caloriesPer100g: recipeForm.caloriesPer100g ? parseFloat(recipeForm.caloriesPer100g) : null,
      proteinPer100g: recipeForm.proteinPer100g ? parseFloat(recipeForm.proteinPer100g) : null,
      fatPer100g: recipeForm.fatPer100g ? parseFloat(recipeForm.fatPer100g) : null,
      carbsPer100g: recipeForm.carbsPer100g ? parseFloat(recipeForm.carbsPer100g) : null,
      caloriesPerServing: recipeForm.caloriesPerServing ? parseFloat(recipeForm.caloriesPerServing) : null,
      proteinPerServing: recipeForm.proteinPerServing ? parseFloat(recipeForm.proteinPerServing) : null,
      fatPerServing: recipeForm.fatPerServing ? parseFloat(recipeForm.fatPerServing) : null,
      carbsPerServing: recipeForm.carbsPerServing ? parseFloat(recipeForm.carbsPerServing) : null,
    }

    if (editingRecipe) {
      updateRecipeMutation.mutate({ recipeId: editingRecipe.id, data })
    } else {
      createRecipeMutation.mutate(data)
    }
  }

  if (isLoading) {
    return <div className="p-8">Загрузка...</div>
  }

  const collection = data?.data

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/recipes')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Назад к сборникам
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
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
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 border border-gray-300"
          >
            <Edit className="w-4 h-4" />
            Редактировать сборник
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Рецепты ({collection.recipes?.length || 0})
          </h2>
          <button
            onClick={() => handleOpenRecipeModal()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Plus className="w-5 h-5" />
            Добавить рецепт
          </button>
        </div>

        {collection.recipes?.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Рецептов пока нет. Добавьте первый рецепт!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collection.recipes?.map((recipe: any) => (
              <div key={recipe.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex gap-4">
                  {recipe.coverImage && (
                    <img
                      src={recipe.coverImage}
                      alt={recipe.title}
                      loading="lazy"
                      decoding="async"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">{recipe.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{recipe.category}</p>
                    {recipe.cookingTime && (
                      <p className="text-sm text-gray-500">⏱ {recipe.cookingTime} мин</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenRecipeModal(recipe)}
                      className="p-2 text-primary hover:bg-primary/10 rounded"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Удалить рецепт?')) {
                          deleteRecipeMutation.mutate(recipe.id)
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="bg-white min-h-screen w-full p-6">
            <div className="flex justify-between items-center mb-4 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold">
                {editingRecipe ? 'Редактировать рецепт' : 'Новый рецепт'}
              </h2>
              <button
                onClick={() => {
                  setShowRecipeModal(false)
                  resetRecipeForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitRecipe} className="space-y-4 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название рецепта *
                  </label>
                  <input
                    type="text"
                    value={recipeForm.title}
                    onChange={(e) => setRecipeForm({ ...recipeForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Категория *
                  </label>
                  <select
                    value={recipeForm.category}
                    onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <ImageUpload
                label="Обложка сборника"
                value={recipeForm.coverImage}
                onChange={(url) => setRecipeForm({ ...recipeForm, coverImage: url })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Положение фото (как увидит пользователь)
                </label>
                <ImageFocusPicker
                  imageUrl={recipeForm.coverImage}
                  value={recipeForm.coverImagePosition}
                  onChange={(v) => setRecipeForm({ ...recipeForm, coverImagePosition: v })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Время приготовления (мин)
                </label>
                <input
                  type="number"
                  value={recipeForm.cookingTime}
                  onChange={(e) => setRecipeForm({ ...recipeForm, cookingTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ингредиенты
                </label>
                <div className="space-y-4">
                  {ingredientGroups.map((group, gi) => (
                    <div key={gi} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={group.title}
                          onChange={(e) => updateGroupTitle(gi, e.target.value)}
                          placeholder="Заголовок раздела (пусто = «Ингредиенты»). Напр.: Для начинки"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        {ingredientGroups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeGroup(gi)}
                            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs whitespace-nowrap"
                          >
                            Удалить раздел
                          </button>
                        )}
                      </div>
                      {group.items.map((ing, ii) => (
                        <div key={ii} className="flex gap-2">
                          <input
                            type="text"
                            value={ing.name}
                            onChange={(e) => updateItem(gi, ii, 'name', e.target.value)}
                            placeholder="Название"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={ing.amount}
                            onChange={(e) => updateItem(gi, ii, 'amount', e.target.value)}
                            placeholder="Количество"
                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          {group.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(gi, ii)}
                              className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addItem(gi)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить ингредиент
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addGroup}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить раздел (напр. «Для начинки»)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Способ приготовления
                </label>
                <textarea
                  value={recipeForm.instructions}
                  onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={5}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">КБЖУ на 100г</h3>
                <div className="grid grid-cols-4 gap-4">
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.caloriesPer100g}
                    onChange={(e) => setRecipeForm({ ...recipeForm, caloriesPer100g: e.target.value })}
                    placeholder="Калории"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.proteinPer100g}
                    onChange={(e) => setRecipeForm({ ...recipeForm, proteinPer100g: e.target.value })}
                    placeholder="Белки"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.fatPer100g}
                    onChange={(e) => setRecipeForm({ ...recipeForm, fatPer100g: e.target.value })}
                    placeholder="Жиры"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.carbsPer100g}
                    onChange={(e) => setRecipeForm({ ...recipeForm, carbsPer100g: e.target.value })}
                    placeholder="Углеводы"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">КБЖУ на порцию</h3>
                <div className="grid grid-cols-4 gap-4">
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.caloriesPerServing}
                    onChange={(e) => setRecipeForm({ ...recipeForm, caloriesPerServing: e.target.value })}
                    placeholder="Калории"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.proteinPerServing}
                    onChange={(e) => setRecipeForm({ ...recipeForm, proteinPerServing: e.target.value })}
                    placeholder="Белки"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.fatPerServing}
                    onChange={(e) => setRecipeForm({ ...recipeForm, fatPerServing: e.target.value })}
                    placeholder="Жиры"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={recipeForm.carbsPerServing}
                    onChange={(e) => setRecipeForm({ ...recipeForm, carbsPerServing: e.target.value })}
                    placeholder="Углеводы"
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={createRecipeMutation.isPending || updateRecipeMutation.isPending}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {createRecipeMutation.isPending || updateRecipeMutation.isPending
                    ? 'Сохранение...'
                    : editingRecipe
                    ? 'Сохранить'
                    : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecipeModal(false)
                    resetRecipeForm()
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

      {/* Collection Edit Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
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
                  Название сборника *
                </label>
                <input
                  type="text"
                  value={collectionForm.title}
                  onChange={(e) => setCollectionForm({ ...collectionForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  Положение обложки (как увидит пользователь)
                </label>
                <ImageFocusPicker
                  imageUrl={collectionForm.coverImage}
                  value={collectionForm.coverImagePosition}
                  onChange={(v) => setCollectionForm({ ...collectionForm, coverImagePosition: v })}
                />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Скидка
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={collectionForm.discount}
                      onChange={(e) => setCollectionForm({ ...collectionForm, discount: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                    <select
                      value={collectionForm.discountType}
                      onChange={(e) => setCollectionForm({ ...collectionForm, discountType: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="PERCENTAGE">%</option>
                      <option value="FIXED">сум</option>
                    </select>
                  </div>
                </div>
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
    </div>
  )
}
