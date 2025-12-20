<template>
  <div class="ring-groups-demo">
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

    <!-- Main Demo Card -->
    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">📞</span>
          <div>
            <h2>Ring Groups Management</h2>
            <p class="demo-subtitle">
              Configure ring strategies, manage members, and monitor call distribution
            </p>
          </div>
        </div>
      </template>

      <template #content>
        <!-- Info Panel -->
        <Panel header="About Ring Groups" toggleable class="info-panel">
          <Message severity="info" :closable="false">
            Ring Groups allow multiple extensions to ring simultaneously or in sequence when a
            single number is dialed.
          </Message>
          <Message severity="warn" :closable="false" class="mt-2">
            <strong>Note:</strong> This demo simulates ring group management. In production,
            changes would be applied to your Asterisk dialplan configuration.
          </Message>
        </Panel>

        <Divider />

        <!-- Controls Section -->
        <div class="controls-section">
          <div class="controls-input">
            <label for="group-id">Ring Group ID</label>
            <InputText
              id="group-id"
              v-model="newGroupId"
              placeholder="e.g., 600"
              :disabled="isMonitoring"
              class="group-id-input"
            />
          </div>

          <div class="controls-actions">
            <Button
              v-if="!isMonitoring"
              label="Start Monitoring"
              icon="pi pi-play"
              @click="handleStartMonitoring"
            />
            <Button
              v-else
              label="Stop Monitoring"
              icon="pi pi-stop"
              severity="danger"
              @click="handleStopMonitoring"
            />
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              :disabled="!isMonitoring"
              @click="handleRefresh"
            />
            <Button
              label="Add Group"
              icon="pi pi-plus"
              severity="success"
              :disabled="!isMonitoring || !newGroupId"
              @click="handleAddGroup"
            />
          </div>
        </div>

        <Divider v-if="isMonitoring" />

        <!-- Ring Groups Grid -->
        <div v-if="groupList.length > 0" class="groups-section">
          <h3>Ring Groups</h3>
          <div class="groups-grid">
            <Card
              v-for="group in groupList"
              :key="group.id"
              class="group-card"
              :class="{ selected: selectedGroup?.id === group.id, disabled: !group.enabled }"
              @click="selectGroup(group.id)"
            >
              <template #content>
                <div class="group-card-content">
                  <div class="group-header">
                    <span class="group-id">{{ group.id }}</span>
                    <Tag
                      :value="group.state"
                      :severity="getStateSeverity(group.state)"
                      class="group-state"
                    />
                  </div>

                  <div class="group-name">{{ group.name }}</div>

                  <Divider class="my-2" />

                  <div class="group-strategy">
                    <span class="strategy-label">Strategy:</span>
                    <span class="strategy-value">{{ formatStrategy(group.strategy) }}</span>
                  </div>

                  <div class="group-members">
                    <i class="pi pi-users"></i>
                    <span class="members-count">{{ group.members.length }}</span> members
                    <span class="available-count"
                    >({{ getAvailableCount(group) }} available)</span
                    >
                  </div>

                  <div class="group-stats">
                    <span class="stat">
                      <strong>{{ group.stats.totalCalls }}</strong> calls
                    </span>
                    <span class="stat">
                      <strong>{{ group.stats.answeredCalls }}</strong> answered
                    </span>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>

        <!-- Selected Group Details -->
        <div v-if="selectedGroup" class="group-details">
          <Card>
            <template #title>
              <div class="details-header">
                <div class="details-title">
                  <h3>{{ selectedGroup.name }} ({{ selectedGroup.id }})</h3>
                  <Tag
                    :value="selectedGroup.enabled ? 'Enabled' : 'Disabled'"
                    :severity="selectedGroup.enabled ? 'success' : 'danger'"
                  />
                </div>
                <div class="details-actions">
                  <Button
                    v-if="selectedGroup.enabled"
                    label="Disable"
                    icon="pi pi-ban"
                    severity="warning"
                    size="small"
                    @click="handleDisableGroup"
                  />
                  <Button
                    v-else
                    label="Enable"
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    @click="handleEnableGroup"
                  />
                  <Button
                    label="Clear Stats"
                    icon="pi pi-trash"
                    severity="secondary"
                    size="small"
                    @click="handleClearStats"
                  />
                </div>
              </div>
            </template>

            <template #content>
              <!-- TabView for organized sections -->
              <TabView>
                <!-- Configuration Tab -->
                <TabPanel header="Configuration">
                  <div class="config-grid">
                    <div class="config-item">
                      <label for="ring-strategy">Ring Strategy</label>
                      <Dropdown
                        id="ring-strategy"
                        v-model="selectedStrategy"
                        :options="strategyOptions"
                        option-label="label"
                        option-value="value"
                        placeholder="Select a strategy"
                        class="w-full"
                        @change="handleStrategyChange"
                      />
                    </div>

                    <div class="config-item">
                      <label for="ring-timeout">Ring Timeout (seconds)</label>
                      <InputNumber
                        id="ring-timeout"
                        :model-value="selectedGroup.ringTimeout"
                        :min="5"
                        :max="300"
                        show-buttons
                        class="w-full"
                        @update:model-value="handleTimeoutChange"
                      />
                    </div>
                  </div>
                </TabPanel>

                <!-- Members Tab -->
                <TabPanel header="Members">
                  <div class="members-section">
                    <!-- Add Member Form -->
                    <Panel header="Add Member" class="add-member-panel">
                      <div class="add-member-form">
                        <InputText
                          v-model="newMemberExt"
                          placeholder="Extension"
                          class="member-input"
                        />
                        <InputText
                          v-model="newMemberName"
                          placeholder="Name (optional)"
                          class="member-input"
                        />
                        <Button
                          label="Add Member"
                          icon="pi pi-plus"
                          :disabled="!newMemberExt"
                          @click="handleAddMember"
                        />
                      </div>
                    </Panel>

                    <Divider />

                    <!-- Members List -->
                    <div v-if="selectedGroup.members.length > 0" class="members-list">
                      <Card
                        v-for="member in selectedGroup.members"
                        :key="member.extension"
                        class="member-card"
                        :class="{ disabled: !member.enabled }"
                      >
                        <template #content>
                          <div class="member-content">
                            <div class="member-info">
                              <Tag
                                :value="getStatusIcon(member.status)"
                                :severity="getStatusSeverity(member.status)"
                                class="member-status"
                              />
                              <div class="member-details">
                                <span class="member-extension">{{ member.extension }}</span>
                                <span class="member-name">{{ member.name }}</span>
                              </div>
                            </div>

                            <div class="member-stats">
                              <span class="stat answered">
                                <i class="pi pi-phone"></i>
                                {{ member.callsAnswered }} answered
                              </span>
                              <span class="stat missed">
                                <i class="pi pi-times-circle"></i>
                                {{ member.callsMissed }} missed
                              </span>
                            </div>

                            <div class="member-priority">
                              <label for="member-priority">Priority:</label>
                              <InputNumber
                                id="member-priority"
                                :model-value="member.priority"
                                :min="1"
                                :max="99"
                                show-buttons
                                button-layout="horizontal"
                                class="priority-input"
                                @update:model-value="(val) => handlePriorityChange(member.extension, val)"
                              />
                            </div>

                            <div class="member-actions">
                              <Button
                                v-if="member.enabled"
                                icon="pi pi-pause"
                                severity="warning"
                                size="small"
                                rounded
                                text
                                v-tooltip.top="'Disable'"
                                @click="handleDisableMember(member.extension)"
                              />
                              <Button
                                v-else
                                icon="pi pi-play"
                                severity="success"
                                size="small"
                                rounded
                                text
                                v-tooltip.top="'Enable'"
                                @click="handleEnableMember(member.extension)"
                              />
                              <Button
                                icon="pi pi-trash"
                                severity="danger"
                                size="small"
                                rounded
                                text
                                v-tooltip.top="'Remove'"
                                @click="handleRemoveMember(member.extension)"
                              />
                            </div>
                          </div>
                        </template>
                      </Card>
                    </div>
                    <div v-else class="empty-members">
                      <i class="pi pi-users empty-icon"></i>
                      <p>No members in this ring group</p>
                      <p class="empty-hint">Add members using the form above</p>
                    </div>
                  </div>
                </TabPanel>

                <!-- Statistics Tab -->
                <TabPanel header="Statistics">
                  <div class="stats-grid">
                    <Card class="stat-card">
                      <template #content>
                        <div class="stat-content">
                          <i class="pi pi-phone stat-icon"></i>
                          <div class="stat-value">{{ selectedGroup.stats.totalCalls }}</div>
                          <div class="stat-label">Total Calls</div>
                        </div>
                      </template>
                    </Card>

                    <Card class="stat-card success">
                      <template #content>
                        <div class="stat-content">
                          <i class="pi pi-check-circle stat-icon"></i>
                          <div class="stat-value">{{ selectedGroup.stats.answeredCalls }}</div>
                          <div class="stat-label">Answered</div>
                        </div>
                      </template>
                    </Card>

                    <Card class="stat-card danger">
                      <template #content>
                        <div class="stat-content">
                          <i class="pi pi-times-circle stat-icon"></i>
                          <div class="stat-value">{{ selectedGroup.stats.unansweredCalls }}</div>
                          <div class="stat-label">Unanswered</div>
                        </div>
                      </template>
                    </Card>

                    <Card class="stat-card info">
                      <template #content>
                        <div class="stat-content">
                          <i class="pi pi-phone-calling stat-icon"></i>
                          <div class="stat-value">{{ selectedGroup.stats.currentCalls }}</div>
                          <div class="stat-label">Current Calls</div>
                        </div>
                      </template>
                    </Card>

                    <Card class="stat-card">
                      <template #content>
                        <div class="stat-content">
                          <i class="pi pi-chart-line stat-icon"></i>
                          <div class="stat-value">
                            {{ formatServiceLevel(selectedGroup.stats.serviceLevel) }}
                          </div>
                          <div class="stat-label">Service Level</div>
                        </div>
                      </template>
                    </Card>

                    <Card class="stat-card">
                      <template #content>
                        <div class="stat-content">
                          <i class="pi pi-clock stat-icon"></i>
                          <div class="stat-value">
                            {{ formatLastCall(selectedGroup.stats.lastCallTime) }}
                          </div>
                          <div class="stat-label">Last Call</div>
                        </div>
                      </template>
                    </Card>
                  </div>
                </TabPanel>

                <!-- Simulation Tab -->
                <TabPanel header="Simulate">
                  <Panel header="Call Simulation" class="simulation-panel">
                    <Message severity="info" :closable="false" class="mb-3">
                      Test ring group behavior with simulated calls
                    </Message>

                    <div class="simulation-buttons">
                      <Button
                        label="Incoming Call"
                        icon="pi pi-phone"
                        severity="info"
                        @click="simulateIncomingCall"
                      />
                      <Button
                        label="Answer Call"
                        icon="pi pi-check"
                        severity="success"
                        @click="simulateCallAnswer"
                      />
                      <Button
                        label="End Call"
                        icon="pi pi-times"
                        severity="secondary"
                        @click="simulateCallEnd"
                      />
                    </div>
                  </Panel>
                </TabPanel>
              </TabView>
            </template>
          </Card>
        </div>

        <!-- Empty State -->
        <div v-if="!isMonitoring" class="empty-state">
          <i class="pi pi-phone empty-icon"></i>
          <h3>Ring Group Management</h3>
          <p>Enter a ring group ID and click "Start Monitoring" to manage ring groups.</p>
        </div>

        <!-- Code Example -->
        <Panel header="Code Example" toggleable collapsed class="code-panel mt-4">
          <pre class="code-block"><code>import { useAmi, useAmiRingGroups } from 'vuesip'

