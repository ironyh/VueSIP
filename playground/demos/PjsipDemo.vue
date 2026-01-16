<template>
  <div class="pjsip-demo">
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
          <span class="demo-icon">📡</span>
          <span>PJSIP Endpoint Manager</span>
        </div>
      </template>
      <template #subtitle>Manage PJSIP endpoints and registrations via AMI</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to manage PJSIP endpoints
          </Message>
          <div class="connection-form">
            <InputText v-model="amiUrl" placeholder="ws://pbx:8089/ws" class="url-input" />
            <Button label="Connect" icon="pi pi-link" @click="connectAmi" :loading="connecting" />
          </div>
        </div>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <Tag
              :severity="isConnected ? 'success' : 'danger'"
              :value="isConnected ? 'Connected' : 'Disconnected'"
            />
            <Tag severity="info" :value="`${endpointList.length} endpoints`" />
            <Tag severity="success" :value="`${registeredCount} registered`" />
            <Tag severity="warning" :value="`${onlineCount} online`" />
          </div>

          <!-- Endpoints Table -->
          <Panel header="PJSIP Endpoints" :toggleable="true" class="section-panel">
            <div class="panel-actions">
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                size="small"
                @click="refresh"
                :loading="isLoading"
              />
              <Button
                label="Qualify All"
                icon="pi pi-check-circle"
                size="small"
                severity="secondary"
                @click="qualifyAllEndpoints"
              />
            </div>

            <DataTable :value="endpointList" class="endpoints-table" size="small">
              <Column field="endpoint" header="Endpoint" />
              <Column field="transport" header="Transport" />
              <Column header="State">
                <template #body="{ data }">
                  <Tag :severity="getStateSeverity(data.state)" :value="data.state" />
                </template>
              </Column>
              <Column header="Channels">
                <template #body="{ data }">
                  <span>{{ data.activeChannels }} / {{ data.maxContacts }}</span>
                </template>
              </Column>
              <Column header="Actions">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      icon="pi pi-check-circle"
                      size="small"
                      @click="qualifyEndpoint(data.endpoint)"
                      v-tooltip="'Qualify'"
                    />
                    <Button
                      icon="pi pi-eye"
                      size="small"
                      severity="secondary"
                      @click="selectEndpoint(data)"
                      v-tooltip="'View Details'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </Panel>

          <!-- Registrations Table -->
          <Panel header="Active Registrations" :toggleable="true" class="section-panel">
            <DataTable :value="registrationList" class="registrations-table" size="small">
              <Column field="endpoint" header="Endpoint" />
              <Column field="username" header="Username" />
              <Column field="serverUri" header="Server" />
              <Column header="Status">
                <template #body="{ data }">
                  <Tag
                    :severity="data.status === 'Registered' ? 'success' : 'warning'"
                    :value="data.status"
                  />
                </template>
              </Column>
              <Column field="roundtripTime" header="RTT">
                <template #body="{ data }">
                  <span v-if="data.roundtripTime">{{ data.roundtripTime }}ms</span>
                  <span v-else class="text-muted">-</span>
                </template>
              </Column>
            </DataTable>
          </Panel>

          <!-- Endpoint Details -->
          <Panel
            v-if="selectedEndpoint"
            :header="`Endpoint Details: ${selectedEndpoint.endpoint}`"
            :toggleable="true"
            class="section-panel"
          >
            <div class="endpoint-details">
              <div class="detail-row">
                <span class="detail-label">State:</span>
                <Tag
                  :severity="getStateSeverity(selectedEndpoint.state)"
                  :value="selectedEndpoint.state"
                />
              </div>
              <div class="detail-row">
                <span class="detail-label">Transport:</span>
                <span>{{ selectedEndpoint.transport }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">AOR:</span>
                <span>{{ selectedEndpoint.aor }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Auth:</span>
                <span>{{ selectedEndpoint.auth }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Context:</span>
                <span>{{ selectedEndpoint.context }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Codecs:</span>
                <span>{{ selectedEndpoint.allowCodecs?.join(', ') || 'Default' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Active Channels:</span>
                <span
                  >{{ selectedEndpoint.activeChannels }} / {{ selectedEndpoint.maxContacts }}</span
                >
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
import { useAmi, useAmiPjsip } from 'vuesip'
import type { PjsipEndpointStatus } from 'vuesip'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
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

// PJSIP
const {
  endpointList,
  registrationList,
  isLoading,
  registeredCount,
  onlineCount,
  qualifyEndpoint,
  refresh,
} = useAmiPjsip(computed(() => ami.getClient()))

// Selected endpoint
const selectedEndpoint = ref<PjsipEndpointStatus | null>(null)

const selectEndpoint = (endpoint: PjsipEndpointStatus) => {
  selectedEndpoint.value = endpoint
}

const getStateSeverity = (state: string) => {
  switch (state?.toLowerCase()) {
    case 'online':
    case 'reachable':
      return 'success'
    case 'offline':
    case 'unreachable':
      return 'danger'
    case 'unavailable':
      return 'warning'
    default:
      return 'secondary'
  }
}

const qualifyAllEndpoints = async () => {
  for (const endpoint of endpointList.value) {
    await qualifyEndpoint(endpoint.endpoint)
  }
}
</script>

<style scoped>
.pjsip-demo {
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

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.endpoint-details {
  display: grid;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-label {
  font-weight: 600;
  min-width: 120px;
}

.text-muted {
  color: var(--text-color-secondary);
}
</style>
