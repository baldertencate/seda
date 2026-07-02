import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/seda/'

// https://vite.dev/config/
export default defineConfig({
  base,

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icons/icon.svg', 'pwa-icons/maskable-icon.svg'],
      manifest: {
        name: 'Ear Trainer',
        short_name: 'Ear Trainer',
        description: 'A mobile-first musical ear-training exercise.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        theme_color: '#245f63',
        background_color: '#f7f4ef',
        icons: [
          {
            src: `${base}pwa-icons/icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: `${base}pwa-icons/maskable-icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,mp3}'],
        maximumFileSizeToCacheInBytes: 7 * 1024 * 1024,
      },
    }),
  ],
})
