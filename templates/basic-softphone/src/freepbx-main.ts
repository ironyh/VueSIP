import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import 'primevue/resources/themes/lara-light-indigo/theme.css'
import 'primevue/resources/primevue.css'
import 'primeicons/primeicons.css'
import FreePBXApp from './FreePBXApp.vue'

const app = createApp(FreePBXApp)
app.use(PrimeVue)
app.mount('#app')