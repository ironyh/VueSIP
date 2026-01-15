import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import ToastService from 'primevue/toastservice'
import App from './App.vue'
import 'primevue/resources/themes/lara-dark-blue/theme.css'
import 'primeicons/primeicons.css'
import './styles/main.css'

const app = createApp(App)
app.use(PrimeVue)
app.use(ToastService)
app.directive('tooltip', Tooltip)
app.mount('#app')
