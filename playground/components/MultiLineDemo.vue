<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

interface Line {
  id: number
  status: 'idle' | 'ringing' | 'active' | 'hold' | 'connecting'
  remoteNumber?: string
  duration: number
  isActive: boolean
}

const MAX_LINES = 4

const lines = reactive<Line[]>([
  { id: 1, status: 'active', remoteNumber: '+1 (555) 123-4567', duration: 125, isActive: true },
  { id: 2, status: 'hold', remoteNumber: '+1 (555) 987-6543', duration: 67, isActive: false },
  { id: 3, status: 'ringing', remoteNumber: '+1 (555) 456-7890', duration: 0, isActive: false },
  { id: 4, status: 'idle', duration: 0, isActive: false },
])

const activeLine = computed(() => lines.find(l => l.isActive))
const availableLines = computed(() => lines.filter(l => l.status === 'idle'))

const parkSlots = reactive<Array<{ slot: string; number: string; duration: number }>>([])
const conferenceMembers = ref<number[]>([])
const events = ref<Array<{ time: string; type: string; data: string }>>([])

// Duration timers
let durationTimers: Map<number, ReturnType<typeof setInterval>> = new Map()

const addEvent = (type: string, data: string) => {
  const now = new Date()
  events.value.unshift({
    time: now.toLocaleTimeString(),
    type,
    data
  })
  if (events.value.length > 20) events.value.pop()
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const switchToLine = (lineId: number) => {
  const targetLine = lines.find(l => l.id === lineId)
  if (!targetLine || targetLine.status === 'idle') return

  // Put current active line on hold
  const currentActive = lines.find(l => l.isActive)
  if (currentActive && currentActive.id !== lineId) {
    currentActive.isActive = false
    if (currentActive.status === 'active') {
      currentActive.status = 'hold'
      addEvent('HOLD', `Line ${currentActive.id} placed on hold`)
    }
  }

  // Activate target line
  targetLine.isActive = true
  if (targetLine.status === 'hold') {
    targetLine.status = 'active'
    addEvent('RESUME', `Line ${lineId} resumed`)
  } else if (targetLine.status === 'ringing') {
    targetLine.status = 'active'
    addEvent('ANSWER', `Line ${lineId} answered`)
    // Start duration timer
    durationTimers.set(lineId, setInterval(() => {
      targetLine.duration++
    }, 1000))
  }

  addEvent('LINE', `Switched to Line ${lineId}`)
}

const holdLine = (lineId: number) => {
  const line = lines.find(l => l.id === lineId)
  if (!line || line.status !== 'active') return

  line.status = 'hold'
  addEvent('HOLD', `Line ${lineId} placed on hold`)
}

const endCall = (lineId: number) => {
  const line = lines.find(l => l.id === lineId)
  if (!line) return

  // Clear timer
  const timer = durationTimers.get(lineId)
  if (timer) {
    clearInterval(timer)
    durationTimers.delete(lineId)
  }

  addEvent('HANGUP', `Line ${lineId} call ended (${line.remoteNumber})`)

  line.status = 'idle'
  line.remoteNumber = undefined
  line.duration = 0
  line.isActive = false

  // If this was active, switch to another call
  const nextCall = lines.find(l => l.status === 'hold' || l.status === 'ringing')
  if (nextCall) {
    switchToLine(nextCall.id)
  }
}

const parkCall = (lineId: number) => {
  const line = lines.find(l => l.id === lineId)
  if (!line || line.status === 'idle') return

  const slot = `*70${parkSlots.length + 1}`
  parkSlots.push({
    slot,
    number: line.remoteNumber || 'Unknown',
    duration: line.duration
  })

  addEvent('PARK', `Line ${lineId} parked at ${slot}`)
  endCall(lineId)
}

const retrieveParked = (slot: string) => {
  const parked = parkSlots.find(p => p.slot === slot)
  if (!parked) return

  const freeLine = lines.find(l => l.status === 'idle')
  if (!freeLine) {
    addEvent('ERROR', 'No available lines to retrieve parked call')
    return
  }

  freeLine.status = 'active'
  freeLine.remoteNumber = parked.number
  freeLine.duration = parked.duration
  freeLine.isActive = true

  // Put current active on hold
  const currentActive = lines.find(l => l.isActive && l.id !== freeLine.id)
  if (currentActive) {
    currentActive.isActive = false
    currentActive.status = 'hold'
  }

  parkSlots.splice(parkSlots.indexOf(parked), 1)
  addEvent('RETRIEVE', `Retrieved ${slot} on Line ${freeLine.id}`)

  // Start timer
  durationTimers.set(freeLine.id, setInterval(() => {
    freeLine.duration++
  }, 1000))
}

const createConference = () => {
  const activeCalls = lines.filter(l => l.status === 'active' || l.status === 'hold')
  if (activeCalls.length < 2) {
    addEvent('ERROR', 'Need at least 2 calls for conference')
    return
  }

  conferenceMembers.value = activeCalls.map(l => l.id)
  activeCalls.forEach(l => {
    l.status = 'active'
    l.isActive = true
  })

  addEvent('CONFERENCE', `Created conference with Lines ${conferenceMembers.value.join(', ')}`)
}

const simulateIncoming = () => {
  const freeLine = lines.find(l => l.status === 'idle')
  if (!freeLine) {
    addEvent('ERROR', 'No available lines for incoming call')
    return
  }

  const randomNumber = `+1 (555) ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`
  freeLine.status = 'ringing'
  freeLine.remoteNumber = randomNumber

  addEvent('INCOMING', `Line ${freeLine.id}: ${randomNumber}`)
}

// Initialize timers for active calls
lines.forEach(line => {
  if (line.status === 'active') {
    durationTimers.set(line.id, setInterval(() => {
      line.duration++
    }, 1000))
  }
})

addEvent('DEMO', 'Multi-Line demo initialized')
addEvent('INFO', `${MAX_LINES} lines available`)
</script>

<template>
  <div class="demo-panel">
    <h2>Multi-Line Demo</h2>

    <div class="status-bar">
      <div class="status-item">
        <span>Lines: {{ lines.filter(l => l.status !== 'idle').length }}/{{ MAX_LINES }}</span>
      </div>
      <div class="status-item" v-if="conferenceMembers.length > 0">
        <span style="color: var(--primary);">Conference Active</span>
      </div>
      <div class="status-item" v-if="parkSlots.length > 0">
        <span style="color: var(--warning);">{{ parkSlots.length }} Parked</span>
      </div>
    </div>

    <div class="demo-section">
      <h3>Phone Lines</h3>
      <div class="line-panel">
        <div
          v-for="line in lines"
          :key="line.id"
          :class="[
            'line-card',
            {
              active: line.isActive,
              'on-hold': line.status === 'hold',
              ringing: line.status === 'ringing',
              empty: line.status === 'idle'
            }
          ]"
          @click="switchToLine(line.id)"
        >
          <div class="line-header">
            <span class="line-number">Line {{ line.id }}</span>
            <span :class="['line-status', line.status]">
              {{ line.status === 'idle' ? 'Available' : line.status }}
            </span>
          </div>
          <div v-if="line.status !== 'idle'" class="line-info">
            <div>{{ line.remoteNumber }}</div>
            <div v-if="line.status !== 'ringing'">{{ formatDuration(line.duration) }}</div>
          </div>
          <div v-else class="line-info" style="opacity: 0.5;">
            Click to receive call
          </div>

          <div v-if="line.status !== 'idle'" style="margin-top: 0.75rem; display: flex; gap: 0.25rem;">
            <button
              class="btn btn-outline"
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
              @click.stop="holdLine(line.id)"
              v-if="line.status === 'active'"
            >
              Hold
            </button>
            <button
              class="btn btn-outline"
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
              @click.stop="parkCall(line.id)"
            >
              Park
            </button>
            <button
              class="btn btn-danger"
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
              @click.stop="endCall(line.id)"
            >
              End
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>Actions</h3>
      <div class="btn-group">
        <button class="btn btn-primary" @click="simulateIncoming">
          Simulate Incoming
        </button>
        <button
          class="btn btn-outline"
          @click="createConference"
          :disabled="lines.filter(l => l.status !== 'idle').length < 2"
        >
          Create Conference
        </button>
      </div>
    </div>

    <div class="demo-section" v-if="parkSlots.length > 0">
      <h3>Parked Calls</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <div
          v-for="parked in parkSlots"
          :key="parked.slot"
          class="participant-chip"
          style="cursor: pointer;"
          @click="retrieveParked(parked.slot)"
        >
          <span>{{ parked.slot }}</span>
          <span style="color: var(--text-muted);">{{ parked.number }}</span>
          <span style="color: var(--success);">Retrieve</span>
        </div>
      </div>
    </div>

    <div class="demo-section" v-if="conferenceMembers.length > 0">
      <h3>Conference</h3>
      <div class="conference-participants">
        <div v-for="lineId in conferenceMembers" :key="lineId" class="participant-chip">
          <span>Line {{ lineId }}</span>
          <span>{{ lines.find(l => l.id === lineId)?.remoteNumber }}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="demo-panel">
    <h2>Event Log & API</h2>

    <div class="demo-section">
      <h3>Event Log</h3>
      <div class="event-log">
        <div v-for="(event, i) in events" :key="i" class="event-log-entry">
          <span class="event-time">{{ event.time }}</span>
          <span class="event-type">[{{ event.type }}]</span>
          <span class="event-data">{{ event.data }}</span>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>API Usage</h3>
      <div class="code-preview">
        <code>
