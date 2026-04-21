import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ...(process.env.ANALYZE === 'true'
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue')) {
            return 'vendor-vue'
          }

          if (
            id.includes('/src/core/Ami') ||
            id.includes('/src/composables/useAmi') ||
            id.includes('/src/services/AmiService') ||
            id.includes('/src/types/ami') ||
            id.includes('/src/types/system')
          ) {
            return 'vuesip-ami'
          }

          if (
            id.includes('/src/providers/call-center') ||
            id.includes('/src/composables/useAgent') ||
            id.includes('/src/composables/useAmiCallback') ||
            id.includes('/src/types/agent') ||
            id.includes('/src/types/callback')
          ) {
            return 'vuesip-call-center'
          }

          if (
            id.includes('/src/core/') ||
            id.includes('/src/composables/') ||
            id.includes('/src/stores/') ||
            id.includes('/src/services/') ||
            id.includes('/src/types/') ||
            id.includes('/src/utils/')
          ) {
            return 'vuesip-core'
          }
        },
      },
    },
  },
  server: {
    port: 5174,
    host: true,
  },
})
