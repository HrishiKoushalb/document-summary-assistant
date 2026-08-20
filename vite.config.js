import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vercel/Netlify (see README) always serve the built app from the domain
  // root, so we use the default absolute base ('/'). This also keeps the
  // hardcoded '/tesseract/...' asset paths in ocrExtractor.js unambiguous.
  worker: {
    format: 'es',
  },
})
