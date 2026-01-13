import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      vuesip: resolve(__dirname, '../../dist/vuesip.js'),
    },
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api/46elks': {
        target: 'https://api.46elks.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/46elks/, ''),
        secure: true,
      },
    },
  },
})
