import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Mirrors the vercel.json rewrite so VITE_API_BASE_URL can stay
    // '/api/v1' locally too — dev server proxies to the same Edge Function.
    proxy: {
      '/api/v1': {
        target: 'https://cuypgdqbqiqctvbqfgjd.supabase.co/functions/v1/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, ''),
      },
    },
  },
})
