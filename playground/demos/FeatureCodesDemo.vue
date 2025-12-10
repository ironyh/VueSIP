<template>
  <div class="feature-codes-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
      :duration="simulation.duration.value"
      :remote-uri="simulation.remoteUri.value"
      :remote-display-name="simulation.remoteDisplayName.value"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="simulation.isMuted.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Not Connected State -->
    <div v-if="!isAmiConnected" class="config-panel">
      <h3>Feature Codes</h3>
      <p class="info-text">
        Connect to Asterisk via AMI to use feature codes for DND, Call Forwarding, and more.
      </p>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <input
          id="ami-url"
          v-model="amiUrl"
          type="text"
          placeholder="ws://pbx.example.com:8080"
          :disabled="connecting"
        />
        <small>amiws WebSocket proxy URL</small>
      </div>

      <div class="form-group">
        <label for="extension">Your Extension</label>
        <input
          id="extension"
          v-model="extension"
          type="text"
          placeholder="1001"
          :disabled="connecting"
        />
        <small>Extension to manage features for</small>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!amiUrl || !extension || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect to AMI' }}
      </button>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> Feature codes must be configured in your PBX dialplan.
        Common codes: *76 (DND On), *77 (DND Off), *72 (CF), *73 (CF Off).
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-item">
          <span class="status-dot connected"></span>
          <span>AMI Connected</span>
        </div>
        <div class="status-item">
          <span>Extension: {{ extension }}</span>
        </div>
        <button class="btn btn-sm btn-secondary" @click="refreshStatus">
          🔄 Refresh
        </button>
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">
          Disconnect
        </button>
      </div>

      <!-- DND Section -->
      <div class="feature-section">
        <h3>🚫 Do Not Disturb</h3>
        <div class="dnd-controls">
          <div class="dnd-status">
            <span class="status-badge" :class="{ enabled: dndEnabled, disabled: !dndEnabled }">
              {{ dndEnabled ? '🔴 DND Enabled' : '🟢 DND Disabled' }}
            </span>
          </div>
          <div class="dnd-buttons">
            <button
              class="btn"
              :class="dndEnabled ? 'btn-secondary' : 'btn-danger'"
              @click="toggleDnd"
              :disabled="loading"
            >
              {{ dndEnabled ? 'Disable DND' : 'Enable DND' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Call Forward Section -->
      <div class="feature-section">
        <h3>📞 Call Forwarding</h3>

        <div class="cf-types">
          <!-- Unconditional -->
          <div class="cf-card">
            <div class="cf-header">
              <span class="cf-title">Unconditional (All Calls)</span>
              <span class="cf-status" :class="{ active: cfAllEnabled }">
                {{ cfAllEnabled ? '✓ Active' : 'Inactive' }}
              </span>
            </div>
            <div class="cf-body">
              <input
                v-model="cfAllNumber"
                type="text"
                placeholder="Forward to number..."
                :disabled="loading"
              />
              <div class="cf-actions">
                <button
                  class="btn btn-sm btn-primary"
                  @click="setCallForward('all', cfAllNumber)"
                  :disabled="!cfAllNumber || loading"
                >
                  Set
                </button>
                <button
                  class="btn btn-sm btn-secondary"
                  @click="clearCallForward('all')"
                  :disabled="!cfAllEnabled || loading"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <!-- Busy -->
          <div class="cf-card">
            <div class="cf-header">
              <span class="cf-title">When Busy</span>
              <span class="cf-status" :class="{ active: cfBusyEnabled }">
                {{ cfBusyEnabled ? '✓ Active' : 'Inactive' }}
              </span>
            </div>
            <div class="cf-body">
              <input
                v-model="cfBusyNumber"
                type="text"
                placeholder="Forward to number..."
                :disabled="loading"
              />
              <div class="cf-actions">
                <button
                  class="btn btn-sm btn-primary"
                  @click="setCallForward('busy', cfBusyNumber)"
                  :disabled="!cfBusyNumber || loading"
                >
                  Set
                </button>
                <button
                  class="btn btn-sm btn-secondary"
                  @click="clearCallForward('busy')"
                  :disabled="!cfBusyEnabled || loading"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <!-- No Answer -->
          <div class="cf-card">
            <div class="cf-header">
              <span class="cf-title">No Answer</span>
              <span class="cf-status" :class="{ active: cfNoAnswerEnabled }">
                {{ cfNoAnswerEnabled ? '✓ Active' : 'Inactive' }}
              </span>
            </div>
            <div class="cf-body">
              <input
                v-model="cfNoAnswerNumber"
                type="text"
                placeholder="Forward to number..."
                :disabled="loading"
              />
              <div class="cf-actions">
                <button
                  class="btn btn-sm btn-primary"
                  @click="setCallForward('noanswer', cfNoAnswerNumber)"
                  :disabled="!cfNoAnswerNumber || loading"
                >
                  Set
                </button>
                <button
                  class="btn btn-sm btn-secondary"
                  @click="clearCallForward('noanswer')"
                  :disabled="!cfNoAnswerEnabled || loading"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Feature Codes -->
      <div class="feature-section">
        <h3>*️⃣ Execute Custom Feature Code</h3>
        <div class="custom-code">
          <input
            v-model="customCode"
            type="text"
            placeholder="*72 or *98..."
            :disabled="loading"
          />
          <button
            class="btn btn-primary"
            @click="executeCode"
            :disabled="!customCode || loading"
          >
            Execute
          </button>
        </div>

        <div class="code-reference">
          <h4>Common Feature Codes</h4>
          <div class="code-grid">
            <div class="code-item" @click="customCode = '*76'">
              <span class="code">*76</span>
              <span class="desc">DND On</span>
            </div>
            <div class="code-item" @click="customCode = '*77'">
              <span class="code">*77</span>
              <span class="desc">DND Off</span>
            </div>
            <div class="code-item" @click="customCode = '*72'">
              <span class="code">*72</span>
              <span class="desc">Call Forward</span>
            </div>
            <div class="code-item" @click="customCode = '*73'">
              <span class="code">*73</span>
              <span class="desc">CF Cancel</span>
            </div>
            <div class="code-item" @click="customCode = '*97'">
              <span class="code">*97</span>
              <span class="desc">Voicemail</span>
            </div>
            <div class="code-item" @click="customCode = '*98'">
              <span class="code">*98</span>
              <span class="desc">VM Login</span>
            </div>
            <div class="code-item" @click="customCode = '*60'">
              <span class="code">*60</span>
              <span class="desc">Blacklist</span>
            </div>
            <div class="code-item" @click="customCode = '*69'">
              <span class="code">*69</span>
              <span class="desc">Last Caller</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Execution History -->
      <div v-if="executionHistory.length > 0" class="feature-section">
        <h3>📋 Recent Executions</h3>
        <div class="history-list">
          <div
            v-for="(item, index) in executionHistory.slice(0, 10)"
            :key="index"
            class="history-item"
            :class="{ success: item.success, error: !item.success }"
          >
            <span class="history-code">{{ item.code }}</span>
            <span class="history-result">{{ item.success ? '✓' : '✗' }} {{ item.message }}</span>
            <span class="history-time">{{ formatTime(item.time) }}</span>
          </div>
        </div>
      </div>

      <!-- Code Example -->
      <div class="code-section">
        <h4>Code Example</h4>
        <pre class="code-block">{{ codeExample }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// AMI connection state - use standardized storage key
const amiUrl = ref(localStorage.getItem('vuesip-ami-url') || '')
const extension = ref(localStorage.getItem('playground_extension') || '')
const connecting = ref(false)
const connectionError = ref('')
const loading = ref(false)

const { isConnected: realIsAmiConnected, connect, disconnect } = playgroundAmiClient

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Effective values for simulation
const isAmiConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsAmiConnected.value
)

// Feature state
const dndEnabled = ref(false)
const cfAllEnabled = ref(false)
const cfAllNumber = ref('')
const cfBusyEnabled = ref(false)
const cfBusyNumber = ref('')
const cfNoAnswerEnabled = ref(false)
const cfNoAnswerNumber = ref('')
const customCode = ref('')
const executionHistory = ref<Array<{ code: string; success: boolean; message: string; time: Date }>>([])

// Connect to AMI
async function handleConnect() {
  if (!amiUrl.value || !extension.value) return

  connecting.value = true
  connectionError.value = ''

  try {
    localStorage.setItem('vuesip-ami-url', amiUrl.value)
    localStorage.setItem('playground_extension', extension.value)
    await connect(amiUrl.value)
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

function handleDisconnect() {
  disconnect()
}

async function refreshStatus() {
  loading.value = true
  // In real implementation, this would query the feature status via AMI
  // For demo, we just simulate a refresh
  await new Promise(resolve => setTimeout(resolve, 500))
  loading.value = false
}

async function toggleDnd() {
  loading.value = true
  try {
    dndEnabled.value = !dndEnabled.value
    executionHistory.value.unshift({
      code: dndEnabled.value ? '*76' : '*77',
      success: true,
      message: dndEnabled.value ? 'DND Enabled' : 'DND Disabled',
      time: new Date(),
    })
  } finally {
    loading.value = false
  }
}

async function setCallForward(type: 'all' | 'busy' | 'noanswer', number: string) {
  if (!number) return
  loading.value = true

  try {
    if (type === 'all') {
      cfAllEnabled.value = true
    } else if (type === 'busy') {
      cfBusyEnabled.value = true
    } else {
      cfNoAnswerEnabled.value = true
    }

    executionHistory.value.unshift({
      code: `*72 ${number}`,
      success: true,
      message: `Call forward (${type}) set to ${number}`,
      time: new Date(),
    })
  } finally {
    loading.value = false
  }
}

async function clearCallForward(type: 'all' | 'busy' | 'noanswer') {
  loading.value = true

  try {
    if (type === 'all') {
      cfAllEnabled.value = false
      cfAllNumber.value = ''
    } else if (type === 'busy') {
      cfBusyEnabled.value = false
      cfBusyNumber.value = ''
    } else {
      cfNoAnswerEnabled.value = false
      cfNoAnswerNumber.value = ''
    }

    executionHistory.value.unshift({
      code: '*73',
      success: true,
      message: `Call forward (${type}) cleared`,
      time: new Date(),
    })
  } finally {
    loading.value = false
  }
}

async function executeCode() {
  if (!customCode.value) return
  loading.value = true

  try {
    // Simulate feature code execution
    await new Promise(resolve => setTimeout(resolve, 500))

    executionHistory.value.unshift({
      code: customCode.value,
      success: true,
      message: 'Feature code executed',
      time: new Date(),
    })

    customCode.value = ''
  } finally {
    loading.value = false
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}

const codeExample = `import { computed } from 'vue'
import { useAmi, useAmiFeatureCodes } from 'vuesip'

const ami = useAmi()
const features = useAmiFeatureCodes(computed(() => ami.getClient()), {
  extension: '1001',
  onDndChanged: (enabled) => {
    console.log('DND:', enabled ? 'enabled' : 'disabled')
  },
  onCallForwardChanged: (type, destination) => {
    console.log('CF ' + type + ':', destination || 'cleared')
  },
})

// DND controls
await features.enableDnd()
await features.disableDnd()
await features.toggleDnd()

// Check DND status
console.log('DND is', features.dndEnabled.value ? 'on' : 'off')

// Call forwarding
await features.setCallForward('all', '1002')
await features.setCallForward('busy', 'voicemail')
await features.setCallForward('noanswer', '1003')
await features.clearCallForward('all')

// Execute custom feature code
await features.executeFeatureCode('*97')

// Get current status
const status = features.featureStatus.value
console.log('Current CF:', status.callForward)`

// Auto-connect if URL is saved
if (amiUrl.value && extension.value && !isAmiConnected.value) {
  handleConnect()
}
</script>

<style scoped>
.feature-codes-demo {
  max-width: 900px;
  margin: 0 auto;
}

.config-panel {
  padding: 2rem;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}

.config-panel h3 {
  margin: 0 0 1rem 0;
}

.info-text {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  font-size: 1rem;
  background: var(--surface-ground);
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--surface-200);
  color: var(--text-color);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
  font-size: 0.875rem;
}

.connected-interface {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.connected {
  background: #22c55e;
}

.feature-section {
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}

.feature-section h3 {
  margin: 0 0 1rem 0;
}

.dnd-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 500;
}

.status-badge.enabled {
  background: #fef2f2;
  color: #dc2626;
}

.status-badge.disabled {
  background: #dcfce7;
  color: #16a34a;
}

.cf-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.cf-card {
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 6px;
  border: 1px solid var(--surface-border);
}

.cf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.cf-title {
  font-weight: 500;
}

.cf-status {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.cf-status.active {
  color: #16a34a;
}

.cf-body input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  background: var(--surface-card);
}

.cf-actions {
  display: flex;
  gap: 0.5rem;
}

.custom-code {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.custom-code input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  font-size: 1.25rem;
  font-family: monospace;
  background: var(--surface-ground);
}

.code-reference h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.code-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.code-item {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.code-item:hover {
  background: var(--surface-200);
}

.code-item .code {
  font-family: monospace;
  font-weight: bold;
  font-size: 1.1rem;
}

.code-item .desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.history-item.success {
  background: #dcfce7;
}

.history-item.error {
  background: #fef2f2;
}

.history-code {
  font-family: monospace;
  font-weight: 500;
  min-width: 80px;
}

.history-result {
  flex: 1;
}

.history-time {
  color: var(--text-secondary);
}

.code-section {
  margin-top: 1rem;
}

.code-section h4 {
  margin: 0 0 0.5rem 0;
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