const ami = useAmi()
const {
  ringGroups,
  groupList,
  selectedGroup,
  startMonitoring,
  addMember,
  removeMember,
  setStrategy,
  enableMember,
  disableMember
} = useAmiRingGroups(ami.getClient(), {
  groupIds: ['600', '601'],
  onEvent: (event) => {
    console.log('Ring group event:', event)
  },
  onMemberStatusChange: (groupId, member, status) => {
    console.log(`Member ${member} in group ${groupId}: ${status}`)
  }
})

// Start monitoring
startMonitoring()

// Add member to ring group
await addMember('600', '1001', { name: 'Alice', priority: 1 })

// Change ring strategy
await setStrategy('600', 'ringall')

// Enable/disable members
await disableMember('600', '1001')
await enableMember('600', '1001')

// Remove member
await removeMember('600', '1001')</code></pre>
        </Panel>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import type {
  RingGroup,
  RingGroupMember,
  RingGroupMemberStatus,
  RingStrategy,
} from '../../src/types/ringgroup.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Simulated state
const ringGroups = ref<Map<string, RingGroup>>(new Map())
const selectedGroupId = ref<string | null>(null)
const isMonitoring = ref(false)

// Form inputs
const newGroupId = ref('600')
const newMemberExt = ref('')
const newMemberName = ref('')
const selectedStrategy = ref<RingStrategy>('ringall')

