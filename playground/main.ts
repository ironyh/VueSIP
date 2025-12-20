import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'

import 'primevue/resources/themes/aura-light-indigo/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

import PlaygroundApp from './PlaygroundApp.vue'
import './style.css'

const app = createApp(PlaygroundApp)
app.use(PrimeVue)
app.directive('tooltip', Tooltip)
app.mount('#app')
