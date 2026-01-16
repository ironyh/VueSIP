<template>
  <div class="system-status" :class="{ connected: isAmiConnected }">
    <!-- System Health Indicator -->
    <div class="health-section">
      <span class="health-indicator" :class="healthClass" :title="healthTitle" aria-hidden="true"
      >●</span
      >
      <span class="sr-only">{{ healthAccessibleLabel }}</span>
      <span class="health-label">{{ healthLabel }}</span>
    </div>

    <!-- Quick Metrics -->
    <div v-if="isAmiConnected" class="metrics">
      <div class="metric" :title="`${activeCalls} active call${activeCalls !== 1 ? 's' : ''}`">
        <span class="metric-icon" aria-hidden="true">📞</span>
        <span class="metric-value">{{ activeCalls }}</span>
        <span class="sr-only">{{ activeCalls }} active calls</span>
      </div>
      <div
        class="metric"
        :title="`${activeChannels} active channel${activeChannels !== 1 ? 's' : ''}`"
      >
        <span class="metric-icon" aria-hidden="true">📡</span>
        <span class="metric-value">{{ activeChannels }}</span>
        <span class="sr-only">{{ activeChannels }} active channels</span>
      </div>
    </div>

    <!-- System Version (collapsed) -->
    <div v-if="isAmiConnected && systemVersion" class="version-info" :title="systemVersion">
      <span class="version-label">v{{ shortVersion }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted, type Ref } from 'vue'
import { useAmi, useAmiSystem } from 'vuesip'

// ============================================================================
// AMI Integration
// ============================================================================

const ami = useAmi()

// Create a computed ref that returns AmiClient | null for type compatibility
const amiClientRef: Ref<ReturnType<typeof ami.getClient>> = computed(() => ami.getClient())

const { coreStatus, channels, isLoading, getCoreStatus } = useAmiSystem(amiClientRef as any)

// ============================================================================
// Local State
// ============================================================================

const isAmiConnected = ref(false)
let refreshInterval: number | null = null

// ============================================================================
// Computed Properties
// ============================================================================

const healthClass = computed(() => {
  if (!isAmiConnected.value) return 'disconnected'
  if (isLoading.value) return 'loading'

  // Determine health based on system metrics
  const status = coreStatus.value
  if (!status) return 'unknown'

  // Check reload status
  if (status.reloadInProgress) return 'warning'

  return 'healthy'
})

const healthLabel = computed(() => {
  if (!isAmiConnected.value) return 'AMI Offline'
  if (isLoading.value) return 'Loading...'

  const status = coreStatus.value
  if (!status) return 'Unknown'
  if (status.reloadInProgress) return 'Reloading'

  return 'System OK'
})

const healthTitle = computed(() => {
  if (!isAmiConnected.value) return 'AMI connection not established'
  if (isLoading.value) return 'Loading system status...'

  const status = coreStatus.value
  if (!status) return 'System status unknown'

  return `Asterisk ${status.asteriskVersion || 'Unknown'} - Uptime: ${formatUptime(status.reloadTime)}`
})

const healthAccessibleLabel = computed(() => {
  return `System status: ${healthLabel.value}. ${healthTitle.value}`
})

const activeCalls = computed(() => {
  const status = coreStatus.value
  return status?.currentCalls ?? 0
})

const activeChannels = computed(() => {
  return channels.value.size
})

const systemVersion = computed(() => {
  const status = coreStatus.value
  return status?.asteriskVersion || null
})

const shortVersion = computed(() => {
  if (!systemVersion.value) return ''
  // Extract just the major.minor version
  const match = systemVersion.value.match(/^(\d+\.\d+)/)
  return match ? match[1] : systemVersion.value.substring(0, 8)
})

// ============================================================================
// Helper Functions
// ============================================================================

function formatUptime(reloadTime?: Date): string {
  if (!reloadTime) return 'Unknown'

  const now = new Date()
  const diff = Math.floor((now.getTime() - reloadTime.getTime()) / 1000)

  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

// ============================================================================
// Lifecycle
// ============================================================================

// Watch for AMI connection changes
watch(
  () => ami.isConnected.value,
  async (connected) => {
    isAmiConnected.value = connected

    if (connected) {
      // Initial fetch
      try {
        await getCoreStatus()
      } catch (error) {
        console.warn('Failed to get initial system status:', error)
      }

      // Setup refresh interval (every 30 seconds)
      refreshInterval = window.setInterval(async () => {
        try {
          await getCoreStatus()
        } catch (error) {
          console.warn('Failed to refresh system status:', error)
        }
      }, 30000)
    } else {
      // Clear interval when disconnected
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 0.875rem;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.system-status.connected {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

/* Health Section */
.health-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.health-indicator {
  font-size: 0.75rem;
  line-height: 1;
  transition: color 0.2s ease;
}

.health-indicator.healthy {
  color: #10b981;
  text-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
}

.health-indicator.warning {
  color: #f59e0b;
  animation: pulse-warning 1.5s infinite;
}

.health-indicator.loading {
  color: #3b82f6;
  animation: pulse-loading 1s infinite;
}

.health-indicator.disconnected {
  color: #9ca3af;
}

.health-indicator.unknown {
  color: #6b7280;
}

.health-label {
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
}

/* Metrics */
.metrics {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-left: 0.75rem;
  border-left: 1px solid #d1d5db;
}

.metric {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #6b7280;
  cursor: default;
}

.metric-icon {
  font-size: 0.75rem;
}

.metric-value {
  font-weight: 600;
  color: #374151;
}

/* Version Info */
.version-info {
  margin-left: auto;
  padding-left: 0.75rem;
  border-left: 1px solid #d1d5db;
}

.version-label {
  color: #9ca3af;
  font-size: 0.75rem;
  font-family: monospace;
}

/* Animations */
@keyframes pulse-warning {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes pulse-loading {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .system-status {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .metrics {
    border-left: none;
    padding-left: 0;
  }

  .version-info {
    width: 100%;
    margin-left: 0;
    border-left: none;
    padding-left: 0;
    text-align: center;
  }
}
</style>
