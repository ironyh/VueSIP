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
    <!-- Design Decision: Card component structures the configuration panel for better visual hierarchy.
         InputText components provide built-in validation states. Message component for errors. -->
    <Card v-if="!isAmiConnected" class="config-panel">
      <template #title>Feature Codes</template>
      <template #content>
        <p class="info-text mb-4">
          Connect to Asterisk via AMI to use feature codes for DND, Call Forwarding, and more.
        </p>

        <div class="form-group">
          <label for="ami-url">AMI WebSocket URL</label>
          <InputText
            id="ami-url"
            v-model="amiUrl"
            placeholder="ws://pbx.example.com:8080"
            :disabled="connecting"
            class="w-full"
            aria-required="true"
            aria-describedby="ami-url-hint"
          />
          <small id="ami-url-hint">amiws WebSocket proxy URL</small>
        </div>

        <div class="form-group">
          <label for="extension">Your Extension</label>
          <InputText
            id="extension"
            v-model="extension"
            placeholder="1001"
            :disabled="connecting"
            class="w-full"
            aria-required="true"
            aria-describedby="extension-hint"
          />
          <small id="extension-hint">Extension to manage features for</small>
        </div>

        <Button
          :label="connecting ? 'Connecting...' : 'Connect to AMI'"
          :disabled="!amiUrl || !extension || connecting"
          @click="handleConnect"
          icon="pi pi-plug"
          class="w-full"
        />

        <Message v-if="connectionError" severity="error" :closable="false" class="mt-3">
          {{ connectionError }}
        </Message>

        <Message severity="info" :closable="false" class="demo-tip mt-4">
          <strong>Tip:</strong> Feature codes must be configured in your PBX dialplan. Common codes:
          *76 (DND On), *77 (DND Off), *72 (CF), *73 (CF Off).
        </Message>
      </template>
    </Card>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <!-- Design Decision: Card component structures status bar. Badge component for connection status
           provides semantic meaning. Button components with secondary severity for actions. -->
      <Card class="status-bar">
        <template #content>
          <div class="flex align-items-center gap-3 flex-wrap">
            <div class="status-item">
              <Badge value="AMI Connected" severity="success" />
            </div>
            <div class="status-item">
              <span>Extension: {{ extension }}</span>
            </div>
            <Button
              label="Refresh"
              @click="refreshStatus"
              icon="pi pi-refresh"
              severity="secondary"
              size="small"
            />
            <Button
              label="Disconnect"
              @click="handleDisconnect"
              icon="pi pi-sign-out"
              severity="secondary"
              size="small"
            />
          </div>
        </template>
      </Card>

      <!-- DND Section -->
      <!-- Design Decision: Card component structures DND section. Badge component with dynamic severity
           (danger when enabled, success when disabled) provides clear visual feedback. -->
      <Card class="feature-section">
        <template #title>Do Not Disturb</template>
        <template #content>
          <div class="dnd-controls">
            <div class="dnd-status">
              <Badge
                :value="dndEnabled ? 'DND Enabled' : 'DND Disabled'"
                :severity="dndEnabled ? 'danger' : 'success'"
              />
            </div>
            <div class="dnd-buttons">
              <Button
                :label="dndEnabled ? 'Disable DND' : 'Enable DND'"
                @click="toggleDnd"
                :disabled="loading"
                :severity="dndEnabled ? 'secondary' : 'danger'"
                :icon="dndEnabled ? 'pi pi-ban' : 'pi pi-check'"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Call Forward Section -->
      <!-- Design Decision: Card component structures call forwarding section. Nested Card components
           for each CF type provide clear visual separation. Badge components for status indicators.
           InputText and Button components for form controls. -->
      <Card class="feature-section">
        <template #title>Call Forwarding</template>
        <template #content>
          <div class="cf-types">
            <!-- Unconditional -->
            <Card class="cf-card">
              <template #content>
                <div class="cf-header">
                  <span class="cf-title">Unconditional (All Calls)</span>
                  <Badge
                    :value="cfAllEnabled ? 'Active' : 'Inactive'"
                    :severity="cfAllEnabled ? 'success' : 'secondary'"
                  />
                </div>
                <div class="cf-body">
                  <InputText
                    v-model="cfAllNumber"
                    placeholder="Forward to number..."
                    :disabled="loading"
                    class="w-full mb-2"
                  />
                  <div class="cf-actions">
                    <Button
                      label="Set"
                      @click="setCallForward('all', cfAllNumber)"
                      :disabled="!cfAllNumber || loading"
                      size="small"
                      icon="pi pi-check"
                    />
                    <Button
                      label="Clear"
                      @click="clearCallForward('all')"
                      :disabled="!cfAllEnabled || loading"
                      severity="secondary"
                      size="small"
                      icon="pi pi-times"
                    />
                  </div>
                </div>
              </template>
            </Card>

            <!-- Busy -->
            <Card class="cf-card">
              <template #content>
                <div class="cf-header">
                  <span class="cf-title">When Busy</span>
                  <Badge
                    :value="cfBusyEnabled ? 'Active' : 'Inactive'"
                    :severity="cfBusyEnabled ? 'success' : 'secondary'"
                  />
                </div>
                <div class="cf-body">
                  <InputText
                    v-model="cfBusyNumber"
                    placeholder="Forward to number..."
                    :disabled="loading"
                    class="w-full mb-2"
                  />
                  <div class="cf-actions">
                    <Button
                      label="Set"
                      @click="setCallForward('busy', cfBusyNumber)"
                      :disabled="!cfBusyNumber || loading"
                      size="small"
                      icon="pi pi-check"
                    />
                    <Button
                      label="Clear"
                      @click="clearCallForward('busy')"
                      :disabled="!cfBusyEnabled || loading"
                      severity="secondary"
                      size="small"
                      icon="pi pi-times"
                    />
                  </div>
                </div>
              </template>
            </Card>

            <!-- No Answer -->
            <Card class="cf-card">
              <template #content>
                <div class="cf-header">
                  <span class="cf-title">No Answer</span>
                  <Badge
                    :value="cfNoAnswerEnabled ? 'Active' : 'Inactive'"
                    :severity="cfNoAnswerEnabled ? 'success' : 'secondary'"
                  />
                </div>
                <div class="cf-body">
                  <InputText
                    v-model="cfNoAnswerNumber"
                    placeholder="Forward to number..."
                    :disabled="loading"
                    class="w-full mb-2"
                  />
                  <div class="cf-actions">
                    <Button
                      label="Set"
                      @click="setCallForward('noanswer', cfNoAnswerNumber)"
                      :disabled="!cfNoAnswerNumber || loading"
                      size="small"
                      icon="pi pi-check"
                    />
                    <Button
                      label="Clear"
                      @click="clearCallForward('noanswer')"
                      :disabled="!cfNoAnswerEnabled || loading"
                      severity="secondary"
                      size="small"
                      icon="pi pi-times"
                    />
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </template>
      </Card>

      <!-- Custom Feature Codes -->
      <!-- Design Decision: Card component structures custom code section. InputText with monospace
           styling for code input. Button component for execution. -->
      <Card class="feature-section">
        <template #title>Execute Custom Feature Code</template>
        <template #content>
          <div class="custom-code">
            <InputText
              v-model="customCode"
              placeholder="*72 or *98..."
              :disabled="loading"
              class="w-full custom-code-input"
            />
            <Button
              label="Execute"
              @click="executeCode"
              :disabled="!customCode || loading"
              icon="pi pi-play"
            />
          </div>

          <div class="code-reference mt-4">
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
        </template>
      </Card>

      <!-- Execution History -->
      <!-- Design Decision: Card component structures history section. Tag components for result badges
           provide semantic meaning with appropriate severity (success/danger). -->
      <Card v-if="executionHistory.length > 0" class="feature-section">
        <template #title>Recent Executions</template>
        <template #content>
          <div class="history-list">
            <div
              v-for="(item, index) in executionHistory.slice(0, 10)"
              :key="index"
              class="history-item"
              :class="{ success: item.success, error: !item.success }"
            >
              <span class="history-code">{{ item.code }}</span>
              <span class="history-result">
                <Tag
                  :value="item.success ? 'OK' : 'FAIL'"
                  :severity="item.success ? 'success' : 'danger'"
                  class="mr-2"
                />
                {{ item.message }}
              </span>
              <span class="history-time">{{ formatTime(item.time) }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Code Example -->
      <!-- Design Decision: Panel component provides collapsible code example section for better
           organization and space efficiency. -->
      <Panel class="code-section" toggleable>
        <template #header>
          <span class="font-bold">Code Example</span>
        </template>
        <pre class="code-block">{{ codeExample }}</pre>
      </Panel>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Feature Codes Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Card components to structure feature sections for better visual hierarchy
 * - Button components with appropriate severity (primary, secondary, danger) provide semantic meaning
 * - InputText components for all text inputs with proper validation states
 * - Badge components for status indicators (DND, Call Forward status) provide consistent styling
 * - Tag components for execution history results provide clear visual feedback
 * - Message component for error messages ensures consistent error styling
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 * - Panel component for code example section provides collapsible content
 */
import { ref, computed, watch as _watch } from 'vue'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, Card, Panel, Badge, Tag, Message } from './shared-components'

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
const executionHistory = ref<
  Array<{ code: string; success: boolean; message: string; time: Date }>
>([])

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
  await new Promise((resolve) => setTimeout(resolve, 500))
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
    await new Promise((resolve) => setTimeout(resolve, 500))

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

/* Input styling now handled by PrimeVue InputText component */
:deep(.p-inputtext) {
  width: 100%;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Button styling now handled by PrimeVue Button component */

/* Error message styling now handled by PrimeVue Message component */

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

/* Status dot now handled by PrimeVue Badge component */

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

/* Status badge styling now handled by PrimeVue Badge component with dynamic severity */

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

/* CF status styling now handled by PrimeVue Badge component with dynamic severity */

/* CF body input styling now handled by PrimeVue InputText component */

.cf-actions {
  display: flex;
  gap: 0.5rem;
}

.custom-code {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.custom-code-input {
  flex: 1;
  font-size: 1.25rem;
  font-family: monospace;
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
  background: var(--surface-50);
  border-left: 3px solid var(--success);
}

.history-item.error {
  background: var(--surface-50);
  border-left: 3px solid var(--danger);
}

/* Result badge styling now handled by PrimeVue Tag component */

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
