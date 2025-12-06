import { createApp } from 'vue'
import PlaygroundApp from './PlaygroundApp.vue'
import TestApp from './TestApp.vue'
import { initializeStorePersistence } from '../src/stores/persistence'
import { configStore } from '../src/stores/configStore'
import './style.css'

// Use TestApp for E2E tests, PlaygroundApp for development
const isE2E = import.meta.env.MODE === 'test' || window.location.search.includes('test=true')
console.log('main.ts: isE2E =', isE2E, 'MODE =', import.meta.env.MODE, 'search =', window.location.search)

// Initialize store persistence BEFORE creating Vue app (E2E tests only)
if (isE2E) {
  console.log('main.ts: Initializing store persistence for E2E tests...')
  await initializeStorePersistence({
    enabled: true,
    autoLoad: true,
    debounce: 300,
  })
  console.log('main.ts: Store persistence initialized')

  // Expose configStore for E2E tests to set config after page load
  ;(window as unknown as { __configStore: typeof configStore }).__configStore = configStore
  console.log('main.ts: configStore exposed to window for E2E tests')
}

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
