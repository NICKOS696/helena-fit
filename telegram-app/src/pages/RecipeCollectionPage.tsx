import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { recipesApi, paymeApi, analyticsApi } from '@/lib/api'
import {
  getShoppingList,
  toggleShoppingList,
  clearShoppingList,
  type ShoppingRecipe,
} from '@/lib/shoppingList'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { PriceDisplay } from '@/components/PriceDisplay'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ErrorState } from '@/components/ErrorState'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { haptic } from '@/lib/telegram'
import { ArrowLeft, Clock, Lock, Flame, Heart, Search, X, ShoppingBag, Copy, Share2, Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { pluralize } from '@/utils/plural'

// Достаём плоский список ингредиентов рецепта (поддержка разделов и старого формата)
function extractIngredients(recipe: any): { name: string; amount: string }[] {
  const raw = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const groups =
    raw.length && raw[0] && Array.isArray(raw[0].items) ? raw : [{ title: '', items: raw }]
  const out: { name: string; amount: string }[] = []
  groups.forEach((g: any) =>
    (g.items || []).forEach((it: any) => {
      if (it && it.name) out.push({ name: String(it.name), amount: String(it.amount || '') })
    }),
  )
  return out
}

// Приводим название ингредиента к единому виду.
// Объединяем ТОЛЬКО по справочнику из админки (группы). Без группы —
// название остаётся отдельным продуктом «как написано» (без авто-угадывания).
function canonicalizeIngredient(
  raw: string,
  aliasMap?: Record<string, string>,
): { key: string; display: string } {
  const lower = raw.trim().toLowerCase()
  // Справочник: точное совпадение «сырого» названия
  const grouped = aliasMap?.[lower]
  if (grouped) return { key: grouped.toLowerCase(), display: grouped }

  // Нет группы — продукт сам по себе, с аккуратным отображением
  const display = raw.trim() ? raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1) : raw.trim()
  return { key: lower, display }
}

// Суммируем количества по единицам (г/кг/мл/л/шт). «По вкусу», «щепотка»,
// диапазоны и прочее без чёткого числа+единицы — игнорируем (ингредиент
// попадёт в список просто по названию, без граммажа).
function summarizeAmounts(amounts: string[]): string {
  // число + единица в начале строки; единица не должна продолжаться буквой
  // (чтобы «1 лимон» не посчитать как «1 л»)
  const re = /^\s*(\d+(?:[.,]\d+)?)\s*(кг|грамм|гр|г|мл|л|шт|штук)(?![а-яё])/i
  const sums: Record<string, number> = {}
  const order: string[] = []
  for (const a of amounts) {
    const m = a.trim().match(re)
    if (!m) continue
    const num = parseFloat(m[1].replace(',', '.'))
    if (isNaN(num)) continue
    let unit = m[2].toLowerCase()
    if (unit === 'грамм' || unit === 'гр') unit = 'г'
    if (unit === 'штук') unit = 'шт'
    if (!(unit in sums)) {
      sums[unit] = 0
      order.push(unit)
    }
    sums[unit] += num
  }
  return order.map((u) => `${Math.round(sums[u] * 100) / 100} ${u}`).join(', ')
}

const categories = [
  { value: 'all', label: 'Все' },
  { value: 'BREAKFAST', label: 'Завтраки' },
  { value: 'MAIN_COURSE', label: 'Вторые блюда' },
  { value: 'SALAD', label: 'Салаты' },
  { value: 'SNACK', label: 'Перекусы' },
  { value: 'DESSERT', label: 'Десерты' },
  { value: 'SMOOTHIE', label: 'Смузи' },
]

