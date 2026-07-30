import { BrowserRouter, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TelegramProvider } from './providers/TelegramProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ScrollToTop } from './components/ScrollToTop'
import { AppRoutes } from './routes'

// Вход по рекламной метке с маршрутом (см. AD_ROUTES в TelegramProvider):
// одноразово переносим пользователя на целевой экран вместо главной.
const AdRedirect = () => {
  const navigate = useNavigate()
  useEffect(() => {
    const path = sessionStorage.getItem('ad_route')
    if (path) {
      sessionStorage.removeItem('ad_route')
      navigate(path, { replace: true })
    }
  }, [navigate])
  return null
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TelegramProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AdRedirect />
            <AppRoutes />
          </BrowserRouter>
        </TelegramProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
