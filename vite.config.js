import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  // TEMPORARY: minification turns real variable/method names into single
  // letters, which makes Safari's error messages (e.g. "near 'n of e'")
  // unreadable. Disabling it produces a much more legible error with real
  // names, to identify a specific missing-API issue on iOS. Revert once
  // that's found.
  build: {
    minify: false,
  },
})
