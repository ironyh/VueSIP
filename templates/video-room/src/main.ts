import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import App from './App.vue'
import './styles/main.css'
import 'primevue/resources/themes/lara-dark-blue/theme.css'
import 'primeicons/primeicons.css'

const app = createApp(App)
app.use(PrimeVue)
app.directive('tooltip', Tooltip)
app.mount('#app')
