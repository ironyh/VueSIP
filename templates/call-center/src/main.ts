import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import 'primevue/resources/themes/lara-dark-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import App from './App.vue'

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
