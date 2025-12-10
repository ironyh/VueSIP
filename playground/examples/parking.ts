import type { ExampleDefinition } from './types'
import ParkingDemo from '../demos/ParkingDemo.vue'

export const parkingExample: ExampleDefinition = {
  id: 'parking',
  icon: '🅿️',
  title: 'Call Parking',
  description: 'Park and retrieve calls from parking lots',
  category: 'ami',
  tags: ['Advanced', 'Call Control', 'PBX'],
  component: ParkingDemo,
  setupGuide: `<p>Call parking allows you to place a call on hold in a parking lot and retrieve it from another phone. Configure your PBX parking lot settings.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the parking composable for call parking operations</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Parking Service',
      description: 'Connect to AMI and access parking features',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get parking composable via unified service
const parking = amiService.useParking()

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Park a Call',
      description: 'Park the current call to a parking space',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const parking = amiService.useParking()

// Park the current call
const channel = 'PJSIP/1001-00000001'
const space = await parking.parkCall(channel)
console.log('Call parked at space', space)

// Park with specific lot and announcement
const result = await parking.parkCall(channel, {
  parkingLot: 'default',
  announceChannel: 'PJSIP/1002',
})`,
    },
    {
      title: 'Retrieve Parked Call',
      description: 'Pick up a call from a parking space',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch } from 'vue'

const amiService = getAmiService()
const parking = amiService.useParking()

// Retrieve a parked call
await parking.retrieveCall('701', 'PJSIP/1002')

