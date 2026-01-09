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
  },
})
