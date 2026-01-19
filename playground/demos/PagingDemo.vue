<template>
  <div class="paging-demo">
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
      <h3>Paging & Intercom</h3>
      <p class="info-text">Connect to Asterisk via AMI to use paging and intercom features.</p>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <InputText
          id="ami-url"
          v-model="amiUrl"
          placeholder="ws://pbx.example.com:8080"
          :disabled="connecting"
          class="w-full"
        />
        <small>amiws WebSocket proxy URL</small>
      </div>

      <Button
        :disabled="!amiUrl || connecting"
        @click="handleConnect"
        :label="connecting ? 'Connecting...' : 'Connect to AMI'"
        severity="primary"
      />

      <Message v-if="connectionError" severity="error" class="mt-3">
        {{ connectionError }}
      </Message>

      <div class="demo-tip">
        <strong>Tip:</strong> This demo requires Asterisk with paging/intercom configured (Page
        application or PJSIP auto-answer support).
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
          <span>Active Pages: {{ activeSessions.length }}</span>
        </div>
        <Button @click="handleDisconnect" label="Disconnect" severity="secondary" size="small" />
      </div>

      <!-- Paging Controls -->
      <div class="paging-panel">
        <h3>Page Extension</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="target">Target Extension(s)</label>
            <InputText
              id="target"
              v-model="pageTarget"
              placeholder="1001 or 1001,1002,1003"
              :disabled="isPaging"
              class="w-full"
            />
            <small>Single extension or comma-separated list</small>
          </div>

          <div class="form-group">
            <label for="mode">Paging Mode</label>
            <Dropdown
              id="mode"
              v-model="pageMode"
              :options="[
                { label: 'One-way (Simplex)', value: 'simplex' },
                { label: 'Two-way (Duplex/Intercom)', value: 'duplex' },
              ]"
              optionLabel="label"
              optionValue="value"
              :disabled="isPaging"
              class="w-full"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="timeout">Timeout (seconds)</label>
            <InputNumber
              id="timeout"
              v-model="pageTimeout"
              :min="5"
              :max="120"
              :disabled="isPaging"
              class="w-full"
            />
          </div>

          <div class="form-group">
            <label for="caller-id">Caller ID</label>
            <InputText
              id="caller-id"
              v-model="callerId"
              placeholder="Paging System"
              :disabled="isPaging"
              class="w-full"
            />
          </div>
        </div>

        <div class="action-buttons">
          <Button
            :disabled="!pageTarget || isPaging"
            @click="startPage"
            :label="pageMode === 'duplex' ? 'Start Intercom' : 'Start Page'"
            severity="primary"
          />
          <Button v-if="isPaging" @click="stopPage" label="Stop Page" severity="danger" />
        </div>

        <!-- Active Paging Sessions -->
        <div v-if="activeSessions.length > 0" class="active-sessions">
          <h4>Active Paging Sessions</h4>
          <div v-for="session in activeSessions" :key="session.id" class="session-item">
            <div class="session-info">
              <span class="session-target">{{ session.target }}</span>
              <span class="session-mode" :class="session.mode">
                {{ session.mode === 'duplex' ? 'Intercom' : 'Page' }}
              </span>
              <span class="session-duration">{{ formatDuration(session.startTime) }}</span>
            </div>
            <Button @click="endSession(session.id)" label="End" severity="danger" size="small" />
          </div>
        </div>

        <!-- Page History -->
        <div v-if="pageHistory.length > 0" class="page-history">
          <h4>Recent Pages</h4>
          <div v-for="(page, index) in pageHistory.slice(0, 10)" :key="index" class="history-item">
            <span class="history-target">{{ page.target }}</span>
            <span class="history-mode">{{ page.mode }}</span>
            <span class="history-time">{{ formatTime(page.endTime) }}</span>
            <span class="history-duration">{{ page.duration }}s</span>
          </div>
        </div>
      </div>

      <!-- Page Groups -->
      <div class="page-groups">
        <h3>Page Groups</h3>
        <p class="info-text">Define groups of extensions for quick paging.</p>

        <div class="groups-list">
          <div v-for="group in pageGroups" :key="group.id" class="group-card">
            <div class="group-info">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-members">{{ group.extensions.length }} extensions</span>
            </div>
            <div class="group-actions">
              <Button @click="pageGroup(group)" label="Page" severity="primary" size="small" />
              <Button
                @click="intercomGroup(group)"
                label="Intercom"
                severity="secondary"
                size="small"
              />
            </div>
          </div>
        </div>

        <Button @click="showAddGroupModal = true" label="+ Add Group" severity="secondary" />
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
/**
 * Paging Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for all interactive buttons with appropriate severity levels
 * - Using PrimeVue InputText for text inputs, with proper v-model binding
 * - Using PrimeVue InputNumber for numeric timeout input with min/max constraints
 * - Using PrimeVue Dropdown for paging mode selection to maintain consistent styling
 * - Using PrimeVue Message for error messages with appropriate severity
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, onUnmounted } from 'vue'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { type PageGroup } from '../../src'
import { Button, InputText, InputNumber, Dropdown, Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI connection state - use standardized storage key
const amiUrl = ref(localStorage.getItem('vuesip-ami-url') || '')
const connecting = ref(false)
const connectionError = ref('')

const {
  isConnected: realIsAmiConnected,
  connect,
  disconnect,
  getClient: _getClient,
} = playgroundAmiClient

// Effective values for simulation
const isAmiConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsAmiConnected.value
)

// Paging composable - will be initialized when connected
const pageTarget = ref('')
const pageMode = ref<'simplex' | 'duplex'>('simplex')
const pageTimeout = ref(30)
const callerId = ref('Paging System')
const isPaging = ref(false)
const activeSessions = ref<Array<{ id: string; target: string; mode: string; startTime: Date }>>([])
const pageHistory = ref<Array<{ target: string; mode: string; endTime: Date; duration: number }>>(
  []
)
const pageGroups = ref<PageGroup[]>([
  { id: '1', name: 'All Sales', extensions: ['1001', '1002', '1003'] },
  { id: '2', name: 'Support Team', extensions: ['2001', '2002'] },
  { id: '3', name: 'Management', extensions: ['3001', '3002', '3003'] },
])
const showAddGroupModal = ref(false)

// Connect to AMI
async function handleConnect() {
  if (!amiUrl.value) return

  connecting.value = true
  connectionError.value = ''

  try {
    localStorage.setItem('vuesip-ami-url', amiUrl.value)
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

// Paging functions
async function startPage() {
  if (!pageTarget.value) return

  isPaging.value = true
  const sessionId = Date.now().toString()

  activeSessions.value.push({
    id: sessionId,
    target: pageTarget.value,
    mode: pageMode.value,
    startTime: new Date(),
  })

  // In real implementation, this would use the useAmiPaging composable
  // For demo purposes, we simulate the paging
  console.log('Starting page to:', pageTarget.value, 'mode:', pageMode.value)
}

function stopPage() {
  if (activeSessions.value.length > 0) {
    const session = activeSessions.value[0]
    const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000)

    pageHistory.value.unshift({
      target: session.target,
      mode: session.mode,
      endTime: new Date(),
      duration,
    })

    activeSessions.value.shift()
  }
  isPaging.value = false
}

function endSession(sessionId: string) {
  const index = activeSessions.value.findIndex((s) => s.id === sessionId)
  if (index !== -1) {
    const session = activeSessions.value[index]
    const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000)

    pageHistory.value.unshift({
      target: session.target,
      mode: session.mode,
      endTime: new Date(),
      duration,
    })

    activeSessions.value.splice(index, 1)
  }

  if (activeSessions.value.length === 0) {
    isPaging.value = false
  }
}

function pageGroup(group: PageGroup) {
  pageTarget.value = group.extensions.join(',')
  pageMode.value = 'simplex'
  startPage()
}

function intercomGroup(group: PageGroup) {
  pageTarget.value = group.extensions.join(',')
  pageMode.value = 'duplex'
  startPage()
}

function formatDuration(startTime: Date): string {
  const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}

const codeExample = `import { computed } from 'vue'
import { useAmi, useAmiPaging } from 'vuesip'

const ami = useAmi()
const paging = useAmiPaging(computed(() => ami.getClient()), {
  onPageStart: (session) => {
    console.log('Paging', session.target, '...')
  },
  onPageConnect: (session) => {
    console.log('Page connected:', session.target)
  },
  onPageEnd: (session) => {
    console.log('Page ended:', session.id)
  },
})

// Page a single extension
await paging.page('1001')

// Page multiple extensions
await paging.page('1001,1002,1003')

// Start intercom (two-way, auto-answer)
await paging.intercom('1001')

// Page a group
await paging.pageGroup({
  id: 'sales',
  name: 'Sales Team',
  extensions: ['1001', '1002', '1003']
})

// End active page
paging.endPage(sessionId)`

// Auto-connect if URL is saved
if (amiUrl.value && !isAmiConnected.value) {
  handleConnect()
}

onUnmounted(() => {
  // Clean up any active sessions
  activeSessions.value = []
})
</script>

<style scoped>
.paging-demo {
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

.form-group input,
.form-group select {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

.btn-primary:hover:not(:disabled) {
  background: var(--primary-700);
}

.btn-secondary {
  background: var(--surface-200);
  color: var(--text-color);
}

/* Design Decision: PrimeVue Button components handle all button styling.
   Removed custom .btn-danger class as it's no longer needed. */

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Design Decision: PrimeVue Message component handles error message styling.
   Removed custom .error-message class as it's no longer needed. */

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
  background: var(--danger);
}

.status-dot.connected {
  background: var(--success);
}

.paging-panel,
.page-groups {
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}

.paging-panel h3,
.page-groups h3 {
  margin: 0 0 1rem 0;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.active-sessions,
.page-history {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--surface-border);
}

.active-sessions h4,
.page-history h4 {
  margin: 0 0 1rem 0;
}

.session-item,
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.session-target,
.history-target {
  font-weight: 500;
}

.session-mode {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.session-mode.simplex {
  background: var(--info-light);
  color: var(--info);
}

.session-mode.duplex {
  background: var(--success-light);
  color: var(--success);
}

.history-item {
  font-size: 0.875rem;
  gap: 1rem;
}

.history-time,
.history-duration {
  color: var(--text-secondary);
}

.groups-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.group-card {
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 6px;
  border: 1px solid var(--surface-border);
}

.group-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.group-name {
  font-weight: 500;
}

.group-members {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.group-actions {
  display: flex;
  gap: 0.5rem;
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
