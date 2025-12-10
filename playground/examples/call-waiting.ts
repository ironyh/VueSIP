import type { ExampleDefinition } from './types'
import CallWaitingDemo from '../demos/CallWaitingDemo.vue'

export const callWaitingExample: ExampleDefinition = {
  id: 'call-waiting',
  icon: '📱',
  title: 'Call Waiting & Switching',
  description: 'Handle multiple calls and switch between them',
  category: 'sip',
  tags: ['Advanced', 'Multi-Call', 'Practical'],
  component: CallWaitingDemo,
  setupGuide: '<p>Handle multiple simultaneous calls with call waiting. Switch between active calls, hold/resume calls, and manage incoming calls while on another call.</p>',
  codeSnippets: [
    {
      title: 'Managing Multiple Calls',
      description: 'Track and switch between calls',
      code: `import { ref } from 'vue'
import { useSipClient } from 'vuesip'

interface Call {
  id: string
  remoteUri: string
  state: 'active' | 'held' | 'incoming'
  isHeld: boolean
}

const calls = ref<Call[]>([])
const activeCallId = ref<string | null>(null)

// Answer incoming call and hold current
const answerAndHoldActive = async (callId: string) => {
  // Hold current active call
  if (activeCallId.value) {
    const current = calls.value.find(c => c.id === activeCallId.value)
    if (current) {
      await holdCall(current.id)
    }
  }

  // Answer new call
  const call = calls.value.find(c => c.id === callId)
  if (call) {
    await answerCall(callId)
    activeCallId.value = callId
  }
}

// Switch between calls
const switchToCall = async (callId: string) => {
  // Hold current
  if (activeCallId.value) {
    await holdCall(activeCallId.value)
  }

  // Resume target
  await resumeCall(callId)
  activeCallId.value = callId
}`,
    },
    {
      title: 'Call Waiting Settings',
      description: 'Configure call waiting behavior',
      code: `const callWaitingEnabled = ref(true)
const autoAnswerWaiting = ref(false)
const maxSimultaneousCalls = ref(3)

// Handle incoming call with call waiting
watch(incomingCall, async (call) => {
  if (!call) return

  if (!callWaitingEnabled.value && calls.value.length > 0) {
    // Reject if call waiting disabled
    await rejectCall(call.id, 486) // Busy Here
    return
  }

  if (calls.value.length >= maxSimultaneousCalls.value) {
    // Reject if max calls reached
    await rejectCall(call.id, 486)
    return
  }

  // Play call waiting tone
  playCallWaitingTone()

  if (autoAnswerWaiting.value) {
    // Auto-answer and hold current
    await answerAndHoldActive(call.id)
  }
})`,
    },
    {
      title: 'Swap and Merge Calls',
      description: 'Advanced multi-call operations',
      code: `// Swap active and held calls
const swapCalls = () => {
  const activeCall = calls.value.find(c => c.id === activeCallId.value)
  const heldCall = calls.value.find(c => c.isHeld)

  if (activeCall && heldCall) {
    // Hold active
    activeCall.isHeld = true

    // Resume held
    heldCall.isHeld = false
    activeCallId.value = heldCall.id
  }
}

// Merge all calls into conference
const mergeAllCalls = async () => {
  // Resume all held calls
  calls.value.forEach(call => {
    call.isHeld = false
  })

  console.log(\`Merged \${calls.value.length} calls into conference\`)
}`,
    },
    {
      title: 'Call Waiting Tone',
      description: 'Play distinctive call waiting beep',
      code: `class CallWaitingTone {
  private audioContext: AudioContext | null = null
  private isPlaying = false

  async play() {
    if (this.isPlaying) return

    this.audioContext = new AudioContext()
    this.isPlaying = true

    // Play beep pattern: two short beeps
    await this.playBeep(440, 0.2)  // First beep
    await this.delay(0.1)
    await this.playBeep(440, 0.2)  // Second beep

    this.isPlaying = false
  }

  private playBeep(frequency: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext) return resolve()

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      // Fade in/out to avoid clicks
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration)

      oscillator.start()
      oscillator.stop(this.audioContext.currentTime + duration)
      oscillator.onended = () => resolve()
    })
  }

  private delay(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000))
  }

  stop() {
    this.audioContext?.close()
    this.audioContext = null
    this.isPlaying = false
  }
}

const callWaitingTone = new CallWaitingTone()

// Play when new call comes in during active call
const playCallWaitingNotification = () => {
  if (calls.value.some(c => c.state === 'active')) {
    callWaitingTone.play()
  }
}`,
    },
    {
      title: 'Call Queue Display',
      description: 'Visual representation of waiting calls',
      code: `<template>
  <div class="call-queue">
    <!-- Active Call -->
    <div v-if="activeCall" class="active-call">
      <div class="call-status active">
        <span class="pulse"></span>
        Active
      </div>
      <div class="caller-info">
        <span class="name">{{ activeCall.displayName }}</span>
        <span class="duration">{{ formatDuration(activeCall.duration) }}</span>
      </div>
      <div class="call-actions">
        <button @click="holdActive" title="Hold">⏸️</button>
        <button @click="endCall(activeCall.id)" title="End">📵</button>
      </div>
    </div>

    <!-- Waiting Calls -->
    <div class="waiting-calls" v-if="waitingCalls.length > 0">
      <h4>Waiting ({{ waitingCalls.length }})</h4>

      <div
        v-for="call in waitingCalls"
        :key="call.id"
        class="waiting-call"
        :class="{ incoming: call.state === 'incoming' }"
      >
        <div class="call-status" :class="call.state">
          {{ call.state === 'incoming' ? '📞 Incoming' : '⏸️ On Hold' }}
        </div>
        <div class="caller-info">
          <span class="name">{{ call.displayName }}</span>
          <span class="wait-time">{{ formatWaitTime(call.waitingSince) }}</span>
        </div>
        <div class="call-actions">
          <button
            v-if="call.state === 'incoming'"
            @click="answerAndHoldActive(call.id)"
            class="answer-btn"
          >
            Answer
          </button>
          <button
            v-else
            @click="switchToCall(call.id)"
            class="switch-btn"
          >
            Switch
          </button>
          <button @click="endCall(call.id)" class="end-btn">
            End
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="queue-actions" v-if="calls.length > 1">
      <button @click="swapCalls" :disabled="!canSwap">
        🔄 Swap
      </button>
      <button @click="mergeAllCalls" :disabled="calls.length < 2">
        🔀 Merge All
      </button>
    </div>
  </div>
</template>

<script setup>
const waitingCalls = computed(() =>
  calls.value.filter(c => c.id !== activeCallId.value)
)

const canSwap = computed(() =>
  calls.value.filter(c => c.state !== 'incoming').length >= 2
)

const formatWaitTime = (since: Date) => {
  const seconds = Math.floor((Date.now() - since.getTime()) / 1000)
  return \`Waiting \${seconds}s\`
}
</script>`,
    },
    {
      title: 'Call Priority Handling',
      description: 'Handle calls based on priority',
      code: `interface CallWithPriority extends Call {
  priority: 'normal' | 'high' | 'urgent'
  isVIP: boolean
}

const callPriorityRules = ref({
  vipContacts: ['sip:boss@company.com', 'sip:ceo@company.com'],
  urgentKeywords: ['emergency', 'urgent', '911'],
  autoPromoteRepeated: true
})

const determineCallPriority = (call: IncomingCall): 'normal' | 'high' | 'urgent' => {
  const callerUri = call.remoteIdentity.uri.toString()
  const displayName = call.remoteIdentity.displayName || ''

  // VIP contacts get high priority
  if (callPriorityRules.value.vipContacts.includes(callerUri)) {
    return 'high'
  }

  // Check for urgent keywords in caller ID
  const lowerName = displayName.toLowerCase()
  if (callPriorityRules.value.urgentKeywords.some(kw => lowerName.includes(kw))) {
    return 'urgent'
  }

  // Repeated calls get promoted
  if (callPriorityRules.value.autoPromoteRepeated && isRepeatedCall(callerUri)) {
    return 'high'
  }

  return 'normal'
}

// Handle based on priority
const handlePrioritizedIncoming = async (call: IncomingCall) => {
  const priority = determineCallPriority(call)

  switch (priority) {
    case 'urgent':
      // Auto-answer urgent calls, interrupt current
      await endAllCalls()
      await answerCall(call.id)
      break

    case 'high':
      // Play distinctive ringtone, show prominent UI
      playHighPriorityRingtone()
      showUrgentCallNotification(call)
      break

    default:
      // Normal call waiting behavior
      playCallWaitingTone()
  }
}`,
    },
    {
      title: 'Keyboard Shortcuts',
      description: 'Quick actions via keyboard',
      code: `import { onMounted, onUnmounted } from 'vue'

const keyboardShortcuts = {
  'Space': () => toggleHoldActive(),
  'Enter': () => answerFirstWaiting(),
  'Escape': () => endActiveCall(),
  'Tab': () => switchToNextCall(),
  'Shift+Tab': () => switchToPreviousCall(),
  '1-9': (num: number) => switchToCallByIndex(num - 1),
  'm': () => toggleMute(),
  's': () => swapCalls()
}

const handleKeyDown = (event: KeyboardEvent) => {
  // Ignore if typing in input
  if (event.target instanceof HTMLInputElement) return

  const key = event.key

  // Number keys 1-9
  if (/^[1-9]$/.test(key)) {
    event.preventDefault()
    switchToCallByIndex(parseInt(key) - 1)
    return
  }

  // Other shortcuts
  const action = keyboardShortcuts[key]
  if (action) {
    event.preventDefault()
    action()
  }

  // Shift+Tab
  if (key === 'Tab' && event.shiftKey) {
    event.preventDefault()
    switchToPreviousCall()
  }
}

const switchToNextCall = () => {
  const currentIndex = calls.value.findIndex(c => c.id === activeCallId.value)
  const nextIndex = (currentIndex + 1) % calls.value.length
  switchToCall(calls.value[nextIndex].id)
}

const switchToPreviousCall = () => {
  const currentIndex = calls.value.findIndex(c => c.id === activeCallId.value)
  const prevIndex = (currentIndex - 1 + calls.value.length) % calls.value.length
  switchToCall(calls.value[prevIndex].id)
}

const switchToCallByIndex = (index: number) => {
  if (index < calls.value.length) {
    switchToCall(calls.value[index].id)
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})`,
    },
    {
      title: 'Call Waiting Statistics',
      description: 'Track call waiting metrics',
      code: `interface CallWaitingStats {
  totalCallsReceived: number
  callsWhileBusy: number
  callsAnswered: number
  callsMissed: number
  averageWaitTime: number
  longestWaitTime: number
  callsConvertedToConference: number
}

const stats = ref<CallWaitingStats>({
  totalCallsReceived: 0,
  callsWhileBusy: 0,
  callsAnswered: 0,
  callsMissed: 0,
  averageWaitTime: 0,
  longestWaitTime: 0,
  callsConvertedToConference: 0
})

const waitTimes: number[] = []

const trackWaitTime = (call: Call, answered: boolean) => {
  const waitTime = Date.now() - call.startedWaiting
  waitTimes.push(waitTime)

  stats.value.totalCallsReceived++

  if (answered) {
    stats.value.callsAnswered++
  } else {
    stats.value.callsMissed++
  }

  // Update averages
  stats.value.averageWaitTime =
    waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length

  stats.value.longestWaitTime = Math.max(...waitTimes)
}

// Display stats
const formattedStats = computed(() => ({
  answerRate: \`\${((stats.value.callsAnswered / stats.value.totalCallsReceived) * 100).toFixed(1)}%\`,
  avgWait: \`\${(stats.value.averageWaitTime / 1000).toFixed(1)}s\`,
  maxWait: \`\${(stats.value.longestWaitTime / 1000).toFixed(1)}s\`
}))`,
    },
  ],
}
