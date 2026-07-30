import { createContext, useContext, useEffect, useState } from 'react'
import { initTelegram, getTelegramInitData, tg } from '@/lib/telegram'
import { authApi, analyticsApi } from '@/lib/api'

// Если приложение открыто по кнопке рассылки (?bc=<id>) — фиксируем переход
const trackBroadcastClick = () => {
  try {
    const bc = new URLSearchParams(window.location.search).get('bc')
    if (bc) {
      analyticsApi
        .trackView({ itemType: 'BROADCAST' as any, itemId: bc })
        .catch(() => {})
    }
  } catch {
    /* не мешаем запуску */
  }
}

// Суффикс рекламной метки → стартовый экран. Метка insta_reels5_sb1
// откроет карточку сборника №1; статистика при этом считает полную метку.
const AD_ROUTES: Record<string, string> = {
  sb1: '/recipes/1af56da3-1140-489a-966c-bbc74880dad3', // Сборник рецептов №1
  sb2: '/recipes/f2c682f5-030f-4c3c-908a-6b27055e81a5', // Сборник рецептов №2
  recipes: '/recipes',
  workouts: '/workouts',
}

// Переход по рекламе: ссылка вида t.me/<bot>?startapp=<метка> кладёт метку
// в start_param — фиксируем как ContentView типа AD (itemId = метка).
const trackAdClick = () => {
  try {
    const sp =
      (tg as any)?.initDataUnsafe?.start_param ||
      new URLSearchParams(window.location.search).get('tgWebAppStartParam')
    if (sp) {
      analyticsApi
        .trackView({ itemType: 'AD' as any, itemId: String(sp).slice(0, 64) })
        .catch(() => {})
      // Роутинг по суффиксу метки: заберёт AdRedirect внутри роутера
      const suffix = String(sp).split('_').pop() || ''
      if (AD_ROUTES[suffix]) {
        sessionStorage.setItem('ad_route', AD_ROUTES[suffix])
      }
    }
  } catch {
    /* не мешаем запуску */
  }
}

interface TelegramContextType {
  user: any
  isLoading: boolean
  isAuthenticated: boolean
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
})

export const useTelegram = () => useContext(TelegramContext)

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const authenticate = async () => {
      initTelegram()
      const initData = getTelegramInitData()

      // Стандартный путь: приложение открыто внутри Telegram и есть initData.
      if (initData) {
        try {
          const response = await authApi.loginTelegram(initData)
          localStorage.setItem('token', response.data.access_token)
          setUser(response.data.user)
          setIsAuthenticated(true)
          trackBroadcastClick()
          trackAdClick()
        } catch (error) {
          // ВАЖНО: при сбое НЕ считаем пользователя авторизованным —
          // иначе он работал бы без токена (все запросы без доступа).
          console.error('Telegram auth failed:', error)
          setHasError(true)
          setIsAuthenticated(false)
        } finally {
          setIsLoading(false)
        }
        return
      }

      // Нет initData. В dev-сборке — вход через dev-login для локальной отладки.
      if (import.meta.env.DEV) {
        try {
          const response = await authApi.devLogin('123456789')
          localStorage.setItem('token', response.data.access_token)
          setUser(response.data.user)
          setIsAuthenticated(true)
        } catch (error) {
          console.error('Dev login failed:', error)
          setIsAuthenticated(false)
        } finally {
          setIsLoading(false)
        }
        return
      }

      // Прод вне Telegram: Mini App должно открываться из Telegram.
      setHasError(true)
      setIsAuthenticated(false)
      setIsLoading(false)
    }

    authenticate()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold text-text-primary mb-2">
          Не удалось войти
        </p>
        <p className="text-sm text-text-secondary mb-6">
          Откройте приложение из Telegram и попробуйте ещё раз.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-white py-3 px-6 rounded-xl font-medium hover:opacity-90"
        >
          Повторить
        </button>
      </div>
    )
  }

  return (
    <TelegramContext.Provider value={{ user, isLoading, isAuthenticated }}>
      {children}
    </TelegramContext.Provider>
  )
}