// Strategy options for dropdown
const strategyOptions = [
  { label: 'Ring All', value: 'ringall' },
  { label: 'Hunt', value: 'hunt' },
  { label: 'Memory Hunt', value: 'memoryhunt' },
  { label: 'Random', value: 'random' },
  { label: 'Linear', value: 'linear' },
  { label: 'Round Robin (Memory)', value: 'rrmemory' },
  { label: 'Round Robin (Ordered)', value: 'rrordered' },
]

// Computed
const groupList = computed(() => Array.from(ringGroups.value.values()))

const selectedGroup = computed(() =>
  selectedGroupId.value ? ringGroups.value.get(selectedGroupId.value) || null : null
)

// Utility functions
function formatStrategy(strategy: RingStrategy): string {
  const labels: Record<RingStrategy, string> = {
    ringall: 'Ring All',
    hunt: 'Hunt',
    memoryhunt: 'Memory Hunt',
    firstunavailable: 'First Unavailable',
    firstnotonphone: 'First Not On Phone',
    random: 'Random',
    linear: 'Linear',
    rrmemory: 'Round Robin (Memory)',
    rrordered: 'Round Robin (Ordered)',
  }
  return labels[strategy] || strategy
}

function getAvailableCount(group: RingGroup): number {
  return group.members.filter((m) => m.status === 'available' && m.enabled).length
}

