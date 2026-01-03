<script setup lang="ts">
import { ref, reactive } from 'vue'

// Simulated state for demo
const callState = reactive({
  isConnected: true,
  activeCall: {
    id: 'call-123',
    remoteNumber: '+1 (555) 123-4567',
    duration: 125,
    status: 'connected',
  },
})

const transferType = ref<'blind' | 'attended'>('blind')
const transferTarget = ref('')
const transferStatus = ref<'idle' | 'transferring' | 'consulting' | 'completed' | 'failed'>('idle')
const consultCall = ref<{ number: string; status: string } | null>(null)
const events = ref<Array<{ time: string; type: string; data: string }>>([])

const addEvent = (type: string, data: string) => {
  const now = new Date()
  events.value.unshift({
    time: now.toLocaleTimeString(),
    type,
    data,
  })
  if (events.value.length > 20) events.value.pop()
}

const initiateTransfer = () => {
  if (!transferTarget.value) return

  if (transferType.value === 'blind') {
    transferStatus.value = 'transferring'
    addEvent('TRANSFER', `Blind transfer initiated to ${transferTarget.value}`)
    addEvent('SIP', 'Sending REFER request...')

    setTimeout(() => {
      addEvent('SIP', '202 Accepted received')
      addEvent('NOTIFY', 'Transfer in progress (100 Trying)')
    }, 500)

    setTimeout(() => {
      addEvent('NOTIFY', 'Transfer ringing (180 Ringing)')
    }, 1000)

    setTimeout(() => {
      transferStatus.value = 'completed'
      addEvent('NOTIFY', 'Transfer completed (200 OK)')
      addEvent('TRANSFER', 'Call successfully transferred!')
    }, 2000)
  } else {
    // Attended transfer
    transferStatus.value = 'consulting'
    consultCall.value = { number: transferTarget.value, status: 'dialing' }
    addEvent('TRANSFER', `Attended transfer - consulting ${transferTarget.value}`)
    addEvent('SIP', 'Creating consultation call...')

    setTimeout(() => {
      if (consultCall.value) consultCall.value.status = 'ringing'
      addEvent('SIP', '180 Ringing')
    }, 800)

    setTimeout(() => {
      if (consultCall.value) consultCall.value.status = 'connected'
      addEvent('SIP', '200 OK - Consultation call established')
      addEvent('INFO', 'Original call automatically placed on hold')
    }, 1500)
  }
}

const completeAttendedTransfer = () => {
  addEvent('TRANSFER', 'Completing attended transfer')
  addEvent('SIP', 'Sending REFER with Replaces header')
  transferStatus.value = 'transferring'

  setTimeout(() => {
    transferStatus.value = 'completed'
    consultCall.value = null
    addEvent('TRANSFER', 'Attended transfer completed!')
  }, 1000)
}

const cancelTransfer = () => {
  addEvent('TRANSFER', 'Transfer cancelled')
  transferStatus.value = 'idle'
  consultCall.value = null
  transferTarget.value = ''
}

const resetDemo = () => {
  transferStatus.value = 'idle'
  consultCall.value = null
  transferTarget.value = ''
  events.value = []
  addEvent('DEMO', 'Demo reset - ready for new transfer')
}

// Initialize
addEvent('DEMO', 'Call Transfer demo initialized')
addEvent('INFO', 'Active call with +1 (555) 123-4567')
</script>

