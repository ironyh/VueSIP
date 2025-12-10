import type { ExampleDefinition } from './types'
import PresenceDemo from '../demos/PresenceDemo.vue'

export const presenceExample: ExampleDefinition = {
  id: 'presence',
  icon: '👁️',
  title: 'Presence & Status',
  description: 'Track user presence and availability',
  category: 'sip',
  tags: ['Presence', 'Status', 'SUBSCRIBE'],
  component: PresenceDemo,
  setupGuide: '<p>Demonstrate SIP presence functionality (SUBSCRIBE/NOTIFY). Track your own status and watch other users\' availability.</p>',
  codeSnippets: [
    {
      title: 'Setting Own Presence',
      description: 'Publish your presence status',
      code: `import { usePresence } from 'vuesip'

const { setStatus, currentStatus } = usePresence(sipClientRef)

// Set status to available
await setStatus('available')

// Set status with note
await setStatus('busy', { note: 'In a meeting' })`,
    },
    {
      title: 'Watching User Presence',
      description: 'Subscribe to another user\'s presence',
      code: `const { subscribe, watchedUsers, unsubscribe } = usePresence(sipClientRef)

// Watch a user
await subscribe('sip:colleague@example.com')

// Access their status
const status = watchedUsers.value.get('sip:colleague@example.com')
console.log(status.state) // 'available', 'away', 'busy', 'offline'

// Stop watching
await unsubscribe('sip:colleague@example.com')`,
    },
    {
      title: 'Presence States',
      description: 'Understanding presence status values',
      code: `// Standard presence states
enum PresenceState {
  Available = 'available',   // Green - ready for calls
  Away = 'away',            // Yellow - temporarily away
  Busy = 'busy',            // Red - do not disturb
  OnPhone = 'on-phone',     // Red - currently on a call
  Offline = 'offline',      // Gray - not connected
  Unknown = 'unknown',      // Unknown status
}

// Extended status with additional info
interface PresenceStatus {
  state: PresenceState
  note?: string           // Custom status message
  until?: Date            // Expected return time
  activity?: string       // What user is doing
  lastUpdated: Date       // When status was set
}

// Map status to UI display
const statusDisplay = {
  available: { icon: '🟢', label: 'Available', color: '#22c55e' },
  away: { icon: '🟡', label: 'Away', color: '#eab308' },
  busy: { icon: '🔴', label: 'Do Not Disturb', color: '#ef4444' },
  'on-phone': { icon: '📞', label: 'On a Call', color: '#ef4444' },
  offline: { icon: '⚫', label: 'Offline', color: '#6b7280' },
}`,
    },
    {
      title: 'BLF (Busy Lamp Field)',
      description: 'Monitor extension status for speed dial',
      code: `import { usePresence } from 'vuesip'
import { computed } from 'vue'

// Define BLF buttons
const blfExtensions = [
  { extension: '101', name: 'Reception' },
  { extension: '102', name: 'Sales' },
  { extension: '103', name: 'Support' },
  { extension: '104', name: 'Manager' },
]

const { subscribe, watchedUsers } = usePresence(sipClientRef)

// Subscribe to all BLF extensions
const initBLF = async () => {
  for (const ext of blfExtensions) {
    await subscribe(\`sip:\${ext.extension}@\${domain}\`)
  }
}

// Get BLF status for an extension
const getBLFStatus = (extension: string) => {
  const uri = \`sip:\${extension}@\${domain}\`
  return watchedUsers.value.get(uri)
}

// Computed BLF panel data
const blfPanel = computed(() =>
  blfExtensions.map(ext => ({
    ...ext,
    status: getBLFStatus(ext.extension),
    canCall: getBLFStatus(ext.extension)?.state === 'available',
  }))
)`,
    },
    {
      title: 'Presence Event Logging',
      description: 'Track presence changes over time',
      code: `import { ref, watch } from 'vue'

interface PresenceEvent {
  timestamp: Date
  user: string
  previousState: string
  newState: string
  note?: string
}

const presenceLog = ref<PresenceEvent[]>([])

// Watch for presence changes
watch(watchedUsers, (current, previous) => {
  current.forEach((status, uri) => {
    const prev = previous?.get(uri)

    if (prev && prev.state !== status.state) {
      presenceLog.value.unshift({
        timestamp: new Date(),
        user: uri,
        previousState: prev.state,
        newState: status.state,
        note: status.note,
      })

      // Keep only last 100 events
      if (presenceLog.value.length > 100) {
        presenceLog.value.pop()
      }
    }
  })
}, { deep: true })

// Filter log by user or state
const filterLog = (filter: { user?: string; state?: string }) => {
  return presenceLog.value.filter(event => {
    if (filter.user && !event.user.includes(filter.user)) return false
    if (filter.state && event.newState !== filter.state) return false
    return true
  })
}`,
    },
    {
      title: 'Custom Status Messages',
      description: 'Set rich presence with custom notes',
      code: `// Preset status options
const statusPresets = [
  { state: 'available', note: '', icon: '🟢' },
  { state: 'busy', note: 'In a meeting', icon: '📅' },
  { state: 'busy', note: 'Do not disturb', icon: '🔕' },
  { state: 'away', note: 'Back in 5 minutes', icon: '⏱️' },
  { state: 'away', note: 'Out to lunch', icon: '🍽️' },
  { state: 'away', note: 'Working remotely', icon: '🏠' },
]

// Set custom status with return time
const setAwayWithReturn = async (minutes: number, reason: string) => {
  const returnTime = new Date()
  returnTime.setMinutes(returnTime.getMinutes() + minutes)

  await setStatus('away', {
    note: reason,
    until: returnTime,
  })
}

// Auto-clear status at return time
watch(currentStatus, (status) => {
  if (status.until && status.state === 'away') {
    const delay = status.until.getTime() - Date.now()
    if (delay > 0) {
      setTimeout(() => {
        if (currentStatus.value.until?.getTime() === status.until?.getTime()) {
          setStatus('available')
        }
      }, delay)
    }
  }
})`,
    },
    {
      title: 'Presence Contact List',
      description: 'Build a presence-aware contact list',
      code: `<template>
  <div class="contact-list">
    <div v-for="contact in sortedContacts" :key="contact.uri" class="contact">
      <span class="status-indicator" :style="{ background: contact.statusColor }"></span>
      <span class="name">{{ contact.name }}</span>
      <span class="status-text">{{ contact.statusText }}</span>
      <button
        @click="makeCall(contact.uri)"
        :disabled="!contact.canCall"
      >
        Call
      </button>
    </div>
  </div>
</template>

<script setup>
const contacts = ref([
  { uri: 'sip:alice@example.com', name: 'Alice' },
  { uri: 'sip:bob@example.com', name: 'Bob' },
  { uri: 'sip:carol@example.com', name: 'Carol' },
])

// Sort contacts by availability
const sortedContacts = computed(() => {
  const priority = { available: 0, away: 1, busy: 2, offline: 3 }

  return contacts.value
    .map(contact => {
      const status = watchedUsers.value.get(contact.uri)
      return {
        ...contact,
        status: status?.state || 'offline',
        statusText: status?.note || status?.state || 'Offline',
        statusColor: statusDisplay[status?.state || 'offline'].color,
        canCall: status?.state === 'available',
      }
    })
    .sort((a, b) => priority[a.status] - priority[b.status])
})
</script>`,
    },
  ],
}
