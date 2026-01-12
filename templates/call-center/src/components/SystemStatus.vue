<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import { useAmiSystem, useAmiMWI } from 'vuesip'
import type { AmiClient } from 'vuesip'

const props = defineProps<{
  amiClient: AmiClient | null
}>()

// AMI System composable
const amiClientRef = computed(() => props.amiClient)
const {
  coreStatus,
  channels,
  isLoading: systemLoading,
  error: systemError,
  getCoreStatus,
  ping,
} = useAmiSystem(amiClientRef)

// AMI MWI composable
const {
  mailboxes,
  totalNewMessages,
  totalOldMessages,
  isLoading: mwiLoading,
  error: mwiError,
  trackMailbox,
  untrackMailbox,
} = useAmiMWI(amiClientRef)

// Local state
const pingTime = ref<number | null>(null)
const lastPingError = ref<string | null>(null)

// Computed
const healthStatus = computed(() => {
  if (!coreStatus.value) return 'unknown'
  const activeChannels = channels.value?.length ?? 0
  if (systemError.value) return 'error'
  if (activeChannels > 50) return 'warning'
  return 'healthy'
})

const healthSeverity = computed(() => {
  switch (healthStatus.value) {
    case 'healthy':
      return 'success'
    case 'warning':
      return 'warn'
    case 'error':
      return 'danger'
    default:
      return 'secondary'
  }
})

const activeCalls = computed(() => {
  return channels.value?.filter((ch) => ch.State === 'Up').length ?? 0
})

const systemUptime = computed(() => {
  if (!coreStatus.value?.CoreUptime) return 'Unknown'
  const seconds = parseInt(coreStatus.value.CoreUptime)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
})

// Methods
async function handlePing() {
  lastPingError.value = null
  const start = Date.now()
  const result = await ping()
  if (result) {
    pingTime.value = Date.now() - start
  } else {
    lastPingError.value = 'Ping failed'
  }
}

async function handleRefresh() {
  await getCoreStatus()
}

// Track agent's mailbox when mounted
onMounted(async () => {
  // Refresh system status on mount
  if (props.amiClient) {
    await getCoreStatus()
  }
})
</script>

<template>
  <Card class="system-status">
    <template #title>
      <div class="status-header">
        <span>System Status</span>
        <Tag :value="healthStatus" :severity="healthSeverity" />
      </div>
    </template>

    <template #content>
      <!-- System Health -->
      <div class="status-section">
        <div class="status-row">
          <span class="label">PBX Status</span>
          <span class="value">
            <i v-if="systemLoading" class="pi pi-spin pi-spinner" />
            <template v-else-if="coreStatus">
              <i class="pi pi-check-circle" style="color: var(--green-500)" />
              {{ coreStatus.CoreCurrentCalls || 0 }} calls
            </template>
            <template v-else>
              <i class="pi pi-times-circle" style="color: var(--red-500)" />
              Unavailable
            </template>
          </span>
        </div>

        <div class="status-row">
          <span class="label">Uptime</span>
          <span class="value">{{ systemUptime }}</span>
        </div>

        <div class="status-row">
          <span class="label">Active Channels</span>
          <span class="value">
            <Badge :value="channels?.length ?? 0" severity="info" />
          </span>
        </div>

        <div class="status-row">
          <span class="label">Active Calls</span>
          <span class="value">
            <Badge :value="activeCalls" :severity="activeCalls > 0 ? 'success' : 'secondary'" />
          </span>
        </div>

        <div v-if="pingTime !== null" class="status-row">
          <span class="label">Latency</span>
          <span class="value" :class="{ warning: pingTime > 100 }"> {{ pingTime }}ms </span>
        </div>
      </div>

      <!-- MWI / Voicemail -->
      <div v-if="mailboxes.size > 0" class="status-section mwi-section">
        <h4>Voicemail</h4>
        <div class="mwi-summary">
          <div class="mwi-stat">
            <Badge
              :value="totalNewMessages"
              :severity="totalNewMessages > 0 ? 'danger' : 'secondary'"
            />
            <span>New</span>
          </div>
          <div class="mwi-stat">
            <Badge :value="totalOldMessages" severity="info" />
            <span>Old</span>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="systemError || mwiError || lastPingError" class="error-section">
        <small class="error-text">
          {{ systemError || mwiError || lastPingError }}
        </small>
      </div>

      <!-- Actions -->
      <div class="actions">
        <Button
          icon="pi pi-sync"
          label="Refresh"
          size="small"
          text
          :loading="systemLoading"
          @click="handleRefresh"
        />
        <Button icon="pi pi-bolt" label="Ping" size="small" text @click="handlePing" />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.system-status {
  background: var(--surface-card);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.value {
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.value.warning {
  color: var(--yellow-500);
}

.mwi-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.mwi-summary {
  display: flex;
  gap: 16px;
}

.mwi-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.error-section {
  padding: 8px;
  background: var(--red-50);
  border-radius: 4px;
  margin-bottom: 12px;
}

.error-text {
  color: var(--red-500);
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid var(--surface-border);
  padding-top: 12px;
}
</style>
