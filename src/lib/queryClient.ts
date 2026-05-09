import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 min — riduce refetch inutili con la cache persistita
      gcTime: 1000 * 60 * 60 * 24, // 24h — deve essere >= maxAge del persister
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
