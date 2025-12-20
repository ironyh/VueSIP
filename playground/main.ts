import { createApp } from 'vue'
import PlaygroundApp from './PlaygroundApp.vue'
import './style.css'

// PrimeVue
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'

const app = createApp(PlaygroundApp)
app.use(PrimeVue)
app.directive('tooltip', Tooltip)
app.mount('#app')
