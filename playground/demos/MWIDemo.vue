<template>
  <div class="mwi-demo">
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
          <span class="demo-icon">📬</span>
          <span>Message Waiting Indicator</span>
        </div>
      </template>
      <template #subtitle>Control voicemail lamp status via AMI</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to manage MWI indicators
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
            <Tag severity="info" :value="`${mailboxList.length} mailboxes tracked`" />
            <Tag severity="warning" :value="`${totalNewMessages} new messages`" />
            <Tag severity="secondary" :value="`${indicatorOnCount} indicators on`" />
          </div>

          <!-- Track New Mailbox -->
          <Panel header="Track Mailbox" :toggleable="true" class="section-panel">
            <div class="track-form">
              <InputText
                v-model="newMailbox"
                placeholder="Extension (e.g., 1001)"
                class="mailbox-input"
              />
              <InputText
                v-model="mailboxContext"
                placeholder="Context (default)"
                class="context-input"
              />
              <Button
                label="Track"
                icon="pi pi-plus"
                @click="trackNewMailbox"
                :disabled="!newMailbox"
              />
            </div>
          </Panel>

          <!-- Mailbox Status Table -->
          <Panel header="Mailbox Status" :toggleable="true" class="section-panel">
            <div class="panel-actions">
              <Button
                label="Refresh All"
                icon="pi pi-refresh"
                size="small"
                @click="refresh"
                :loading="isLoading"
              />
            </div>

            <DataTable
              v-if="mailboxList.length > 0"
              :value="mailboxList"
              class="mailbox-table"
              size="small"
            >
              <Column field="mailbox" header="Mailbox" />
              <Column header="Indicator">
                <template #body="{ data }">
                  <div class="indicator-cell">
                    <span
                      class="indicator-lamp"
                      :class="{ 'lamp-on': data.indicatorOn, 'lamp-off': !data.indicatorOn }"
                    >
                      {{ data.indicatorOn ? '🔴' : '⚪' }}
                    </span>
                    <Tag
                      :severity="data.indicatorOn ? 'danger' : 'secondary'"
                      :value="data.indicatorOn ? 'ON' : 'OFF'"
                    />
                  </div>
                </template>
              </Column>
              <Column header="Messages">
                <template #body="{ data }">
                  <div class="message-counts">
                    <Tag severity="warning" :value="`${data.newMessages} new`" />
                    <Tag severity="secondary" :value="`${data.oldMessages} old`" />
                    <Tag
                      v-if="data.urgentNew > 0"
                      severity="danger"
                      :value="`${data.urgentNew} urgent`"
                    />
                  </div>
                </template>
              </Column>
              <Column header="Last Update">
                <template #body="{ data }">
                  <span v-if="data.lastUpdate" class="last-update">
                    {{ formatTime(data.lastUpdate) }}
                  </span>
                  <span v-else class="text-muted">-</span>
                </template>
              </Column>
              <Column header="Actions">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      icon="pi pi-refresh"
                      size="small"
                      @click="refreshMailbox(data.mailbox)"
                      v-tooltip="'Refresh Status'"
                    />
                    <Button
                      icon="pi pi-pencil"
                      size="small"
                      severity="secondary"
                      @click="openUpdateDialog(data)"
                      v-tooltip="'Update MWI'"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      severity="danger"
                      @click="removeMailbox(data.mailbox)"
                      v-tooltip="'Stop Tracking'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>

            <Message v-else severity="info" :closable="false">
              No mailboxes tracked. Add a mailbox above to start monitoring.
            </Message>
          </Panel>

          <!-- Update MWI Dialog -->
          <Dialog
            v-model:visible="updateDialogVisible"
            header="Update MWI Status"
            :modal="true"
            :style="{ width: '400px' }"
          >
            <div v-if="selectedMailbox" class="update-form">
              <div class="form-field">
                <label>Mailbox</label>
                <InputText :value="selectedMailbox.mailbox" disabled class="w-full" />
              </div>
              <div class="form-field">
                <label>New Messages</label>
                <InputNumber v-model="updateNewMessages" :min="0" class="w-full" />
              </div>
              <div class="form-field">
                <label>Old Messages</label>
                <InputNumber v-model="updateOldMessages" :min="0" class="w-full" />
              </div>
            </div>
            <template #footer>
              <Button label="Cancel" severity="secondary" @click="updateDialogVisible = false" />
              <Button label="Update" @click="submitUpdate" />
            </template>
          </Dialog>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAmi, useAmiMWI } from 'vuesip'
import type { MWIStatus } from 'vuesip'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
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

// MWI
const {
  mailboxList,
  isLoading,
  totalNewMessages,
  indicatorOnCount,
  getMailboxStatus,
  updateMWI,
  trackMailbox,
  untrackMailbox,
  refresh,
} = useAmiMWI(computed(() => ami.getClient()))

// Track new mailbox
const newMailbox = ref('')
const mailboxContext = ref('default')

const trackNewMailbox = async () => {
  if (newMailbox.value) {
    const mailbox = mailboxContext.value
      ? `${newMailbox.value}@${mailboxContext.value}`
      : newMailbox.value
    await trackMailbox(mailbox)
    newMailbox.value = ''
  }
}

const refreshMailbox = async (mailbox: string) => {
  await getMailboxStatus(mailbox)
}

const removeMailbox = (mailbox: string) => {
  untrackMailbox(mailbox)
}

// Update MWI dialog
const updateDialogVisible = ref(false)
const selectedMailbox = ref<MWIStatus | null>(null)
const updateNewMessages = ref(0)
const updateOldMessages = ref(0)

const openUpdateDialog = (mailbox: MWIStatus) => {
  selectedMailbox.value = mailbox
  updateNewMessages.value = mailbox.newMessages
  updateOldMessages.value = mailbox.oldMessages
  updateDialogVisible.value = true
}

const submitUpdate = async () => {
  if (selectedMailbox.value) {
    await updateMWI(selectedMailbox.value.mailbox, updateNewMessages.value, updateOldMessages.value)
    updateDialogVisible.value = false
  }
}

// Formatting
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString()
}
</script>

<style scoped>
.mwi-demo {
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
  margin-bottom: 0.5rem;
}

.track-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mailbox-input {
  flex: 1;
  min-width: 150px;
}

.context-input {
  width: 150px;
}

.indicator-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.indicator-lamp {
  font-size: 1.25rem;
}

.lamp-on {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.message-counts {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.last-update {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.text-muted {
  color: var(--text-color-secondary);
}

.update-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
}

.w-full {
  width: 100%;
}
</style>
