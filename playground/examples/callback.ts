import type { ExampleDefinition } from './types'
import CallbackDemo from '../demos/CallbackDemo.vue'

export const callbackExample: ExampleDefinition = {
  id: 'callback',
  icon: '🔙',
  title: 'Callback Requests',
  description: 'Schedule and manage callback requests',
  category: 'ami',
  tags: ['Call Center', 'Callbacks', 'Queue'],
  component: CallbackDemo,
  setupGuide: `<p>Allow callers to request callbacks instead of waiting in queue. Manage callback scheduling and execution via the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the callback composable to schedule and manage callbacks</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Callback Service',
      description: 'Connect to AMI and access callback features',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the callback composable via unified service
const callbacks = amiService.useCallback({
  onCallbackAdded: (callback) => {
    console.log('Callback scheduled:', callback.callerNumber)
  },
  onCallbackCompleted: (callback) => {
    console.log('Callback completed:', callback.id)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Schedule Callback',
      description: 'Create a callback request for a caller',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const callbacks = amiService.useCallback()

// Schedule a callback for 1 hour from now
await callbacks.scheduleCallback({
  callerNumber: '+1234567890',
  queue: 'sales-queue',
  scheduledTime: new Date(Date.now() + 3600000), // 1 hour
  priority: 'normal',
  maxAttempts: 3,
})

// Schedule with specific options
await callbacks.scheduleCallback({
  callerNumber: '+1987654321',
  callerName: 'John Smith',
  queue: 'support-queue',
  scheduledTime: new Date(Date.now() + 1800000), // 30 minutes
  priority: 'vip',
  maxAttempts: 5,
  notes: 'Premium customer - billing inquiry',
})`,
    },
    {
      title: 'Manage Pending Callbacks',
      description: 'List and process callback requests',
      code: `import { getAmiService } from '@/services/AmiService'
import { computed } from 'vue'

const amiService = getAmiService()
const callbacks = amiService.useCallback()

// List pending callbacks
const pending = callbacks.pendingCallbacks.value
pending.forEach(cb => {
  console.log('Pending:', cb.callerNumber, 'for', cb.queue)
  console.log('  Scheduled:', cb.scheduledTime)
  console.log('  Priority:', cb.priority)
})

// Execute a callback now
await callbacks.executeCallback(pending[0].id)

// Cancel a callback
await callbacks.cancelCallback(pending[0].id)

// Reschedule a callback
await callbacks.rescheduleCallback(pending[0].id, {
  scheduledTime: new Date(Date.now() + 7200000), // 2 hours
})

// Get overdue callbacks
const overdue = computed(() =>
  callbacks.pendingCallbacks.value.filter(cb => cb.scheduledTime < new Date())
)`,
    },
    {
      title: 'Callback Data Model',
      description: 'Complete callback request structure',
      code: `interface CallbackRequest {
  id: string
  callerNumber: string
  callerName?: string
  queue: string
  queuePosition?: number  // Position when callback was requested
  estimatedWait?: number  // Seconds at time of request
  scheduledTime: Date
  createdAt: Date
  status: 'pending' | 'scheduled' | 'calling' | 'completed' | 'failed' | 'cancelled'
  attempts: number
  maxAttempts: number
  lastAttemptAt?: Date
  lastAttemptResult?: 'no-answer' | 'busy' | 'failed' | 'answered'
  notes?: string
  priority: 'normal' | 'high' | 'vip'
  metadata?: Record<string, unknown>
}

interface CallbackQueue {
  name: string
  pendingCount: number
  scheduledCount: number
  averageWaitTime: number
  callbacksEnabled: boolean
  maxCallbacksPerHour: number
  retryInterval: number  // Minutes between retry attempts
}

const callbackRequests = ref<Map<string, CallbackRequest>>(new Map())
const callbackQueues = ref<Map<string, CallbackQueue>>(new Map())

// Get callbacks by status
const pendingCallbacks = computed(() =>
  Array.from(callbackRequests.value.values())
    .filter(cb => cb.status === 'pending' || cb.status === 'scheduled')
    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
)

const overdueCallbacks = computed(() =>
  pendingCallbacks.value.filter(cb => cb.scheduledTime < new Date())
)`,
    },
    {
      title: 'Callback Scheduling Logic',
      description: 'Intelligent callback time slot selection',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const callbacks = amiService.useCallback()

interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  callbacksScheduled: number
  maxCallbacks: number
}

