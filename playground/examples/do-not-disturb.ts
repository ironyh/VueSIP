import type { ExampleDefinition } from './types'
import DoNotDisturbDemo from '../demos/DoNotDisturbDemo.vue'

export const doNotDisturbExample: ExampleDefinition = {
  id: 'do-not-disturb',
  icon: '🔕',
  title: 'Do Not Disturb',
  description: 'Auto-reject incoming calls',
  category: 'utility',
  tags: ['Feature', 'Auto-Action', 'Simple'],
  component: DoNotDisturbDemo,
  setupGuide: '<p>Enable Do Not Disturb mode to automatically reject all incoming calls. Perfect for focus time or meetings.</p>',
  codeSnippets: [
    {
      title: 'DND Implementation',
      description: 'Auto-reject calls when DND is enabled',
      code: `import { ref, watch } from 'vue'
import { useCallSession } from 'vuesip'

const dndEnabled = ref(false)

const { state, reject } = useCallSession(sipClient)

// Auto-reject incoming calls
watch(state, async (newState) => {
  if (newState === 'incoming' && dndEnabled.value) {
    console.log('Auto-rejecting due to DND')
    await reject(486) // 486 Busy Here
  }
})

// Save DND state
watch(dndEnabled, (enabled) => {
  localStorage.setItem('dnd-enabled', String(enabled))
})`,
    },
    {
      title: 'DND State Model',
      description: 'Complete DND state with scheduling and exceptions',
      code: `interface DNDState {
  enabled: boolean
  reason: string | null
  schedule: DNDSchedule | null
  allowedContacts: string[]
  allowRepeatedCalls: boolean
  repeatThreshold: number // seconds
  autoReply: string | null
}

interface DNDSchedule {
  enabled: boolean
  startTime: string  // "22:00"
  endTime: string    // "07:00"
  days: number[]     // 0-6 (Sun-Sat)
  timezone: string
}

const dndState = ref<DNDState>({
  enabled: false,
  reason: null,
  schedule: null,
  allowedContacts: [],
  allowRepeatedCalls: true,
  repeatThreshold: 180, // 3 minutes
  autoReply: 'I am currently unavailable. Please try again later.'
})

// Load from storage
const loadDNDState = () => {
  const saved = localStorage.getItem('dnd-state')
  if (saved) {
    dndState.value = JSON.parse(saved)
  }
}

// Persist changes
watch(dndState, (state) => {
  localStorage.setItem('dnd-state', JSON.stringify(state))
}, { deep: true })`,
    },
    {
      title: 'Schedule-Based DND',
      description: 'Automatically enable DND on schedule',
      code: `import { ref, computed, onMounted, onUnmounted } from 'vue'

const schedule = ref<DNDSchedule>({
  enabled: true,
  startTime: '22:00',
  endTime: '07:00',
  days: [0, 1, 2, 3, 4, 5, 6], // Every day
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
})

const isWithinSchedule = computed(() => {
  if (!schedule.value.enabled) return false

  const now = new Date()
  const currentDay = now.getDay()

  // Check if today is a scheduled day
  if (!schedule.value.days.includes(currentDay)) return false

  const currentTime = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = schedule.value.startTime.split(':').map(Number)
  const [endH, endM] = schedule.value.endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  // Handle overnight schedules (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentTime >= startMinutes || currentTime < endMinutes
  }

  return currentTime >= startMinutes && currentTime < endMinutes
})

// Check schedule every minute
let scheduleChecker: number

onMounted(() => {
  scheduleChecker = window.setInterval(() => {
    if (isWithinSchedule.value && !dndState.value.enabled) {
      dndState.value.enabled = true
      dndState.value.reason = 'Scheduled DND'
    } else if (!isWithinSchedule.value && dndState.value.reason === 'Scheduled DND') {
      dndState.value.enabled = false
      dndState.value.reason = null
    }
  }, 60000)
})

onUnmounted(() => {
  clearInterval(scheduleChecker)
})`,
    },
    {
      title: 'VIP/Allowed Contacts',
      description: 'Allow certain contacts through DND',
      code: `const allowedContacts = ref<string[]>([])

const addAllowedContact = (uri: string) => {
  if (!allowedContacts.value.includes(uri)) {
    allowedContacts.value.push(uri)
  }
}

const removeAllowedContact = (uri: string) => {
  const index = allowedContacts.value.indexOf(uri)
  if (index > -1) {
    allowedContacts.value.splice(index, 1)
  }
}

const isContactAllowed = (callerUri: string): boolean => {
  // Normalize URI for comparison
  const normalizedCaller = callerUri.replace(/^sip:/, '').split('@')[0]

  return allowedContacts.value.some(allowed => {
    const normalizedAllowed = allowed.replace(/^sip:/, '').split('@')[0]
    return normalizedCaller === normalizedAllowed
  })
}

// Enhanced call handling with VIP check
watch(incomingCall, async (call) => {
  if (!call || !dndState.value.enabled) return

  const callerUri = call.remoteIdentity.uri.toString()

  // Check if caller is VIP
  if (isContactAllowed(callerUri)) {
    console.log('VIP caller, allowing through DND:', callerUri)
    return // Don't reject
  }

  // Reject with auto-reply
  await rejectWithAutoReply(call)
})`,
    },
    {
      title: 'Repeated Call Detection',
      description: 'Allow urgent repeated calls through DND',
      code: `interface CallAttempt {
  uri: string
  timestamp: number
}

const recentCallAttempts = ref<CallAttempt[]>([])

const trackCallAttempt = (callerUri: string) => {
  const now = Date.now()

  // Clean old attempts
  recentCallAttempts.value = recentCallAttempts.value.filter(
    attempt => now - attempt.timestamp < dndState.value.repeatThreshold * 1000
  )

  // Add new attempt
  recentCallAttempts.value.push({
    uri: callerUri,
    timestamp: now
  })
}

const isRepeatedCall = (callerUri: string): boolean => {
  if (!dndState.value.allowRepeatedCalls) return false

  const threshold = dndState.value.repeatThreshold * 1000
  const now = Date.now()

  // Count recent attempts from same caller
  const attempts = recentCallAttempts.value.filter(
    attempt =>
      attempt.uri === callerUri &&
      now - attempt.timestamp < threshold
  )

  // 2 or more attempts within threshold = repeated call
  return attempts.length >= 2
}

// Handle incoming call with repeat detection
const handleIncomingCall = async (call: IncomingCall) => {
  const callerUri = call.remoteIdentity.uri.toString()

  trackCallAttempt(callerUri)

  if (!dndState.value.enabled) return 'allow'

  if (isContactAllowed(callerUri)) {
    return 'allow' // VIP
  }

  if (isRepeatedCall(callerUri)) {
    console.log('Repeated call detected, allowing through DND')
    return 'allow' // Urgent
  }

  return 'reject'
}`,
    },
    {
      title: 'Auto-Reply Message',
      description: 'Send automatic reply when rejecting calls',
      code: `const sendAutoReply = async (toUri: string, message: string) => {
  try {
    await sipClient.value.createMessage(
      toUri,
      message,
      'text/plain'
    ).send()

    console.log('Auto-reply sent to:', toUri)
  } catch (error) {
    console.error('Failed to send auto-reply:', error)
  }
}

const rejectWithAutoReply = async (call: IncomingCall) => {
  const callerUri = call.remoteIdentity.uri.toString()

  // Reject the call
  await call.reject({ statusCode: 486 }) // Busy Here

  // Send auto-reply if configured
  if (dndState.value.autoReply) {
    await sendAutoReply(callerUri, dndState.value.autoReply)
  }

  // Log for call history
  logRejectedCall({
    uri: callerUri,
    timestamp: new Date(),
    reason: 'DND',
    autoReplySent: !!dndState.value.autoReply
  })
}

// Customizable auto-reply templates
const autoReplyTemplates = [
  { id: 'meeting', text: 'I am in a meeting. Will call back soon.' },
  { id: 'busy', text: 'I am currently busy. Please leave a message.' },
  { id: 'driving', text: 'I am driving. Will call back when safe.' },
  { id: 'offline', text: 'I am offline. Please try again later.' },
  { id: 'custom', text: '' }
]`,
    },
    {
      title: 'DND UI Component',
      description: 'Complete DND toggle with settings',
      code: `<template>
  <div class="dnd-controls">
    <!-- Quick Toggle -->
    <button
      @click="toggleDND"
      :class="['dnd-toggle', { active: dndEnabled }]"
    >
      <span class="icon">{{ dndEnabled ? '🔕' : '🔔' }}</span>
      <span>{{ dndEnabled ? 'DND On' : 'DND Off' }}</span>
    </button>

    <!-- DND Status -->
    <div v-if="dndEnabled" class="dnd-status">
      <p v-if="dndState.reason">{{ dndState.reason }}</p>
      <p v-if="scheduleActive">
        Until {{ schedule.endTime }}
      </p>
    </div>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="dnd-settings">
      <h3>Do Not Disturb Settings</h3>

      <!-- Schedule -->
      <section>
        <label>
          <input type="checkbox" v-model="schedule.enabled" />
          Enable Schedule
        </label>
        <div v-if="schedule.enabled" class="schedule-config">
          <input type="time" v-model="schedule.startTime" />
          <span>to</span>
          <input type="time" v-model="schedule.endTime" />
        </div>
      </section>

      <!-- Allowed Contacts -->
      <section>
        <h4>VIP Contacts (bypass DND)</h4>
        <ul>
          <li v-for="contact in allowedContacts" :key="contact">
            {{ contact }}
            <button @click="removeAllowedContact(contact)">×</button>
          </li>
        </ul>
        <button @click="showContactPicker = true">+ Add Contact</button>
      </section>

      <!-- Repeated Calls -->
      <section>
        <label>
          <input type="checkbox" v-model="dndState.allowRepeatedCalls" />
          Allow repeated calls (urgent)
        </label>
        <p class="help">
          If someone calls twice within {{ repeatThreshold }}s, allow through
        </p>
      </section>

      <!-- Auto-Reply -->
      <section>
        <h4>Auto-Reply Message</h4>
        <textarea
          v-model="dndState.autoReply"
          placeholder="Optional message to send..."
        />
      </section>
    </div>
  </div>
</template>`,
    },
    {
      title: 'DND Presence Integration',
      description: 'Publish DND status to presence',
      code: `import { usePresence } from 'vuesip'

const { publishPresence } = usePresence(sipClient)

// Update presence when DND changes
watch(() => dndState.value.enabled, async (enabled) => {
  await publishPresence({
    status: enabled ? 'dnd' : 'available',
    note: enabled
      ? dndState.value.reason || 'Do Not Disturb'
      : 'Available',
    activities: enabled ? ['busy'] : []
  })
})

// Presence states for DND
const presenceStates = {
  available: {
    status: 'open',
    note: 'Available',
    rpid: 'unknown'
  },
  dnd: {
    status: 'closed',
    note: 'Do Not Disturb',
    rpid: 'busy'
  },
  meeting: {
    status: 'closed',
    note: 'In a Meeting',
    rpid: 'meeting'
  },
  away: {
    status: 'closed',
    note: 'Away',
    rpid: 'away'
  }
}

const setPresenceState = async (state: keyof typeof presenceStates) => {
  const presence = presenceStates[state]
  await publishPresence(presence)

  // Also update DND if needed
  dndState.value.enabled = state !== 'available'
  dndState.value.reason = presence.note
}`,
    },
  ],
}
