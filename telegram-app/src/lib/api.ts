import axios from 'axios'

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
}

export const recipesApi = {
  getCollections: () => api.get('/recipes'),
  getCollection: (id: string, category?: string) =>
    api.get(`/recipes/${id}`, { params: { category } }),
  getRecipe: (collectionId: string, recipeId: string) =>
    api.get(`/recipes/${collectionId}/recipe/${recipeId}`),
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