const SLOT_DURATION = 15 // minutes
const MAX_CALLBACKS_PER_SLOT = 5

const generateTimeSlots = (
  startTime: Date,
  endTime: Date
): TimeSlot[] => {
  const slots: TimeSlot[] = []
  let current = new Date(startTime)

  while (current < endTime) {
    const slotEnd = new Date(current.getTime() + SLOT_DURATION * 60000)

    // Count existing callbacks in this slot
    const callbacksInSlot = callbacks.pendingCallbacks.value
      .filter(cb =>
        cb.scheduledTime >= current &&
        cb.scheduledTime < slotEnd &&
        cb.status !== 'cancelled'
      ).length

    slots.push({
      start: new Date(current),
      end: slotEnd,
      available: callbacksInSlot < MAX_CALLBACKS_PER_SLOT,
      callbacksScheduled: callbacksInSlot,
      maxCallbacks: MAX_CALLBACKS_PER_SLOT
    })

    current = slotEnd
  }

  return slots
}

// Find next available slot
const findNextAvailableSlot = (preferredTime?: Date): TimeSlot | null => {
  const now = new Date()
  const startTime = preferredTime && preferredTime > now ? preferredTime : now
  const endTime = new Date(now.getTime() + 24 * 60 * 60000) // Next 24 hours

  const slots = generateTimeSlots(startTime, endTime)
    .filter(slot => slot.available)

  return slots[0] || null
}`,
    },
    {
      title: 'Callback Execution Engine',
      description: 'Process and execute callback calls',
      code: `import { getAmiService } from '@/services/AmiService'
import { useSipClient } from 'vuesip'

const amiService = getAmiService()
const callbacks = amiService.useCallback()
const { makeCall } = useSipClient()

