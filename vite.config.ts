import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      workbox: {
        // Activate new service worker immediately without waiting for all tabs to close
        skipWaiting: true,
        clientsClaim: true,
        // Never cache Supabase API calls — always go to network
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Kard — Portafoglio Condiviso',
        short_name: 'Kard',
        description: 'Portafoglio carte condiviso per la famiglia',
        theme_color: '#0f0826',
        background_color: '#0f0826',
        display: 'standalone',
        start_url: '/Kard/',
        scope: '/Kard/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: '/Kard/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'react-vendor'
          if (id.includes('@tanstack/react-query')) return 'query-vendor'
          if (id.includes('@supabase')) return 'supabase-vendor'
          if (id.includes('recharts')) return 'chart-vendor'
        },
      },
    },
  },
})
