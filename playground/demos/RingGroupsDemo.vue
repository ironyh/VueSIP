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

    <!-- Design Decision: Message component for informational note provides consistent styling. -->
    <div class="info-section">
      <p>
        Ring Groups allow multiple extensions to ring simultaneously or in sequence when a single
        number is dialed. Configure ring strategies, manage members, and monitor call distribution.
      </p>
      <Message severity="warn" :closable="false" class="note">
        <strong>Note:</strong> This demo simulates ring group management. In production, changes
        would be applied to your Asterisk dialplan configuration.
      </Message>
    </div>

    <!-- Controls -->
    <!-- Design Decision: InputText and Button components for form controls. Button severity
         provides semantic meaning (primary for start, danger for stop, secondary for actions). -->
    <div class="controls-section">
      <div class="input-group">
        <label for="ring-group-id">Ring Group ID</label>
        <InputText
          id="ring-group-id"
          v-model="newGroupId"
          placeholder="e.g., 600"
          :disabled="isMonitoring"
        />
      </div>
      <div class="action-buttons">
        <Button
          v-if="!isMonitoring"
          label="Start Monitoring"
          @click="handleStartMonitoring"
          icon="pi pi-play"
          severity="primary"
        />
        <Button
          v-else
          label="Stop Monitoring"
          @click="handleStopMonitoring"
          icon="pi pi-stop"
          severity="danger"
        />
        <Button
          label="Refresh"
          @click="handleRefresh"
          icon="pi pi-refresh"
          :disabled="!isMonitoring"
          severity="secondary"
        />
        <Button
          label="Add Group"
          @click="handleAddGroup"
          icon="pi pi-plus"
          :disabled="!isMonitoring || !newGroupId"
          severity="secondary"
        />
      </div>
    </div>

    <!-- Ring Groups List -->
    <!-- Design Decision: Card component structures groups section. Group cards use clickable
         Card components for better interaction feedback. -->
    <Card v-if="groupList.length > 0" class="groups-section">
      <template #title>Ring Groups</template>
      <template #content>
        <div class="groups-grid">
          <div
            v-for="group in groupList"
            :key="group.id"
            class="group-card"
            :class="{ selected: selectedGroup?.id === group.id, disabled: !group.enabled }"
            @click="selectGroup(group.id)"
          >
            <div class="group-header">
              <span class="group-id">{{ group.id }}</span>
              <Badge
                :value="group.state"
                :severity="
                  group.state === 'connected'
                    ? 'success'
                    : group.state === 'ringing'
                      ? 'warning'
                      : group.state === 'disabled'
                        ? 'danger'
                        : 'secondary'
                "
              />
            </div>
            <div class="group-name">{{ group.name }}</div>
            <div class="group-strategy">
              <span class="strategy-label">Strategy:</span>
              <span class="strategy-value">{{ formatStrategy(group.strategy) }}</span>
            </div>
            <div class="group-members">
              <span class="members-count">{{ group.members.length }}</span> members
              <span class="available-count">({{ getAvailableCount(group) }} available)</span>
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
        </div>
      </template>
    </Card>

    <!-- Selected Group Details -->
    <!-- Design Decision: Card component structures group details. Button components with
         appropriate severity for actions. -->
    <Card v-if="selectedGroup" class="group-details">
      <template #title>{{ selectedGroup.name }} ({{ selectedGroup.id }})</template>
      <template #content>
        <div class="details-actions">
          <Button
            v-if="selectedGroup.enabled"
            label="Disable"
            @click="handleDisableGroup"
            icon="pi pi-pause"
            severity="warning"
            size="small"
          />
          <Button
            v-else
            label="Enable"
            @click="handleEnableGroup"
            icon="pi pi-play"
            severity="success"
            size="small"
          />
          <Button
            label="Clear Stats"
            @click="handleClearStats"
            icon="pi pi-trash"
            severity="secondary"
            size="small"
          />
        </div>

        <!-- Strategy Configuration -->
        <!-- Design Decision: Dropdown component for strategy selection provides better UX.
           InputNumber component for timeout with proper validation. -->
        <div class="config-section">
          <h4>Configuration</h4>
          <div class="config-grid">
            <div class="config-item">
              <label for="ring-strategy">Ring Strategy</label>
              <Dropdown
                id="ring-strategy"
                v-model="selectedStrategy"
                :options="strategyOptions"
                optionLabel="label"
                optionValue="value"
                @change="handleStrategyChange"
                class="w-full"
              />
            </div>
            <div class="config-item">
              <label for="ring-timeout">Ring Timeout</label>
              <div class="timeout-input">
                <InputNumber
                  id="ring-timeout"
                  :modelValue="selectedGroup.ringTimeout"
                  :min="5"
                  :max="300"
                  @update:modelValue="handleTimeoutChangeNumber"
                  suffix=" seconds"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Members Section -->
        <div class="members-section">
          <div class="members-header">
            <h4>Members</h4>
            <!-- Design Decision: InputText components for member form. Button component for actions. -->
            <div class="add-member-form">
              <InputText v-model="newMemberExt" placeholder="Extension" />
              <InputText v-model="newMemberName" placeholder="Name (optional)" />
              <Button
                label="Add Member"
                @click="handleAddMember"
                icon="pi pi-plus"
                :disabled="!newMemberExt"
                severity="primary"
                size="small"
              />
            </div>
          </div>

          <div v-if="selectedGroup.members.length > 0" class="members-list">
            <div
              v-for="member in selectedGroup.members"
              :key="member.extension"
              class="member-item"
              :class="{ disabled: !member.enabled }"
            >
              <div class="member-info">
                <div class="member-status" :class="member.status">
                  <span class="status-indicator">{{ getStatusIcon(member.status) }}</span>
                </div>
                <div class="member-details">
                  <span class="member-extension">{{ member.extension }}</span>
                  <span class="member-name">{{ member.name }}</span>
                </div>
              </div>
              <div class="member-stats">
                <span class="stat answered">{{ member.callsAnswered }} answered</span>
                <span class="stat missed">{{ member.callsMissed }} missed</span>
              </div>
              <div class="member-priority">
                <label>Priority:</label>
                <InputNumber
                  :modelValue="member.priority"
                  :min="1"
                  :max="99"
                  @update:modelValue="(val) => handlePriorityChangeNumber(member.extension, val)"
                  class="w-full"
                />
              </div>
              <div class="member-actions">
                <!-- Design Decision: Button components with icons for member actions. Severity
                   provides semantic meaning (danger for remove). -->
                <Button
                  v-if="member.enabled"
                  icon="pi pi-pause"
                  @click="handleDisableMember(member.extension)"
                  severity="secondary"
                  size="small"
                  text
                  :title="'Disable'"
                />
                <Button
                  v-else
                  icon="pi pi-play"
                  @click="handleEnableMember(member.extension)"
                  severity="secondary"
                  size="small"
                  text
                  :title="'Enable'"
                />
                <Button
                  icon="pi pi-trash"
                  @click="handleRemoveMember(member.extension)"
                  severity="danger"
                  size="small"
                  text
                  :title="'Remove'"
                />
              </div>
            </div>
          </div>
          <div v-else class="empty-members">No members in this ring group. Add members above.</div>
        </div>

        <!-- Statistics -->
        <div class="stats-section">
          <h4>Statistics</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ selectedGroup.stats.totalCalls }}</div>
              <div class="stat-label">Total Calls</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ selectedGroup.stats.answeredCalls }}</div>
              <div class="stat-label">Answered</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ selectedGroup.stats.unansweredCalls }}</div>
              <div class="stat-label">Unanswered</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ selectedGroup.stats.currentCalls }}</div>
              <div class="stat-label">Current Calls</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">
                {{ formatServiceLevel(selectedGroup.stats.serviceLevel) }}
              </div>
              <div class="stat-label">Service Level</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ formatLastCall(selectedGroup.stats.lastCallTime) }}</div>
              <div class="stat-label">Last Call</div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Simulation Controls -->
    <!-- Design Decision: Card component structures simulation section. Button components for actions. -->
    <Card v-if="isMonitoring && selectedGroup" class="simulation-section">
      <template #title>Simulate Activity</template>
      <template #content>
        <div class="simulation-buttons">
          <Button
            label="Simulate Incoming Call"
            @click="simulateIncomingCall"
            icon="pi pi-phone"
            severity="secondary"
          />
          <Button
            label="Simulate Call Answer"
            @click="simulateCallAnswer"
            icon="pi pi-check"
            severity="secondary"
          />
          <Button
            label="Simulate Call End"
            @click="simulateCallEnd"
            icon="pi pi-times"
            severity="secondary"
          />
        </div>
      </template>
    </Card>

    <!-- Empty State -->
    <div v-if="!isMonitoring" class="empty-state">
      <div class="empty-icon">PHONE</div>
      <h4>Ring Group Management</h4>
      <p>Enter a ring group ID and click "Start Monitoring" to manage ring groups.</p>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useAmi, useAmiRingGroups } from 'vuesip'

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
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Ring Groups Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Card components to structure sections for better visual hierarchy
 * - InputText and InputNumber components for form inputs with proper validation states
 * - Dropdown component for strategy selection provides better UX
 * - Badge and Tag components for status indicators provide semantic meaning
 * - Button components with appropriate severity provide clear visual hierarchy
 * - Message component for notes ensures consistent styling
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, onUnmounted } from 'vue'
import type {
  RingGroup,
  RingGroupMember,
  RingGroupMemberStatus,
  RingStrategy,
} from '../../src/types/ringgroup.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, InputNumber, Dropdown, Card, Badge, Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Simulated state
const ringGroups = ref<Map<string, RingGroup>>(new Map())
const selectedGroupId = ref<string | null>(null)
const isMonitoring = ref(false)
const _isLoading = ref(false)
const _error = ref<string | null>(null)

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
] as const

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

