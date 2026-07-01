import { getTelegramUser } from '@/lib/telegram'

// Telegram ID, которым показываем закрытые превью-фичи (владелец Николай + жена ElenA).
// Для боевого запуска доступ будет открываться через админку по каждому клиенту.
export const PREVIEW_IDS = [89761488, 449178486]

export const isPreviewUser = (): boolean => {
  const id = getTelegramUser()?.id
  return typeof id === 'number' && PREVIEW_IDS.includes(id)
}
