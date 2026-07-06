import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsApi, adminRecipesApi, adminWorkoutsApi } from '@/lib/api'
import {
  BarChart3,
  Eye,
  Users,
  TrendingUp,
  ChevronDown,
  ShoppingBag,
  Banknote,
  Trash2,
} from 'lucide-react'

const formatMoney = (n: number) => (n || 0).toLocaleString('ru-RU') + ' сум'

// Курс для рублёвой карты (как в telegram-app/lib/payments.ts)
const RUBLE_RATE = 155

// Сворачиваемый блок: по умолчанию закрыт, раскрывается по клику на заголовок.
const CollapsibleSection = ({
  title,
  icon,
  count,
  children,
}: {
  title: string
  icon: ReactNode
  count?: number
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full p-6 flex items-center justify-between hover:bg-gray-50 ${
          open ? 'border-b' : ''
        }`}
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          {icon}
          {title}
          {typeof count === 'number' && (
            <span className="text-sm font-normal text-gray-400">({count})</span>
          )}
        </h2>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  )
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

// Дата YYYY-MM-DD «сегодня» по Ташкенту (UTC+5)
const tashkentToday = (shiftDays = 0) => {
  const d = new Date(Date.now() + 5 * 3600 * 1000 + shiftDays * 24 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

const PERIODS = [
  { key: 'today', label: 'Сегодня' },
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
  { key: 'all', label: 'Всё время' },
  { key: 'custom', label: 'Период…' },
] as const

// Секция «Продажи»: фильтры по периоду и сборнику, итоги, разбивки, список.
const SalesSection = () => {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('all')
  const [customFrom, setCustomFrom] = useState(tashkentToday(-6))
  const [customTo, setCustomTo] = useState(tashkentToday())
  const [collectionId, setCollectionId] = useState('')

  // Даты фильтра из выбранного периода
  let from: string | undefined
  let to: string | undefined
  if (period === 'today') { from = tashkentToday(); to = tashkentToday() }
  else if (period === '7d') { from = tashkentToday(-6); to = tashkentToday() }
  else if (period === '30d') { from = tashkentToday(-29); to = tashkentToday() }
  else if (period === 'custom') { from = customFrom || undefined; to = customTo || undefined }
  // 'all' — без дат (бэкенд возьмёт с запуска)

  const { data: recipesData } = useQuery({
    queryKey: ['admin-recipes-all'],
    queryFn: () => adminRecipesApi.getCollections(),
    enabled: open,
  })
  const { data: workoutsData } = useQuery({
    queryKey: ['admin-workouts-all'],
    queryFn: () => adminWorkoutsApi.getCollections(),
    enabled: open,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-sales', from, to, collectionId],
    queryFn: () => analyticsApi.getSales({ from, to, collectionId: collectionId || undefined }),
    enabled: open,
  })
  const result = data?.data
  const purchases: any[] = result?.purchases || []
  const byCollection: any[] = result?.byCollection || []
  const byDay: any[] = result?.byDay || []
  const maxDayRevenue = Math.max(1, ...byDay.map((d: any) => d.revenue))

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full p-6 flex items-center justify-between hover:bg-gray-50 ${
          open ? 'border-b' : ''
        }`}
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          Продажи
        </h2>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="p-6">
          {/* Фильтры */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  period === p.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="ml-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm max-w-[220px]"
            >
              <option value="">Все сборники</option>
              {(recipesData?.data || []).map((c: any) => (
                <option key={c.id} value={c.id}>🍽 {c.title}</option>
              ))}
              {(workoutsData?.data || []).map((c: any) => (
                <option key={c.id} value={c.id}>🏋️ {c.title}</option>
              ))}
            </select>
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
              <label className="text-gray-500">с</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg"
              />
              <label className="text-gray-500">по</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          {isLoading || !result ? (
            <p className="text-center text-gray-500 py-6">Загрузка…</p>
          ) : (
            <>
              {/* Итоги за выбранный период */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Выручка</p>
                  <p className="text-base md:text-lg font-bold text-primary leading-tight">
                    {formatMoney(result.totalRevenue)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Покупок</p>
                  <p className="text-base md:text-lg font-bold leading-tight">{result.count}</p>
                </div>
              </div>

              {result.count === 0 ? (
                <p className="text-center text-gray-500 py-6">
                  Продаж за выбранный период нет
                </p>
              ) : (
                <>
                  {/* График по дням (когда дней 2–62) */}
                  {byDay.length >= 2 && byDay.length <= 62 && (
                    <div className="mb-5">
                      <p className="text-xs text-gray-500 mb-2">По дням</p>
                      <div className="flex items-end gap-[3px] h-16">
                        {byDay.map((d: any) => (
                          <div
                            key={d.date}
                            title={`${d.date.slice(8, 10)}.${d.date.slice(5, 7)} — ${formatMoney(d.revenue)} (${d.count})`}
                            className="flex-1 bg-primary/70 hover:bg-primary rounded-t"
                            style={{ height: `${Math.max(6, (d.revenue / maxDayRevenue) * 100)}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>{byDay[0].date.slice(8, 10)}.{byDay[0].date.slice(5, 7)}</span>
                        <span>
                          {byDay[byDay.length - 1].date.slice(8, 10)}.
                          {byDay[byDay.length - 1].date.slice(5, 7)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Разбивка по сборникам */}
                  {byCollection.length > 1 && (
                    <div className="mb-5">
                      <p className="text-xs text-gray-500 mb-2">По сборникам</p>
                      <div className="space-y-2">
                        {byCollection.map((c: any) => (
                          <div key={c.collectionId} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium truncate">
                                  {c.itemType === 'WORKOUT_COLLECTION' ? '🏋️ ' : '🍽 '}
                                  {c.title}
                                </span>
                                <span className="text-gray-500 flex-shrink-0 ml-2">
                                  {c.count} · <b className="text-primary">{formatMoney(c.revenue)}</b>
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{
                                    width: `${Math.round((c.revenue / Math.max(1, result.totalRevenue)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Список покупок */}
                  <p className="text-xs text-gray-500 mb-2">Покупки ({result.count})</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {purchases.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100"
                      >
                        {p.coverImage ? (
                          <img
                            src={p.coverImage}
                            alt={p.title}
                            className="w-10 h-10 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {p.title}
                            {p.manual && (
                              <span className="ml-2 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                ₽ карта
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {p.user?.firstName || 'Пользователь'} {p.user?.lastName || ''}
                            {p.user?.username
                              ? ` · @${p.user.username}`
                              : p.user?.telegramId
                              ? ` · ${p.user.telegramId}`
                              : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-primary whitespace-nowrap">
                            {formatMoney(p.amount)}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(p.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Секция «Рублёвые оплаты»: ручной учёт оплат картой МИР — попадают в общий доход.
const ManualPaymentsSection = () => {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const [type, setType] = useState<'RECIPE_COLLECTION' | 'WORKOUT_COLLECTION'>('RECIPE_COLLECTION')
  const [collectionId, setCollectionId] = useState('')
  const [amount, setAmount] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [note, setNote] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: recipesData } = useQuery({
    queryKey: ['admin-recipes-all'],
    queryFn: () => adminRecipesApi.getCollections(),
    enabled: open,
  })
  const { data: workoutsData } = useQuery({
    queryKey: ['admin-workouts-all'],
    queryFn: () => adminWorkoutsApi.getCollections(),
    enabled: open,
  })
  const collections: any[] =
    (type === 'RECIPE_COLLECTION' ? recipesData?.data : workoutsData?.data) || []

  const { data: listData } = useQuery({
    queryKey: ['analytics-manual-payments'],
    queryFn: () => analyticsApi.getManualPayments(),
    enabled: open,
  })
  const items: any[] = listData?.data || []

  const selectCollection = (id: string) => {
    setCollectionId(id)
    const c = collections.find((x) => x.id === id)
    if (c && (c.price ?? null) !== null) setAmount(String(c.price))
  }

  const createMut = useMutation({
    mutationFn: () =>
      analyticsApi.createManualPayment({
        collectionId,
        collectionType: type,
        amount: Number(amount),
        telegramId: telegramId.trim() || undefined,
        note: note.trim() || undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics-manual-payments'] })
      qc.invalidateQueries({ queryKey: ['analytics-purchases'] })
      setCollectionId('')
      setAmount('')
      setTelegramId('')
      setNote('')
    },
    onError: () => alert('Не удалось записать оплату. Проверьте поля и соединение.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => analyticsApi.deleteManualPayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics-manual-payments'] })
      qc.invalidateQueries({ queryKey: ['analytics-purchases'] })
    },
    onError: () => alert('Не удалось удалить запись.'),
  })

  const amountNum = Number(amount)
  const canSubmit = !!collectionId && amountNum > 0 && !createMut.isPending
  const rub = amountNum > 0 ? Math.round(amountNum / RUBLE_RATE) : 0

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full p-6 flex items-center justify-between hover:bg-gray-50 ${
          open ? 'border-b' : ''
        }`}
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary" />
          Рублёвые оплаты
          {items.length > 0 && (
            <span className="text-sm font-normal text-gray-400">({items.length})</span>
          )}
        </h2>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="p-6">
          {/* Форма записи оплаты */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Тип</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as any)
                    setCollectionId('')
                    setAmount('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="RECIPE_COLLECTION">🍽️ Рецепты</option>
                  <option value="WORKOUT_COLLECTION">🏋️ Тренировки</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Сборник</label>
                <select
                  value={collectionId}
                  onChange={(e) => selectCollection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">— выберите —</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Сумма (сум)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="напр. 50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {rub > 0 && (
                  <p className="text-xs text-gray-500 mt-1">≈ {rub.toLocaleString('ru-RU')} ₽ по курсу {RUBLE_RATE}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Дата оплаты</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telegram ID (необязательно)</label>
                <input
                  type="text"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="кому открыли"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Заметка (необязательно)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="комментарий"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={() => createMut.mutate()}
              disabled={!canSubmit}
              className="w-full sm:w-auto bg-primary text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {createMut.isPending ? 'Записываю…' : 'Записать оплату'}
            </button>
          </div>

          {/* Список записанных оплат */}
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Пока нет записанных рублёвых оплат</p>
          ) : (
            <div className="space-y-2">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {m.title}
                      <span className="ml-2 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        ₽ карта
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {m.userName || (m.telegramId ? `ID ${m.telegramId}` : 'без привязки')}
                      {m.note ? ` · ${m.note}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary whitespace-nowrap">{formatMoney(m.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(m.paidAt)}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Удалить запись об оплате?')) deleteMut.mutate(m.id)
                    }}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

  const overall = overallData?.data
  const collections = collectionsData?.data || []
  const recipes = recipesData?.data || []

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-8">📊 Статистика</h1>

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

      {/* Продажи: фильтры, итоги, разбивки */}
      <SalesSection />

      {/* Рублёвые оплаты (ручной учёт) */}
      <ManualPaymentsSection />

      {/* Популярный контент (коллекции) */}
      <CollapsibleSection
        title="Популярный контент"
        icon={<BarChart3 className="w-6 h-6 text-primary" />}
        count={collections.length}
      >
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
      </CollapsibleSection>

      {/* Популярные рецепты */}
      <CollapsibleSection
        title="Популярные рецепты"
        icon={<BarChart3 className="w-6 h-6 text-primary" />}
        count={recipes.length}
      >
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
      </CollapsibleSection>

    </div>
  )
}
