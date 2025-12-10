import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Playground-specific Vite config for building as a standalone app
export default defineConfig({
  plugins: [vue()],

  root: '.',
  base: '/',

  resolve: {
    alias: {
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
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },

  server: {
    port: 5173,
  },
})
