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
        // skipWaiting: activate new SW quickly, but WITHOUT clientsClaim so
        // existing open pages are NOT taken over and forced to reload.
        // Users get the update silently the next time they open the app fresh.
        skipWaiting: true,
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
        theme_color: '#0a0a12',
        background_color: '#0a0a12',
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
          // Keep @zxing in its own chunk so it doesn't bleed into the main
          // bundle. CardScanner is lazy-loaded; the dynamic import will pull
          // this chunk only when the user taps "Scansiona".
          if (id.includes('@zxing')) return 'scanner-vendor'
        },
      },
    },
  },
})
