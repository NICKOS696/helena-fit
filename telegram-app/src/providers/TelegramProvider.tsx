import { createContext, useContext, useEffect, useState } from 'react'
import { initTelegram, getTelegramInitData } from '@/lib/telegram'
import { authApi } from '@/lib/api'

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
