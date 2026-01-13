import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      console.log('SW registered:', registration.scope)
    } catch (error) {
      console.log('SW registration failed:', error)
    }
  })
}

createApp(App).mount('#app')
