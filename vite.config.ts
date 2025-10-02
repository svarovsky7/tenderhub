import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    '__VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
      timeout: 5000
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['lodash-es', 'antd', 'react', 'react-dom']
  },
  build: {
    sourcemap: false, // Disable sourcemaps in production
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Simplified chunking to avoid React context issues
          if (id.includes('node_modules')) {
            // XLSX library in separate chunk due to large size
            if (id.includes('xlsx')) {
              return 'xlsx';
            }

            // All other vendor libs together to avoid module resolution issues
            return 'vendor';
          }
        }
      }
    }
  }
})
