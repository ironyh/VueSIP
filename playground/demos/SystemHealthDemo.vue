<template>
  <div class="system-health-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
    />

    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">💓</span>
          <span>System Health Monitor</span>
        </div>
      </template>
      <template #subtitle>Monitor Asterisk system health and performance via AMI</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to monitor system health
          </Message>
          <div class="connection-form">
            <InputText v-model="amiUrl" placeholder="ws://pbx:8089/ws" class="url-input" />
            <Button label="Connect" icon="pi pi-link" @click="connectAmi" :loading="connecting" />
          </div>
        </div>

        <template v-else>
          <!-- Health Status Bar -->
          <div class="status-bar">
            <Tag
              :severity="
                healthStatus === 'healthy'
                  ? 'success'
                  : healthStatus === 'degraded'
                    ? 'warning'
                    : 'danger'
              "
              :value="healthStatus.toUpperCase()"
            />
            <Tag severity="info" :value="`Uptime: ${formatUptime(systemInfo?.uptime || 0)}`" />
            <Tag severity="secondary" :value="`${activeCalls} active calls`" />
          </div>

          <!-- System Overview -->
          <Panel header="System Overview" :toggleable="true" class="section-panel">
            <div class="panel-actions">
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                size="small"
                @click="refresh"
                :loading="isLoading"
              />
              <Button
                label="Reload Config"
                icon="pi pi-cog"
                size="small"
                severity="secondary"
                @click="reloadConfig"
              />
            </div>

            <div v-if="systemInfo" class="system-info-grid">
              <div class="info-card">
                <div class="info-label">Version</div>
                <div class="info-value">{{ systemInfo.version }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Uptime</div>
                <div class="info-value">{{ formatUptime(systemInfo.uptime) }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Reload Count</div>
                <div class="info-value">{{ systemInfo.reloadCount }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Active Channels</div>
                <div class="info-value">{{ systemInfo.activeChannels }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Calls Processed</div>
                <div class="info-value">{{ systemInfo.callsProcessed }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Active Calls</div>
                <div class="info-value">{{ activeCalls }}</div>
              </div>
            </div>
          </Panel>

          <!-- Module Status -->
          <Panel header="Module Status" :toggleable="true" class="section-panel">
            <DataTable :value="moduleList" class="modules-table" size="small">
              <Column field="name" header="Module" />
              <Column field="description" header="Description" />
              <Column header="Status">
                <template #body="{ data }">
                  <Tag
                    :severity="data.status === 'Running' ? 'success' : 'danger'"
                    :value="data.status"
                  />
                </template>
              </Column>
              <Column field="useCount" header="Use Count" />
              <Column header="Actions">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      v-if="data.status === 'Running'"
                      icon="pi pi-refresh"
                      size="small"
                      severity="warning"
                      @click="reloadModule(data.name)"
                      v-tooltip="'Reload Module'"
                    />
                    <Button
                      v-if="data.status === 'Running'"
                      icon="pi pi-stop"
                      size="small"
                      severity="danger"
                      @click="unloadModule(data.name)"
                      v-tooltip="'Unload Module'"
                    />
                    <Button
                      v-else
                      icon="pi pi-play"
                      size="small"
                      severity="success"
                      @click="loadModule(data.name)"
                      v-tooltip="'Load Module'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </Panel>

          <!-- Resource Metrics -->
          <Panel header="Resource Metrics" :toggleable="true" class="section-panel">
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">CPU Usage</div>
                <ProgressBar
                  :value="systemInfo?.cpuUsage || 0"
                  :show-value="true"
                  :class="getCpuClass(systemInfo?.cpuUsage || 0)"
                />
              </div>
              <div class="metric-card">
                <div class="metric-label">Memory Usage</div>
                <ProgressBar
                  :value="systemInfo?.memoryUsage || 0"
                  :show-value="true"
                  :class="getMemoryClass(systemInfo?.memoryUsage || 0)"
                />
              </div>
              <div class="metric-card">
                <div class="metric-label">File Descriptors</div>
                <div class="metric-value">
                  {{ systemInfo?.openFileDescriptors || 0 }} /
                  {{ systemInfo?.maxFileDescriptors || 0 }}
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Threads</div>
                <div class="metric-value">{{ systemInfo?.threadCount || 0 }}</div>
              </div>
            </div>
          </Panel>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAmi, useAmiSystem } from 'vuesip'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressBar from 'primevue/progressbar'
import SimulationControls from '../components/SimulationControls.vue'
import { useSimulation } from '../composables/useSimulation'

// Simulation
const simulation = useSimulation()
const isSimulationMode = computed(() => simulation.isEnabled.value)
const activeScenario = computed(() => simulation.activeScenario.value)

// AMI Connection
const amiUrl = ref('ws://localhost:8089/ws')
const connecting = ref(false)
const ami = useAmi()
const isConnected = computed(() => ami.isConnected())

const connectAmi = async () => {
  connecting.value = true
  try {
    await ami.connect(amiUrl.value)
  } finally {
    connecting.value = false
  }
}

// System Health
const {
  systemInfo,
  moduleList,
  isLoading,
  healthStatus,
  activeCalls,
  loadModule,
  unloadModule,
  reloadModule,
  reloadConfig,
  refresh,
} = useAmiSystem(computed(() => ami.getClient()))

// Formatting helpers
const formatUptime = (seconds: number): string => {
  if (!seconds) return '0s'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const getCpuClass = (value: number) => {
  if (value >= 90) return 'cpu-critical'
  if (value >= 70) return 'cpu-warning'
  return 'cpu-normal'
}

const getMemoryClass = (value: number) => {
  if (value >= 90) return 'memory-critical'
  if (value >= 70) return 'memory-warning'
  return 'memory-normal'
}
</script>

<style scoped>
.system-health-demo {
  padding: 1rem;
}

.demo-card {
  max-width: 1000px;
  margin: 0 auto;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-icon {
  font-size: 1.25rem;
}

.connection-panel {
  padding: 1rem;
}

.connection-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.url-input {
  flex: 1;
}

.status-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.section-panel {
  margin-bottom: 1rem;
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.system-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.info-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.info-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.25rem;
}

.info-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1rem;
}

.metric-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.cpu-critical :deep(.p-progressbar-value),
.memory-critical :deep(.p-progressbar-value) {
  background: var(--red-500);
}

.cpu-warning :deep(.p-progressbar-value),
.memory-warning :deep(.p-progressbar-value) {
  background: var(--yellow-500);
}

.cpu-normal :deep(.p-progressbar-value),
.memory-normal :deep(.p-progressbar-value) {
  background: var(--green-500);
}
</style>
