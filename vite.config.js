import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  // TEMPORARY: the legacy-build fix (pdfExtractor.js) did not clear the
  // iOS Safari crash - UA shows Safari 26.6, newer than expected, so the
  // "old engine missing a new built-in" theory needs re-checking against
  // this device's actual unminified error. Revert once diagnosed.
  build: {
    minify: false,
  },
})
