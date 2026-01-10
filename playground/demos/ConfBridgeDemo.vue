<template>
  <div class="confbridge-demo">
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
          <span class="demo-icon">CB</span>
          <span>ConfBridge Manager</span>
        </div>
      </template>
      <template #subtitle>Manage Asterisk ConfBridge conferences via AMI</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to manage conferences
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
            <Tag severity="info" :value="`${roomList.length} conferences`" />
            <Tag severity="secondary" :value="`${totalParticipants} participants`" />
          </div>

          <!-- Conference Rooms -->
          <Panel header="Active Conferences" :toggleable="true" class="section-panel">
            <div class="panel-actions">
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                size="small"
                @click="refresh"
                :loading="isLoading"
              />
            </div>

            <DataTable :value="roomList" class="conferences-table" size="small">
              <Column field="conference" header="Conference" />
              <Column field="parties" header="Participants" />
              <Column header="Status">
                <template #body="{ data }">
                  <div class="status-badges">
                    <Tag v-if="data.locked" severity="warning" value="Locked" />
                    <Tag v-if="data.recording" severity="danger" value="Recording" />
                    <Tag v-if="data.muted" severity="secondary" value="Muted" />
                  </div>
                </template>
              </Column>
              <Column header="Actions">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      icon="pi pi-users"
                      size="small"
                      @click="selectConference(data)"
                      v-tooltip="'View Users'"
                    />
                    <Button
                      :icon="data.locked ? 'pi pi-unlock' : 'pi pi-lock'"
                      size="small"
                      severity="secondary"
                      @click="toggleLock(data)"
                      v-tooltip="data.locked ? 'Unlock' : 'Lock'"
                    />
                    <Button
                      :icon="data.recording ? 'pi pi-stop' : 'pi pi-circle'"
                      size="small"
                      :severity="data.recording ? 'danger' : 'success'"
                      @click="toggleRecording(data)"
                      v-tooltip="data.recording ? 'Stop Recording' : 'Start Recording'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </Panel>

          <!-- Selected Conference Users -->
          <Panel
            v-if="selectedConference"
            :header="`Participants in ${selectedConference.conference}`"
            :toggleable="true"
            class="section-panel"
          >
            <DataTable :value="conferenceUsers" class="users-table" size="small">
              <Column field="callerIdNum" header="Number" />
              <Column field="callerIdName" header="Name" />
              <Column header="Status">
                <template #body="{ data }">
                  <div class="user-status">
                    <Tag v-if="data.admin" severity="info" value="Admin" />
                    <Tag v-if="data.muted" severity="warning" value="Muted" />
                    <Tag v-if="data.talking" severity="success" value="Talking" />
                  </div>
                </template>
              </Column>
              <Column header="Actions">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      :icon="data.muted ? 'pi pi-volume-up' : 'pi pi-volume-off'"
                      size="small"
                      :severity="data.muted ? 'success' : 'warning'"
                      @click="toggleMute(data)"
                      v-tooltip="data.muted ? 'Unmute' : 'Mute'"
                    />
                    <Button
                      icon="pi pi-times"
                      size="small"
                      severity="danger"
                      @click="kick(data)"
                      v-tooltip="'Kick'"
                    />
                    <Button
                      icon="pi pi-video"
                      size="small"
                      severity="secondary"
                      @click="setVideo(data)"
                      v-tooltip="'Set as Video Source'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </Panel>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAmi, useAmiConfBridge } from 'vuesip'
import type { ConfBridgeRoom, ConfBridgeUser } from 'vuesip'
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

// ConfBridge
const {
  roomList,
  userList,
  isLoading,
  totalParticipants,
  listUsers,
  lockRoom,
  unlockRoom,
  startRecording,
  stopRecording,
  muteUser,
  unmuteUser,
  kickUser,
  setVideoSource,
  refresh,
} = useAmiConfBridge(computed(() => ami.getClient()))

// Selected conference
const selectedConference = ref<ConfBridgeRoom | null>(null)
const conferenceUsers = computed(() =>
  userList.value.filter((u) => u.conference === selectedConference.value?.conference)
)

const selectConference = async (room: ConfBridgeRoom) => {
  selectedConference.value = room
  await listUsers(room.conference)
}

const toggleLock = async (room: ConfBridgeRoom) => {
  if (room.locked) {
    await unlockRoom(room.conference)
  } else {
    await lockRoom(room.conference)
  }
}

const toggleRecording = async (room: ConfBridgeRoom) => {
  if (room.recording) {
    await stopRecording(room.conference)
  } else {
    await startRecording(room.conference)
  }
}

const toggleMute = async (user: ConfBridgeUser) => {
  if (user.muted) {
    await unmuteUser(user.conference, user.channel)
  } else {
    await muteUser(user.conference, user.channel)
  }
}

const kick = async (user: ConfBridgeUser) => {
  await kickUser(user.conference, user.channel)
}

const setVideo = async (user: ConfBridgeUser) => {
  await setVideoSource(user.conference, user.channel)
}
</script>

<style scoped>
.confbridge-demo {
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
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.875rem;
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

.status-badges,
.user-status {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}
</style>
