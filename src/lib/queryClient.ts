import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep stale time short so reopening the PWA after a change made on
      // the web (or another device) refetches instead of serving stale
      // persisted data for minutes.
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24, // 24h — deve essere >= maxAge del persister
      retry: 2,
      // useRealtimeCards already invalidates queries on visibilitychange, so
      // refetchOnWindowFocus would just fire a duplicate request on every
      // tab focus. Reconnect refetch stays on because realtime can be silently
      // dropped while the socket is down.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})
