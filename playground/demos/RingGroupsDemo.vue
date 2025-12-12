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

    <div class="info-section">
      <p>
        Ring Groups allow multiple extensions to ring simultaneously or in sequence when a single
        number is dialed. Configure ring strategies, manage members, and monitor call distribution.
      </p>
      <p class="note">
        <strong>Note:</strong> This demo simulates ring group management. In production, changes
        would be applied to your Asterisk dialplan configuration.
      </p>
    </div>

    <!-- Controls -->
    <div class="controls-section">
      <div class="input-group">
        <label>Ring Group ID</label>
        <input v-model="newGroupId" type="text" placeholder="e.g., 600" :disabled="isMonitoring" />
      </div>
      <div class="action-buttons">
        <button v-if="!isMonitoring" class="btn btn-primary" @click="handleStartMonitoring">
          Start Monitoring
        </button>
        <button v-else class="btn btn-danger" @click="handleStopMonitoring">Stop Monitoring</button>
        <button class="btn btn-secondary" :disabled="!isMonitoring" @click="handleRefresh">
          Refresh
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!isMonitoring || !newGroupId"
          @click="handleAddGroup"
        >
          Add Group
        </button>
      </div>
    </div>

    <!-- Ring Groups List -->
    <div v-if="groupList.length > 0" class="groups-section">
      <h3>Ring Groups</h3>
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
            <span class="group-state" :class="group.state">{{ group.state }}</span>
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
    </div>

    <!-- Selected Group Details -->
    <div v-if="selectedGroup" class="group-details">
      <div class="details-header">
        <h3>{{ selectedGroup.name }} ({{ selectedGroup.id }})</h3>
        <div class="details-actions">
          <button
            v-if="selectedGroup.enabled"
            class="btn btn-sm btn-warning"
            @click="handleDisableGroup"
          >
            Disable
          </button>
          <button v-else class="btn btn-sm btn-success" @click="handleEnableGroup">Enable</button>
          <button class="btn btn-sm btn-secondary" @click="handleClearStats">Clear Stats</button>
        </div>
      </div>

      <!-- Strategy Configuration -->
      <div class="config-section">
        <h4>Configuration</h4>
        <div class="config-grid">
          <div class="config-item">
            <label>Ring Strategy</label>
            <select v-model="selectedStrategy" @change="handleStrategyChange">
              <option value="ringall">Ring All</option>
              <option value="hunt">Hunt</option>
              <option value="memoryhunt">Memory Hunt</option>
              <option value="random">Random</option>
              <option value="linear">Linear</option>
              <option value="rrmemory">Round Robin (Memory)</option>
              <option value="rrordered">Round Robin (Ordered)</option>
            </select>
          </div>
          <div class="config-item">
            <label>Ring Timeout</label>
            <div class="timeout-input">
              <input
                type="number"
                :value="selectedGroup.ringTimeout"
                min="5"
                max="300"
                @change="handleTimeoutChange"
              />
              <span class="unit">seconds</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Members Section -->
      <div class="members-section">
        <div class="members-header">
          <h4>Members</h4>
          <div class="add-member-form">
            <input v-model="newMemberExt" type="text" placeholder="Extension" />
            <input v-model="newMemberName" type="text" placeholder="Name (optional)" />
            <button
              class="btn btn-sm btn-primary"
              :disabled="!newMemberExt"
              @click="handleAddMember"
            >
              Add Member
            </button>
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
              <input
                type="number"
                :value="member.priority"
                min="1"
                max="99"
                @change="(e) => handlePriorityChange(member.extension, e)"
              />
            </div>
            <div class="member-actions">
              <button
                v-if="member.enabled"
                class="btn-icon"
                title="Disable"
                @click="handleDisableMember(member.extension)"
              >
                Pause
              </button>
              <button
                v-else
                class="btn-icon"
                title="Enable"
                @click="handleEnableMember(member.extension)"
              >
                Play
              </button>
              <button
                class="btn-icon danger"
                title="Remove"
                @click="handleRemoveMember(member.extension)"
              >
                Remove
              </button>
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
            <div class="stat-value">{{ formatServiceLevel(selectedGroup.stats.serviceLevel) }}</div>
            <div class="stat-label">Service Level</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatLastCall(selectedGroup.stats.lastCallTime) }}</div>
            <div class="stat-label">Last Call</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Simulation Controls -->
    <div v-if="isMonitoring && selectedGroup" class="simulation-section">
      <h4>Simulate Activity</h4>
      <div class="simulation-buttons">
        <button class="btn btn-secondary" @click="simulateIncomingCall">
          Simulate Incoming Call
        </button>
        <button class="btn btn-secondary" @click="simulateCallAnswer">Simulate Call Answer</button>
        <button class="btn btn-secondary" @click="simulateCallEnd">Simulate Call End</button>
      </div>
    </div>

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
import { ref, computed, onUnmounted } from 'vue'
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
const _isLoading = ref(false)
const _error = ref<string | null>(null)

// Form inputs
const newGroupId = ref('600')
const newMemberExt = ref('')
const newMemberName = ref('')
const selectedStrategy = ref<RingStrategy>('ringall')

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

function handleTimeoutChange(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (selectedGroup.value && value >= 5 && value <= 300) {
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

function handlePriorityChange(extension: string, event: Event) {
  if (!selectedGroup.value) return

  const target = event.target as HTMLInputElement
  const priority = parseInt(target.value, 10)

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
  padding: 1rem;
}

.info-section {
  margin-bottom: 1.5rem;
}

.note {
  background: var(--color-warning-bg, #fff3cd);
  padding: 0.75rem;
  border-radius: 4px;
  border-left: 4px solid var(--color-warning, #ffc107);
  font-size: 0.9rem;
}

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

.input-group input {
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  width: 150px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: var(--color-primary, #007bff);
  color: white;
}

.btn-secondary {
  background: var(--color-secondary, #6c757d);
  color: white;
}

.btn-danger {
  background: var(--color-danger, #dc3545);
  color: white;
}

.btn-success {
  background: var(--color-success, #28a745);
  color: white;
}

.btn-warning {
  background: var(--color-warning, #ffc107);
  color: #212529;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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
  border-color: var(--color-primary, #007bff);
  background: var(--color-primary-bg, #e7f1ff);
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

.group-state {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: var(--color-secondary, #6c757d);
  color: white;
}

.group-state.ringing {
  background: var(--color-warning, #ffc107);
  color: #212529;
}

.group-state.connected {
  background: var(--color-success, #28a745);
}

.group-state.disabled {
  background: var(--color-danger, #dc3545);
}

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
  color: var(--color-success, #28a745);
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

.config-item select,
.config-item input {
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
}

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

.add-member-form input {
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  width: 120px;
}

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
  background: var(--color-bg-secondary, #f8f9fa);
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
  color: var(--color-success, #28a745);
}

.member-stats .missed {
  color: var(--color-danger, #dc3545);
}

.member-priority {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.member-priority input {
  width: 50px;
  padding: 0.25rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
}

.member-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
}

.btn-icon:hover {
  background: var(--color-bg-secondary, #f8f9fa);
}

.btn-icon.danger:hover {
  background: var(--color-danger-bg, #f8d7da);
}

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
  background: var(--color-bg-secondary, #f8f9fa);
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary, #007bff);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
}

.simulation-section {
  background: var(--color-bg-secondary, #f8f9fa);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

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
  background: var(--color-code-bg, #1e1e1e);
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
  color: var(--color-code-text, #d4d4d4);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
