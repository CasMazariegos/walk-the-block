import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Public path. `/` is the default for local dev and for
 * https://walk-the-block.casmazariegos.workers.dev
 * Set VITE_BASE (for example `/walk-the-block/`) to build for a subpath.
 * `npm run cf:deploy` always passes `--base /`, which overrides this.
 */
function publicBase(): string {
  const configured = process.env.VITE_BASE?.trim() || '/'
  if (configured === '/' || configured === './') return configured
  const withLeading = configured.startsWith('/') || configured.startsWith('.') ? configured : `/${configured}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export default defineConfig({
  base: publicBase(),
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