const executeCallback = async (callbackId: string): Promise<boolean> => {
  const callback = callbacks.getCallback(callbackId)
  if (!callback) {
    throw new Error('Callback not found')
  }

  if (callback.status === 'calling') {
    throw new Error('Callback already in progress')
  }

  // Update status via AMI
  await callbacks.updateCallbackStatus(callbackId, 'calling')

  try {
    // Initiate the call
    const session = await makeCall(callback.callerNumber, {
      extraHeaders: [
        \`X-Callback-ID: \${callback.id}\`,
        \`X-Original-Queue: \${callback.queue}\`
      ]
    })

    // Wait for answer or timeout
    const result = await waitForCallResult(session)

    if (result === 'answered') {
      await callbacks.updateCallbackStatus(callbackId, 'completed')
      return true
    } else {
      await callbacks.handleFailedAttempt(callbackId, result)
      return false
    }

  } catch (error) {
    await callbacks.handleFailedAttempt(callbackId, 'failed')
    throw error
  }
}

const waitForCallResult = (
  session: any
): Promise<'answered' | 'no-answer' | 'busy' | 'failed'> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve('no-answer')
      session.bye()
    }, 30000)

    session.on('accepted', () => {
      clearTimeout(timeout)
      resolve('answered')
    })

    session.on('rejected', (response: any) => {
      clearTimeout(timeout)
      resolve(response.statusCode === 486 ? 'busy' : 'failed')
    })

    session.on('failed', () => {
      clearTimeout(timeout)
      resolve('failed')
    })
  })
}`,
    },
    {
      title: 'Callback Queue Dashboard',
      description: 'Visual callback management interface',
      code: `<template>
  <div class="callback-dashboard">
    <!-- Queue Overview -->
    <div class="queue-stats">
      <div class="stat-card">
        <span class="stat-value">{{ pendingCallbacks.length }}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat-card warning" v-if="overdueCallbacks.length > 0">
        <span class="stat-value">{{ overdueCallbacks.length }}</span>
        <span class="stat-label">Overdue</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ todayCompleted }}</span>
        <span class="stat-label">Completed Today</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ successRate }}%</span>
        <span class="stat-label">Success Rate</span>
      </div>
    </div>

    <!-- Callback List -->
    <div class="callback-list">
      <div
        v-for="callback in sortedCallbacks"
        :key="callback.id"
        class="callback-card"
        :class="[callback.status, { overdue: isOverdue(callback) }]"
      >
        <div class="callback-header">
          <span class="caller-number">{{ callback.callerNumber }}</span>
          <span class="priority-badge" :class="callback.priority">
            {{ callback.priority }}
          </span>
        </div>

        <div class="callback-details">
          <span>Queue: {{ callback.queue }}</span>
          <span>Scheduled: {{ formatTime(callback.scheduledTime) }}</span>
          <span>Attempts: {{ callback.attempts }}/{{ callback.maxAttempts }}</span>
        </div>

        <div class="callback-actions">
          <button
            @click="executeCallback(callback.id)"
            :disabled="callback.status === 'calling'"
          >
            {{ callback.status === 'calling' ? 'Calling...' : 'Call Now' }}
          </button>
          <button @click="rescheduleCallback(callback.id)">Reschedule</button>
          <button @click="cancelCallback(callback.id)" class="danger">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const callbacks = amiService.useCallback()

const pendingCallbacks = computed(() => callbacks.pendingCallbacks.value)
const overdueCallbacks = computed(() =>
  pendingCallbacks.value.filter(cb => cb.scheduledTime < new Date())
)
</script>`,
    },
    {
      title: 'Callback Analytics',
      description: 'Track callback performance metrics',
      code: `import { getAmiService } from '@/services/AmiService'
import { computed } from 'vue'

const amiService = getAmiService()
const callbacks = amiService.useCallback()

interface CallbackAnalytics {
  period: 'day' | 'week' | 'month'
  totalRequested: number
  totalCompleted: number
  totalFailed: number
  totalCancelled: number
  successRate: number
  averageAttempts: number
  averageWaitTime: number
  peakHours: number[]
  byQueue: Map<string, QueueCallbackStats>
}

interface QueueCallbackStats {
  queueName: string
  requested: number
  completed: number
  failed: number
  averageWaitTime: number
}

const getCallbackAnalytics = (period: 'day' | 'week' | 'month'): CallbackAnalytics => {
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
  }

  const allCallbacks = callbacks.allCallbacks.value
    .filter(cb => cb.createdAt >= startDate)

  const completed = allCallbacks.filter(cb => cb.status === 'completed')
  const failed = allCallbacks.filter(cb => cb.status === 'failed')
  const cancelled = allCallbacks.filter(cb => cb.status === 'cancelled')

  // Calculate peak hours
  const hourCounts = new Array(24).fill(0)
  allCallbacks.forEach(cb => {
    hourCounts[cb.createdAt.getHours()]++
  })
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(h => h.hour)

  return {
    period,
    totalRequested: allCallbacks.length,
    totalCompleted: completed.length,
    totalFailed: failed.length,
    totalCancelled: cancelled.length,
    successRate: allCallbacks.length > 0
      ? Math.round((completed.length / allCallbacks.length) * 100)
      : 0,
    averageAttempts: completed.length > 0
      ? completed.reduce((sum, cb) => sum + cb.attempts, 0) / completed.length
      : 0,
    averageWaitTime: 0,
    peakHours,
    byQueue: new Map()
  }
}`,
    },
  ],
}
