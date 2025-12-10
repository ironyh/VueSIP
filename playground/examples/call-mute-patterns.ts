import type { ExampleDefinition } from './types'
import CallMutePatternsDemo from '../demos/CallMutePatternsDemo.vue'

export const callMutePatternsExample: ExampleDefinition = {
  id: 'call-mute-patterns',
  icon: '🔇',
  title: 'Call Mute Patterns',
  description: 'Advanced mute controls and patterns',
  category: 'sip',
  tags: ['Advanced', 'Audio', 'Patterns'],
  component: CallMutePatternsDemo,
  setupGuide: '<p>Explore different mute patterns including push-to-talk, auto-mute on silence, and scheduled mute/unmute. Perfect for different use cases like meetings and presentations.</p>',
  codeSnippets: [
    {
      title: 'Push-to-Talk Implementation',
      description: 'Hold key to unmute temporarily',
      code: `import { ref, onMounted, onUnmounted } from 'vue'
import { useCallSession } from 'vuesip'

const { mute, unmute, isMuted } = useCallSession(sipClient)
const isPushToTalkActive = ref(false)

const handleKeyDown = async (event: KeyboardEvent) => {
  if (event.code === 'Space' && !isPushToTalkActive.value) {
    isPushToTalkActive.value = true
    await unmute()
  }
}

const handleKeyUp = async (event: KeyboardEvent) => {
  if (event.code === 'Space' && isPushToTalkActive.value) {
    isPushToTalkActive.value = false
    await mute()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // Start muted for push-to-talk
  mute()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})`,
    },
    {
      title: 'Auto-Mute on Silence',
      description: 'Automatically mute when no audio detected',
      code: `const autoMuteDelay = ref(3000) // 3 seconds
let silenceTimer: number | null = null

// Monitor audio level
const checkAudioLevel = (level: number) => {
  if (level < 10) {
    // Low audio, start silence timer
    if (!silenceTimer) {
      silenceTimer = window.setTimeout(async () => {
        await mute()
      }, autoMuteDelay.value)
    }
  } else {
    // Audio detected, cancel timer and unmute
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    if (isMuted.value) {
      await unmute()
    }
  }
}`,
    },
    {
      title: 'Mute Pattern Configuration',
      description: 'TypeScript interfaces for mute pattern settings',
      code: `// Mute pattern types and configuration
interface MutePattern {
  id: string
  name: string
  type: 'push-to-talk' | 'auto-mute' | 'scheduled' | 'toggle' | 'voice-activated'
  enabled: boolean
  config: MutePatternConfig
}

interface MutePatternConfig {
  // Push-to-talk settings
  pttKey?: string
  pttModifier?: 'ctrl' | 'alt' | 'shift' | 'meta'

  // Auto-mute settings
  silenceThreshold?: number // dB level
  silenceDelay?: number // ms before muting

  // Scheduled mute settings
  schedules?: MuteSchedule[]

  // Voice-activated settings
  vadSensitivity?: 'low' | 'medium' | 'high'
  vadHoldTime?: number // ms to stay unmuted after voice detected
}

interface MuteSchedule {
  id: string
  name: string
  startTime: string // HH:mm format
  endTime: string
  days: number[] // 0-6 (Sunday-Saturday)
  action: 'mute' | 'unmute'
}

// Pattern presets for common use cases
const mutePatternPresets: Record<string, MutePattern> = {
  meeting: {
    id: 'meeting',
    name: 'Meeting Mode',
    type: 'push-to-talk',
    enabled: false,
    config: {
      pttKey: 'Space',
      pttModifier: undefined,
    },
  },
  presentation: {
    id: 'presentation',
    name: 'Presentation Mode',
    type: 'voice-activated',
    enabled: false,
    config: {
      vadSensitivity: 'medium',
      vadHoldTime: 2000,
    },
  },
  callCenter: {
    id: 'call-center',
    name: 'Call Center Mode',
    type: 'auto-mute',
    enabled: false,
    config: {
      silenceThreshold: -50,
      silenceDelay: 5000,
    },
  },
}`,
    },
    {
      title: 'Voice Activity Detection (VAD)',
      description: 'Advanced voice-activated mute using Web Audio API',
      code: `import { ref, onMounted, onUnmounted } from 'vue'

class VoiceActivityDetector {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private isListening = false
  private holdTimer: number | null = null

  public isVoiceDetected = ref(false)
  public audioLevel = ref(0)

  constructor(
    private sensitivity: 'low' | 'medium' | 'high' = 'medium',
    private holdTime: number = 1500,
    private onVoiceStart?: () => void,
    private onVoiceEnd?: () => void
  ) {}

  private get threshold(): number {
    const thresholds = { low: 25, medium: 15, high: 8 }
    return thresholds[this.sensitivity]
  }

  async start(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()

      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      source.connect(this.analyser)

      this.analyser.fftSize = 256
      this.isListening = true
      this.detectVoice()
    } catch (error) {
      console.error('Failed to start VAD:', error)
    }
  }

  private detectVoice(): void {
    if (!this.isListening || !this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)

    // Calculate average audio level
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    this.audioLevel.value = average

    const wasDetected = this.isVoiceDetected.value
    const isNowDetected = average > this.threshold

    if (isNowDetected && !wasDetected) {
      // Voice started
      this.isVoiceDetected.value = true
      if (this.holdTimer) {
        clearTimeout(this.holdTimer)
        this.holdTimer = null
      }
      this.onVoiceStart?.()
    } else if (!isNowDetected && wasDetected) {
      // Start hold timer before marking voice as ended
      if (!this.holdTimer) {
        this.holdTimer = window.setTimeout(() => {
          this.isVoiceDetected.value = false
          this.onVoiceEnd?.()
          this.holdTimer = null
        }, this.holdTime)
      }
    }

    requestAnimationFrame(() => this.detectVoice())
  }

  stop(): void {
    this.isListening = false
    this.mediaStream?.getTracks().forEach(track => track.stop())
    this.audioContext?.close()
    if (this.holdTimer) clearTimeout(this.holdTimer)
  }
}

// Usage in component
const vad = new VoiceActivityDetector(
  'medium',
  1500,
  () => unmute(), // Voice started - unmute
  () => mute()    // Voice ended - mute
)

onMounted(() => vad.start())
onUnmounted(() => vad.stop())`,
    },
    {
      title: 'Scheduled Mute Patterns',
      description: 'Time-based automatic mute scheduling',
      code: `import { ref, computed, onMounted, onUnmounted } from 'vue'

interface ScheduledMute {
  id: string
  name: string
  startTime: string // HH:mm
  endTime: string
  days: number[] // 0=Sun, 6=Sat
  action: 'mute' | 'unmute'
  enabled: boolean
}

const schedules = ref<ScheduledMute[]>([
  {
    id: '1',
    name: 'Morning Standup',
    startTime: '09:00',
    endTime: '09:30',
    days: [1, 2, 3, 4, 5], // Mon-Fri
    action: 'mute',
    enabled: true,
  },
  {
    id: '2',
    name: 'Lunch Break',
    startTime: '12:00',
    endTime: '13:00',
    days: [1, 2, 3, 4, 5],
    action: 'unmute',
    enabled: true,
  },
])

let scheduleCheckInterval: number | null = null

const isWithinSchedule = (schedule: ScheduledMute): boolean => {
  const now = new Date()
  const currentDay = now.getDay()

  if (!schedule.days.includes(currentDay)) return false

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = schedule.startTime.split(':').map(Number)
  const [endH, endM] = schedule.endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

const checkSchedules = async () => {
  for (const schedule of schedules.value) {
    if (!schedule.enabled) continue

    if (isWithinSchedule(schedule)) {
      if (schedule.action === 'mute' && !isMuted.value) {
        await mute()
        console.log(\`Auto-muted for: \${schedule.name}\`)
      } else if (schedule.action === 'unmute' && isMuted.value) {
        await unmute()
        console.log(\`Auto-unmuted for: \${schedule.name}\`)
      }
    }
  }
}

const activeSchedule = computed(() =>
  schedules.value.find(s => s.enabled && isWithinSchedule(s))
)

onMounted(() => {
  checkSchedules()
  scheduleCheckInterval = window.setInterval(checkSchedules, 60000) // Check every minute
})

onUnmounted(() => {
  if (scheduleCheckInterval) clearInterval(scheduleCheckInterval)
})`,
    },
    {
      title: 'Mute Pattern Manager UI',
      description: 'Vue component for managing mute patterns',
      code: `<template>
  <div class="mute-pattern-manager">
    <h3>Mute Patterns</h3>

    <!-- Active Pattern Indicator -->
    <div class="active-pattern" v-if="activePattern">
      <span class="pattern-badge">{{ activePattern.name }}</span>
      <span class="status">{{ isMuted ? '🔇 Muted' : '🔊 Unmuted' }}</span>
    </div>

    <!-- Pattern List -->
    <div class="pattern-list">
      <div
        v-for="pattern in patterns"
        :key="pattern.id"
        class="pattern-item"
        :class="{ active: pattern.enabled }"
      >
        <div class="pattern-info">
          <span class="pattern-icon">{{ getPatternIcon(pattern.type) }}</span>
          <div class="pattern-details">
            <span class="pattern-name">{{ pattern.name }}</span>
            <span class="pattern-type">{{ pattern.type }}</span>
          </div>
        </div>

        <div class="pattern-controls">
          <button
            @click="configurePattern(pattern)"
            class="btn-config"
          >
            ⚙️
          </button>
          <label class="toggle">
            <input
              type="checkbox"
              v-model="pattern.enabled"
              @change="togglePattern(pattern)"
            >
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Audio Level Meter (for VAD) -->
    <div v-if="showAudioMeter" class="audio-meter">
      <label>Audio Level</label>
      <div class="meter-bar">
        <div
          class="meter-fill"
          :style="{ width: audioLevel + '%' }"
          :class="{ active: isVoiceDetected }"
        ></div>
      </div>
      <span class="level-value">{{ audioLevel.toFixed(0) }}%</span>
    </div>

    <!-- PTT Indicator -->
    <div v-if="isPTTMode" class="ptt-indicator">
      <div class="ptt-key" :class="{ pressed: isPTTPressed }">
        {{ pttKeyDisplay }}
      </div>
      <span>{{ isPTTPressed ? 'Speaking...' : 'Hold to speak' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const patterns = ref<MutePattern[]>([])
const activePattern = computed(() => patterns.value.find(p => p.enabled))
const isPTTMode = computed(() => activePattern.value?.type === 'push-to-talk')
const showAudioMeter = computed(() =>
  activePattern.value?.type === 'voice-activated' ||
  activePattern.value?.type === 'auto-mute'
)

const getPatternIcon = (type: string) => {
  const icons: Record<string, string> = {
    'push-to-talk': '🎤',
    'auto-mute': '🔇',
    'scheduled': '⏰',
    'toggle': '🔄',
    'voice-activated': '🗣️',
  }
  return icons[type] || '🔊'
}

const togglePattern = async (pattern: MutePattern) => {
  // Disable other patterns first
  patterns.value.forEach(p => {
    if (p.id !== pattern.id) p.enabled = false
  })

  if (pattern.enabled) {
    await activatePattern(pattern)
  } else {
    await deactivatePattern(pattern)
  }
}
</script>`,
    },
    {
      title: 'Custom Hotkey Mute Controls',
      description: 'Configurable keyboard shortcuts for mute operations',
      code: `import { ref, onMounted, onUnmounted } from 'vue'

interface MuteHotkey {
  key: string
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[]
  action: 'toggle' | 'mute' | 'unmute' | 'ptt-start' | 'ptt-end'
}

const defaultHotkeys: MuteHotkey[] = [
  { key: 'm', modifiers: ['ctrl'], action: 'toggle' },
  { key: 'Space', modifiers: [], action: 'ptt-start' },
  { key: 'd', modifiers: ['ctrl', 'shift'], action: 'mute' },
]

const hotkeys = ref<MuteHotkey[]>([...defaultHotkeys])
const isPTTActive = ref(false)

const matchesHotkey = (event: KeyboardEvent, hotkey: MuteHotkey): boolean => {
  // Check key match
  if (event.key.toLowerCase() !== hotkey.key.toLowerCase() &&
      event.code !== hotkey.key) {
    return false
  }

  // Check modifiers
  const hasCtrl = hotkey.modifiers.includes('ctrl')
  const hasAlt = hotkey.modifiers.includes('alt')
  const hasShift = hotkey.modifiers.includes('shift')
  const hasMeta = hotkey.modifiers.includes('meta')

  return (
    event.ctrlKey === hasCtrl &&
    event.altKey === hasAlt &&
    event.shiftKey === hasShift &&
    event.metaKey === hasMeta
  )
}

const handleKeyDown = async (event: KeyboardEvent) => {
  for (const hotkey of hotkeys.value) {
    if (matchesHotkey(event, hotkey)) {
      event.preventDefault()

      switch (hotkey.action) {
        case 'toggle':
          isMuted.value ? await unmute() : await mute()
          break
        case 'mute':
          await mute()
          break
        case 'unmute':
          await unmute()
          break
        case 'ptt-start':
          if (!isPTTActive.value) {
            isPTTActive.value = true
            await unmute()
          }
          break
      }
      break
    }
  }
}

const handleKeyUp = async (event: KeyboardEvent) => {
  for (const hotkey of hotkeys.value) {
    if (hotkey.action === 'ptt-start' && matchesHotkey(event, hotkey)) {
      if (isPTTActive.value) {
        isPTTActive.value = false
        await mute()
      }
      break
    }
  }
}

// Register/unregister hotkey
const registerHotkey = (hotkey: MuteHotkey): void => {
  hotkeys.value.push(hotkey)
}

const unregisterHotkey = (key: string): void => {
  const index = hotkeys.value.findIndex(h => h.key === key)
  if (index !== -1) hotkeys.value.splice(index, 1)
}

// Hotkey display helper
const formatHotkey = (hotkey: MuteHotkey): string => {
  const parts = [...hotkey.modifiers.map(m => m.charAt(0).toUpperCase() + m.slice(1))]
  parts.push(hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key)
  return parts.join(' + ')
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})`,
    },
    {
      title: 'Mute State Persistence & Sync',
      description: 'Save mute preferences and sync across tabs',
      code: `import { ref, watch, onMounted } from 'vue'

interface MuteState {
  isMuted: boolean
  activePattern: string | null
  lastUpdated: number
  source: string // Tab/device identifier
}

const STORAGE_KEY = 'vuesip-mute-state'
const BROADCAST_CHANNEL = 'vuesip-mute-sync'

// BroadcastChannel for cross-tab sync
let broadcastChannel: BroadcastChannel | null = null

const muteState = ref<MuteState>({
  isMuted: false,
  activePattern: null,
  lastUpdated: Date.now(),
  source: generateTabId(),
})

function generateTabId(): string {
  return \`tab-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`
}

// Save state to localStorage
const saveState = () => {
  const state: MuteState = {
    isMuted: isMuted.value,
    activePattern: activePattern.value?.id || null,
    lastUpdated: Date.now(),
    source: muteState.value.source,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

  // Broadcast to other tabs
  broadcastChannel?.postMessage(state)
}

// Load state from localStorage
const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const state: MuteState = JSON.parse(saved)
    // Only apply if from different source and newer
    if (state.source !== muteState.value.source) {
      applyState(state)
    }
  }
}

// Apply received state
const applyState = async (state: MuteState) => {
  if (state.isMuted !== isMuted.value) {
    state.isMuted ? await mute() : await unmute()
  }

  if (state.activePattern !== activePattern.value?.id) {
    const pattern = patterns.value.find(p => p.id === state.activePattern)
    if (pattern) {
      await activatePattern(pattern)
    }
  }
}

// Setup cross-tab sync
const setupSync = () => {
  broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL)

  broadcastChannel.onmessage = (event) => {
    const state: MuteState = event.data
    // Ignore own messages
    if (state.source !== muteState.value.source) {
      applyState(state)
    }
  }

  // Listen for storage events (fallback for older browsers)
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      const state: MuteState = JSON.parse(event.newValue)
      if (state.source !== muteState.value.source) {
        applyState(state)
      }
    }
  })
}

// Watch for mute changes and save
watch(isMuted, () => saveState())

onMounted(() => {
  loadState()
  setupSync()
})

// Export for settings UI
const exportMuteSettings = () => ({
  patterns: patterns.value,
  hotkeys: hotkeys.value,
  schedules: schedules.value,
})

const importMuteSettings = (settings: ReturnType<typeof exportMuteSettings>) => {
  patterns.value = settings.patterns
  hotkeys.value = settings.hotkeys
  schedules.value = settings.schedules
  saveState()
}`,
    },
  ],
}
