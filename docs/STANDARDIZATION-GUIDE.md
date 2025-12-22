# Playground Demos Standardization Guide

## Quick Reference: Demo Structure Template

All new and refactored demos should follow this structure:

### 1. Import Organization
```typescript
// Vue essentials
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'

// VueSIP composables
import { useSipClient, useCallSession } from '../../src'

// Playground utilities
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Shared components (NEW - these will be created)
import DemoConfigForm from '../components/DemoConfigForm.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
```

### 2. Setup Order (Consistent Across All Demos)
```typescript
<script setup lang="ts">
// 1. Simulation (if applicable)
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// 2. Connection Management (STANDARDIZED)
const { isConnected, connectionError, connect, disconnect } = useConnection('demo-name')

// 3. SIP/AMI State (STANDARDIZED)
const { state, setState, resetState } = useDemoState()

// 4. UI State
const { error, setError, clearError } = useErrorHandler()
const { isLoading, execute } = useAsyncOperation()

// 5. Computed/Reactive Values
const effectiveIsConnected = computed(() => {...})

// 6. Methods
const handleConnect = async () => { ... }
const handleAction = async () => { ... }

// 7. Lifecycle
onMounted(async () => { ... })
onUnmounted(() => { ... })
</script>
```

---

## Connection Patterns - Implementation Guide

### For SIP-Based Demos

```typescript
// Use shared playground instance
const { isConnected, getClient } = useSipClient()

// Create reactive ref for composable dependency
const sipClientRef = computed(() => getClient())

// Use connection-based composables
const { state, makeCall, hangup } = useCallSession(sipClientRef)

// NO NEED for connection panel - already managed in BasicCallDemo
```

**Benefits**:
- Credentials shared across demos
- Persist across demo switches
- User doesn't re-enter credentials

### For AMI-Based Demos

```typescript
// Use new standardized connection composable (to be created)
const { 
  config, 
  isConnected, 
  error, 
  connect, 
  disconnect 
} = useAmiConnection('demo-name', {
  defaultUrl: 'ws://localhost:8080/ami',
  persistCredentials: true, // NEW: auto-save/restore
  retryAttempts: 3,
  retryDelay: 1000
})

// Connection form is now STANDARD via DemoConfigForm
// See template section below
```

**New Features**:
- Automatic credential persistence
- Automatic retry with backoff
- Consistent error handling
- Centralized config storage

### For Simulation-Only Demos

```typescript
// Keep existing simulation pattern - it's already good
const simulation = useSimulation()
const { isSimulationMode, isConnected: simIsConnected } = simulation

// Compute effective state that toggles sim/real
const effectiveIsConnected = computed(() => 
  isSimulationMode.value ? simIsConnected.value : realIsConnected.value
)

// Use effective values in template
<div v-if="effectiveIsConnected">Connected</div>
```

---

## Template Structure

### Configuration Section (NEW STANDARD)

All demos needing configuration use this pattern:

```vue
<template>
  <div class="demo-container">
    <!-- Use standard simulation controls -->
    <SimulationControls
      v-if="hasSimulation"
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveState"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
    />

    <!-- Use standard config form -->
    <DemoConfigForm
      v-if="!effectiveIsConnected"
      :title="configTitle"
      :fields="configFields"
      :connecting="isConnecting"
      :error="connectionError"
      @connect="handleConnect"
    />

    <!-- Demo content when connected -->
    <div v-else class="demo-content">
      <!-- Your demo-specific content here -->
      
      <!-- Use standard error alert -->
      <ErrorAlert v-if="error" :error="error" @dismiss="clearError" />
    </div>
  </div>
</template>
```

### Configuration Fields Definition

```typescript
const configFields = computed(() => [
  {
    name: 'url',
    type: 'text',
    label: 'WebSocket URL',
    placeholder: 'ws://pbx.example.com:8080',
    help: 'AMI WebSocket proxy URL for Asterisk integration',
    required: true,
    pattern: 'ws://'
  },
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: 'admin',
    help: 'AMI user account',
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter password',
    help: 'AMI user password',
    required: true
  },
  {
    name: 'rememberMe',
    type: 'checkbox',
    label: 'Remember me',
    help: 'Save credentials for next visit (uses browser storage)',
    default: false
  }
])
```

---

## Error Handling - Standard Pattern

### For All Demos

