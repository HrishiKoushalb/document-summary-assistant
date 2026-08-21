import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Everything the app needs - OCR engine, language model, self-hosted
      // fonts - is already same-origin (see README), so precaching it all
      // is what makes offline actually work end to end, not just the app
      // shell. Default file-size cap is 2MB; the OCR WASM engine and the
      // PDF worker are both bigger than that.
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,woff2,png,svg,gz}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Document Summary Assistant',
        short_name: 'Doc Summary',
        description: 'Upload any PDF or scanned image and get a smart, adjustable-length summary with key points highlighted — extracted and summarized entirely in your browser.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#edeee6',
        theme_color: '#c68a2e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
})
