<template>
  <div class="connection-recovery-demo">
    <div class="info-section">
      <p>
        Monitor and recover WebRTC connections with automatic ICE restart handling. This composable
        provides real-time connection health monitoring, configurable recovery strategies, and
        detailed attempt history tracking.
      </p>
      <p class="note">
        <strong>Note:</strong> Connection recovery is most effective during active calls when ICE
        connection issues occur (disconnected or failed states).
      </p>
    </div>

    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
      :duration="effectiveDuration"
      :remote-uri="effectiveRemoteUri"
      :remote-display-name="effectiveRemoteDisplayName"
      :is-on-hold="effectiveIsOnHold"
      :is-muted="effectiveIsMuted"
      :scenarios="customScenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Connection Status -->
    <Message v-if="!effectiveIsConnected" severity="info" :closable="false">
      {{
        isSimulationMode
          ? 'Enable simulation and run a scenario to see connection recovery'
          : 'Connect to a SIP server to use connection recovery (use the Basic Call demo to connect)'
      }}
    </Message>

    <!-- Recovery Dashboard -->
    <div v-else class="recovery-dashboard">
      <!-- Network Info Card -->
      <div class="network-info-card" :class="networkStatusClass">
        <div class="network-header">
          <div class="network-icon">{{ networkIcon }}</div>
          <div class="network-info">
            <div class="network-status">{{ networkInfo.isOnline ? 'Online' : 'Offline' }}</div>
            <div class="network-label">Network Status</div>
          </div>
        </div>
        <div class="network-details">
          <div class="detail-row">
            <span class="detail-label">Connection Type:</span>
            <span class="detail-value">{{ networkInfo.type }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Effective Type:</span>
            <span class="detail-value">{{ networkInfo.effectiveType }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Downlink Speed:</span>
            <span class="detail-value">{{ networkInfo.downlink }} Mbps</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Round-Trip Time:</span>
            <span class="detail-value">{{ networkInfo.rtt }} ms</span>
          </div>
        </div>
      </div>

      <!-- ICE Health Status -->
      <div class="health-card" :class="healthStatusClass">
        <div class="health-header">
          <div class="health-icon">{{ healthIcon }}</div>
          <div class="health-info">
            <div class="health-state">{{ iceHealthState }}</div>
            <div class="health-label">ICE Connection State</div>
          </div>
        </div>
        <div class="health-details">
          <div class="detail-row">
            <span class="detail-label">Recovery State:</span>
            <span class="detail-value" :class="recoveryStateClass">{{ recoveryState }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">State Age:</span>
            <span class="detail-value">{{ formatDuration(stateAge) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Recovery Attempts:</span>
            <span class="detail-value">{{ recoveryAttempts }}</span>
          </div>
        </div>
      </div>

      <!-- Status Indicators -->
      <div class="status-indicators">
        <div class="indicator" :class="{ active: isRecovering }">
          <div class="indicator-icon">🔄</div>
          <div class="indicator-label">Recovering</div>
        </div>
        <div class="indicator" :class="{ active: isHealthy }">
          <div class="indicator-icon">✅</div>
          <div class="indicator-label">Healthy</div>
        </div>
        <div class="indicator" :class="{ active: hasError }">
          <div class="indicator-icon">⚠️</div>
          <div class="indicator-label">Error</div>
        </div>
      </div>

      <!-- Recovery Controls -->
      <div class="recovery-controls">
        <Button
          :disabled="isRecovering || recoveryState === 'stable'"
          @click="triggerRecovery"
          :label="isRecovering ? 'Recovering...' : 'Trigger Recovery'"
          severity="primary"
        />
        <Button @click="resetRecovery" label="Reset State" severity="secondary" />
      </div>

      <!-- Recovery Attempt History -->
      <div v-if="attempts.length > 0" class="attempts-section">
        <h3>Recovery Attempt History</h3>
        <div class="attempts-list">
          <div
            v-for="attempt in attempts"
            :key="attempt.timestamp"
            class="attempt-item"
            :class="{ success: attempt.success, failed: !attempt.success }"
          >
            <div class="attempt-header">
              <span class="attempt-number">Attempt #{{ attempt.attempt }}</span>
              <span class="attempt-result">{{ attempt.success ? '✅ Success' : '❌ Failed' }}</span>
            </div>
            <div class="attempt-details">
              <span class="attempt-strategy">Strategy: {{ attempt.strategy }}</span>
              <span class="attempt-duration">Duration: {{ attempt.duration }}ms</span>
            </div>
            <div v-if="attempt.error" class="attempt-error">Error: {{ attempt.error }}</div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <Message v-if="error" severity="error" :closable="false" class="mt-3">
        {{ error }}
      </Message>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { watch } from 'vue'
import { useConnectionRecovery, useCallSession } from 'vuesip'

const { session } = useCallSession(sipClient)

// Initialize connection recovery with options
const {
  state,          // 'stable' | 'monitoring' | 'recovering' | 'failed'
  iceHealth,      // ICE connection health status
  isRecovering,   // Currently attempting recovery
  isHealthy,      // Connection is healthy
  attempts,       // Recovery attempt history
  error,          // Current error message
  networkInfo,    // Current network info (type, speed, rtt, online)
  recover,        // Manually trigger recovery
  reset,          // Reset recovery state
  monitor,        // Start monitoring a peer connection
  stopMonitoring  // Stop monitoring
} = useConnectionRecovery({
  autoRecover: true,                   // Auto-recover on failure
  maxAttempts: 3,                      // Max recovery attempts
  attemptDelay: 2000,                  // Base delay between attempts
  iceRestartTimeout: 10000,            // Timeout for ICE restart
  exponentialBackoff: true,            // Progressive retry delays
  maxBackoffDelay: 30000,              // Max 30s between retries
  autoReconnectOnNetworkChange: true,  // Restart on network change
  networkChangeDelay: 500,             // Wait before restart
  onRecoveryStart: () => console.log('Recovery started'),
  onRecoverySuccess: (attempt) => console.log('Recovered!', attempt),
  onRecoveryFailed: (attempts) => console.log('Failed', attempts),
  onNetworkChange: (info) => console.log('Network:', info.type)
})

// Start monitoring when call becomes active
watch(() => session.value?.connection, (pc) => {
  if (pc) monitor(pc)
  else stopMonitoring()
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Connection Recovery Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for all interactive buttons with appropriate severity levels
 * - Using PrimeVue Message for status messages and error displays with appropriate severity
 * - Status indicators remain custom styled to maintain the visual design pattern
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, onUnmounted } from 'vue'
import { useSipClient, useCallSession, useConnectionRecovery } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import type { RecoveryAttempt, NetworkInfo } from '../../src/types/connection-recovery.types'
import { Button, Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Custom scenarios for connection recovery
const customScenarios = computed(() => [
  ...simulation.scenarios,
  { id: 'ice-disconnected', label: 'ICE Disconnected', icon: '🔌' },
  { id: 'ice-failed', label: 'ICE Failed', icon: '❌' },
  { id: 'ice-recovery', label: 'Recovery Success', icon: '✅' },
])

// SIP Client and Call Session
const { isConnected, getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  session: _session,
  duration: realDuration,
  remoteUri: realRemoteUri,
  remoteDisplayName: realRemoteDisplayName,
} = useCallSession(sipClientRef)

// Simulated connection recovery state
const simulatedRecoveryState = ref<'stable' | 'monitoring' | 'recovering' | 'failed'>('stable')
const simulatedIceState = ref<RTCIceConnectionState>('connected')
const simulatedAttempts = ref<RecoveryAttempt[]>([])
const simulatedError = ref<string | null>(null)
const simulatedStateAge = ref(0)
const simulatedNetworkInfo = ref<NetworkInfo>({
  type: 'wifi',
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  isOnline: true,
})
let stateAgeInterval: number | null = null

// Connection Recovery composable (for real connections)
const {
  state: realRecoveryState,
  iceHealth: realIceHealth,
  isRecovering: realIsRecovering,
  isHealthy: realIsHealthy,
  attempts: realAttempts,
  error: realError,
  networkInfo: realNetworkInfo,
  recover: realRecover,
  reset: realReset,
  monitor: _monitor,
  stopMonitoring,
} = useConnectionRecovery({
  autoRecover: true,
  autoReconnectOnNetworkChange: true,
  maxAttempts: 3,
  attemptDelay: 2000,
  iceRestartTimeout: 10000,
  networkChangeDelay: 500,
  onRecoveryStart: () => console.log('[Recovery] Started'),
  onRecoverySuccess: (attempt) => console.log('[Recovery] Success', attempt),
  onRecoveryFailed: (attempts) => console.log('[Recovery] Failed', attempts),
  onNetworkChange: (info) => console.log('[Network] Changed', info),
})

// Effective values - use simulation or real data based on mode
const effectiveIsConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : isConnected.value
)

const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : realCallState.value
)

const effectiveDuration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : realDuration.value || 0
)

const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : realRemoteUri.value
)

const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : realRemoteDisplayName.value
)

const effectiveIsOnHold = computed(() =>
  isSimulationMode.value ? simulation.isOnHold.value : false
)

const effectiveIsMuted = computed(() => (isSimulationMode.value ? simulation.isMuted.value : false))

// Recovery state values
const recoveryState = computed(() =>
  isSimulationMode.value ? simulatedRecoveryState.value : realRecoveryState.value
)

const iceHealthState = computed(() =>
  isSimulationMode.value ? simulatedIceState.value : realIceHealth.value.iceState
)

const isRecovering = computed(() =>
  isSimulationMode.value ? simulatedRecoveryState.value === 'recovering' : realIsRecovering.value
)

const isHealthy = computed(() =>
  isSimulationMode.value
    ? simulatedRecoveryState.value === 'stable' &&
      (simulatedIceState.value === 'connected' || simulatedIceState.value === 'completed')
    : realIsHealthy.value
)

const hasError = computed(() =>
  isSimulationMode.value ? !!simulatedError.value : !!realError.value
)

const error = computed(() => (isSimulationMode.value ? simulatedError.value : realError.value))

const attempts = computed(() =>
  isSimulationMode.value ? simulatedAttempts.value : realAttempts.value
)

const stateAge = computed(() =>
  isSimulationMode.value ? simulatedStateAge.value : realIceHealth.value.stateAge
)

const recoveryAttempts = computed(() =>
  isSimulationMode.value ? simulatedAttempts.value.length : realIceHealth.value.recoveryAttempts
)

// Network info
const networkInfo = computed(() =>
  isSimulationMode.value ? simulatedNetworkInfo.value : realNetworkInfo.value
)

// Computed classes
const networkStatusClass = computed(() => {
  if (!networkInfo.value.isOnline) return 'offline'
  if (networkInfo.value.effectiveType === '4g') return 'excellent'
  if (networkInfo.value.effectiveType === '3g') return 'good'
  return 'fair'
})

const networkIcon = computed(() => {
  if (!networkInfo.value.isOnline) return '📴'
  if (networkInfo.value.type === 'wifi') return '📶'
  if (networkInfo.value.type === 'cellular') return '📱'
  if (networkInfo.value.type === 'ethernet') return '🔌'
  return '🌐'
})

const healthStatusClass = computed(() => {
  const ice = iceHealthState.value
  if (ice === 'connected' || ice === 'completed') return 'healthy'
  if (ice === 'disconnected' || ice === 'checking') return 'warning'
  if (ice === 'failed' || ice === 'closed') return 'error'
  return 'neutral'
})

const healthIcon = computed(() => {
  const ice = iceHealthState.value
  if (ice === 'connected' || ice === 'completed') return '✅'
  if (ice === 'disconnected' || ice === 'checking') return '⚠️'
  if (ice === 'failed' || ice === 'closed') return '❌'
  return '⏳'
})

const recoveryStateClass = computed(() => {
  switch (recoveryState.value) {
    case 'stable':
      return 'stable'
    case 'monitoring':
      return 'monitoring'
    case 'recovering':
      return 'recovering'
    case 'failed':
      return 'failed'
    default:
      return ''
  }
})

// Methods
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

const runScenario = (scenarioId: string) => {
  // Handle custom scenarios
  if (scenarioId === 'ice-disconnected') {
    simulatedIceState.value = 'disconnected'
    simulatedRecoveryState.value = 'monitoring'
    simulatedError.value = null
    startStateAgeTimer()
  } else if (scenarioId === 'ice-failed') {
    simulatedIceState.value = 'failed'
    simulatedRecoveryState.value = 'recovering'
    simulatedError.value = 'ICE connection failed'
    startStateAgeTimer()
    // Simulate recovery attempt
    setTimeout(() => {
      simulatedAttempts.value.push({
        attempt: simulatedAttempts.value.length + 1,
        strategy: 'ice-restart',
        success: false,
        duration: 2500,
        error: 'Timeout waiting for connection',
        timestamp: Date.now(),
      })
    }, 1000)
  } else if (scenarioId === 'ice-recovery') {
    simulatedRecoveryState.value = 'recovering'
    simulatedIceState.value = 'checking'
    startStateAgeTimer()
    // Simulate successful recovery
    setTimeout(() => {
      simulatedIceState.value = 'connected'
      simulatedRecoveryState.value = 'stable'
      simulatedError.value = null
      simulatedAttempts.value.push({
        attempt: simulatedAttempts.value.length + 1,
        strategy: 'ice-restart',
        success: true,
        duration: 1500,
        timestamp: Date.now(),
      })
    }, 1500)
  } else {
    // Run standard simulation scenarios
    simulation.runScenario(scenarioId)
    if (scenarioId === 'active') {
      simulatedIceState.value = 'connected'
      simulatedRecoveryState.value = 'stable'
      startStateAgeTimer()
    }
  }
}

const startStateAgeTimer = () => {
  if (stateAgeInterval) clearInterval(stateAgeInterval)
  simulatedStateAge.value = 0
  stateAgeInterval = window.setInterval(() => {
    simulatedStateAge.value += 1000
  }, 1000)
}

const triggerRecovery = async () => {
  if (isSimulationMode.value) {
    // Simulate recovery
    simulatedRecoveryState.value = 'recovering'
    simulatedIceState.value = 'checking'

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Random success/failure for demo
    const success = Math.random() > 0.3

    simulatedAttempts.value.push({
      attempt: simulatedAttempts.value.length + 1,
      strategy: 'ice-restart',
      success,
      duration: 2000,
      error: success ? undefined : 'Recovery timeout',
      timestamp: Date.now(),
    })

    if (success) {
      simulatedIceState.value = 'connected'
      simulatedRecoveryState.value = 'stable'
      simulatedError.value = null
    } else {
      simulatedIceState.value = 'failed'
      simulatedRecoveryState.value = 'failed'
      simulatedError.value = 'Recovery failed after attempt'
    }
  } else {
    await realRecover()
  }
}

const resetRecovery = () => {
  if (isSimulationMode.value) {
    simulatedRecoveryState.value = 'stable'
    simulatedIceState.value = 'connected'
    simulatedAttempts.value = []
    simulatedError.value = null
    simulatedStateAge.value = 0
    if (stateAgeInterval) clearInterval(stateAgeInterval)
  } else {
    realReset()
  }
}

// Cleanup
onUnmounted(() => {
  if (stateAgeInterval) clearInterval(stateAgeInterval)
  stopMonitoring()
})
</script>

<style scoped>
.connection-recovery-demo {
  max-width: 900px;
  margin: 0 auto;
}

.info-section {
  padding: var(--spacing-lg);
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  transition: background-color 0.3s ease;
}

.info-section p {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
  line-height: 1.6;
  transition: color 0.3s ease;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: var(--spacing-md);
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.status-message {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  text-align: center;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.status-message.info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--text-info);
}

.recovery-dashboard {
  padding: var(--spacing-lg);
}

/* Network Info Card */
.network-info-card {
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  border: 3px solid var(--surface-border);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
}

.network-info-card.excellent {
  border-color: var(--success);
  background: rgba(16, 185, 129, 0.05);
}

.network-info-card.good {
  border-color: var(--info);
  background: rgba(59, 130, 246, 0.05);
}

.network-info-card.fair {
  border-color: var(--warning);
  background: rgba(245, 158, 11, 0.05);
}

.network-info-card.offline {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.05);
}

.network-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.network-icon {
  font-size: 3rem;
}

.network-info {
  flex: 1;
}

.network-status {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.network-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.network-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* Health Card */
.health-card {
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  border: 3px solid var(--surface-border);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
}

.health-card.healthy {
  border-color: var(--success);
  background: rgba(16, 185, 129, 0.05);
}

.health-card.warning {
  border-color: var(--warning);
  background: rgba(245, 158, 11, 0.05);
}

.health-card.error {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.05);
}

.health-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.health-icon {
  font-size: 3rem;
}

.health-state {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: capitalize;
}

.health-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.health-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--surface-ground);
  border-radius: var(--radius-md);
}