export const RecipeCollectionPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useTelegramBackButton()
  // Категорию храним в URL (?cat=...), чтобы она сохранялась при возврате
  // с экрана рецепта — иначе фильтр каждый раз сбрасывался бы на «Все».
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCategory = searchParams.get('cat') || 'all'
  const [search, setSearch] = useState('')
  const selectCategory = (cat: string) => {
    haptic.selection()
    setSearchParams(
      (prev) => {
        if (cat === 'all') {
          prev.delete('cat')
        } else {
          prev.set('cat', cat)
        }
        return prev
      },
      { replace: true },
    )
  }
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)

  // --- Список покупок (общий, сквозной для всех сборников; тест на Сборнике №2) ---
  const shoppingEnabled = true // список покупок включён во всех сборниках
  const [listRecipes, setListRecipes] = useState<ShoppingRecipe[]>(() => getShoppingList())
  const listIds = useMemo(() => new Set(listRecipes.map((r) => r.id)), [listRecipes])
  const [showList, setShowList] = useState(false)
  const [showListRecipes, setShowListRecipes] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checkedLines, setCheckedLines] = useState<Set<string>>(new Set())

  // Добавляем/убираем рецепт в общий список (сохраняем «снимок»)
  const toggleInList = (recipe: any) => {
    haptic.selection()
    setListRecipes(
      toggleShoppingList({
        id: recipe.id,
        collectionId: id || recipe.collectionId,
        title: recipe.title,
        coverImage: recipe.coverImage,
        ingredients: recipe.ingredients,
      }),
    )
  }

  const clearList = () => {
    haptic.impact('light')
    setListRecipes(clearShoppingList())
    setShowList(false)
  }

  // Пока открыт экран списка — «замораживаем» фоновую страницу (iOS-надёжный способ
  // через position:fixed), иначе её прокрутка просвечивает полосой сбоку.
  useEffect(() => {
    if (!showList) return
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [showList])

  // Собираем позиции списка покупок: объединяем синонимы и суммируем количества.
  const buildListItems = (selectedRecipes: any[]) => {
    const map = new Map<string, { name: string; amounts: string[] }>()
    selectedRecipes.forEach((r) => {
      extractIngredients(r).forEach(({ name, amount }) => {
        if (!name.trim()) return
        const { key, display } = canonicalizeIngredient(name, aliasMap)
        if (!map.has(key)) map.set(key, { name: display, amounts: [] })
        if (amount.trim()) map.get(key)!.amounts.push(amount.trim())
      })
    })
    return [...map.values()]
      .map((e) => ({ name: e.name, detail: summarizeAmounts(e.amounts) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }

  const buildListText = (selectedRecipes: any[]) =>
    'Список продуктов для рецептов от Helena Fit\n\n' +
    buildListItems(selectedRecipes)
      .map((i) => `• ${i.name}${i.detail ? ' — ' + i.detail : ''}`)
      .join('\n')

  const handleCopyList = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      haptic.notify('success')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // молча — буфер может быть недоступен
    }
  }

  const handleShareList = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await handleCopyList(text)
      }
    } catch {
      // пользователь отменил шеринг — ничего не делаем
    }
  }


  // Опрос статуса оплаты переживает перезагрузку Mini App (флаг в sessionStorage).
  const pollKey = id ? `payment_polling_${id}` : ''
  const [isPollingPayment, setIsPollingPayment] = useState(
    () => !!pollKey && sessionStorage.getItem(pollKey) === '1',
  )

  // Грузим все рецепты сборника один раз; переключение категорий —
  // мгновенная клиентская фильтрация (без повторных запросов и скелетона).
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recipe-collection', id],
    queryFn: () => recipesApi.getCollection(id!),
  })

  // Словарь объединения ингредиентов (для списка покупок) — грузим только когда включено
  const { data: aliasData } = useQuery({
    queryKey: ['ingredient-aliases'],
    queryFn: () => recipesApi.getIngredientAliases(),
    enabled: shoppingEnabled,
    staleTime: 5 * 60 * 1000,
  })
  const aliasMap: Record<string, string> = aliasData?.data || {}

  // После клика "Купить" опрос API каждые 2 сек
  useEffect(() => {
    if (!isPollingPayment || !id) return
    const interval = setInterval(async () => {
      try {
        const res = await recipesApi.getCollection(id)
        if (res.data?.hasAccess) {
          sessionStorage.removeItem(pollKey)
          window.location.reload()
        }
      } catch {}
    }, 2000)
    const stopTimeout = setTimeout(() => {
      sessionStorage.removeItem(pollKey)
      setIsPollingPayment(false)
    }, 10 * 60 * 1000)
    return () => {
      clearInterval(interval)
      clearTimeout(stopTimeout)
    }
  }, [isPollingPayment, id, pollKey])

  // Отправляем просмотр при загрузке страницы
  useEffect(() => {
    if (id) {
      analyticsApi.trackView({
        itemType: 'RECIPE_COLLECTION',
        itemId: id,
      }).catch(() => {
        // Игнорируем ошибки трекинга
      })
    }
  }, [id])

  const collection = data?.data

  const handlePurchase = async () => {
    try {
      haptic.impact('medium')
      setIsPaymentLoading(true)
      const response = await paymeApi.createPayment({
        collectionId: id!,
        collectionType: 'RECIPE',
        amount: collection.finalPrice,
      })
      
      // Открываем страницу оплаты Payme
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink(response.data.paymentUrl)
      } else {
        window.open(response.data.paymentUrl, '_blank')
      }

      // Запускаем опрос статуса оплаты (переживёт перезагрузку приложения)
      if (pollKey) sessionStorage.setItem(pollKey, '1')
      setIsPollingPayment(true)
    } catch (error) {
      console.error('Payment error:', error)
      alert('Ошибка при создании платежа. Попробуйте еще раз.')
    } finally {
      setIsPaymentLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="bg-white rounded-card h-64" />
          <div className="bg-white rounded-card h-32" />
        </div>
      </div>
    )
  }

  // Защита от белого экрана: если запрос упал или данных нет — показываем ошибку.
  if (isError || !collection) {
    return (
      <ErrorState
        message="Не удалось загрузить сборник."
        onBack={() => navigate(-1)}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-[var(--app-safe-top)] bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{collection.title}</h1>
          <p className="text-sm text-text-secondary">Рецепты с расчетом КБЖУ</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Индикатор ожидания подтверждения оплаты */}
        {isPollingPayment && !collection.hasAccess && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-text-primary flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-primary animate-pulse" />
            Ожидаем подтверждение оплаты. Доступ откроется автоматически.
          </div>
        )}

        {/* Обложка и описание — только на продающей странице (до покупки).
            После покупки пользователь сразу видит поиск, категории и рецепты. */}
        {!collection.hasAccess && collection.coverImage && (
          <img
            src={collection.coverImage}
            alt={collection.title}
            className="w-full h-64 rounded-lg object-cover"
            style={{ objectPosition: collection.coverImagePosition || 'center' }}
          />
        )}

        {!collection.hasAccess && collection.description && (
          <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
            {collection.description}
          </p>
        )}

        {/* Price Card - только если нет доступа */}
        {!collection.hasAccess && (
          <Card>
            <PriceDisplay
              price={collection.price}
              discount={collection.discount}
              discountType={collection.discountType}
              finalPrice={collection.finalPrice}
              discountEndDate={collection.discountEndDate}
            />
            <Button 
              fullWidth 
              className="mt-4"
              onClick={handlePurchase}
              disabled={isPaymentLoading}
            >
              {isPaymentLoading ? 'Создание платежа...' : 'Купить сборник'}
            </Button>
          </Card>
        )}

        {/* Что входит - только если нет доступа */}
        {!collection.hasAccess && (
        <Card>
          <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Что входит:</h2>
          <div className="space-y-1">
            {categories.filter(cat => cat.value !== 'all').map((cat) => {
              const count = collection.recipes?.filter((r: any) => r.category === cat.value).length || 0
              return count > 0 ? (
                <div key={cat.value} className="flex justify-between text-sm">
                  <span className="text-gray-700">{cat.label}:</span>
                  <span className="text-gray-600">{count}</span>
                </div>
              ) : null
            })}
          </div>
        </Card>
        )}

        {/* Поиск по рецептам сборника */}
        {collection.hasAccess && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск рецепта..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary"
                aria-label="Очистить поиск"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Categories - показываем если есть доступ.
            Кнопки категорий показываем только для непустых (где есть рецепты);
            появляются автоматически, как только в категорию добавлен рецепт. */}
        {collection.hasAccess && (() => {
          const presentCategories = categories.filter(
            (c) =>
              c.value !== 'all' &&
              collection.recipes?.some((r: any) => r.category === c.value),
          )
          const filterButtons = [
            { value: 'all', label: 'Все' },
            { value: 'favorites', label: 'Избранное' },
            ...presentCategories,
          ]
          return (
            <div className="grid grid-cols-3 gap-2">
              {filterButtons.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => selectCategory(cat.value)}
                  className={clsx(
                    'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    selectedCategory === cat.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-text-primary border border-gray-200',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )
        })()}

        {/* Recipe Cards - показываем если есть доступ */}
        {collection.hasAccess && collection.recipes && (() => {
          const query = search.trim().toLowerCase()
          const filteredRecipes = collection.recipes.filter((recipe: any) => {
            // Поиск по названию (работает вместе с категорией)
            if (query && !(recipe.title || '').toLowerCase().includes(query)) {
              return false
            }
            // Фильтр по избранному
            if (selectedCategory === 'favorites') {
              return recipe.isFavorite
            }
            // Фильтр по категории
            if (selectedCategory !== 'all') {
              return recipe.category === selectedCategory
            }
            return true
          })

          if (filteredRecipes.length === 0 && query) {
            return (
              <Card className="text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-600 mb-2">Ничего не найдено</h3>
                <p className="text-sm text-gray-500">
                  Попробуйте изменить запрос или выбрать категорию «Все»
                </p>
              </Card>
            )
          }

          if (filteredRecipes.length === 0 && selectedCategory === 'favorites') {
            return (
              <Card className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-600 mb-2">Нет избранных рецептов</h3>
                <p className="text-sm text-gray-500">Добавьте рецепты в избранное, нажав на ❤️</p>
              </Card>
            )
          }

          const renderCard = (recipe: any) => (
            <div
              key={recipe.id}
              onClick={() =>
                !recipe.locked && navigate(`/recipes/${id}/recipe/${recipe.id}`)
              }
              className={clsx(
                'bg-white rounded-xl overflow-hidden shadow-card',
                !recipe.locked && 'cursor-pointer active:scale-95 transition-transform'
              )}
            >
              {/* Image */}
              <div className="relative">
                {recipe.coverImage ? (
                  <img
                    src={recipe.coverImage}
                    alt={recipe.title}
                    className="w-full h-40 object-cover"
                    style={{ objectPosition: recipe.coverImagePosition || 'center' }}
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100" />
                )}
                {recipe.locked && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                )}
                {/* Favorite Button */}
                {!recipe.locked && (
                  <div className="absolute top-2 right-2">
                    <FavoriteButton
                      recipeId={recipe.id}
                      isFavorite={recipe.isFavorite || false}
                      size="sm"
                    />
                  </div>
                )}
                {/* Кнопка «в список покупок» */}
                {shoppingEnabled && !recipe.locked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleInList(recipe)
                    }}
                    aria-label="В список покупок"
                    className={clsx(
                      'absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors',
                      listIds.has(recipe.id)
                        ? 'bg-primary-light text-white'
                        : 'bg-white/90 text-primary-light/70',
                    )}
                  >
                    {listIds.has(recipe.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <ShoppingBag className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="text-sm font-bold text-text-primary mb-2 line-clamp-2 min-h-[2.5rem]">
                  {recipe.title}
                </h3>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  {recipe.caloriesPerServing && (
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{recipe.caloriesPerServing} Kcal</span>
                    </div>
                  )}
                  {recipe.cookingTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{recipe.cookingTime} мин</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )

          // В режиме «Все» — группируем по категориям (завтраки → вторые →
          // салаты → ...) с неявным серым заголовком. Незнакомые — в конец.
          if (selectedCategory === 'all') {
            const known = new Set(categories.map((c) => c.value))
            const groups = categories
              .filter((c) => c.value !== 'all')
              .map((c) => ({
                label: c.label,
                items: filteredRecipes.filter((r: any) => r.category === c.value),
              }))
              .filter((g) => g.items.length > 0)

            const others = filteredRecipes.filter((r: any) => !known.has(r.category))
            if (others.length) groups.push({ label: 'Другое', items: others })

            return (
              <div key="all" className="space-y-5 animate-fadein">
                {groups.map((g) => (
                  <div key={g.label}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                      {g.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">{g.items.map(renderCard)}</div>
                  </div>
                ))}
              </div>
            )
          }

          return (
            <div key={selectedCategory} className="grid grid-cols-2 gap-3 animate-fadein">
              {filteredRecipes.map(renderCard)}
            </div>
          )
        })()}
      </div>

      {/* Компактные плавающие кнопки списка покупок (тест на Сборнике №2) */}
      {shoppingEnabled && collection.hasAccess && listIds.size > 0 && !showList && (
        <div className="fixed right-3 bottom-24 z-30 flex items-center gap-2">
          <button
            onClick={clearList}
            className="bg-white/95 border border-gray-200 text-text-secondary text-xs px-3 py-1.5 rounded-full shadow active:scale-95 transition-transform"
          >
            Очистить
          </button>
          <button
            onClick={() => {
              haptic.impact('light')
              setShowList(true)
            }}
            className="flex items-center gap-1.5 bg-primary text-white text-sm px-3.5 py-1.5 rounded-full shadow active:scale-95 transition-transform"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="font-medium">{listIds.size}</span>
          </button>
        </div>
      )}

      {/* Экран списка покупок — берём общий список (со всех сборников) */}
      {shoppingEnabled && showList && (() => {
        const selected = listRecipes
        const items = buildListItems(selected)
        const text = buildListText(selected)
        return (
          // z-[60] — выше нижней навигации (z-50), иначе она перекрывает низ списка.
          // Экран не скроллится сам (overflow-hidden), шапка фиксирована (flex-none),
          // прокручивается ТОЛЬКО список ниже. Короткий список не «пружинит».
          <div className="fixed inset-0 z-[60] bg-white flex flex-col overflow-hidden">
            {/* Шапка */}
            <div
              className="flex-none bg-white border-b border-gray-200"
              style={{ paddingTop: 'var(--app-safe-top)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setShowList(false)}>
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-text-primary flex-1">Список покупок</h1>
                {/* Компактные действия */}
                <button
                  onClick={() => handleCopyList(text)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Готово' : 'Копировать'}
                </button>
                <button
                  onClick={() => handleShareList(text)}
                  aria-label="Поделиться"
                  className="w-9 h-9 flex items-center justify-center text-text-secondary bg-gray-100 rounded-full active:scale-95 transition-transform"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Чип «N рецептов» — раскрывает список рецептов */}
              <div className="px-4 pb-3">
                <button
                  onClick={() => setShowListRecipes((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary bg-gray-100 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                >
                  <ShoppingBag className="w-4 h-4 text-primary-light" />
                  {selected.length}{' '}
                  {pluralize(selected.length, 'рецепт', 'рецепта', 'рецептов')}
                  <ChevronDown
                    className={clsx('w-4 h-4 transition-transform', showListRecipes && 'rotate-180')}
                  />
                </button>

                {showListRecipes && (
                  <div className="mt-2 space-y-1">
                    {selected.map((r: any) => (
                      <div
                        key={r.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg"
                      >
                        {r.coverImage ? (
                          <img
                            src={r.coverImage}
                            alt={r.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm text-text-primary line-clamp-2">
                          {r.title}
                        </span>
                        <button
                          onClick={() => toggleInList(r)}
                          aria-label="Убрать из списка"
                          className="flex-shrink-0 p-1 text-text-secondary active:scale-90 transition-transform"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Чек-лист — единственная прокручиваемая область.
                Нижний отступ с учётом safe-area, чтобы последний пункт не прятался. */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4"
              style={{
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'calc(2.5rem + var(--app-safe-bottom))',
              }}
            >
              {items.length === 0 ? (
                <p className="text-center text-text-secondary py-12">Список пуст</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((it) => {
                    const done = checkedLines.has(it.name)
                    return (
                      <button
                        key={it.name}
                        onClick={() =>
                          setCheckedLines((prev) => {
                            const next = new Set(prev)
                            if (next.has(it.name)) next.delete(it.name)
                            else next.add(it.name)
                            return next
                          })
                        }
                        className="w-full flex items-start gap-3 py-3 text-left"
                      >
                        <span
                          className={clsx(
                            'flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center',
                            done ? 'bg-primary border-primary' : 'border-gray-300',
                          )}
                        >
                          {done && <Check className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <span className={clsx('flex-1', done && 'line-through text-text-secondary')}>
                          <span className="text-text-primary font-medium">{it.name}</span>
                          {it.detail && (
                            <span className="text-text-secondary text-sm"> — {it.detail}</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
