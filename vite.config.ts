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
    exclude: ['lucide-react'],
    include: ['lodash-es', 'antd', 'react', 'react-dom']
  },
  build: {
    sourcemap: false, // Disable sourcemaps in production
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Create vendor chunk for large third-party libraries
          if (id.includes('node_modules')) {
            // XLSX library in separate chunk due to large size (425KB)
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            
            // Ant Design components in separate chunk
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'antd';
            }
            
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            
            // TanStack Query
            if (id.includes('@tanstack')) {
              return 'tanstack';
            }
            
            // Other utilities
            if (id.includes('lodash') || id.includes('dayjs') || id.includes('yup')) {
              return 'utils';
            }
            
            // DnD Kit
            if (id.includes('@dnd-kit')) {
              return 'dnd-kit';
            }
            
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            
            // All other vendor libs
            return 'vendor';
          }
          
          // Split large application chunks
          // BOQ related components
          if (id.includes('BOQ') || id.includes('boq')) {
            return 'boq';
          }
          
          // Tender related components
          if (id.includes('tender') && !id.includes('BOQ')) {
            return 'tender';
          }
          
          // Admin pages
          if (id.includes('admin')) {
            return 'admin';
          }
          
          // Financial components
          if (id.includes('financial') || id.includes('commercial') || id.includes('markup')) {
            return 'financial';
          }
        }
      }
    }
  }
})
