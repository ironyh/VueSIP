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
  build: {
    outDir: 'dist-freepbx',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'freepbx-index.html'),
      },
    },
  },
  server: {
    port: 3003,
    host: true,
  },
})