import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * Playground-specific Vite config for building as a standalone app.
 * Deployed to Cloudflare Workers as 'vuesiplay'.
 */
export default defineConfig({
  plugins: [vue()],

  root: '.',
  base: '/',

  resolve: {
    alias: {
      // Resolve 'vuesip' imports to source (dist is gitignored)
      vuesip: resolve(__dirname, 'src/index.ts'),
      '@': resolve(__dirname, 'src'),
      '@/composables': resolve(__dirname, 'src/composables'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/stores': resolve(__dirname, 'src/stores'),
      '@/plugins': resolve(__dirname, 'src/plugins'),
      '@/providers': resolve(__dirname, 'src/providers'),
    },
  },

  build: {
    outDir: 'dist-playground',
    emptyOutDir: true,
    // Playground includes full PrimeVue + VueSIP demo - higher threshold acceptable
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        // Code splitting for better caching and faster loads
        manualChunks: {
          // Vue core
          'vue-vendor': ['vue', 'pinia'],
          // PrimeVue UI library (largest chunk)
          primevue: [
            'primevue/config',
            'primevue/tooltip',
            'primevue/button',
            'primevue/inputtext',
            'primevue/card',
            'primevue/panel',
            'primevue/datatable',
            'primevue/column',
            'primevue/tag',
            'primevue/message',
            'primevue/divider',
            'primevue/toolbar',
            'primevue/badge',
            'primevue/chip',
            'primevue/usetoast',
          ],
          // VueSIP library
          vuesip: ['./src/composables/index.ts', './src/core/index.ts'],
        },
      },
    },
    // Enable source maps for debugging in production
    sourcemap: false,
  },

  server: {
    port: 5173,
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['vue', 'pinia', 'primevue/config'],
  },
})
