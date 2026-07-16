import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  /** SUPER_ADMIN | ADMIN — полный доступ; MODERATOR — тренер (Пользователи/Клиенты/Статистика) */
  role: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  role: null,
  login: async () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    setIsAuthenticated(!!token)
    setRole(localStorage.getItem('admin_role'))
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password)
    localStorage.setItem('admin_token', response.data.access_token)
    const r = response.data.admin?.role || 'ADMIN'
    localStorage.setItem('admin_role', r)
    setRole(r)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_role')
    setRole(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
