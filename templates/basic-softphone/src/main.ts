import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primeicons/primeicons.css'

const app = createApp(App)
app.use(PrimeVue)
app.mount('#app')

// Optional: register service worker when SW notifications are enabled
if ('serviceWorker' in navigator) {
  const SW_FLAG = 'vuesip_sw_notifications_enabled'
  try {
    const enabled = localStorage.getItem(SW_FLAG) === 'true'
    if (enabled) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
    }
  } catch {
    // ignore storage errors
  }
}