<span class="keyword">import</span> { useMultiLine } <span class="keyword">from</span> <span class="string">'vuesip'</span>

<span class="keyword">const</span> {
  lines,
  activeLine,
  maxLines,
  <span class="function">assignCallToLine</span>,
  <span class="function">switchToLine</span>,
  <span class="function">holdLine</span>,
  <span class="function">resumeLine</span>,
  <span class="function">parkLine</span>,
  <span class="function">retrieveParked</span>,
  <span class="function">createConference</span>
} = <span class="function">useMultiLine</span>({ maxLines: <span class="number">4</span> })

<span class="comment">// Switch between lines</span>
<span class="keyword">await</span> <span class="function">switchToLine</span>(<span class="number">2</span>)

<span class="comment">// Park a call</span>
<span class="keyword">const</span> slot = <span class="keyword">await</span> <span class="function">parkLine</span>(<span class="number">1</span>)

<span class="comment">// Retrieve parked call</span>
<span class="keyword">await</span> <span class="function">retrieveParked</span>(slot)

<span class="comment">// Create conference</span>
<span class="keyword">await</span> <span class="function">createConference</span>([<span class="number">1</span>, <span class="number">2</span>])
        </code>
      </div>
    </div>

    <div class="demo-section">
      <h3>Line State Structure</h3>
      <div class="code-preview">
        <code>
<span class="keyword">interface</span> Line {
  id: <span class="keyword">number</span>
  status: <span class="string">'idle'</span> | <span class="string">'ringing'</span> | <span class="string">'active'</span> | <span class="string">'hold'</span>
  callSession?: CallSession
  remoteNumber?: <span class="keyword">string</span>
  duration: <span class="keyword">number</span>
  isActive: <span class="keyword">boolean</span>
}
        </code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-card {
  cursor: pointer;
}

.line-card:hover:not(.empty) {
  border-color: var(--primary);
}
</style>
