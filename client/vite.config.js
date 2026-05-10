import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    legacy({
      targets: ['> 0.5%', 'last 2 versions', 'not dead', 'Chrome >= 38', 'Safari >= 10', 'Firefox >= 52'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime', 'whatwg-fetch', 'intersection-observer', 'core-js/stable']
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon.png', 'icons.svg', 'manifest-admin.json'],
      manifest: {
        name: 'Gold Price TV Display',
        short_name: 'GoldTV',
        description: "Affichage en temps réel du prix de l'or pour Smart TV et Mobile",
        theme_color: '#fbbf24',
        background_color: '#0b0f19',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,json}'],
        maximumFileSizeToCacheInBytes: 5242880, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['recharts', 'react-is']
  }
})