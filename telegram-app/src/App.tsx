import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TelegramProvider } from './providers/TelegramProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './routes'

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
            <AppRoutes />
          </BrowserRouter>
        </TelegramProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
