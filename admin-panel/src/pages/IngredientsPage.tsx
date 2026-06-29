import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminIngredientsApi } from '@/lib/api'
import { Plus, X, Trash2, Search, ExternalLink } from 'lucide-react'

interface Group {
  id: string
  name: string
  aliases: string[]
}

interface Usage {
  recipeId: string
  recipeTitle: string
  collectionId: string
}

export const IngredientsPage = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [newGroup, setNewGroup] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetGroup, setTargetGroup] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ingredients'],
    queryFn: () => adminIngredientsApi.getOverview(),
  })

  const overview = data?.data || { groups: [], unassigned: [], usage: {} }
  const groups: Group[] = overview.groups || []
  const unassigned: string[] = overview.unassigned || []
  const usage: Record<string, Usage[]> = overview.usage || {}

  // Переход в рецепт для правки названия (откроется на редактирование)
  const goToRecipe = (u: Usage) => navigate(`/recipes/${u.collectionId}?recipe=${u.recipeId}`)

  // Все мутации возвращают свежую сводку — кладём её в кэш
  const onData = (res: any) => queryClient.setQueryData(['admin-ingredients'], res)

  const createMut = useMutation({
    mutationFn: (name: string) => adminIngredientsApi.createGroup(name),
    onSuccess: (res) => {
      onData(res)
      setNewGroup('')
    },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => adminIngredientsApi.deleteGroup(id),
    onSuccess: onData,
  })
  const assignMut = useMutation({
    mutationFn: ({ groupId, aliases }: { groupId: string; aliases: string[] }) =>
      adminIngredientsApi.assign(groupId, aliases),
    onSuccess: (res) => {
      onData(res)
      setSelected(new Set())
    },
  })
  const unassignMut = useMutation({
    mutationFn: (aliases: string[]) => adminIngredientsApi.unassign(aliases),
    onSuccess: onData,
  })

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const filteredUnassigned = unassigned.filter((n) =>
    n.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const handleAddToGroup = () => {
    if (!targetGroup || selected.size === 0) return
    assignMut.mutate({ groupId: targetGroup, aliases: [...selected] })
  }

  if (isLoading) {
    return <div className="p-4 md:p-8">Загрузка...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Ингредиенты</h1>
      <p className="text-gray-600 mb-6">
        Объединяйте разные написания одного продукта в группы — это нужно для списка покупок.
        Например, «яйцо», «яйца», «яичный белок» → группа «Яйца».
      </p>

      {/* Создание группы */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && newGroup.trim() && createMut.mutate(newGroup.trim())}
          placeholder="Название группы (напр. «Яйца»)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
        <button
          onClick={() => newGroup.trim() && createMut.mutate(newGroup.trim())}
          disabled={!newGroup.trim() || createMut.isPending}
          className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Создать группу
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Нераспределённые */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-3">
            Нераспределённые <span className="text-gray-400 font-normal">({unassigned.length})</span>
          </h2>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск ингредиента..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {filteredUnassigned.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              {unassigned.length === 0 ? 'Все ингредиенты распределены 🎉' : 'Ничего не найдено'}
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {filteredUnassigned.map((name) => (
                <div key={name} className="px-3 py-2 hover:bg-gray-50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(name)}
                      onChange={() => toggleSelect(name)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-800">{name}</span>
                  </label>
                  {/* В каких рецептах встречается — клик ведёт в рецепт на правку */}
                  {usage[name]?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1 pl-7">
                      {usage[name].map((u) => (
                        <button
                          key={u.recipeId}
                          onClick={() => goToRecipe(u)}
                          title="Открыть рецепт для правки"
                          className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full"
                        >
                          {u.recipeTitle}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Действие: добавить выбранные в группу */}
          {selected.size > 0 && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2 items-stretch">
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">→ выберите группу</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddToGroup}
                disabled={!targetGroup || assignMut.isPending}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                Добавить ({selected.size})
              </button>
            </div>
          )}
        </div>

        {/* Группы */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-3">
            Группы <span className="text-gray-400 font-normal">({groups.length})</span>
          </h2>

          {groups.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Групп пока нет. Создайте первую выше.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{g.name}</h3>
                    <button
                      onClick={() => {
                        if (confirm(`Удалить группу «${g.name}»? Её ингредиенты вернутся в нераспределённые.`)) {
                          deleteMut.mutate(g.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Удалить группу"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {g.aliases.length === 0 ? (
                    <p className="text-xs text-gray-400">Пусто — добавьте названия слева</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {g.aliases.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded-full"
                        >
                          {a}
                          <button
                            onClick={() => unassignMut.mutate([a])}
                            className="text-gray-400 hover:text-red-600"
                            title="Убрать из группы"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