function getStateSeverity(state: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
  const severity: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
    idle: 'secondary',
    ringing: 'warning',
    connected: 'success',
    disabled: 'danger',
  }
  return severity[state] || 'secondary'
}

function getStatusIcon(status: RingGroupMemberStatus): string {
  const icons: Record<RingGroupMemberStatus, string> = {
    available: 'Available',
    busy: 'Busy',
    ringing: 'Ringing',
    unavailable: 'Unavailable',
    unknown: 'Unknown',
  }
  return icons[status] || 'Unknown'
}

function getStatusSeverity(
  status: RingGroupMemberStatus
): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
  const severity: Record<
    RingGroupMemberStatus,
    'success' | 'info' | 'warning' | 'danger' | 'secondary'
  > = {
    available: 'success',
    busy: 'danger',
    ringing: 'warning',
    unavailable: 'secondary',
    unknown: 'info',
  }
  return severity[status] || 'secondary'
}

function formatServiceLevel(level: number): string {
  return `${level.toFixed(1)}%`
}

function formatLastCall(date?: Date): string {
  if (!date) return 'Never'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

function createEmptyGroup(id: string): RingGroup {
  return {
    id,
    name: `Ring Group ${id}`,
    extension: id,
    strategy: 'ringall',
    ringTimeout: 20,
    totalTimeout: 60,
    state: 'idle',
    enabled: true,
    members: [],
    stats: {
      totalCalls: 0,
      answeredCalls: 0,
      unansweredCalls: 0,
      timedOutCalls: 0,
      avgRingTime: 0,
      avgTalkTime: 0,
      currentCalls: 0,
      serviceLevel: 100,
    },
    skipBusy: true,
    confirmAnswer: false,
    lastUpdated: new Date(),
  }
}

// Handlers
function handleStartMonitoring() {
  isMonitoring.value = true

  // Initialize with the default group
  if (newGroupId.value && !ringGroups.value.has(newGroupId.value)) {
    ringGroups.value.set(newGroupId.value, createEmptyGroup(newGroupId.value))
  }

  // Select the first group
  if (ringGroups.value.size > 0) {
    selectedGroupId.value = Array.from(ringGroups.value.keys())[0]
    if (selectedGroup.value) {
      selectedStrategy.value = selectedGroup.value.strategy
    }
  }
}

function handleStopMonitoring() {
  isMonitoring.value = false
  selectedGroupId.value = null
}

function handleRefresh() {
  // Simulate refresh
  if (selectedGroup.value) {
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleAddGroup() {
  if (!newGroupId.value) return

  if (!ringGroups.value.has(newGroupId.value)) {
    ringGroups.value.set(newGroupId.value, createEmptyGroup(newGroupId.value))
    selectedGroupId.value = newGroupId.value
    if (selectedGroup.value) {
      selectedStrategy.value = selectedGroup.value.strategy
    }
  }
}

function selectGroup(groupId: string) {
  selectedGroupId.value = groupId
  const group = ringGroups.value.get(groupId)
  if (group) {
    selectedStrategy.value = group.strategy
  }
}

function handleStrategyChange() {
  if (selectedGroup.value) {
    selectedGroup.value.strategy = selectedStrategy.value
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleTimeoutChange(value: number | null) {
  if (selectedGroup.value && value !== null && value >= 5 && value <= 300) {
    selectedGroup.value.ringTimeout = value
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleAddMember() {
  if (!selectedGroup.value || !newMemberExt.value) return

  const member: RingGroupMember = {
    extension: newMemberExt.value,
    interface: `PJSIP/${newMemberExt.value}`,
    name: newMemberName.value || newMemberExt.value,
    status: 'available',
    priority: selectedGroup.value.members.length + 1,
    enabled: true,
    addedAt: new Date(),
    callsAnswered: 0,
    callsMissed: 0,
  }

  selectedGroup.value.members.push(member)
  selectedGroup.value.lastUpdated = new Date()

  newMemberExt.value = ''
  newMemberName.value = ''
}

function handleRemoveMember(extension: string) {
  if (!selectedGroup.value) return

  const index = selectedGroup.value.members.findIndex((m) => m.extension === extension)
  if (index !== -1) {
    selectedGroup.value.members.splice(index, 1)
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleEnableMember(extension: string) {
  if (!selectedGroup.value) return

  const member = selectedGroup.value.members.find((m) => m.extension === extension)
  if (member) {
    member.enabled = true
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleDisableMember(extension: string) {
  if (!selectedGroup.value) return

  const member = selectedGroup.value.members.find((m) => m.extension === extension)
  if (member) {
    member.enabled = false
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handlePriorityChange(extension: string, priority: number | null) {
  if (!selectedGroup.value || priority === null) return

  const member = selectedGroup.value.members.find((m) => m.extension === extension)
  if (member && priority >= 1 && priority <= 99) {
    member.priority = priority
    selectedGroup.value.members.sort((a, b) => a.priority - b.priority)
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleEnableGroup() {
  if (selectedGroup.value) {
    selectedGroup.value.enabled = true
    selectedGroup.value.state = 'idle'
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleDisableGroup() {
  if (selectedGroup.value) {
    selectedGroup.value.enabled = false
    selectedGroup.value.state = 'disabled'
    selectedGroup.value.lastUpdated = new Date()
  }
}

function handleClearStats() {
  if (selectedGroup.value) {
    selectedGroup.value.stats = {
      totalCalls: 0,
      answeredCalls: 0,
      unansweredCalls: 0,
      timedOutCalls: 0,
      avgRingTime: 0,
      avgTalkTime: 0,
      currentCalls: 0,
      serviceLevel: 100,
    }
    selectedGroup.value.members.forEach((m) => {
      m.callsAnswered = 0
      m.callsMissed = 0
    })
    selectedGroup.value.lastUpdated = new Date()
  }
}

// Simulation functions
function simulateIncomingCall() {
  if (!selectedGroup.value) return

  selectedGroup.value.state = 'ringing'
  selectedGroup.value.stats.totalCalls++

  // Ring available members
  selectedGroup.value.members.forEach((m) => {
    if (m.enabled && m.status === 'available') {
      m.status = 'ringing'
    }
  })

  selectedGroup.value.lastUpdated = new Date()
}

function simulateCallAnswer() {
  if (!selectedGroup.value) return

  const ringingMember = selectedGroup.value.members.find((m) => m.status === 'ringing')
  if (ringingMember) {
    ringingMember.status = 'busy'
    ringingMember.callsAnswered++
    selectedGroup.value.state = 'connected'
    selectedGroup.value.stats.answeredCalls++
    selectedGroup.value.stats.currentCalls++

    // Stop ringing others
    selectedGroup.value.members.forEach((m) => {
      if (m.status === 'ringing') {
        m.status = 'available'
        m.callsMissed++
      }
    })

    selectedGroup.value.lastUpdated = new Date()
  }
}

function simulateCallEnd() {
  if (!selectedGroup.value) return

  const busyMember = selectedGroup.value.members.find((m) => m.status === 'busy')
  if (busyMember) {
    busyMember.status = 'available'
    selectedGroup.value.state = 'idle'
    if (selectedGroup.value.stats.currentCalls > 0) {
      selectedGroup.value.stats.currentCalls--
    }
    selectedGroup.value.stats.lastCallTime = new Date()
    selectedGroup.value.lastUpdated = new Date()
  }
}

// Cleanup
onUnmounted(() => {
  handleStopMonitoring()
})
</script>

<style scoped>
.ring-groups-demo {
  max-width: 1400px;
  margin: 0 auto;
}

.demo-card {
  margin: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.demo-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.demo-subtitle {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: normal;
  margin: 0.25rem 0 0 0;
}

/* Info Panel */
.info-panel {
  margin-bottom: 1rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

/* Controls Section */
.controls-section {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  padding: 1rem;
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
  border-radius: 10px;
}

.controls-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
}

.controls-input label {
  font-weight: 500;
  color: var(--text-color);
}

.group-id-input {
  width: 100%;
}

.controls-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Groups Section */
.groups-section {
  margin-bottom: 2rem;
}

.groups-section h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.group-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.group-card.selected {
  border: 2px solid var(--primary-500);
  box-shadow: 0 4px 12px rgba(var(--primary-500-rgb), 0.2);
}

.group-card.disabled {
  opacity: 0.6;
}

.group-card-content {
  padding: 0.5rem 0;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.group-id {
  font-weight: 600;
  font-size: 1.25rem;
  color: var(--text-color);
}

.group-name {
  color: var(--text-color-secondary);
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}

.my-2 {
  margin: 0.5rem 0;
}

.group-strategy {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.strategy-label {
  color: var(--text-color-secondary);
}

.strategy-value {
  font-weight: 500;
  color: var(--text-color);
}

.group-members {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.members-count {
  font-weight: 600;
}

.available-count {
  color: var(--green-500);
}

.group-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

/* Group Details */
.group-details {
  margin-top: 2rem;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}

.details-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.details-title h3 {
  margin: 0;
  color: var(--text-color);
}

.details-actions {
  display: flex;
  gap: 0.5rem;
}

/* Configuration */
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-item label {
  font-weight: 500;
  color: var(--text-color);
}

/* Members Section */
.members-section {
  padding: 1rem 0;
}

.add-member-panel {
  margin-bottom: 1.5rem;
}

.add-member-form {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.member-input {
  flex: 1;
  min-width: 150px;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.member-card {
  transition: all 0.2s ease;
}

.member-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.member-card.disabled {
  opacity: 0.6;
}

.member-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 150px;
}

.member-details {
  display: flex;
  flex-direction: column;
}

.member-extension {
  font-weight: 600;
  color: var(--text-color);
}

.member-name {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.member-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
}

.member-stats .stat {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.member-stats .answered {
  color: var(--green-600);
}

.member-stats .missed {
  color: var(--red-600);
}

.member-priority {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.member-priority label {
  font-size: 0.875rem;
  font-weight: 500;
}

.priority-input {
  width: 120px;
}

.member-actions {
  display: flex;
  gap: 0.25rem;
}

.empty-members {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--surface-400);
}

.empty-members p {
  margin: 0.5rem 0;
}

.empty-hint {
  font-size: 0.875rem;
}

/* Statistics */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
}

.stat-card {
  text-align: center;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card.success {
  border-left: 4px solid var(--green-500);
}

.stat-card.danger {
  border-left: 4px solid var(--red-500);
}

.stat-card.info {
  border-left: 4px solid var(--blue-500);
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-icon {
  font-size: 2rem;
  color: var(--primary-500);
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

/* Simulation */
.simulation-panel {
  margin-top: 1rem;
}

.simulation-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mb-3 {
  margin-bottom: 1rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-color-secondary);
}

.empty-state .empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: var(--surface-400);
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* Code Panel */
.code-panel {
  margin-top: 2rem;
}

.code-block {
  background: var(--surface-900);
  color: var(--surface-50);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

.code-block code {
  color: inherit;
}

.mt-4 {
  margin-top: 1.5rem;
}

.w-full {
  width: 100%;
}

/* Responsive */
@media (max-width: 768px) {
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }

  .controls-actions {
    width: 100%;
  }

  .groups-grid {
    grid-template-columns: 1fr;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .details-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .details-actions {
    width: 100%;
  }

  .add-member-form {
    flex-direction: column;
  }

  .member-input {
    width: 100%;
  }

  .member-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .member-priority {
    width: 100%;
  }

  .member-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .simulation-buttons {
    flex-direction: column;
  }
}
</style>
