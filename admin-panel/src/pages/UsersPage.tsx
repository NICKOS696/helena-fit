import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUsersApi, adminWorkoutsApi, adminRecipesApi, analyticsApi, adminClientsApi } from '@/lib/api'
import { Plus, Search, Edit, Trash2, X, History, HeartHandshake, Check, ChevronRight } from 'lucide-react'

const typeLabel: Record<string, string> = {
  WORKOUT_COLLECTION: '🏋️ Сборник тренировок',
  RECIPE_COLLECTION: '🍽️ Сборник рецептов',
  RECIPE: '🍽️ Рецепт',
  WORKOUT: '🏋️ Тренировка',
  NEWS: '📰 Новость',
  BROADCAST: '📨 Рассылка',
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

// Модалка «Журнал просмотров»: что открывал пользователь, сколько раз и когда
const UserLogModal = ({ user, onClose }: { user: any; onClose: () => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['user-views', user.id],
    queryFn: () => analyticsApi.getUserViews(user.id),
  })
  const views: any[] = data?.data || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              Журнал: {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ID {user.telegramId}
              {user.username ? ` · @${user.username}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 py-8">Загрузка…</p>
        ) : views.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Пользователь ещё ничего не открывал
          </p>
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
                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{v.title}</p>
                  <p className="text-xs text-gray-500">
                    {typeLabel[v.itemType] || v.itemType}
                    {' · '}
                    открыто {formatDate(v.lastViewedAt)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary">{v.views}</p>
                  <p className="text-xs text-gray-500">раз</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Аватар: фото из Telegram, а если его нет или оно не загрузилось — буква имени
const Avatar = ({ url, name }: { url?: string | null; name: string }) => {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        className="w-10 h-10 rounded-full shrink-0 object-cover bg-gray-100"
      />
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-dark font-semibold flex items-center justify-center shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен',
  PENDING: 'Ожидает',
  BLOCKED: 'Заблокирован',
}

// «1 доступ», «2 доступа», «5 доступов»
const accessLabel = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  const word =
    m10 === 1 && m100 !== 11
      ? 'доступ'
      : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
        ? 'доступа'
        : 'доступов'
  return `${n} ${word}`
}

export const UsersPage = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  // Фильтр по доступности бота (пометки из рассылок)
  const [tgStatus, setTgStatus] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newTelegramId, setNewTelegramId] = useState('')
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([])
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])
  // Для какого пользователя доступы уже загружены в галочки — предохранитель от
  // сохранения пустого набора (иначе бэкенд удалит все покупки пользователя).
  const [accessLoadedFor, setAccessLoadedFor] = useState<string | null>(null)
  // Пользователь, чей журнал просмотров открыт
  const [logUser, setLogUser] = useState<any>(null)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, status, tgStatus],
    queryFn: () => adminUsersApi.getUsers(search, status, tgStatus),
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

  const { data: userAccessData, dataUpdatedAt: accessUpdatedAt } = useQuery({
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
      setAccessLoadedFor(null)
    },
    onError: () => {
      alert('Не удалось сохранить доступы. Проверьте соединение и попробуйте ещё раз.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUsersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  // Кто уже клиент: userId → id карточки (чтобы сразу показать и открыть)
  const navigate = useNavigate()
  // Какая строка списка раскрыта (мобильный вид)
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => adminClientsApi.list(),
  })
  const clientByUser = useMemo(() => {
    const map = new Map<string, string>()
    ;((clientsData?.data as any[]) || []).forEach((c) => {
      if (c.status === 'ACTIVE' && c.user?.id) map.set(c.user.id, c.id)
    })
    return map
  }, [clientsData])

  const markClientMutation = useMutation({
    mutationFn: (userId: string) => adminClientsApi.mark(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || 'Не удалось отметить клиентом'),
  })

  const handleOpenAccessModal = (user: any) => {
    // Сбрасываем прошлый выбор и флаг «загружено» — галочки заполнятся заново,
    // когда придут доступы именно этого пользователя.
    setSelectedWorkouts([])
    setSelectedRecipes([])
    setAccessLoadedFor(null)
    setSelectedUser(user)
    setShowAccessModal(true)
  }

  const handleSubmitAccess = () => {
    // Не даём сохранить, пока доступы текущего пользователя не загружены в галочки,
    // иначе можно случайно отправить пустой набор и стереть все покупки.
    if (!selectedUser || accessLoadedFor !== selectedUser.id) return
    updateAccessMutation.mutate({
      userId: selectedUser.id,
      workoutIds: selectedWorkouts,
      recipeIds: selectedRecipes,
    })
  }

  // Загружаем текущие доступы пользователя в галочки ровно один раз на открытие.
  // accessUpdatedAt в зависимостях гарантирует срабатывание даже когда React Query
  // отдаёт закэшированный объект с прежней ссылкой (иначе эффект бы не сработал).
  useEffect(() => {
    if (!showAccessModal || !selectedUser) return
    const access = userAccessData?.data
    if (!access) return
    if (accessLoadedFor === selectedUser.id) return
    const workoutIds = access.workouts?.filter((w: any) => w.hasAccess).map((w: any) => w.id) || []
    const recipeIds = access.recipes?.filter((r: any) => r.hasAccess).map((r: any) => r.id) || []
    setSelectedWorkouts(workoutIds)
    setSelectedRecipes(recipeIds)
    setAccessLoadedFor(selectedUser.id)
  }, [userAccessData, accessUpdatedAt, selectedUser, showAccessModal, accessLoadedFor])

  const users = data?.data || []
  // Доступы текущего пользователя реально загружены — только тогда можно сохранять
  const accessReady = !!userAccessData?.data && accessLoadedFor === selectedUser?.id

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Пользователи</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-xl hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Поиск — главное действие страницы */}
      <div className="mb-4 md:mb-6 space-y-2 sm:space-y-0 sm:flex sm:gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Имя, @username или Telegram ID"
            className="w-full h-12 pl-11 pr-10 bg-white border border-gray-200 rounded-xl shadow-sm text-[15px] focus:border-primary outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Очистить"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 sm:h-12 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-primary outline-none"
          >
            <option value="">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="PENDING">Ожидание</option>
            <option value="BLOCKED">Заблокированные</option>
          </select>
          <select
            value={tgStatus}
            onChange={(e) => setTgStatus(e.target.value)}
            className="h-10 sm:h-12 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-primary outline-none"
          >
            <option value="">Бот: все</option>
            <option value="OK">Бот доступен</option>
            <option value="BLOCKED">Заблокировали бота</option>
            <option value="DELETED">Удалили аккаунт</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : (
        <>
        {/* Десктоп: таблица */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
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
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : user.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {STATUS_LABEL[user.status] || user.status}
                      </span>
                      {user.tgStatus === 'BLOCKED' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                          🚫 заблокировал бота
                        </span>
                      )}
                      {user.tgStatus === 'DELETED' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                          👻 удалил аккаунт
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="whitespace-nowrap">{accessLabel(user._count.workoutAccess + user._count.recipeAccess)}</span>
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
                        onClick={() => setLogUser(user)}
                        className="text-gray-500 hover:text-primary"
                        title="Журнал просмотров"
                      >
                        <History className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Сделать ${user.firstName || 'пользователя'} клиентом? У него в боте откроется раздел «Мой прогресс».`))
                            markClientMutation.mutate(user.id)
                        }}
                        className="text-gray-500 hover:text-primary"
                        title="Сделать клиентом"
                      >
                        <HeartHandshake className="w-5 h-5" />
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

        {/* Мобильные: компактный список; действия раскрываются по нажатию на строку */}
        <div className="md:hidden">
          {users.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Никого не нашлось</p>
          ) : (
            <div className="bg-white rounded-2xl shadow divide-y divide-gray-100 overflow-hidden">
              {users.map((user: any) => {
                const clientId = clientByUser.get(user.id)
                const fullName =
                  `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Без имени'
                const accessCount = user._count.workoutAccess + user._count.recipeAccess
                const open = openUserId === user.id
                const pill =
                  'inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-gray-100 text-xs text-gray-700 whitespace-nowrap active:bg-gray-200'
                return (
                  <div key={user.id}>
                    <button
                      onClick={() => setOpenUserId(open ? null : user.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <Avatar url={user.photoUrl} name={fullName} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[15px] font-medium text-gray-900 truncate">
                            {fullName}
                          </span>
                          {clientId && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary-dark">
                              клиент
                            </span>
                          )}
                          {user.status !== 'ACTIVE' && (
                            <span
                              className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded-full ${
                                user.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {STATUS_LABEL[user.status] || user.status}
                            </span>
                          )}
                          {user.tgStatus === 'BLOCKED' && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700">
                              блок бота
                            </span>
                          )}
                          {user.tgStatus === 'DELETED' && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-600">
                              удалён
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {user.username ? `@${user.username} · ` : ''}ID {user.telegramId}
                          {accessCount > 0 ? ` · ${accessLabel(accessCount)}` : ''}
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${
                          open ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {open && (
                      <div className="px-3 pb-3 flex items-center gap-1.5">
                        <button onClick={() => handleOpenAccessModal(user)} className={pill}>
                          <Edit className="w-3.5 h-3.5" />
                          Доступ
                        </button>
                        <button onClick={() => setLogUser(user)} className={pill}>
                          <History className="w-3.5 h-3.5" />
                          Журнал
                        </button>
                        {clientId ? (
                          <button onClick={() => navigate(`/clients/${clientId}`)} className={pill}>
                            <Check className="w-4 h-4" />
                            Карточка
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Сделать ${user.firstName || 'пользователя'} клиентом? У него в боте откроется раздел «Мой прогресс».`,
                                )
                              )
                                markClientMutation.mutate(user.id)
                            }}
                            disabled={markClientMutation.isPending}
                            className={pill}
                          >
                            <HeartHandshake className="w-4 h-4" />
                            В клиенты
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Удалить пользователя?')) {
                              deleteMutation.mutate(user.id)
                            }
                          }}
                          aria-label="Удалить пользователя"
                          className="ml-auto inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-gray-100 text-gray-400 active:bg-red-50 active:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </>
      )}

      {logUser && <UserLogModal user={logUser} onClose={() => setLogUser(null)} />}

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
            <div className="flex justify-between items-start gap-3 mb-4">
              <h2 className="text-lg md:text-2xl font-bold">
                Управление доступом: {selectedUser.firstName} {selectedUser.lastName}
              </h2>
              <button
                onClick={() => {
                  setShowAccessModal(false)
                  setSelectedUser(null)
                  setSelectedWorkouts([])
                  setSelectedRecipes([])
                  setAccessLoadedFor(null)
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
                disabled={updateAccessMutation.isPending || !accessReady}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {updateAccessMutation.isPending
                  ? 'Сохранение...'
                  : !accessReady
                  ? 'Загрузка доступов…'
                  : 'Сохранить'}
              </button>
              <button
                onClick={() => {
                  setShowAccessModal(false)
                  setSelectedUser(null)
                  setSelectedWorkouts([])
                  setSelectedRecipes([])
                  setAccessLoadedFor(null)
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
