import { createContext, useContext, useEffect, useState } from 'react'
import { initTelegram, getTelegramInitData, getTelegramUser } from '@/lib/telegram'
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

  useEffect(() => {
    const authenticate = async () => {
      try {
        initTelegram()
        const initData = getTelegramInitData()
        const telegramUser = getTelegramUser()

        if (initData) {
          const response = await authApi.loginTelegram(initData)
          localStorage.setItem('token', response.data.access_token)
          setUser(response.data.user)
          setIsAuthenticated(true)
        } else if (telegramUser) {
          setUser(telegramUser)
          setIsAuthenticated(true)
        } else {
          // Режим разработки: получаем токен через dev-login
          console.log('🔧 Development mode: Using dev-login')
          try {
            const response = await authApi.devLogin('123456789')
            localStorage.setItem('token', response.data.access_token)
            setUser(response.data.user)
            setIsAuthenticated(true)
          } catch (error) {
            console.error('Dev login failed:', error)
            // Fallback: создаем mock пользователя без токена
            const mockUser = {
              id: 123456789,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
            }
            setUser(mockUser)
            setIsAuthenticated(false)
          }
        }
      } catch (error) {
        console.error('Authentication failed:', error)
        // В режиме разработки все равно продолжаем работу
        setIsAuthenticated(true)
      } finally {
        setIsLoading(false)
      }
    }

    authenticate()
  }, [])

  return (
    <TelegramContext.Provider value={{ user, isLoading, isAuthenticated }}>
      {children}
    </TelegramContext.Provider>
  )
}
