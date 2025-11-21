import { createApp } from 'vue'
import PlaygroundApp from './PlaygroundApp.vue'
import TestApp from './TestApp.vue'
import './style.css'

// Use TestApp for E2E tests, PlaygroundApp for development
const isE2E = import.meta.env.MODE === 'test' || window.location.search.includes('test=true')
console.log('main.ts: isE2E =', isE2E, 'MODE =', import.meta.env.MODE, 'search =', window.location.search)

const app = createApp(isE2E ? TestApp : PlaygroundApp)

// Add error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err)
  console.error('Error info:', info)
  console.error('Component:', instance)
}

console.log('main.ts: Mounting app...')
try {
  app.mount('#app')
  console.log('main.ts: App mounted successfully')
} catch (err) {
  console.error('main.ts: Failed to mount app:', err)
}
