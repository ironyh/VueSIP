<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const callState = reactive({
  id: 'call-456',
  remoteNumber: '+1 (555) 987-6543',
  duration: 67,
  isOnHold: false,
  holdDuration: 0,
  musicOnHold: true
})

const holdHistory = ref<Array<{ action: string; time: string; duration?: number }>>([])
const events = ref<Array<{ time: string; type: string; data: string }>>([])

let holdTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null

const addEvent = (type: string, data: string) => {
  const now = new Date()
  events.value.unshift({
    time: now.toLocaleTimeString(),
    type,
    data
  })
  if (events.value.length > 20) events.value.pop()
}

const toggleHold = () => {
  if (callState.isOnHold) {
    // Resume
    if (holdTimer) clearInterval(holdTimer)
    holdHistory.value.unshift({
      action: 'resumed',
      time: new Date().toLocaleTimeString(),
      duration: callState.holdDuration
    })

    addEvent('HOLD', `Call resumed after ${callState.holdDuration}s`)
    addEvent('SDP', 'Re-INVITE sent with active media direction')
    addEvent('SDP', 'a=sendrecv (bidirectional audio)')

    callState.isOnHold = false
    callState.holdDuration = 0

    // Resume duration counter
    durationTimer = setInterval(() => {
      callState.duration++
    }, 1000)
  } else {
    // Hold
    if (durationTimer) clearInterval(durationTimer)

    addEvent('HOLD', 'Placing call on hold...')
    addEvent('SDP', 'Re-INVITE sent with inactive media')
    addEvent('SDP', 'a=sendonly (local hold) or a=inactive')

    callState.isOnHold = true
    holdHistory.value.unshift({
      action: 'held',
      time: new Date().toLocaleTimeString()
    })

    holdTimer = setInterval(() => {
      callState.holdDuration++
    }, 1000)

    if (callState.musicOnHold) {
      addEvent('MOH', 'Music on hold stream started')
    }
  }
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

// Start duration timer
durationTimer = setInterval(() => {
  if (!callState.isOnHold) {
    callState.duration++
  }
}, 1000)

addEvent('DEMO', 'Hold/Resume demo initialized')
addEvent('INFO', `Active call with ${callState.remoteNumber}`)
</script>

<template>
  <div class="demo-panel">
    <h2><span class="icon">⏸️</span> Call Hold/Resume Demo</h2>

    <div class="status-bar">
      <div class="status-item">
        <span :class="['status-dot', callState.isOnHold ? 'connecting' : 'connected']"></span>
        <span>{{ callState.remoteNumber }}</span>
      </div>
      <div class="status-item">
        <span>Call: {{ formatDuration(callState.duration) }}</span>
      </div>
      <div v-if="callState.isOnHold" class="status-item" style="color: var(--warning);">
        <span>⏸️ On Hold: {{ formatDuration(callState.holdDuration) }}</span>
      </div>
    </div>

    <div class="demo-section">
      <h3>Hold Control</h3>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem;">
        <button
          :class="['btn', callState.isOnHold ? 'btn-success' : 'btn-warning']"
          style="font-size: 1.25rem; padding: 1rem 2rem;"
          @click="toggleHold"
        >
          {{ callState.isOnHold ? '▶️ Resume Call' : '⏸️ Hold Call' }}
        </button>

        <div v-if="callState.isOnHold" style="text-align: center;">
          <div style="font-size: 3rem; margin: 1rem 0;">⏸️</div>
          <p style="color: var(--warning);">Call is on hold</p>
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            {{ callState.musicOnHold ? '🎵 Music on hold playing' : 'Silence on hold' }}
          </p>
        </div>

        <div v-else style="text-align: center;">
          <div style="font-size: 3rem; margin: 1rem 0;">📞</div>
          <p style="color: var(--success);">Call is active</p>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>Settings</h3>
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
        <input type="checkbox" v-model="callState.musicOnHold" />
        <span>Enable Music on Hold</span>
      </label>
    </div>

    <div class="demo-section">
      <h3>Hold History</h3>
      <div v-if="holdHistory.length === 0" style="color: var(--text-muted); font-size: 0.9rem;">
        No hold events yet
      </div>
      <div v-else>
        <div v-for="(entry, i) in holdHistory" :key="i" style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
          <span :style="{ color: entry.action === 'held' ? 'var(--warning)' : 'var(--success)' }">
            {{ entry.action === 'held' ? '⏸️' : '▶️' }} {{ entry.action }}
          </span>
          <span style="color: var(--text-muted); margin-left: 0.5rem;">{{ entry.time }}</span>
          <span v-if="entry.duration" style="color: var(--text-muted);">
            ({{ entry.duration }}s)
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="demo-panel">
    <h2><span class="icon">📋</span> SDP Details</h2>

    <div class="demo-section">
      <h3>Current Media Direction</h3>
      <div class="code-preview" style="font-size: 0.9rem;">
        <code v-if="!callState.isOnHold">
m=audio 49170 RTP/AVP 0
<span class="keyword">a=sendrecv</span>  <span class="comment">← Active bidirectional audio</span>
a=rtpmap:0 PCMU/8000
        </code>
        <code v-else>
m=audio 49170 RTP/AVP 0
<span class="keyword">a=sendonly</span>  <span class="comment">← Local hold (or a=inactive)</span>
a=rtpmap:0 PCMU/8000
        </code>
      </div>
    </div>

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
<span class="keyword">import</span> { useCallHold } <span class="keyword">from</span> <span class="string">'vuesip'</span>

<span class="keyword">const</span> {
  isOnHold,
  holdDuration,
  <span class="function">hold</span>,
  <span class="function">resume</span>,
  <span class="function">toggleHold</span>
} = <span class="function">useCallHold</span>(callSession)

<span class="comment">// Toggle hold state</span>
<span class="keyword">await</span> <span class="function">toggleHold</span>()

<span class="comment">// Or explicitly</span>
<span class="keyword">await</span> <span class="function">hold</span>({ musicOnHold: <span class="keyword">true</span> })
<span class="keyword">await</span> <span class="function">resume</span>()
        </code>
      </div>
    </div>
  </div>
</template>
