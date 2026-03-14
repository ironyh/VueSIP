<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { collectDiagnostics, formatDiagnostics, type DiagnosticResult } from '../utils/diagnostics'

const props = defineProps<{
  sipClient?: any
  mediaManager?: any
  activeCalls?: any[]
  phoneDiagnostics?: any // Simplified diagnostics from usePhone
}>()

const diagnostics = ref<DiagnosticResult | null>(null)
const isExpanded = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Auto-refresh interval
let refreshInterval: ReturnType<typeof setInterval> | null = null

async function refreshDiagnostics() {
  isLoading.value = true
  error.value = null

  try {
    if (props.phoneDiagnostics) {
      // Use the pre-collected diagnostics from phone
      const pd = props.phoneDiagnostics
      diagnostics.value = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        connection: pd.connection || { state: 'unknown', reconnectAttempts: 0 },
        registration: pd.registration || { state: 'unknown' },
        media: pd.media || {
          microphone: { deviceId: '', label: 'Not available', isActive: false },
          speaker: { deviceId: '', label: 'Not available', isActive: false },
          permissionGranted: false,
          devicesAvailable: [],
        },
        calls: pd.calls || { activeCalls: 0, calls: [] },
        summary: {
          isHealthy:
            pd.connection?.state === 'connected' && pd.registration?.state === 'registered',
          issues: [
            ...(pd.connection?.state !== 'connected' ? ['Not connected to SIP server'] : []),
            ...(pd.registration?.state !== 'registered' ? ['Not registered'] : []),
            ...(pd.media && !pd.media.permissionGranted
              ? ['Microphone permission not granted']
              : []),
            ...(pd.lastFailure ? [`Last call failed: ${pd.lastFailure.explanation}`] : []),
          ],
          recommendations: [
            ...(pd.connection?.state !== 'connected' ? ['Check SIP server configuration'] : []),
            ...(pd.media && !pd.media.permissionGranted
              ? ['Grant microphone permission for calls']
              : []),
            ...(pd.lastFailure?.suggestions || []),
          ],
        },
      }
    } else {
      diagnostics.value = await collectDiagnostics(
        props.sipClient,
        props.mediaManager,
        props.activeCalls
      )
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to collect diagnostics'
  } finally {
    isLoading.value = false
  }
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value && !diagnostics.value) {
    refreshDiagnostics()
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(refreshDiagnostics, 30000) // Refresh every 30s
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

function copyToClipboard() {
  if (diagnostics.value) {
    navigator.clipboard.writeText(formatDiagnostics(diagnostics.value))
  }
}

onMounted(() => {
  // Start auto-refresh when expanded
  if (isExpanded.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Expose refresh for parent components
defineExpose({ refreshDiagnostics, startAutoRefresh, stopAutoRefresh })
</script>

<template>
  <div class="diagnostics-panel">
    <button class="diagnostics-toggle" @click="toggleExpanded" type="button">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <span>Connection Diagnostics</span>
      <svg
        class="chevron"
        :class="{ expanded: isExpanded }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="isExpanded" class="diagnostics-content">
      <div class="diagnostics-actions">
        <button class="refresh-btn" @click="refreshDiagnostics" :disabled="isLoading" type="button">
          <svg
            v-if="isLoading"
            class="spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{{ isLoading ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
        <button class="copy-btn" @click="copyToClipboard" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>Copy</span>
        </button>
      </div>

      <div v-if="error" class="diagnostics-error">
        {{ error }}
      </div>

      <div v-else-if="diagnostics" class="diagnostics-grid">
        <!-- Health Status -->
        <div
          class="diag-section health"
          :class="{
            healthy: diagnostics.summary.isHealthy,
            unhealthy: !diagnostics.summary.isHealthy,
          }"
        >
          <span class="status-label">{{
            diagnostics.summary.isHealthy ? '✅ Healthy' : '⚠️ Issues Found'
          }}</span>
        </div>

        <!-- Connection -->
        <div class="diag-section">
          <h4>📡 Connection</h4>
          <div class="diag-item">
            <span class="label">State:</span>
            <span class="value">{{ diagnostics.connection.state }}</span>
          </div>
        </div>

        <!-- Registration -->
        <div class="diag-section">
          <h4>📝 Registration</h4>
          <div class="diag-item">
            <span class="label">State:</span>
            <span class="value">{{ diagnostics.registration.state }}</span>
          </div>
          <div v-if="diagnostics.registration.registeredUri" class="diag-item">
            <span class="label">URI:</span>
            <span class="value">{{ diagnostics.registration.registeredUri }}</span>
          </div>
        </div>

        <!-- Media -->
        <div class="diag-section">
          <h4>🎤 Media</h4>
          <div class="diag-item">
            <span class="label">Mic:</span>
            <span class="value">{{ diagnostics.media.microphone.label || 'none' }}</span>
          </div>
          <div class="diag-item">
            <span class="label">Permission:</span>
            <span class="value">{{
              diagnostics.media.permissionGranted ? '✅ Granted' : '❌ Denied'
            }}</span>
          </div>
          <div class="diag-item">
            <span class="label">Devices:</span>
            <span class="value">{{ diagnostics.media.devicesAvailable.length }}</span>
          </div>
        </div>

        <!-- Calls -->
        <div class="diag-section">
          <h4>📞 Calls</h4>
          <div class="diag-item">
            <span class="label">Active:</span>
            <span class="value">{{ diagnostics.calls.activeCalls }}</span>
          </div>
        </div>

        <!-- Last Call Failure -->
        <div v-if="phoneDiagnostics?.lastFailure" class="diag-section failure">
          <h4>🔴 Last Call Failure</h4>
          <div class="diag-item">
            <span class="label">Cause:</span>
            <span class="value">{{ phoneDiagnostics.lastFailure.cause }}</span>
          </div>
          <div class="diag-item">
            <span class="label">Details:</span>
            <span class="value">{{ phoneDiagnostics.lastFailure.explanation }}</span>
          </div>
          <div v-if="phoneDiagnostics.lastFailure.responseCode" class="diag-item">
            <span class="label">SIP Code:</span>
            <span class="value">{{ phoneDiagnostics.lastFailure.responseCode }}</span>
          </div>
        </div>

        <!-- Issues -->
        <div v-if="diagnostics.summary.issues.length > 0" class="diag-section issues">
          <h4>⚠️ Issues</h4>
          <ul>
            <li v-for="(issue, idx) in diagnostics.summary.issues" :key="idx">{{ issue }}</li>
          </ul>
        </div>

        <!-- Recommendations -->
        <div
          v-if="diagnostics.summary.recommendations.length > 0"
          class="diag-section recommendations"
        >
          <h4>💡 Recommendations</h4>
          <ul>
            <li v-for="(rec, idx) in diagnostics.summary.recommendations" :key="idx">{{ rec }}</li>
          </ul>
        </div>
      </div>

      <div v-else class="diagnostics-empty">
        <p>Click "Refresh" to collect diagnostics</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diagnostics-panel {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-top: 1rem;
  overflow: hidden;
}

.diagnostics-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.diagnostics-toggle:hover {
  background: var(--bg-tertiary);
}

.diagnostics-toggle .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.diagnostics-toggle .chevron {
  width: 20px;
  height: 20px;
  margin-left: auto;
  transition: transform 0.2s;
}

.diagnostics-toggle .chevron.expanded {
  transform: rotate(180deg);
}

.diagnostics-content {
  padding: 0 1rem 1rem;
}

.diagnostics-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.refresh-btn,
.copy-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover,
.copy-btn:hover {
  background: var(--bg-primary);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.refresh-btn svg,
.copy-btn svg {
  width: 14px;
  height: 14px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.diagnostics-error {
  padding: 0.75rem;
  background: rgba(197, 48, 48, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  color: var(--color-error);
  font-size: 0.8125rem;
}

.diagnostics-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.diag-section {
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.diag-section.health {
  padding: 0.5rem 0.75rem;
}

.diag-section.health.healthy {
  background: rgba(72, 187, 120, 0.15);
  border: 1px solid var(--color-success);
}

.diag-section.health.unhealthy {
  background: rgba(197, 48, 48, 0.15);
  border: 1px solid var(--color-error);
}

.status-label {
  font-weight: 600;
  font-size: 0.875rem;
}

.diag-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diag-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  padding: 0.25rem 0;
}

.diag-item .label {
  color: var(--text-secondary);
}

.diag-item .value {
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
  word-break: break-all;
  max-width: 60%;
}

.diag-section.issues,
.diag-section.recommendations {
  background: var(--bg-primary);
}

.diag-section.failure {
  background: rgba(197, 48, 48, 0.1);
  border: 1px solid var(--color-error);
}

.diag-section.issues ul,
.diag-section.recommendations ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
}

.diag-section.issues li {
  color: var(--color-error);
  margin-bottom: 0.25rem;
}

.diag-section.recommendations li {
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.diagnostics-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
}
</style>
