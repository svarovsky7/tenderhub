import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
      timeout: 5000
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
})
