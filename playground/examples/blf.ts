import type { ExampleDefinition } from './types'
import BLFDemo from '../demos/BLFDemo.vue'

export const blfExample: ExampleDefinition = {
  id: 'blf',
  icon: '💡',
  title: 'BLF (Busy Lamp Field)',
  description: 'Monitor extension status in real-time',
  category: 'ami',
  tags: ['Advanced', 'Presence', 'Monitoring'],
  component: BLFDemo,
  setupGuide: `<p>BLF (Busy Lamp Field) allows you to monitor the status of other extensions in real-time. See idle, ringing, busy, and unavailable states via the unified AmiService.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the BLF composable for extension monitoring</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & BLF Service',
      description: 'Connect to AMI and access BLF monitoring',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get the BLF composable via unified service
const blf = amiService.usePeers({
  onStateChange: (extension, state) => {
    console.log('Extension', extension, 'is now:', state)
  },
  onSubscriptionError: (extension, error) => {
    console.error('BLF subscription failed:', extension, error)
  },
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Subscribe to Extension Status',
      description: 'Monitor single and multiple extensions',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const blf = amiService.usePeers()

// Subscribe to a single extension
await blf.subscribe('1001')
const status = blf.getStatus('1001')
console.log('Extension 1001:', status?.state)

// Subscribe to multiple extensions
await blf.subscribeMany(['1001', '1002', '1003', '1004'])

// Access all statuses reactively
blf.extensions.value.forEach((ext) => {
  console.log('Extension:', ext.extension, 'State:', ext.state)
})

// Watch for state changes
blf.onStateChange((event) => {
  console.log('Extension changed:', event.extension, 'to', event.state)

  if (event.state === 'ringing') {
    console.log('Ringing from:', event.remoteParty)
  }
})

// Get extensions by state
const busyExtensions = blf.getByState('busy')
const availableExtensions = blf.getByState('idle')
console.log('Busy:', busyExtensions.length, 'Available:', availableExtensions.length)`,
    },
    {
      title: 'BLF Group Management',
      description: 'Organize extensions into logical groups',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const blf = amiService.usePeers()

// Create a BLF group
await blf.createGroup({
  id: 'sales-team',
  name: 'Sales Team',
  extensions: ['1001', '1002', '1003', '1004'],
  layout: 'grid',
  sortBy: 'extension',
})

// Create support group
await blf.createGroup({
  id: 'support',
  name: 'Support Team',
  extensions: ['2001', '2002', '2003'],
  layout: 'list',
  sortBy: 'state',
})

// Get group with live status
const salesGroup = blf.getGroup('sales-team')
console.log('Sales team:', salesGroup?.extensions.length, 'members')

// Get sorted extensions for display
const sortedSales = blf.getSortedExtensions('sales-team')
sortedSales.forEach(ext => {
  console.log(ext.extension, '-', ext.state)
})

// Update group configuration
await blf.updateGroup('sales-team', {
  layout: 'list',
  sortBy: 'name',
})

// Add/remove extensions from group
await blf.addToGroup('sales-team', '1005')
await blf.removeFromGroup('sales-team', '1001')

// Delete a group (unsubscribes from all extensions)
await blf.deleteGroup('old-group')`,
    },
    {
      title: 'BLF Data Model',
      description: 'Data structures for BLF monitoring',
      code: `interface BLFExtension {
  uri: string
  extension: string
  displayName: string
  state: 'idle' | 'ringing' | 'busy' | 'unavailable' | 'unknown'
  direction?: 'inbound' | 'outbound'
  remoteParty?: string
  remotePartyName?: string
  duration: number  // Call duration in seconds
  lastChanged: Date
  subscriptionExpires?: Date
  subscriptionActive: boolean
}

interface BLFGroup {
  id: string
  name: string
  description?: string
  extensions: BLFExtension[]
  layout: 'grid' | 'list' | 'compact'
  sortBy: 'extension' | 'name' | 'state' | 'duration'
  sortDirection: 'asc' | 'desc'
  showOffline: boolean
  autoRefresh: boolean
}

interface BLFStats {
  total: number
  idle: number
  busy: number
  ringing: number
  unavailable: number
  unknown: number
}

interface BLFStateChangeEvent {
  extension: string
  previousState: BLFExtension['state']
  state: BLFExtension['state']
  direction?: 'inbound' | 'outbound'
  remoteParty?: string
  timestamp: Date
}

const groups = ref<Map<string, BLFGroup>>(new Map())
const extensions = ref<Map<string, BLFExtension>>(new Map())

const stats = computed<BLFStats>(() => ({
  total: extensions.value.size,
  idle: getByState('idle').length,
  busy: getByState('busy').length,
  ringing: getByState('ringing').length,
  unavailable: getByState('unavailable').length,
  unknown: getByState('unknown').length,
}))`,
    },
    {
      title: 'Click-to-Action from BLF',
      description: 'Initiate calls and actions from BLF buttons',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const blf = amiService.usePeers()
const sipClient = useSipClient()

// Handle BLF button click based on state
const handleBLFClick = async (extension: BLFExtension) => {
  switch (extension.state) {
    case 'idle':
      // Call the extension directly
      await sipClient.call(extension.extension)
      break

    case 'ringing':
      // Directed call pickup (if allowed)
      if (blf.canPickup(extension.extension)) {
        await pickupCall(extension)
      }
      break

    case 'busy':
      // Show options for busy extension
      showBusyOptions(extension)
      break

    case 'unavailable':
      // Offer to leave voicemail or send message
      showUnavailableOptions(extension)
      break
  }
}

// Directed call pickup
const pickupCall = async (extension: BLFExtension) => {
  // Use directed pickup feature code (*8 is common)
  const pickupCode = '*8'
  await sipClient.call(\`\${pickupCode}\${extension.extension}\`)
}

// Check if we can pick up calls for this extension
const canPickup = (extension: string): boolean => {
  const pickupGroups = blf.getPickupGroups()
  const myExtension = sipClient.extension.value

  return pickupGroups.some(group =>
    group.includes(myExtension) && group.includes(extension)
  )
}

// Show options when extension is busy
const showBusyOptions = (extension: BLFExtension) => {
  const options = [
    { label: 'Camp-On (Wait)', action: () => campOn(extension) },
    { label: 'Leave Voicemail', action: () => callVoicemail(extension) },
    { label: 'Send IM', action: () => openChat(extension) },
    { label: 'Call Back Later', action: () => scheduleCallback(extension) },
  ]

  showOptionsDialog(extension, options)
}`,
    },
    {
      title: 'BLF Subscription Management',
      description: 'Handle subscription lifecycle and renewals',
      code: `import { getAmiService } from '@/services/AmiService'
import { onUnmounted, watch } from 'vue'

const amiService = getAmiService()
const blf = amiService.usePeers()

// Subscription configuration
const SUBSCRIPTION_EXPIRES = 3600 // 1 hour
const RENEWAL_BUFFER = 300 // Renew 5 minutes before expiry
const MAX_RETRY_ATTEMPTS = 3

// Subscribe with automatic renewal
const subscribeWithRenewal = async (extension: string) => {
  try {
    await blf.subscribe(extension, {
      expires: SUBSCRIPTION_EXPIRES,
      autoRenew: true,
      renewalBuffer: RENEWAL_BUFFER,
    })

    console.log('Subscribed to:', extension)
  } catch (error) {
    console.error('Subscription failed:', extension, error)
    // Will auto-retry with exponential backoff
  }
}

// Get subscription status
const checkSubscriptions = () => {
  blf.extensions.value.forEach((ext) => {
    if (ext.subscriptionExpires) {
      const expiresIn = ext.subscriptionExpires.getTime() - Date.now()
      if (expiresIn < RENEWAL_BUFFER * 1000) {
        console.log('Subscription expiring soon:', ext.extension)
      }
    }
  })
}

// Unsubscribe from all on cleanup
const cleanup = () => {
  blf.unsubscribeAll()
}

onUnmounted(cleanup)

// Handle reconnection
watch(amiService.isConnected, (connected) => {
  if (connected) {
    // Re-subscribe to all extensions after reconnect
    blf.resubscribeAll()
  }
})

// Monitor subscription health
const subscriptionHealth = computed(() => {
  const total = blf.extensions.value.size
  const active = Array.from(blf.extensions.value.values())
    .filter(ext => ext.subscriptionActive).length

  return {
    total,
    active,
    inactive: total - active,
    healthPercent: total > 0 ? Math.round((active / total) * 100) : 100,
  }
})`,
    },
    {
      title: 'BLF Analytics & History',
      description: 'Track extension activity and patterns',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const blf = amiService.usePeers()

// Get activity history for an extension
const getActivityHistory = async (extension: string, hours: number = 24) => {
  const history = await blf.getHistory(extension, {
    startTime: new Date(Date.now() - hours * 3600000),
    endTime: new Date(),
  })

  return history.map(event => ({
    time: event.timestamp,
    state: event.state,
    duration: event.duration,
    remoteParty: event.remoteParty,
  }))
}

// Get extension statistics
const getExtensionStats = async (extension: string) => {
  const stats = await blf.getStats(extension, { period: 'day' })

  console.log('Extension:', extension)
  console.log('  Total calls:', stats.totalCalls)
  console.log('  Inbound:', stats.inboundCalls)
  console.log('  Outbound:', stats.outboundCalls)
  console.log('  Avg call duration:', stats.avgCallDuration, 'seconds')
  console.log('  Time on phone:', stats.totalTalkTime, 'seconds')
  console.log('  Busy percentage:', stats.busyPercent, '%')

  return stats
}

// Get group statistics
const getGroupStats = async (groupId: string) => {
  const group = blf.getGroup(groupId)
  if (!group) return null

  const stats = await Promise.all(
    group.extensions.map(ext => blf.getStats(ext.extension, { period: 'day' }))
  )

  return {
    groupName: group.name,
    totalCalls: stats.reduce((sum, s) => sum + s.totalCalls, 0),
    avgCallDuration: stats.reduce((sum, s) => sum + s.avgCallDuration, 0) / stats.length,
    busiestExtension: stats.sort((a, b) => b.totalCalls - a.totalCalls)[0],
    availabilityRate: stats.reduce((sum, s) => sum + (100 - s.busyPercent), 0) / stats.length,
  }
}

// Track state change patterns
const stateHistory = ref<BLFStateChangeEvent[]>([])

blf.onStateChange((event) => {
  stateHistory.value.push(event)

  // Keep last 1000 events
  if (stateHistory.value.length > 1000) {
    stateHistory.value = stateHistory.value.slice(-1000)
  }
})`,
    },
    {
      title: 'BLF Persistence & Configuration',
      description: 'Save and restore BLF settings',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch, onMounted } from 'vue'

const amiService = getAmiService()
const blf = amiService.usePeers()

const STORAGE_KEY = 'blf-configuration'

interface BLFConfiguration {
  groups: Array<{
    id: string
    name: string
    extensions: string[]
    layout: 'grid' | 'list' | 'compact'
    sortBy: 'extension' | 'name' | 'state'
  }>
  favorites: string[]
  settings: {
    showCallDuration: boolean
    showRemoteParty: boolean
    animateRinging: boolean
    soundOnRinging: boolean
    autoSubscribe: boolean
  }
  lastUpdated: string
}

// Save configuration to localStorage
const saveConfiguration = () => {
  const config: BLFConfiguration = {
    groups: Array.from(blf.groups.value.values()).map(g => ({
      id: g.id,
      name: g.name,
      extensions: g.extensions.map(e => e.extension),
      layout: g.layout,
      sortBy: g.sortBy,
    })),
    favorites: blf.favorites.value,
    settings: blf.settings.value,
    lastUpdated: new Date().toISOString(),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// Load configuration from localStorage
const loadConfiguration = async () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return

  try {
    const config: BLFConfiguration = JSON.parse(saved)

    // Apply settings
    blf.updateSettings(config.settings)

    // Recreate groups
    for (const groupConfig of config.groups) {
      await blf.createGroup({
        id: groupConfig.id,
        name: groupConfig.name,
        extensions: groupConfig.extensions,
        layout: groupConfig.layout,
        sortBy: groupConfig.sortBy,
      })
    }

    // Set favorites
    blf.setFavorites(config.favorites)

    console.log('BLF configuration loaded from:', config.lastUpdated)
  } catch (error) {
    console.error('Failed to load BLF config:', error)
  }
}

// Auto-save on changes
watch([blf.groups, blf.favorites, blf.settings], () => {
  saveConfiguration()
}, { deep: true })

// Load on mount
onMounted(async () => {
  await loadConfiguration()
})

// Export/import configuration
const exportConfiguration = () => {
  const config = localStorage.getItem(STORAGE_KEY)
  if (config) {
    const blob = new Blob([config], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'blf-config.json'
    a.click()
  }
}`,
    },
    {
      title: 'BLF Panel UI Component',
      description: 'Visual BLF panel with status indicators',
      code: `<template>
  <div class="blf-panel">
    <!-- Header with Stats -->
    <div class="blf-header">
      <h3>{{ group.name }}</h3>
      <div class="blf-stats">
        <span class="stat idle" :title="stats.idle + ' available'">
          {{ stats.idle }}
        </span>
        <span class="stat busy" :title="stats.busy + ' busy'">
          {{ stats.busy }}
        </span>
        <span class="stat ringing" :title="stats.ringing + ' ringing'">
          {{ stats.ringing }}
        </span>
      </div>
      <div class="blf-controls">
        <select v-model="group.layout">
          <option value="grid">Grid</option>
          <option value="list">List</option>
          <option value="compact">Compact</option>
        </select>
        <select v-model="group.sortBy">
          <option value="extension">Extension</option>
          <option value="name">Name</option>
          <option value="state">State</option>
        </select>
      </div>
    </div>

    <!-- Extension Grid -->
    <div :class="['blf-grid', group.layout]">
      <button
        v-for="ext in sortedExtensions"
        :key="ext.extension"
        :class="['blf-button', ext.state]"
        @click="handleBLFClick(ext)"
        :title="getTooltip(ext)"
      >
        <div class="blf-indicator">
          <span v-if="ext.state === 'ringing'" class="pulse"></span>
        </div>
        <div class="blf-info">
          <span class="extension">{{ ext.extension }}</span>
          <span class="name">{{ ext.displayName }}</span>
          <span v-if="ext.state === 'busy' && settings.showCallDuration" class="duration">
            {{ formatDuration(ext.duration) }}
          </span>
          <span v-if="ext.remoteParty && settings.showRemoteParty" class="remote">
            {{ ext.remoteParty }}
          </span>
        </div>
        <span v-if="isFavorite(ext.extension)" class="favorite-icon">★</span>
      </button>
    </div>

    <!-- Subscription Health -->
    <div class="subscription-health" v-if="showHealth">
      <span>Subscriptions: {{ health.active }}/{{ health.total }}</span>
      <div class="health-bar">
        <div class="health-fill" :style="{ width: health.healthPercent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const blf = amiService.usePeers()

const props = defineProps<{ groupId: string }>()

const group = computed(() => blf.getGroup(props.groupId))
const sortedExtensions = computed(() => blf.getSortedExtensions(props.groupId))
const stats = computed(() => blf.getGroupStats(props.groupId))
const settings = computed(() => blf.settings.value)
const health = computed(() => blf.subscriptionHealth.value)

const isFavorite = (ext: string) => blf.favorites.value.includes(ext)

const handleBLFClick = async (ext: BLFExtension) => {
  emit('click', ext)
}

const getTooltip = (ext: BLFExtension) => {
  let tooltip = \`\${ext.displayName} (\${ext.extension})\\nStatus: \${ext.state}\`
  if (ext.remoteParty) tooltip += \`\\nWith: \${ext.remoteParty}\`
  if (ext.duration) tooltip += \`\\nDuration: \${formatDuration(ext.duration)}\`
  return tooltip
}
</script>

<style scoped>
.blf-button.idle { background: #4CAF50; }
.blf-button.busy { background: #f44336; }
.blf-button.ringing { background: #FF9800; animation: pulse 1s infinite; }
.blf-button.unavailable { background: #9E9E9E; }
.blf-button.unknown { background: #607D8B; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: inherit;
  animation: ripple 1s infinite;
}

@keyframes ripple {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
</style>`,
    },
  ],
}