<template>
  <div class="demo-panel">
    <h2><span class="icon">📞</span> Call Transfer Demo</h2>

    <div class="status-bar">
      <div class="status-item">
        <span :class="['status-dot', callState.isConnected ? 'connected' : '']"></span>
        <span>SIP: {{ callState.isConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>
      <div class="status-item">
        <span class="status-dot connected"></span>
        <span>Call: {{ callState.activeCall.remoteNumber }}</span>
      </div>
      <div class="status-item">
        <span
        >Duration: {{ Math.floor(callState.activeCall.duration / 60) }}:{{
          String(callState.activeCall.duration % 60).padStart(2, '0')
        }}</span
        >
      </div>
    </div>

    <div class="demo-section">
      <h3>Transfer Type</h3>
      <div class="transfer-type-tabs">
        <button
          :class="['transfer-type-tab', { active: transferType === 'blind' }]"
          @click="transferType = 'blind'"
          :disabled="transferStatus !== 'idle'"
        >
          🔀 Blind Transfer
        </button>
        <button
          :class="['transfer-type-tab', { active: transferType === 'attended' }]"
          @click="transferType = 'attended'"
          :disabled="transferStatus !== 'idle'"
        >
          👥 Attended Transfer
        </button>
      </div>

      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem">
        <strong v-if="transferType === 'blind'">Blind:</strong>
        <strong v-else>Attended:</strong>
        {{
          transferType === 'blind'
            ? 'Immediately transfers call without consultation'
            : 'Consult with target before completing transfer'
        }}
      </p>
    </div>

    <div class="demo-section">
      <h3>Transfer Target</h3>
      <div class="input-group">
        <input
          v-model="transferTarget"
          class="input"
          placeholder="Enter number or SIP URI"
          :disabled="transferStatus !== 'idle'"
        />
      </div>

      <div class="btn-group" v-if="transferStatus === 'idle'">
        <button class="btn btn-primary" @click="initiateTransfer" :disabled="!transferTarget">
          {{ transferType === 'blind' ? '🔀 Transfer Now' : '📞 Start Consultation' }}
        </button>
      </div>

      <div v-else-if="transferStatus === 'consulting'" class="transfer-panel">
        <h4 style="margin-bottom: 0.75rem">📞 Consultation Call</h4>
        <div class="status-bar" style="margin-bottom: 0.75rem">
          <div class="status-item">
            <span
              :class="[
                'status-dot',
                consultCall?.status === 'connected' ? 'connected' : 'connecting',
              ]"
            ></span>
            <span>{{ consultCall?.number }}</span>
          </div>
          <div class="status-item">
            <span>Status: {{ consultCall?.status }}</span>
          </div>
        </div>
        <div class="btn-group">
          <button
            class="btn btn-success"
            @click="completeAttendedTransfer"
            :disabled="consultCall?.status !== 'connected'"
          >
            ✅ Complete Transfer
          </button>
          <button class="btn btn-danger" @click="cancelTransfer">❌ Cancel</button>
        </div>
      </div>

      <div v-else-if="transferStatus === 'transferring'" style="text-align: center; padding: 1rem">
        <div style="font-size: 2rem; margin-bottom: 0.5rem">🔄</div>
        <p>Transfer in progress...</p>
      </div>

      <div v-else-if="transferStatus === 'completed'" style="text-align: center; padding: 1rem">
        <div style="font-size: 2rem; margin-bottom: 0.5rem">✅</div>
        <p style="color: var(--success); margin-bottom: 1rem">Transfer Completed!</p>
        <button class="btn btn-outline" @click="resetDemo">Reset Demo</button>
      </div>
    </div>

    <div class="demo-section">
      <h3>Quick Transfer Numbers</h3>
      <div class="btn-group">
        <button class="btn btn-outline" @click="transferTarget = '+1-555-100'">Reception</button>
        <button class="btn btn-outline" @click="transferTarget = '+1-555-200'">Support</button>
        <button class="btn btn-outline" @click="transferTarget = '+1-555-300'">Sales</button>
        <button class="btn btn-outline" @click="transferTarget = 'sip:queue@pbx.local'">
          Queue
        </button>
      </div>
    </div>
  </div>

  <div class="demo-panel">
    <h2><span class="icon">📋</span> Event Log</h2>
    <div class="event-log">
      <div v-for="(event, i) in events" :key="i" class="event-log-entry">
        <span class="event-time">{{ event.time }}</span>
        <span class="event-type">[{{ event.type }}]</span>
        <span class="event-data">{{ event.data }}</span>
      </div>
    </div>

    <div class="demo-section" style="margin-top: 1.5rem">
      <h3>API Usage</h3>
      <div class="code-preview">
        <code>
          <span class="comment">// Import the composable</span>
          <span class="keyword">import</span> { useCallTransfer } <span class="keyword">from</span>
          <span class="string">'vuesip'</span>

          <span class="comment">// In your component</span>
          <span class="keyword">const</span> { <span class="function">blindTransfer</span>,
          <span class="function">attendedTransfer</span>,
          <span class="function">completeTransfer</span>, transferState } =
          <span class="function">useCallTransfer</span>()

          <span class="comment">// Blind transfer</span>
          <span class="keyword">await</span>
          <span class="function">blindTransfer</span>(callSession,
          <span class="string">'sip:target@domain'</span>)

          <span class="comment">// Attended transfer</span>
          <span class="keyword">const</span> consultSession = <span class="keyword">await</span>
          <span class="function">attendedTransfer</span>(callSession, target)
          <span class="comment">// ... consult with target ...</span>
          <span class="keyword">await</span> <span class="function">completeTransfer</span>()
        </code>
      </div>
    </div>
  </div>
</template>
