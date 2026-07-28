import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/admin/login', { username, password }),
}

export const adminUsersApi = {
  getUsers: (search?: string, status?: string) =>
    api.get('/admin/users', { params: { search, status } }),
  createUser: (telegramId: string) =>
    api.post('/admin/users', { telegramId }),
  getUserAccess: (id: string) =>
    api.get(`/admin/users/${id}/access`),
  updateUserAccess: (id: string, workoutIds: string[], recipeIds: string[]) =>
    api.put(`/admin/users/${id}/access`, { workoutIds, recipeIds }),
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),
}

export const adminWorkoutsApi = {
  getCollections: () => api.get('/admin/workouts/collections'),
  getCollection: (id: string) => api.get(`/admin/workouts/collections/${id}`),
  createCollection: (data: any) => api.post('/admin/workouts/collections', data),
  updateCollection: (id: string, data: any) => api.put(`/admin/workouts/collections/${id}`, data),
  deleteCollection: (id: string) => api.delete(`/admin/workouts/collections/${id}`),
  createWorkout: (collectionId: string, data: any) =>
    api.post(`/admin/workouts/collections/${collectionId}/workouts`, data),
  updateWorkout: (id: string, data: any) => api.put(`/admin/workouts/workouts/${id}`, data),
  deleteWorkout: (id: string) => api.delete(`/admin/workouts/workouts/${id}`),
  reorderWorkouts: (collectionId: string, workoutIds: string[]) =>
    api.put(`/admin/workouts/collections/${collectionId}/reorder`, { workoutIds }),
  // Sections API
  getSections: (collectionId: string) => api.get(`/admin/workout-collections/${collectionId}/sections`),
  createSection: (collectionId: string, data: any) =>
    api.post(`/admin/workout-collections/${collectionId}/sections`, data),
  updateSection: (collectionId: string, sectionId: string, data: any) =>
    api.put(`/admin/workout-collections/${collectionId}/sections/${sectionId}`, data),
  deleteSection: (collectionId: string, sectionId: string) =>
    api.delete(`/admin/workout-collections/${collectionId}/sections/${sectionId}`),
  createSectionItem: (collectionId: string, sectionId: string, data: any) =>
    api.post(`/admin/workout-collections/${collectionId}/sections/${sectionId}/items`, data),
  updateSectionItem: (collectionId: string, sectionId: string, itemId: string, data: any) =>
    api.put(`/admin/workout-collections/${collectionId}/sections/${sectionId}/items/${itemId}`, data),
  deleteSectionItem: (collectionId: string, sectionId: string, itemId: string) =>
    api.delete(`/admin/workout-collections/${collectionId}/sections/${sectionId}/items/${itemId}`),
}

export const adminRecipesApi = {
  getCollections: () => api.get('/admin/recipes/collections'),
  getCollection: (id: string) => api.get(`/admin/recipes/collections/${id}`),
  createCollection: (data: any) => api.post('/admin/recipes/collections', data),
  updateCollection: (id: string, data: any) => api.put(`/admin/recipes/collections/${id}`, data),
  deleteCollection: (id: string) => api.delete(`/admin/recipes/collections/${id}`),
  createRecipe: (collectionId: string, data: any) =>
    api.post(`/admin/recipes/collections/${collectionId}/recipes`, data),
  updateRecipe: (id: string, data: any) => api.put(`/admin/recipes/recipes/${id}`, data),
  deleteRecipe: (id: string) => api.delete(`/admin/recipes/recipes/${id}`),
  reorderRecipes: (collectionId: string, recipeIds: string[]) =>
    api.put(`/admin/recipes/collections/${collectionId}/reorder`, { recipeIds }),
}

export const adminNewsApi = {
  getNews: () => api.get('/admin/news'),
  getNewsById: (id: string) => api.get(`/admin/news/${id}`),
  createNews: (data: any) => api.post('/admin/news', data),
  updateNews: (id: string, data: any) => api.put(`/admin/news/${id}`, data),
  deleteNews: (id: string) => api.delete(`/admin/news/${id}`),
}

export const adminBroadcastApi = {
  send: (data: {
    message: string
    imageUrl?: string
    buttonText?: string
    buttonUrl?: string
    test?: boolean
  }) => api.post('/admin/broadcast', data),
}

export const adminIngredientsApi = {
  getOverview: () => api.get('/admin/ingredients'),
  createGroup: (name: string) => api.post('/admin/ingredients/groups', { name }),
  renameGroup: (id: string, name: string) => api.put(`/admin/ingredients/groups/${id}`, { name }),
  deleteGroup: (id: string) => api.delete(`/admin/ingredients/groups/${id}`),
  assign: (groupId: string, aliases: string[]) =>
    api.post('/admin/ingredients/assign', { groupId, aliases }),
  unassign: (aliases: string[]) => api.post('/admin/ingredients/unassign', { aliases }),
}

export const adminClientsApi = {
  list: () => api.get('/admin/clients'),
  mark: (userId: string) => api.post('/admin/clients', { userId }),
  card: (id: string) => api.get(`/admin/clients/${id}`),
  archive: (id: string) => api.patch(`/admin/clients/${id}/archive`),
  updateNotes: (id: string, notes: string) =>
    api.patch(`/admin/clients/${id}/notes`, { notes }),
  addMeasurement: (id: string, data: any) =>
    api.post(`/admin/clients/${id}/measurements`, data),
  deleteMeasurement: (id: string, measurementId: string) =>
    api.delete(`/admin/clients/${id}/measurements/${measurementId}`),
  photos: (id: string) => api.get(`/admin/clients/${id}/photos`),
  addPhoto: (id: string, file: File, angle: string, date?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('angle', angle)
    if (date) fd.append('date', date)
    return api.post(`/admin/clients/${id}/photos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deletePhoto: (id: string, photoId: string) =>
    api.delete(`/admin/clients/${id}/photos/${photoId}`),
  photoFileUrl: (id: string, photoId: string) =>
    `/admin/clients/${id}/photos/${photoId}/file`,
}

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export const analyticsApi = {
  getCollectionStats: () => 
    api.get('/analytics/collection-stats'),
  getRecipeStats: () => 
    api.get('/analytics/recipe-stats'),
  getContentStats: (type?: string) => 
    api.get('/analytics/content-stats', { params: { type } }),
  getOverallStats: () => 
    api.get('/analytics/overall'),
  getUserActivity: () =>
    api.get('/analytics/user-activity'),
  getUserViews: (userId: string) =>
    api.get('/analytics/user-views', { params: { userId } }),
  getPurchases: () =>
    api.get('/analytics/purchases'),
  getSales: (params: { from?: string; to?: string; collectionId?: string }) =>
    api.get('/analytics/sales', { params }),
  getEngagement: () => api.get('/analytics/engagement'),
  getBroadcasts: () => api.get('/analytics/broadcasts'),
  getAds: () => api.get('/analytics/ads'),
  getManualPayments: () =>
    api.get('/analytics/manual-payments'),
  createManualPayment: (data: {
    collectionId: string
    collectionType: 'WORKOUT_COLLECTION' | 'RECIPE_COLLECTION'
    amount: number
    telegramId?: string
    note?: string
    paidAt?: string
  }) => api.post('/analytics/manual-payments', data),
  deleteManualPayment: (id: string) =>
    api.delete(`/analytics/manual-payments/${id}`),
}
