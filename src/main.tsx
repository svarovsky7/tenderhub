import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

// Create a client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут
      cacheTime: 30 * 60 * 1000, // 30 минут в кеше
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Не перезагружать при монтировании если есть кеш
      refetchInterval: false, // Отключить авто-обновление
    },
    mutations: {
      retry: 0, // Не повторять мутации при ошибках
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
