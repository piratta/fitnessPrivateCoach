import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Private Fitness Coach',
        short_name: 'FitnessCoach',
        description: 'Aplicación de entrenamiento personal y registro de rutinas.',
        theme_color: '#1a1a1a',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Increase maximum size for files to be cached
        maximumFileSizeToCacheInBytes: 3000000, 
        runtimeCaching: [
          {
            // Cache API GET requests
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Background Sync for POST/PUT requests (logging workouts)
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'workout-syncQueue',
                options: {
                  maxRetentionTime: 24 * 60 // 24 hours in minutes
                }
              }
            }
          },
          {
            // Background Sync for PUT requests as well
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
            method: 'PUT',
            options: {
              backgroundSync: {
                name: 'workout-syncQueue-put',
                options: {
                  maxRetentionTime: 24 * 60 // 24 hours in minutes
                }
              }
            }
          }
        ]
      }
    })
  ],
})