// Removed unused handleTimeoutChange - replaced by handleTimeoutChangeNumber

function handleTimeoutChangeNumber(value: number | null) {
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

// Removed unused handlePriorityChange - replaced by handlePriorityChangeNumber

function handlePriorityChangeNumber(extension: string, value: number | null) {
  if (!selectedGroup.value || value === null) return

  const member = selectedGroup.value.members.find((m) => m.extension === extension)
  if (member && value >= 1 && value <= 99) {
    member.priority = value
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
  padding: 1rem;
}

.info-section {
  margin-bottom: 1.5rem;
}

/* Note styling now handled by PrimeVue Message component */

.controls-section {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group label {
  font-size: 0.85rem;
  font-weight: 500;
}

/* Input styling now handled by PrimeVue InputText component */

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Button styling now handled by PrimeVue Button component */

.groups-section {
  margin-bottom: 2rem;
}

.groups-section h3 {
  margin-bottom: 1rem;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.group-card {
  background: var(--color-card-bg, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.group-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.group-card.selected {
  border-color: var(--primary);
  background: var(--surface-50);
}

.group-card.disabled {
  opacity: 0.6;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.group-id {
  font-weight: 600;
  font-size: 1.1rem;
}

/* Group state styling now handled by PrimeVue Badge component */

.group-name {
  color: var(--color-text-secondary, #666);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.group-strategy {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.strategy-label {
  color: var(--color-text-secondary, #666);
}

.group-members {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.available-count {
  color: var(--success);
}

.group-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
}

.group-details {
  background: var(--color-card-bg, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.details-header h3 {
  margin: 0;
}

.details-actions {
  display: flex;
  gap: 0.5rem;
}

.config-section {
  margin-bottom: 1.5rem;
}

.config-section h4 {
  margin-bottom: 0.75rem;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.config-item label {
  font-size: 0.85rem;
  font-weight: 500;
}

/* Config item select and input styling now handled by PrimeVue Dropdown and InputNumber components */

.timeout-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timeout-input input {
  width: 80px;
}

.unit {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #666);
}

.members-section {
  margin-bottom: 1.5rem;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.members-header h4 {
  margin: 0;
}

.add-member-form {
  display: flex;
  gap: 0.5rem;
}

/* Add member form input styling now handled by PrimeVue InputText component */

.members-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--surface-50);
  border-radius: 6px;
  flex-wrap: wrap;
}

.member-item.disabled {
  opacity: 0.6;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 150px;
}

.member-status {
  font-size: 1.2rem;
}

.member-details {
  display: flex;
  flex-direction: column;
}

.member-extension {
  font-weight: 600;
}

.member-name {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #666);
}

.member-stats {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.member-stats .answered {
  color: var(--success);
}

.member-stats .missed {
  color: var(--danger);
}

.member-priority {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
}

/* Member priority input styling now handled by PrimeVue InputNumber component */

.member-actions {
  display: flex;
  gap: 0.25rem;
}

/* Button icon styling now handled by PrimeVue Button component with text prop */

.empty-members {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary, #666);
}

.stats-section h4 {
  margin-bottom: 0.75rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--surface-50);
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
}

/* Simulation section styling now handled by PrimeVue Card component */

.simulation-section h4 {
  margin-bottom: 0.75rem;
}

.simulation-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #666);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.code-example {
  margin-top: 2rem;
  background: var(--surface-900);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.code-example h4 {
  color: var(--color-text-light, #fff);
  margin-bottom: 0.75rem;
}

.code-example pre {
  margin: 0;
}

.code-example code {
  color: var(--text-color);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
