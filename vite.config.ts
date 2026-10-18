import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Project site: https://casmazariegos.github.io/walk-the-block/
export default defineConfig({
  base: '/walk-the-block/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
