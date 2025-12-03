import type { ExampleDefinition } from './types'
import CallbackDemo from '../demos/CallbackDemo.vue'

export const callbackExample: ExampleDefinition = {
  id: 'callback',
  icon: '🔙',
  title: 'Callback Requests',
  description: 'Schedule and manage callback requests',
  tags: ['Call Center', 'Callbacks', 'Queue'],
  component: CallbackDemo,
  setupGuide: '<p>Allow callers to request callbacks instead of waiting in queue. Manage callback scheduling and execution.</p>',
  codeSnippets: [
    {
      title: 'Schedule Callback',
      description: 'Create a callback request',
      code: `import { useCallback } from 'vuesip'

const callbacks = useCallback(amiClientRef, {
  onCallbackAdded: (callback) => {
    console.log('Callback scheduled:', callback.callerNumber)
  },
  onCallbackCompleted: (callback) => {
    console.log('Callback completed:', callback.id)
  },
})

// Schedule a callback
await callbacks.scheduleCallback({
  callerNumber: '+1234567890',
  queue: 'sales-queue',
  scheduledTime: new Date(Date.now() + 3600000), // 1 hour
})`,
    },
    {
      title: 'Manage Callbacks',
      description: 'List and process callbacks',
      code: `// List pending callbacks
const pending = callbacks.pendingCallbacks.value
pending.forEach(cb => {
  console.log('Pending:', cb.callerNumber, 'for', cb.queue)
})

// Execute a callback now
await callbacks.executeCallback(pending[0].id)

// Cancel a callback
await callbacks.cancelCallback(pending[0].id)`,
    },
  ],
}
