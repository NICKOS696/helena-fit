import axios from 'axios'
import { getTelegramInitData } from '@/lib/telegram'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Тихий повторный вход по initData. Общий промис — чтобы пачка одновременных 401
// не породила несколько параллельных логинов.
let reloginPromise: Promise<string | null> | null = null

const relogin = async (): Promise<string | null> => {
  const initData = getTelegramInitData()
  if (!initData) return null
  try {
    // Чистый axios, мимо интерсепторов — иначе рекурсия
    const res = await axios.post(`${API_URL}/auth/telegram`, { initData })
    const token = res.data?.access_token
    if (token) {
      localStorage.setItem('token', token)
      return token
    }
  } catch {
    /* initData устарела или сеть — вернём null */
  }
  return null
}

// Токен мог протухнуть (JWT 7 дней, а Telegram держит Mini App «замороженным»
// неделями) или стартовый логин моргнул из-за VPN. На 401 тихо перелогиниваемся
// и повторяем исходный запрос — пользователь ничего не замечает.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {}
    const url: string = config.url || ''
    if (error.response?.status === 401 && !config._retried && !url.includes('/auth/')) {
      config._retried = true
      if (!reloginPromise) {
        reloginPromise = relogin().finally(() => {
          reloginPromise = null
        })
      }
      const token = await reloginPromise
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
        return api.request(config)
      }
      localStorage.removeItem('token')
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  loginTelegram: (initData: string) =>
    api.post('/auth/telegram', { initData }),
  devLogin: (telegramId: string) =>
    api.post('/auth/dev-login', { telegramId }),
}

export const usersApi = {
  getProfile: () => api.get('/users/me'),
  getAccess: () => api.get('/users/me/access'),
  getTransactions: () => api.get('/users/me/transactions'),
}

export const workoutsApi = {
  getCollections: () => api.get('/workouts'),
  getCollection: (id: string) => api.get(`/workouts/${id}`),
  toggleProgress: (itemId: string) => api.post(`/workouts/progress/${itemId}/toggle`),
}

export const recipesApi = {
  getCollections: () => api.get('/recipes'),
  getCollection: (id: string, category?: string) =>
    api.get(`/recipes/${id}`, { params: { category } }),
  getRecipe: (collectionId: string, recipeId: string) =>
    api.get(`/recipes/${collectionId}/recipe/${recipeId}`),
  getIngredientAliases: () => api.get('/recipes/ingredient-aliases'),
  getFavorites: () => api.get('/recipes/favorites/all'),
  addToFavorites: (recipeId: string) => api.post(`/recipes/favorites/${recipeId}`),
  removeFromFavorites: (recipeId: string) => api.delete(`/recipes/favorites/${recipeId}`),
}

export const newsApi = {
  getNews: (page = 1, limit = 10) =>
    api.get('/news', { params: { page, limit } }),
  getNewsById: (id: string) => api.get(`/news/${id}`),
}

export const paymeApi = {
  createPayment: (data: {
    collectionId: string;
    collectionType: 'WORKOUT' | 'RECIPE';
    amount: number;
  }) => api.post('/payme/create-payment', data),
}

// Клиентская зона (для клиентов тренера)
export const clientsApi = {
  getMe: () => api.get('/clients/me'),
  getMeasurements: () => api.get('/clients/me/measurements'),
  addMeasurement: (data: any) => api.post('/clients/me/measurements', data),
  deleteMeasurement: (id: string) => api.delete(`/clients/me/measurements/${id}`),
  submitQuestionnaire: (data: { fullName: string; birthDate: string; health: string }) =>
    api.post('/clients/me/questionnaire', data),
  getFeedback: () => api.get('/clients/me/feedback'),
  addFeedback: (text: string) => api.post('/clients/me/feedback', { text }),
  deleteFeedback: (id: string) => api.delete(`/clients/me/feedback/${id}`),
  getPhotos: () => api.get('/clients/me/photos'),
  // date — чтобы дополнить или заменить фото в прошлом фотоотчёте (без неё — сегодня)
  addPhoto: (file: File, angle: string, date?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('angle', angle)
    if (date) fd.append('date', date)
    return api.post('/clients/me/photos', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deletePhoto: (id: string) => api.delete(`/clients/me/photos/${id}`),
  // Файл фото приватный — грузим blob'ом с токеном (см. AuthImage)
  photoFileUrl: (id: string) => `/clients/me/photos/${id}/file`,
}

export const analyticsApi = {
  trackView: (data: {
    itemType: 'WORKOUT_COLLECTION' | 'RECIPE_COLLECTION' | 'WORKOUT' | 'RECIPE' | 'NEWS';
    itemId: string;
  }) => api.post('/analytics/track', data),
}
