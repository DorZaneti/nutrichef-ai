import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'NutriChef AI',
        short_name: 'NutriChef',
        description: 'Your Personal Recipe & Nutrition Assistant',
        theme_color: '#667eea',
        background_color: '#667eea',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Chat and sync are never safe to serve stale — always hit the network.
        navigateFallbackDenylist: [/^\/api\/chat/, /^\/api\/sync/],
        runtimeCaching: [
          {
            urlPattern: /\/api\/recipe(s)?(\/|\?|$)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'recipe-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /\/api\/trends/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'trends-api-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/www\.themealdb\.com\/images\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'themealdb-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