```typescript
import { useErrorHandler } from '../../src/composables/useErrorHandler'

const { error, setError, clearError } = useErrorHandler({
  defaultDuration: 5000, // Auto-clear after 5s
  onError: (err) => {
    // Optional: custom logging, analytics
    console.error('Demo error:', err)
  }
})

// Usage in try-catch
const handleAction = async () => {
  try {
    clearError() // Clear previous errors
    await performAction()
  } catch (err) {
    setError(err, {
      severity: 'error',
      title: 'Action Failed',
      suggestion: 'Check your connection and try again'
    })
  }
}

// Usage in template
<ErrorAlert v-if="error" :error="error" @dismiss="clearError" />
```

### Error Severity Levels

```typescript
// CRITICAL - stops operation, user action required
setError(err, { severity: 'critical' })

// ERROR - operation failed, but app still usable
setError(err, { severity: 'error' })

// WARNING - operation partly succeeded, review needed
setError(err, { severity: 'warning' })

// INFO - informational message
setError(err, { severity: 'info' })
```

---

## State Management - Standard Pattern

### Simple State

```typescript
const { state, setState, resetState } = useDemoState<DemoState>(
  'demo-name',
  {
    selectedItem: null,
    items: [],
    filter: '',
    sortBy: 'name'
  }
)

// Usage
const selectItem = (item) => {
  setState({ selectedItem: item })
}

// Reset
const handleReset = () => {
  resetState()
}
```

### With Async Loading

```typescript
const { 
  data, 
  isLoading, 
  error, 
  execute, 
  reset 
} = useAsyncState<Data>(
  initialData,
  async () => {
    // Your async operation
    const result = await fetchData()
    return result
  },
  { 
    autoExecute: false,
    cacheKey: 'demo-key' 
  }
)

// Trigger manually
const handleFetch = async () => {
  await execute()
}

// Or trigger on mount
onMounted(() => {
  execute()
})
```

---

## Event Handling - Safe Pattern

### Event Subscriptions

```typescript
// GOOD: Using composables (handles cleanup automatically)
const { state, onStateChange } = useCallSession(sipClientRef)

onStateChange((newState) => {
  console.log('State changed:', newState)
})

// GOOD: Using event bus with cleanup
const handleIncoming = (call) => {
  // Handle call
}

onMounted(() => {
  eventBus.on('call:incoming', handleIncoming)
})

onUnmounted(() => {
  eventBus.off('call:incoming', handleIncoming)
})
```

### Timers - Safe Pattern

```typescript
// GOOD: Using useTimer composable
const { start, stop } = useTimer(() => {
  updateStats()
}, 1000) // 1 second interval

onMounted(() => {
  start()
})

onUnmounted(() => {
  stop() // Automatically cleared
})

// DO NOT do this:
// let interval = setInterval(...) // May leak!
```

---

## Testing Checklist

For each demo, verify:

- [ ] Configuration form works
  - [ ] All fields accept input
  - [ ] Connect button disabled until valid
  - [ ] Error message displays on connection failure
  - [ ] Success message displays on connection
  
- [ ] Error handling
  - [ ] No alert() calls (use ErrorAlert component)
  - [ ] Errors persist until dismissed
  - [ ] Errors have context (what action failed?)
  
- [ ] Loading states
  - [ ] Loading indicator shows during operations
  - [ ] Buttons disabled while loading
  - [ ] Loading cleared on success/error
  
- [ ] Cleanup
  - [ ] No console errors on unmount
  - [ ] Timers cleared
  - [ ] Event listeners unsubscribed
  - [ ] Async operations cancelled
  
- [ ] Simulation (if applicable)
  - [ ] Simulation toggle works
  - [ ] Sim mode doesn't need real connection
  - [ ] Effective values computed correctly
  
- [ ] Documentation
  - [ ] Config fields have help text
  - [ ] Code example shows basic usage
  - [ ] Info message explains purpose
  - [ ] Prerequisites documented

---

## File Organization

```
playground/
├── demos/
│   ├── BasicCallDemo.vue          (✓ Reference - use as template)
│   ├── AgentLoginDemo.vue          (refactor to standard)
│   ├── CallQualityDemo.vue         (refactor to standard)
│   └── ...
├── components/
│   ├── SimulationControls.vue      (✓ Existing - good)
│   ├── DemoConfigForm.vue          (NEW - create)
│   ├── ErrorAlert.vue              (NEW - create)
│   ├── LoadingSpinner.vue          (NEW - create)
│   └── ...
└── composables/
    ├── useSimulation.ts            (✓ Existing - good)
    ├── useConnection.ts            (NEW - create)
    ├── useDemoState.ts             (NEW - create)
    ├── useAsyncState.ts            (NEW - create)
    └── useTimer.ts                 (NEW - create)
```

---

## Migration Priority