// List all parked calls reactively
watch(parking.parkedCalls, (calls) => {
  calls.forEach(call => {
    console.log(\`Space \${call.space} - From: \${call.callerIdNum}\`)
    console.log(\`  Duration: \${call.duration}s\`)
    console.log(\`  Timeout in: \${call.timeout - call.duration}s\`)
  })
}, { deep: true })`,
    },
    {
      title: 'Parking Data Models',
      description: 'TypeScript interfaces for call parking',
      code: `// Complete parking system data models
interface ParkedCall {
  id: string
  space: string // Parking space number (e.g., '701')
  lot: string // Parking lot name

  // Call information
  channel: string
  callerIdNum: string
  callerIdName: string
  connectedLineNum: string
  connectedLineName: string

  // Timing
  parkTime: Date
  timeout: number // Seconds until timeout
  timeoutAt: Date
  duration: number // How long parked

  // Parker info
  parkerDialString: string
  parkerChannel: string

  // Status
  status: 'parked' | 'ringing' | 'retrieved' | 'timeout'
}

interface ParkingLot {
  name: string
  startSpace: number
  stopSpace: number
  timeout: number // Default timeout in seconds

  // Capabilities
  comebackToOrigin: boolean
  comebackDialTime: number
  comebackContext: string

  // Announcement settings
  parkingHints: string
  parkedCallReparking: 'caller' | 'both' | 'no'

  // Current state
  spaces: ParkingSpace[]
  availableSpaces: number
  occupiedSpaces: number
}

interface ParkingSpace {
  number: string
  lot: string
  status: 'available' | 'occupied' | 'reserved'
  parkedCall?: ParkedCall
}

interface ParkingEvent {
  type: 'parked' | 'unparked' | 'timeout' | 'ringing'
  parkingLot: string
  parkingSpace: string
  parkedCall?: ParkedCall
  timestamp: Date
  reason?: string
}`,
    },
    {
      title: 'Parking Manager Class',
      description: 'Complete parking operations management',
      code: `import { ref, computed, watch } from 'vue'

class ParkingManager {
  private amiClient: any

  public parkedCalls = ref<ParkedCall[]>([])
  public parkingLots = ref<ParkingLot[]>([])
  public events = ref<ParkingEvent[]>([])

  constructor(amiClient: any) {
    this.amiClient = amiClient
    this.setupEventListeners()
    this.loadParkingLots()
  }

  private setupEventListeners(): void {
    // Listen for parking events via AMI
    this.amiClient.on('ParkedCall', (event: any) => {
      const parkedCall = this.parseParkedCallEvent(event)
      this.parkedCalls.value.push(parkedCall)
      this.emitEvent('parked', parkedCall)
    })

    this.amiClient.on('UnParkedCall', (event: any) => {
      const space = event.ParkingSpace
      const index = this.parkedCalls.value.findIndex(c => c.space === space)
      if (index !== -1) {
        const call = this.parkedCalls.value.splice(index, 1)[0]
        this.emitEvent('unparked', call)
      }
    })

    this.amiClient.on('ParkedCallTimeOut', (event: any) => {
      const space = event.ParkingSpace
      const index = this.parkedCalls.value.findIndex(c => c.space === space)
      if (index !== -1) {
        const call = this.parkedCalls.value.splice(index, 1)[0]
        call.status = 'timeout'
        this.emitEvent('timeout', call)
      }
    })
  }

  async parkCall(channel: string, lot?: string, announceChannel?: string): Promise<string> {
    const response = await this.amiClient.action({
      action: 'Park',
      channel: channel,
      parkinglot: lot || 'default',
      announcechannel: announceChannel,
    })

    if (response.Response === 'Success') {
      return response.ParkingSpace
    }
    throw new Error(response.Message || 'Failed to park call')
  }

  async retrieveCall(space: string, channel: string): Promise<void> {
    await this.amiClient.action({
      action: 'Originate',
      channel: channel,
      application: 'ParkedCall',
      data: space,
      callerid: 'Parked Call',
    })
  }

  async transferToParking(channel: string, parkingExtension: string = '700'): Promise<void> {
    await this.amiClient.action({
      action: 'Redirect',
      channel: channel,
      context: 'parkedcalls',
      exten: parkingExtension,
      priority: 1,
    })
  }

  getAvailableSpaces(lot: string = 'default'): ParkingSpace[] {
    const parkingLot = this.parkingLots.value.find(l => l.name === lot)
    return parkingLot?.spaces.filter(s => s.status === 'available') || []
  }

  private emitEvent(type: ParkingEvent['type'], call: ParkedCall): void {
    this.events.value.unshift({
      type,
      parkingLot: call.lot,
      parkingSpace: call.space,
      parkedCall: call,
      timestamp: new Date(),
    })
  }
}`,
    },
    {
      title: 'Parking Lot UI Component',
      description: 'Visual parking lot interface with drag-drop support',
      code: `<template>
  <div class="parking-lot-view">
    <h3>{{ lot.name }} Parking Lot</h3>

    <!-- Parking Statistics -->
    <div class="parking-stats">
      <div class="stat">
        <span class="stat-value">{{ lot.occupiedSpaces }}</span>
        <span class="stat-label">Occupied</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ lot.availableSpaces }}</span>
        <span class="stat-label">Available</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ lot.timeout }}s</span>
        <span class="stat-label">Timeout</span>
      </div>
    </div>

    <!-- Parking Spaces Grid -->
    <div class="parking-grid">
      <div
        v-for="space in lot.spaces"
        :key="space.number"
        class="parking-space"
        :class="{
          occupied: space.status === 'occupied',
          available: space.status === 'available',
          timeout: space.parkedCall?.status === 'timeout'
        }"
        @click="handleSpaceClick(space)"
        @dragover.prevent
        @drop="handleDrop($event, space)"
      >
        <span class="space-number">{{ space.number }}</span>

        <template v-if="space.parkedCall">
          <div class="parked-call-info">
            <span class="caller-id">{{ space.parkedCall.callerIdNum }}</span>
            <span class="caller-name">{{ space.parkedCall.callerIdName }}</span>
            <span class="parked-duration">{{ formatDuration(space.parkedCall.duration) }}</span>

            <!-- Timeout progress bar -->
            <div class="timeout-bar">
              <div
                class="timeout-progress"
                :style="{ width: getTimeoutProgress(space.parkedCall) + '%' }"
              ></div>
            </div>
          </div>

          <div class="space-actions">
            <button @click.stop="retrieveToMe(space)" title="Retrieve">📞</button>
            <button @click.stop="transferParked(space)" title="Transfer">↗️</button>
          </div>
        </template>

        <template v-else>
          <span class="empty-label">Empty</span>
        </template>
      </div>
    </div>

    <!-- Quick Park Button -->
    <button
      v-if="hasActiveCall"
      class="btn-park"
      @click="parkCurrentCall"
    >
      🅿️ Park Current Call
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  lot: ParkingLot
  currentChannel?: string
}>()

const emit = defineEmits<{
  (e: 'retrieve', space: ParkingSpace): void
  (e: 'park', channel: string): void
  (e: 'transfer', space: ParkingSpace): void
}>()

const hasActiveCall = computed(() => !!props.currentChannel)

const getTimeoutProgress = (call: ParkedCall): number => {
  const elapsed = (Date.now() - call.parkTime.getTime()) / 1000
  return Math.min((elapsed / call.timeout) * 100, 100)
}

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return \`\${m}:\${s.toString().padStart(2, '0')}\`
}

const handleSpaceClick = (space: ParkingSpace) => {
  if (space.parkedCall) {
    emit('retrieve', space)
  }
}

const handleDrop = (event: DragEvent, space: ParkingSpace) => {
  const channel = event.dataTransfer?.getData('text/channel')
  if (channel && space.status === 'available') {
    emit('park', channel)
  }
}
</script>

<style scoped>
.parking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.parking-space {
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  min-height: 120px;
  cursor: pointer;
  transition: all 0.2s;
}

.parking-space.occupied {
  border-color: #10b981;
  border-style: solid;
  background: #ecfdf5;
}

.parking-space.available:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.timeout-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.timeout-progress {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
  transition: width 1s linear;
}
</style>`,
    },
    {
      title: 'Parking Notifications and Alerts',
      description: 'Audio and visual notifications for parking events',
      code: `import { ref, watch } from 'vue'

interface ParkingNotification {
  id: string
  type: 'parked' | 'timeout_warning' | 'timeout' | 'retrieved'
  message: string
  parkedCall?: ParkedCall
  timestamp: Date
  read: boolean
}

class ParkingNotificationManager {
  public notifications = ref<ParkingNotification[]>([])
  public unreadCount = computed(() =>
    this.notifications.value.filter(n => !n.read).length
  )

  private sounds: Record<string, HTMLAudioElement> = {}
  private soundEnabled = ref(true)
  private timeoutWarningThreshold = 30 // seconds before timeout

  constructor() {
    this.loadSounds()
  }

  private loadSounds(): void {
    this.sounds = {
      parked: new Audio('/sounds/parked.mp3'),
      timeout_warning: new Audio('/sounds/warning.mp3'),
      timeout: new Audio('/sounds/timeout.mp3'),
      retrieved: new Audio('/sounds/retrieved.mp3'),
    }

    // Preload sounds
    Object.values(this.sounds).forEach(audio => {
      audio.load()
      audio.volume = 0.5
    })
  }

  notify(event: ParkingEvent): void {
    const notification = this.createNotification(event)
    this.notifications.value.unshift(notification)

    // Play sound
    if (this.soundEnabled.value && this.sounds[notification.type]) {
      this.sounds[notification.type].play().catch(() => {})
    }

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('Call Parking', {
        body: notification.message,
        icon: '/icons/parking.png',
        tag: notification.id,
      })
    }

    // Limit stored notifications
    if (this.notifications.value.length > 50) {
      this.notifications.value = this.notifications.value.slice(0, 50)
    }
  }

  private createNotification(event: ParkingEvent): ParkingNotification {
    const messages: Record<string, string> = {
      parked: \`Call parked at space \${event.parkingSpace}\`,
      timeout_warning: \`Call in space \${event.parkingSpace} will timeout soon\`,
      timeout: \`Call in space \${event.parkingSpace} timed out\`,
      retrieved: \`Call retrieved from space \${event.parkingSpace}\`,
    }

    return {
      id: \`\${Date.now()}-\${Math.random()}\`,
      type: event.type === 'unparked' ? 'retrieved' : event.type,
      message: messages[event.type] || 'Parking event',
      parkedCall: event.parkedCall,
      timestamp: event.timestamp,
      read: false,
    }
  }

  // Monitor for timeout warnings
  startTimeoutMonitor(parkedCalls: Ref<ParkedCall[]>): void {
    setInterval(() => {
      parkedCalls.value.forEach(call => {
        const remainingTime = call.timeout - call.duration
        if (remainingTime === this.timeoutWarningThreshold) {
          this.notify({
            type: 'timeout_warning' as any,
            parkingLot: call.lot,
            parkingSpace: call.space,
            parkedCall: call,
            timestamp: new Date(),
          })
        }
      })
    }, 1000)
  }

  markAsRead(id: string): void {
    const notification = this.notifications.value.find(n => n.id === id)
    if (notification) notification.read = true
  }

  markAllAsRead(): void {
    this.notifications.value.forEach(n => n.read = true)
  }

  clearAll(): void {
    this.notifications.value = []
  }

  toggleSound(): void {
    this.soundEnabled.value = !this.soundEnabled.value
  }
}`,
    },
    {
      title: 'Parking Analytics Dashboard',
      description: 'Statistics and trends for parking usage',
      code: `import { ref, computed } from 'vue'

interface ParkingAnalytics {
  totalParked: number
  totalRetrieved: number
  totalTimeouts: number
  avgParkDuration: number // seconds
  peakHour: number
  busiestLot: string

  // By lot breakdown
  lotStats: Record<string, {
    parked: number
    retrieved: number
    timeouts: number
    avgDuration: number
  }>

  // Hourly distribution
  hourlyUsage: number[]

  // Timeout rate
  timeoutRate: number
}

class ParkingAnalyticsTracker {
  private events = ref<ParkingEvent[]>([])

  readonly analytics = computed<ParkingAnalytics>(() => {
    const evts = this.events.value

    const parkedEvents = evts.filter(e => e.type === 'parked')
    const retrievedEvents = evts.filter(e => e.type === 'unparked')
    const timeoutEvents = evts.filter(e => e.type === 'timeout')

    // Calculate average park duration
    const durations = retrievedEvents
      .filter(e => e.parkedCall)
      .map(e => e.parkedCall!.duration)
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    // Hourly distribution
    const hourlyUsage = new Array(24).fill(0)
    parkedEvents.forEach(e => {
      hourlyUsage[e.timestamp.getHours()]++
    })
    const peakHour = hourlyUsage.indexOf(Math.max(...hourlyUsage))

    // By lot stats
    const lotStats: Record<string, any> = {}
    evts.forEach(e => {
      if (!lotStats[e.parkingLot]) {
        lotStats[e.parkingLot] = { parked: 0, retrieved: 0, timeouts: 0, durations: [] }
      }
      if (e.type === 'parked') lotStats[e.parkingLot].parked++
      if (e.type === 'unparked') {
        lotStats[e.parkingLot].retrieved++
        if (e.parkedCall) lotStats[e.parkingLot].durations.push(e.parkedCall.duration)
      }
      if (e.type === 'timeout') lotStats[e.parkingLot].timeouts++
    })

    // Process lot stats
    Object.keys(lotStats).forEach(lot => {
      const stats = lotStats[lot]
      stats.avgDuration = stats.durations.length > 0
        ? stats.durations.reduce((a: number, b: number) => a + b, 0) / stats.durations.length
        : 0
      delete stats.durations
    })

    // Find busiest lot
    const busiestLot = Object.entries(lotStats)
      .sort(([, a], [, b]) => (b as any).parked - (a as any).parked)[0]?.[0] || 'N/A'

    return {
      totalParked: parkedEvents.length,
      totalRetrieved: retrievedEvents.length,
      totalTimeouts: timeoutEvents.length,
      avgParkDuration: Math.round(avgDuration),
      peakHour,
      busiestLot,
      lotStats,
      hourlyUsage,
      timeoutRate: parkedEvents.length > 0
        ? (timeoutEvents.length / parkedEvents.length) * 100
        : 0,
    }
  })

  addEvent(event: ParkingEvent): void {
    this.events.value.push(event)
  }

  clearHistory(): void {
    this.events.value = []
  }

  exportAnalytics(): string {
    return JSON.stringify(this.analytics.value, null, 2)
  }
}`,
    },
    {
      title: 'Parking Keyboard Shortcuts',
      description: 'Quick keyboard navigation for parking operations',
      code: `import { onMounted, onUnmounted } from 'vue'

interface ParkingShortcut {
  key: string
  modifiers: ('ctrl' | 'alt' | 'shift')[]
  action: string
  description: string
}

const defaultShortcuts: ParkingShortcut[] = [
  { key: 'p', modifiers: ['ctrl'], action: 'park', description: 'Park current call' },
  { key: '1', modifiers: ['alt'], action: 'retrieve-1', description: 'Retrieve from space 1' },
  { key: '2', modifiers: ['alt'], action: 'retrieve-2', description: 'Retrieve from space 2' },
  { key: '3', modifiers: ['alt'], action: 'retrieve-3', description: 'Retrieve from space 3' },
  { key: 'l', modifiers: ['ctrl', 'shift'], action: 'list', description: 'Show parked calls' },
  { key: 'n', modifiers: ['alt'], action: 'next', description: 'Retrieve next parked call' },
]

const useParkingShortcuts = (
  parkingManager: ParkingManager,
  currentChannel: Ref<string | undefined>
) => {
  const shortcuts = ref<ParkingShortcut[]>([...defaultShortcuts])
  const showHelp = ref(false)

  const matchesShortcut = (event: KeyboardEvent, shortcut: ParkingShortcut): boolean => {
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false

    const hasCtrl = shortcut.modifiers.includes('ctrl')
    const hasAlt = shortcut.modifiers.includes('alt')
    const hasShift = shortcut.modifiers.includes('shift')

    return event.ctrlKey === hasCtrl && event.altKey === hasAlt && event.shiftKey === hasShift
  }

  const handleKeyDown = async (event: KeyboardEvent) => {
    // Show help with ?
    if (event.key === '?' && event.shiftKey) {
      showHelp.value = !showHelp.value
      return
    }

    for (const shortcut of shortcuts.value) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault()
        await executeShortcut(shortcut.action)
        break
      }
    }
  }

  const executeShortcut = async (action: string) => {
    switch (action) {
      case 'park':
        if (currentChannel.value) {
          await parkingManager.parkCall(currentChannel.value)
        }
        break

      case 'list':
        // Emit event to show parking panel
        emit('show-parking-panel')
        break

      case 'next':
        const nextCall = parkingManager.parkedCalls.value[0]
        if (nextCall && currentChannel.value) {
          await parkingManager.retrieveCall(nextCall.space, currentChannel.value)
        }
        break

      default:
        // Handle retrieve-N shortcuts
        if (action.startsWith('retrieve-')) {
          const spaceNum = action.split('-')[1]
          const space = \`70\${spaceNum}\` // Assuming 701, 702, etc.
          const call = parkingManager.parkedCalls.value.find(c => c.space === space)
          if (call && currentChannel.value) {
            await parkingManager.retrieveCall(space, currentChannel.value)
          }
        }
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))

  return { shortcuts, showHelp }
}`,
    },
  ],
}
