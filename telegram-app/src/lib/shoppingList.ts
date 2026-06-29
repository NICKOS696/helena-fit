// Общий список покупок (сквозной для всех сборников).
// Храним «снимки» рецептов, чтобы собрать список без догрузки с сервера.
export interface ShoppingRecipe {
  id: string
  collectionId: string
  title: string
  coverImage?: string | null
  ingredients: any
}

const KEY = 'shopping_list_v2'

export function getShoppingList(): ShoppingRecipe[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveShoppingList(list: ShoppingRecipe[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* no-op */
  }
}

export function isInShoppingList(id: string): boolean {
  return getShoppingList().some((r) => r.id === id)
}

// Добавляет/убирает рецепт, возвращает новый список
export function toggleShoppingList(recipe: ShoppingRecipe): ShoppingRecipe[] {
  const list = getShoppingList()
  const exists = list.some((r) => r.id === recipe.id)
  const next = exists ? list.filter((r) => r.id !== recipe.id) : [...list, recipe]
  saveShoppingList(next)
  return next
}

export function clearShoppingList(): ShoppingRecipe[] {
  saveShoppingList([])
  return []
}