.detail-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-value.stable {
  color: var(--success);
}
.detail-value.monitoring {
  color: var(--warning);
}
.detail-value.recovering {
  color: var(--info);
}
.detail-value.failed {
  color: var(--danger);
}

/* Status Indicators */
.status-indicators {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.indicator {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  opacity: 0.5;
  transition: all 0.3s ease;
}

.indicator.active {
  opacity: 1;
  background: var(--surface-card);
  box-shadow: var(--shadow-md);
}

.indicator-icon {
  font-size: 1.5rem;
  margin-bottom: var(--spacing-xs);
}

.indicator-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Recovery Controls */
.recovery-controls {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.btn {
  flex: 1;
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--surface-ground);
  color: var(--text-primary);
  border: 2px solid var(--surface-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-card);
  border-color: var(--primary);
}

/* Attempts Section */
.attempts-section {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 2px solid var(--surface-border);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.attempts-section h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.attempts-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.attempt-item {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 2px solid var(--surface-border);
  transition: all 0.3s ease;
}

.attempt-item.success {
  border-color: var(--success);
  background: rgba(16, 185, 129, 0.05);
}

.attempt-item.failed {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.05);
}

.attempt-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.attempt-number {
  font-weight: 600;
  color: var(--text-primary);
}

.attempt-result {
  font-size: 0.875rem;
}

.attempt-details {
  display: flex;
  gap: var(--spacing-md);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.attempt-error {
  margin-top: var(--spacing-xs);
  font-size: 0.75rem;
  color: var(--danger);
}

/* Design Decision: PrimeVue Message component handles error display styling.
   Removed custom .error-display classes as they're no longer needed. */

/* Code Example */
.code-example {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-lg);
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  transition: all 0.3s ease;
}

.code-example h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.code-example pre {
  background: var(--gray-900);
  color: var(--gray-100);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 0;
  transition: all 0.3s ease;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 640px) {
  .health-header {
    flex-direction: column;
    text-align: center;
  }

  .status-indicators {
    flex-direction: column;
  }

  .recovery-controls {
    flex-direction: column;
  }

  .attempt-details {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
}
</style>
