import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUsersApi, adminWorkoutsApi, adminRecipesApi } from '@/lib/api'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'

export const UsersPage = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newTelegramId, setNewTelegramId] = useState('')
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([])
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, status],
    queryFn: () => adminUsersApi.getUsers(search, status),
  })

  const { data: workoutsData } = useQuery({
    queryKey: ['admin-workouts-all'],
    queryFn: () => adminWorkoutsApi.getCollections(),
    enabled: showAccessModal,
  })

  const { data: recipesData } = useQuery({
    queryKey: ['admin-recipes-all'],
    queryFn: () => adminRecipesApi.getCollections(),
    enabled: showAccessModal,
  })

  const { data: userAccessData } = useQuery({
    queryKey: ['user-access', selectedUser?.id],
    queryFn: () => adminUsersApi.getUserAccess(selectedUser!.id),
    enabled: !!selectedUser && showAccessModal,
  })

  const createMutation = useMutation({
    mutationFn: (telegramId: string) => adminUsersApi.createUser(telegramId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowAddModal(false)
      setNewTelegramId('')
    },
  })

  const updateAccessMutation = useMutation({
    mutationFn: ({ userId, workoutIds, recipeIds }: { userId: string; workoutIds: string[]; recipeIds: string[] }) =>
      adminUsersApi.updateUserAccess(userId, workoutIds, recipeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-access'] })
      setShowAccessModal(false)
      setSelectedUser(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUsersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const handleOpenAccessModal = (user: any) => {
    setSelectedUser(user)
    setShowAccessModal(true)
  }

  const handleSubmitAccess = () => {
    if (selectedUser) {
      updateAccessMutation.mutate({
        userId: selectedUser.id,
        workoutIds: selectedWorkouts,
        recipeIds: selectedRecipes,
      })
    }
  }

  // Загружаем текущие доступы пользователя
  useEffect(() => {
    if (userAccessData?.data) {
      const access = userAccessData.data
      // Фильтруем только те, у которых hasAccess = true
      const workoutIds = access.workouts?.filter((w: any) => w.hasAccess).map((w: any) => w.id) || []
      const recipeIds = access.recipes?.filter((r: any) => r.hasAccess).map((r: any) => r.id) || []
      
      console.log('Loading user access:', { workoutIds, recipeIds })
      setSelectedWorkouts(workoutIds)
      setSelectedRecipes(recipeIds)
    }
  }, [userAccessData])

  const users = data?.data || []

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Пользователи</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
        >
          <Plus className="w-5 h-5" />
          Добавить пользователя
        </button>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по Telegram ID или имени..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="PENDING">Ожидание</option>
            <option value="BLOCKED">Заблокированные</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Telegram ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Имя
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Доступы
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{user.telegramId}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.username || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : user.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user._count.workoutAccess + user._count.recipeAccess} доступов
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenAccessModal(user)}
                        className="text-primary hover:text-primary-dark"
                        title="Управление доступом"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Удалить пользователя?')) {
                            deleteMutation.mutate(user.id)
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Добавить пользователя</h2>
            <input
              type="text"
              value={newTelegramId}
              onChange={(e) => setNewTelegramId(e.target.value)}
              placeholder="Telegram ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate(newTelegramId)}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-lg"
              >
                Добавить
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-200 px-4 py-2 rounded-lg"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccessModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                Управление доступом: {selectedUser.firstName} {selectedUser.lastName}
              </h2>
              <button
                onClick={() => {
                  setShowAccessModal(false)
                  setSelectedUser(null)
                  setSelectedWorkouts([])
                  setSelectedRecipes([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3">Доступ к тренировкам</h3>
                <div className="space-y-2">
                  {workoutsData?.data?.map((workout: any) => (
                    <label key={workout.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWorkouts.includes(workout.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWorkouts([...selectedWorkouts, workout.id])
                          } else {
                            setSelectedWorkouts(selectedWorkouts.filter(id => id !== workout.id))
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{workout.title}</p>
                        <p className="text-sm text-gray-500">{workout.price.toLocaleString()} сум</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">Доступ к рецептам</h3>
                <div className="space-y-2">
                  {recipesData?.data?.map((recipe: any) => (
                    <label key={recipe.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRecipes.includes(recipe.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecipes([...selectedRecipes, recipe.id])
                          } else {
                            setSelectedRecipes(selectedRecipes.filter(id => id !== recipe.id))
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{recipe.title}</p>
                        <p className="text-sm text-gray-500">{recipe.price.toLocaleString()} сум</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={handleSubmitAccess}
                disabled={updateAccessMutation.isPending}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {updateAccessMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => {
                  setShowAccessModal(false)
                  setSelectedUser(null)
                  setSelectedWorkouts([])
                  setSelectedRecipes([])
                }}
                className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
