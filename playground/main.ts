import { createApp, type Component } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'

import 'primevue/resources/themes/aura-light-indigo/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

import PlaygroundApp from './PlaygroundApp.vue'
import TestApp from './TestApp.vue'
import './style.css'

// Load TestApp for E2E tests, PlaygroundApp for normal use
const isE2ETest = window.location.search.includes('test=true')
const AppComponent: Component = isE2ETest ? TestApp : PlaygroundApp

const app = createApp(AppComponent)
app.use(PrimeVue)
app.directive('tooltip', Tooltip)
app.mount('#app')