### Phase 1 (Week 1): Create Foundation Components
1. `DemoConfigForm.vue` - standardized config UI
2. `ErrorAlert.vue` - standardized error display
3. `useErrorHandler.ts` - standardized error management
4. `useAsyncState.ts` - standardized async loading

**Demos to update**: BasicCallDemo, AgentLoginDemo (as examples)

### Phase 2 (Week 2-3): UI Framework Consolidation
1. Decide: PrimeVue vs. HTML+CSS
2. Create button/input component standards
3. Update 10 high-impact demos

### Phase 3 (Week 3-4): Connection Patterns
1. Create `useConnection.ts` composable
2. Create `useDemoState.ts` composable
3. Consolidate AMI connection handling
4. Update remaining 20+ demos

### Phase 4 (Ongoing): Event/State Cleanup
1. Audit all event listeners
2. Fix memory leaks
3. Add timer cleanup
4. Document patterns

---

## Demo Audit Checklist

Use this when reviewing each demo for standardization readiness:

```markdown
## DemoName Audit

- [ ] Uses SimulationControls (if applicable)
- [ ] Uses DemoConfigForm (if needs config)
- [ ] Uses ErrorAlert for errors
- [ ] Uses LoadingSpinner for loading
- [ ] No alert() calls
- [ ] Error handling in all try-catch
- [ ] Event cleanup in onUnmounted
- [ ] Timer cleanup in onUnmounted
- [ ] Async operations cancelled on unmount
- [ ] Documentation for config fields
- [ ] Code example block included
- [ ] Info message explains purpose
- [ ] Mobile-responsive design
- [ ] No TypeScript errors
- [ ] No console warnings
```

---

## Common Patterns - Before & After

### Pattern 1: Configuration Form

**BEFORE:**
```vue
<template>
  <div v-if="!amiConnected" class="config-section">
    <h3>Configure Connection</h3>
    <input v-model="config.url" placeholder="ws://..." />
    <input v-model="config.username" type="text" />
    <input v-model="config.password" type="password" />
    <button @click="handleConnect" :disabled="connecting">
      {{ connecting ? 'Connecting...' : 'Connect' }}
    </button>
    <div v-if="connectionError" class="error">{{ connectionError }}</div>
  </div>
</template>
```

**AFTER:**
```vue
<template>
  <DemoConfigForm
    v-if="!isConnected"
    :title="'AMI Configuration'"
    :fields="configFields"
    :connecting="isConnecting"
    :error="connectionError"
    @connect="handleConnect"
  />
</template>

<script setup>
const configFields = computed(() => [
  { name: 'url', label: 'WebSocket URL', required: true },
  { name: 'username', label: 'Username', required: true },
  { name: 'password', type: 'password', label: 'Password', required: true }
])
</script>
```

**Benefits**: Reusable, consistent styling, proper error display


### Pattern 2: Error Handling

**BEFORE:**
```typescript
try {
  await makeCall()
} catch (error) {
  alert(`Failed: ${error.message}`)
}
```

**AFTER:**
```typescript
try {
  clearError()
  await makeCall()
} catch (error) {
  setError(error, {
    severity: 'error',
    title: 'Call Failed',
    suggestion: 'Check connection and try again'
  })
}
```

**Benefits**: No alert(), better UX, contextual suggestions


### Pattern 3: Event Cleanup

**BEFORE:**
```typescript
onMounted(() => {
  eventBus.on('call:incoming', handleIncoming)
  // Forgot to cleanup!
})
```

**AFTER:**
```typescript
onMounted(() => {
  eventBus.on('call:incoming', handleIncoming)
})

onUnmounted(() => {
  eventBus.off('call:incoming', handleIncoming)
})
```

**Benefits**: No memory leaks, proper resource cleanup


---

## Questions & Answers

**Q: Should we use PrimeVue or plain CSS?**
A: PrimeVue for consistency with existing demos (19 use it). Benefits: accessibility, responsive, professional look. Downside: larger bundle, more dependencies.

**Q: What about TypeScript types?**
A: All new code should be TypeScript. Create `types/demo.ts` with shared types:
```typescript
export interface DemoConfig { url: string; username: string; password: string }
export interface DemoState { [key: string]: any }
export interface DemoError { message: string; code?: string; suggestion?: string }
```

**Q: Can existing demos be left as-is?**
A: No - standardization only works if applied to all. Prioritize high-traffic demos (BasicCallDemo, AgentLoginDemo, etc.)

**Q: How do we migrate without breaking?**
A: Create new composables and components alongside old code. Update demos one by one. Keep old code until migration complete.

**Q: What about demos without errors?**
A: Add try-catch and error handling. Prevents silent failures. Even demos that "shouldn't fail" need error cases.

