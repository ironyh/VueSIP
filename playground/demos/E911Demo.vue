<template>
  <div class="e911-demo">
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
        E911 Emergency Call Handling demo. Configure locations, notification recipients, and monitor
        emergency calls for Kari's Law and RAY BAUM's Act compliance.
      </p>
      <p class="note warning">
        <strong>Important:</strong> This is a demo/simulation. In production, ensure proper E911
        service provider integration and compliance verification.
      </p>
    </div>

    <!-- Compliance Status -->
    <div class="compliance-section">
      <h3>Compliance Status</h3>
      <div class="compliance-card" :class="{ compliant: complianceStatus.compliant }">
        <div class="compliance-header">
          <span class="compliance-icon" :class="{ compliant: complianceStatus.compliant }">
            {{ complianceStatus.compliant ? 'OK' : 'WARN' }}
          </span>
          <span class="compliance-title">
            {{ complianceStatus.compliant ? 'Compliant' : 'Issues Found' }}
          </span>
        </div>
        <div v-if="!complianceStatus.compliant" class="compliance-issues">
          <div v-for="issue in complianceStatus.issues" :key="issue" class="issue-item">
            • {{ issue }}
          </div>
        </div>
      </div>
    </div>

    <!-- Active Emergency Alert -->
    <div v-if="hasActiveEmergency" class="emergency-alert">
      <div class="alert-header">
        <span class="alert-icon">EMERGENCY</span>
        <span class="alert-title">ACTIVE EMERGENCY CALL</span>
      </div>
      <div class="active-calls">
        <div v-for="call in activeCallList" :key="call.id" class="active-call-card">
          <div class="call-info">
            <div class="caller">{{ call.callerIdName || 'Unknown' }} ({{ call.callerIdNum }})</div>
            <div class="extension">Extension: {{ call.callerExtension }}</div>
            <div class="time">Started: {{ formatTime(call.startTime) }}</div>
            <div v-if="call.location" class="location">Location: {{ call.location.name }}</div>
          </div>
          <div class="call-status" :class="call.status">
            {{ call.status.replace('_', ' ').toUpperCase() }}
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Locations Tab -->
    <div v-if="activeTab === 'locations'" class="tab-content">
      <div class="section-header">
        <h3>Locations</h3>
        <button class="btn btn-primary" @click="showAddLocation = true">Add Location</button>
      </div>

      <div class="locations-list">
        <div
          v-for="location in locationList"
          :key="location.id"
          class="location-card"
          :class="{ default: location.isDefault, verified: location.isVerified }"
        >
          <div class="location-header">
            <span class="location-name">{{ location.name }}</span>
            <div class="location-badges">
              <span v-if="location.isDefault" class="badge badge-primary">Default</span>
              <span v-if="location.isVerified" class="badge badge-success">Verified</span>
              <span v-else class="badge badge-warning">Unverified</span>
            </div>
          </div>
          <div class="location-address">
            {{ formatLocationAddress(location) }}
          </div>
          <div class="location-extensions">
            <strong>Extensions:</strong>
            {{ location.extensions.length > 0 ? location.extensions.join(', ') : 'None assigned' }}
          </div>
          <div class="location-actions">
            <button
              v-if="!location.isDefault"
              class="btn btn-sm btn-secondary"
              @click="handleSetDefault(location.id)"
            >
              Set Default
            </button>
            <button
              v-if="!location.isVerified"
              class="btn btn-sm btn-secondary"
              @click="handleVerify(location.id)"
            >
              Verify
            </button>
            <button class="btn btn-sm btn-danger" @click="handleRemoveLocation(location.id)">
              Remove
            </button>
          </div>
        </div>

        <div v-if="locationList.length === 0" class="empty-state">
          <div class="empty-icon">LOCATION</div>
          <p>No locations configured. Add a location to enable dispatchable E911.</p>
        </div>
      </div>
    </div>

    <!-- Recipients Tab -->
    <div v-if="activeTab === 'recipients'" class="tab-content">
      <div class="section-header">
        <h3>Notification Recipients</h3>
        <button class="btn btn-primary" @click="showAddRecipient = true">Add Recipient</button>
      </div>

      <div class="recipients-list">
        <div
          v-for="recipient in config.recipients"
          :key="recipient.id"
          class="recipient-card"
          :class="{ disabled: !recipient.enabled }"
        >
          <div class="recipient-header">
            <span class="recipient-name">{{ recipient.name }}</span>
            <span class="recipient-priority">Priority: {{ recipient.priority }}</span>
          </div>
          <div class="recipient-details">
            <div v-if="recipient.email">
              <span class="contact-type">Email:</span> {{ recipient.email }}
            </div>
            <div v-if="recipient.phone">
              <span class="contact-type">Phone:</span> {{ recipient.phone }}
            </div>
            <div class="recipient-types">Types: {{ recipient.notificationTypes.join(', ') }}</div>
          </div>
          <div class="recipient-actions">
            <button
              class="btn btn-sm"
              :class="recipient.enabled ? 'btn-warning' : 'btn-success'"
              @click="handleToggleRecipient(recipient.id)"
            >
              {{ recipient.enabled ? 'Disable' : 'Enable' }}
            </button>
            <button class="btn btn-sm btn-danger" @click="handleRemoveRecipient(recipient.id)">
              Remove
            </button>
          </div>
        </div>

        <div v-if="config.recipients.length === 0" class="empty-state">
          <div class="empty-icon">RECIPIENTS</div>
          <p>No notification recipients. Add recipients for Kari's Law compliance.</p>
        </div>
      </div>

      <div v-if="config.recipients.length > 0" class="test-notification">
        <button class="btn btn-secondary" @click="handleTestNotification">
          Send Test Notification
        </button>
      </div>
    </div>

    <!-- Settings Tab -->
    <div v-if="activeTab === 'settings'" class="tab-content">
      <h3>E911 Settings</h3>

      <div class="settings-form">
        <div class="form-group">
          <label>Default Callback Number</label>
          <input v-model="settingsForm.callbackNumber" type="text" placeholder="+15551234567" />
          <span class="form-hint">Number for PSAP to call back</span>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input v-model="settingsForm.directDialing" type="checkbox" />
            Direct 911 Dialing (Kari's Law)
          </label>
          <span class="form-hint">Allow 911 without prefix or access codes</span>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input v-model="settingsForm.onSiteNotification" type="checkbox" />
            On-Site Notification (Kari's Law)
          </label>
          <span class="form-hint">Notify security/front desk on 911 calls</span>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input v-model="settingsForm.dispatchableLocation" type="checkbox" />
            Require Dispatchable Location (RAY BAUM's Act)
          </label>
          <span class="form-hint">Require verified location for all extensions</span>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input v-model="settingsForm.recordCalls" type="checkbox" />
            Record Emergency Calls
          </label>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input v-model="settingsForm.autoAnswerCallback" type="checkbox" />
            Auto-Answer PSAP Callbacks
          </label>
        </div>

        <button class="btn btn-primary" @click="handleSaveSettings">Save Settings</button>
      </div>
    </div>

    <!-- Logs Tab -->
    <div v-if="activeTab === 'logs'" class="tab-content">
      <div class="section-header">
        <h3>Compliance Logs</h3>
        <div class="log-actions">
          <button class="btn btn-sm btn-secondary" @click="handleExportLogs('json')">
            Export JSON
          </button>
          <button class="btn btn-sm btn-secondary" @click="handleExportLogs('csv')">
            Export CSV
          </button>
        </div>
      </div>

      <div class="logs-list">
        <div v-for="log in recentLogs" :key="log.id" class="log-entry" :class="log.severity">
          <div class="log-time">{{ formatTime(log.timestamp) }}</div>
          <div class="log-event">{{ log.event }}</div>
          <div class="log-description">{{ log.description }}</div>
        </div>

        <div v-if="recentLogs.length === 0" class="empty-state">
          <div class="empty-icon">LOGS</div>
          <p>No compliance logs yet.</p>
        </div>
      </div>
    </div>

    <!-- Simulation Section -->
    <div class="simulation-section">
      <h4>Simulate Emergency Call</h4>
      <div class="simulation-form">
        <div class="input-group">
          <label>Extension</label>
          <input v-model="simExtension" type="text" placeholder="1001" />
        </div>
        <div class="input-group">
          <label>Number</label>
          <select v-model="simNumber">
            <option value="911">911 (Emergency)</option>
            <option value="933">933 (Test)</option>
          </select>
        </div>
        <button class="btn btn-danger" @click="simulateEmergencyCall">Simulate Call</button>
        <button v-if="hasActiveEmergency" class="btn btn-secondary" @click="simulateEndCall">
          End Call
        </button>
      </div>
    </div>

    <!-- Add Location Modal -->
    <div v-if="showAddLocation" class="modal-overlay" @click.self="showAddLocation = false">
      <div class="modal">
        <h4>Add Location</h4>
        <div class="form-group">
          <label>Name</label>
          <input v-model="locationForm.name" type="text" placeholder="Main Office" />
        </div>
        <div class="form-group">
          <label>Street Address</label>
          <input v-model="locationForm.streetAddress" type="text" placeholder="123 Main St" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>City</label>
            <input v-model="locationForm.city" type="text" placeholder="Anytown" />
          </div>
          <div class="form-group">
            <label>State</label>
            <input v-model="locationForm.state" type="text" placeholder="CA" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>ZIP</label>
            <input v-model="locationForm.zip" type="text" placeholder="12345" />
          </div>
          <div class="form-group">
            <label>Country</label>
            <input v-model="locationForm.country" type="text" placeholder="US" />
          </div>
        </div>
        <div class="form-group">
          <label>Additional Info</label>
          <input
            v-model="locationForm.additionalInfo"
            type="text"
            placeholder="Floor 3, Suite 301"
          />
        </div>
        <div class="form-group">
          <label>Extensions (comma-separated)</label>
          <input v-model="locationForm.extensions" type="text" placeholder="1001, 1002, 1003" />
        </div>
        <div class="form-group checkbox-group">
          <label>
            <input v-model="locationForm.isDefault" type="checkbox" />
            Set as default location
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showAddLocation = false">Cancel</button>
          <button class="btn btn-primary" @click="handleAddLocation">Add Location</button>
        </div>
      </div>
    </div>

    <!-- Add Recipient Modal -->
    <div v-if="showAddRecipient" class="modal-overlay" @click.self="showAddRecipient = false">
      <div class="modal">
        <h4>Add Notification Recipient</h4>
        <div class="form-group">
          <label>Name</label>
          <input v-model="recipientForm.name" type="text" placeholder="Security Team" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="recipientForm.email" type="email" placeholder="security@example.com" />
        </div>
        <div class="form-group">
          <label>Phone (for SMS)</label>
          <input v-model="recipientForm.phone" type="text" placeholder="+15551234567" />
        </div>
        <div class="form-group">
          <label>Priority (1 = highest)</label>
          <input v-model.number="recipientForm.priority" type="number" min="1" max="10" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showAddRecipient = false">Cancel</button>
          <button class="btn btn-primary" @click="handleAddRecipient">Add Recipient</button>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useSipClient, useSipE911 } from 'vuesip'

const { client, eventBus } = useSipClient()
const {
  hasActiveEmergency,
  addLocation,
  addRecipient,
  checkCompliance,
  startMonitoring
} = useSipE911(client, eventBus, {
  config: {
    defaultCallbackNumber: '+15551234567',
    onSiteNotification: true
  },
  onEmergencyCall: (call) => {
    console.log('EMERGENCY:', call.callerExtension)
  }
})

// Add a location
addLocation({
  name: 'Main Office',
  type: 'civic',
  civic: {
    houseNumber: '123',
    streetName: 'Main',
    streetSuffix: 'St',
    city: 'Anytown',
    state: 'CA',
    postalCode: '12345',
    country: 'US'
  },
  isDefault: true,
  isVerified: true,
  extensions: ['1001', '1002']
})

// Add notification recipient
addRecipient({
  name: 'Security',
  email: 'security@example.com',
  notificationTypes: ['email'],
  enabled: true,
  priority: 1
})

// Check compliance
const { compliant, issues } = checkCompliance()

startMonitoring()</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onUnmounted, watch as _watch } from 'vue'
import type {
  E911Config,
  E911Location,
  E911Call,
  E911ComplianceLog,
  E911NotificationRecipient,
} from '../../src/types/e911.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Simulated state
const config = ref<E911Config>({
  enabled: true,
  emergencyNumbers: ['911'],
  testNumbers: ['933'],
  defaultCallbackNumber: '',
  recipients: [],
  recordCalls: true,
  directDialing: true,
  onSiteNotification: true,
  dispatchableLocationRequired: true,
  autoAnswerCallback: false,
  notificationDelay: 0,
  complianceLogging: true,
  lastUpdated: new Date(),
})

const locations = ref<Map<string, E911Location>>(new Map())
const activeCalls = ref<Map<string, E911Call>>(new Map())
const complianceLogs = ref<E911ComplianceLog[]>([])

// UI state
const activeTab = ref('locations')
const showAddLocation = ref(false)
const showAddRecipient = ref(false)
const simExtension = ref('1001')
const simNumber = ref('911')

const tabs = [
  { id: 'locations', label: 'Locations' },
  { id: 'recipients', label: 'Recipients' },
  { id: 'settings', label: 'Settings' },
  { id: 'logs', label: 'Logs' },
]

// Forms
const locationForm = reactive({
  name: '',
  streetAddress: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
  additionalInfo: '',
  extensions: '',
  isDefault: false,
})

const recipientForm = reactive({
  name: '',
  email: '',
  phone: '',
  priority: 1,
})

const settingsForm = reactive({
  callbackNumber: '',
  directDialing: true,
  onSiteNotification: true,
  dispatchableLocation: true,
  recordCalls: true,
  autoAnswerCallback: false,
})

// Computed
const locationList = computed(() => Array.from(locations.value.values()))
const activeCallList = computed(() => Array.from(activeCalls.value.values()))
const hasActiveEmergency = computed(() => activeCalls.value.size > 0)
const recentLogs = computed(() => complianceLogs.value.slice(0, 20))

const complianceStatus = computed(() => {
  const issues: string[] = []

  if (!config.value.directDialing) {
    issues.push("Kari's Law: Direct 911 dialing should be enabled")
  }

  if (!config.value.onSiteNotification) {
    issues.push("Kari's Law: On-site notification should be enabled")
  }

  if (config.value.recipients.filter((r) => r.enabled).length === 0) {
    issues.push("Kari's Law: At least one notification recipient required")
  }

  if (locations.value.size === 0) {
    issues.push("RAY BAUM's Act: At least one dispatchable location required")
  }

  const unverified = locationList.value.filter((loc) => !loc.isVerified)
  if (unverified.length > 0) {
    issues.push(`RAY BAUM's Act: ${unverified.length} location(s) not verified`)
  }

  if (!config.value.defaultCallbackNumber) {
    issues.push('Callback number should be configured')
  }

  return { compliant: issues.length === 0, issues }
})

// Utilities
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}

function formatLocationAddress(location: E911Location): string {
  if (!location.civic) return location.name
  const civic = location.civic
  const parts = []
  if (civic.houseNumber) parts.push(civic.houseNumber)
  if (civic.streetName) parts.push(civic.streetName)
  if (civic.streetSuffix) parts.push(civic.streetSuffix)
  if (civic.city) parts.push(civic.city)
  if (civic.state) parts.push(civic.state)
  if (civic.postalCode) parts.push(civic.postalCode)
  return parts.join(' ')
}

function addLog(
  event: E911ComplianceLog['event'],
  description: string,
  severity: E911ComplianceLog['severity'] = 'info'
): void {
  complianceLogs.value.unshift({
    id: generateId(),
    event,
    description,
    actor: 'user',
    timestamp: new Date(),
    severity,
  })
}

// Handlers
function handleAddLocation() {
  if (!locationForm.name) return

  const streetParts = locationForm.streetAddress.match(/^(\d+)\s+(.+)$/)

  const location: E911Location = {
    id: generateId(),
    name: locationForm.name,
    type: 'civic',
    civic: {
      houseNumber: streetParts?.[1] || '',
      streetName: streetParts?.[2] || locationForm.streetAddress,
      streetSuffix: '',
      city: locationForm.city,
      state: locationForm.state,
      postalCode: locationForm.zip,
      country: locationForm.country,
      additionalInfo: locationForm.additionalInfo,
    },
    isDefault: locationForm.isDefault,
    isVerified: false,
    extensions: locationForm.extensions
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean),
    lastUpdated: new Date(),
  }

  if (location.isDefault) {
    for (const loc of locations.value.values()) {
      loc.isDefault = false
    }
  }

  locations.value.set(location.id, location)
  addLog('location_updated', `Location added: ${location.name}`)

  // Reset form
  Object.assign(locationForm, {
    name: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    additionalInfo: '',
    extensions: '',
    isDefault: false,
  })
  showAddLocation.value = false
}

function handleRemoveLocation(id: string) {
  const location = locations.value.get(id)
  if (location) {
    locations.value.delete(id)
    addLog('location_updated', `Location removed: ${location.name}`)
  }
}

function handleSetDefault(id: string) {
  for (const loc of locations.value.values()) {
    loc.isDefault = loc.id === id
  }
  addLog('location_updated', 'Default location changed')
}

function handleVerify(id: string) {
  const location = locations.value.get(id)
  if (location) {
    location.isVerified = true
    location.verifiedAt = new Date()
    addLog('location_verified', `Location verified: ${location.name}`)
  }
}

function handleAddRecipient() {
  if (!recipientForm.name) return

  const recipient: E911NotificationRecipient = {
    id: generateId(),
    name: recipientForm.name,
    email: recipientForm.email || undefined,
    phone: recipientForm.phone || undefined,
    notificationTypes: ['email'],
    enabled: true,
    priority: recipientForm.priority,
  }

  config.value.recipients.push(recipient)
  addLog('config_changed', `Recipient added: ${recipient.name}`)

  // Reset form
  Object.assign(recipientForm, { name: '', email: '', phone: '', priority: 1 })
  showAddRecipient.value = false
}

function handleRemoveRecipient(id: string) {
  const index = config.value.recipients.findIndex((r) => r.id === id)
  if (index !== -1) {
    const recipient = config.value.recipients[index]
    config.value.recipients.splice(index, 1)
    addLog('config_changed', `Recipient removed: ${recipient.name}`)
  }
}

function handleToggleRecipient(id: string) {
  const recipient = config.value.recipients.find((r) => r.id === id)
  if (recipient) {
    recipient.enabled = !recipient.enabled
    addLog(
      'config_changed',
      `Recipient ${recipient.enabled ? 'enabled' : 'disabled'}: ${recipient.name}`
    )
  }
}

function handleTestNotification() {
  const activeRecipients = config.value.recipients.filter((r) => r.enabled)
  for (const recipient of activeRecipients) {
    addLog('notification_sent', `Test notification sent to ${recipient.name}`)
  }
  alert(`Test notification sent to ${activeRecipients.length} recipient(s)`)
}

function handleSaveSettings() {
  config.value.defaultCallbackNumber = settingsForm.callbackNumber
  config.value.directDialing = settingsForm.directDialing
  config.value.onSiteNotification = settingsForm.onSiteNotification
  config.value.dispatchableLocationRequired = settingsForm.dispatchableLocation
  config.value.recordCalls = settingsForm.recordCalls
  config.value.autoAnswerCallback = settingsForm.autoAnswerCallback
  config.value.lastUpdated = new Date()

  addLog('config_changed', 'E911 settings updated')
  alert('Settings saved')
}

function handleExportLogs(format: 'json' | 'csv') {
  let content: string
  let filename: string

  if (format === 'json') {
    content = JSON.stringify(complianceLogs.value, null, 2)
    filename = 'e911-compliance-logs.json'
  } else {
    const headers = ['id', 'event', 'description', 'timestamp', 'severity']
    const rows = complianceLogs.value.map((log) => [
      log.id,
      log.event,
      `"${log.description.replace(/"/g, '""')}"`,
      log.timestamp.toISOString(),
      log.severity,
    ])
    content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    filename = 'e911-compliance-logs.csv'
  }

  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Simulation
let callCounter = 0

function simulateEmergencyCall() {
  callCounter++
  const channel = `PJSIP/${simExtension.value}-${callCounter.toString().padStart(8, '0')}`
  const location =
    locationList.value.find((loc) => loc.extensions.includes(simExtension.value)) ||
    locationList.value.find((loc) => loc.isDefault) ||
    null

  const call: E911Call = {
    id: generateId(),
    channel,
    callerExtension: simExtension.value,
    callerIdNum: `555${simExtension.value}`,
    callerIdName: `User ${simExtension.value}`,
    dialedNumber: simNumber.value,
    status: 'in_progress',
    location,
    callbackNumber: config.value.defaultCallbackNumber,
    startTime: new Date(),
    notificationSent: true,
    notificationSentAt: new Date(),
    notifiedAdmins: config.value.recipients.filter((r) => r.enabled).map((r) => r.name),
    psapCallbackReceived: false,
  }

  activeCalls.value.set(channel, call)

  const isTest = simNumber.value === '933'
  addLog(
    isTest ? 'test_call' : 'call_initiated',
    `${isTest ? 'Test' : 'Emergency'} call from ${simExtension.value} to ${simNumber.value}`,
    isTest ? 'info' : 'critical'
  )

  if (config.value.onSiteNotification && !isTest) {
    for (const recipient of config.value.recipients.filter((r) => r.enabled)) {
      addLog('notification_sent', `Notification sent to ${recipient.name}`)
    }
  }
}

function simulateEndCall() {
  const channel = Array.from(activeCalls.value.keys())[0]
  if (!channel) return

  const call = activeCalls.value.get(channel)
  if (call) {
    call.status = 'completed'
    call.endTime = new Date()
    call.duration = Math.round((call.endTime.getTime() - call.startTime.getTime()) / 1000)
    activeCalls.value.delete(channel)
    addLog('call_ended', `Emergency call ended. Duration: ${call.duration}s`)
  }
}

// Initialize settings form
settingsForm.callbackNumber = config.value.defaultCallbackNumber
settingsForm.directDialing = config.value.directDialing
settingsForm.onSiteNotification = config.value.onSiteNotification
settingsForm.dispatchableLocation = config.value.dispatchableLocationRequired
settingsForm.recordCalls = config.value.recordCalls
settingsForm.autoAnswerCallback = config.value.autoAnswerCallback

onUnmounted(() => {
  activeCalls.value.clear()
})
</script>

<style scoped>
.e911-demo {
  padding: 1rem;
}

.info-section {
  margin-bottom: 1.5rem;
}

.note {
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.note.warning {
  background: var(--color-warning-bg, #fff3cd);
  border-left: 4px solid var(--color-warning, #ffc107);
}

.compliance-section {
  margin-bottom: 1.5rem;
}

.compliance-card {
  background: var(--color-danger-bg, #f8d7da);
  border: 1px solid var(--color-danger, #dc3545);
  border-radius: 8px;
  padding: 1rem;
}

.compliance-card.compliant {
  background: var(--color-success-bg, #d4edda);
  border-color: var(--color-success, #28a745);
}

.compliance-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
}

.compliance-icon {
  font-size: 0.875rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  background: var(--red-100, #fee2e2);
  color: var(--red-900, #991b1b);
}

.compliance-icon.compliant {
  background: var(--green-100, #d1fae5);
  color: var(--green-900, #064e3b);
}

.compliance-issues {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.issue-item {
  font-size: 0.9rem;
  margin: 0.25rem 0;
}

.emergency-alert {
  background: var(--color-danger, #dc3545);
  color: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
}

.alert-icon {
  font-size: 1rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.active-call-card {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.call-info > div {
  margin: 0.25rem 0;
}
.caller {
  font-weight: 600;
}
.call-status {
  background: rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border, #ddd);
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  font-weight: 500;
}

.tab-btn:hover {
  background: var(--color-bg-secondary, #f8f9fa);
}
.tab-btn.active {
  background: var(--color-primary, #007bff);
  color: white;
}

.tab-content {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
}

.locations-list,
.recipients-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.location-card,
.recipient-card {
  background: var(--color-card-bg, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1rem;
}

.location-card.default {
  border-color: var(--color-primary, #007bff);
}
.location-card.verified {
  background: var(--color-success-bg, #d4edda);
}
.recipient-card.disabled {
  opacity: 0.6;
}

.location-header,
.recipient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.location-name,
.recipient-name {
  font-weight: 600;
}

.location-badges {
  display: flex;
  gap: 0.5rem;
}

.badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.badge-primary {
  background: var(--color-primary, #007bff);
  color: white;
}
.badge-success {
  background: var(--color-success, #28a745);
  color: white;
}
.badge-warning {
  background: var(--color-warning, #ffc107);
  color: #212529;
}

.location-address,
.location-extensions,
.recipient-details {
  font-size: 0.9rem;
  color: var(--color-text-secondary, #666);
  margin-bottom: 0.5rem;
}

.location-actions,
.recipient-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.test-notification {
  margin-top: 1rem;
}

.settings-form {
  max-width: 500px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.form-group input[type='text'],
.form-group input[type='email'],
.form-group input[type='number'] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
}

.form-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
  display: block;
  margin-top: 0.25rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.logs-list {
  max-height: 400px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border, #ddd);
  font-size: 0.85rem;
}

.log-entry.critical {
  background: var(--color-danger-bg, #f8d7da);
}
.log-entry.warning {
  background: var(--color-warning-bg, #fff3cd);
}

.log-time {
  color: var(--color-text-secondary, #666);
  min-width: 80px;
}

.log-event {
  font-weight: 500;
  min-width: 120px;
}

.log-description {
  flex: 1;
}

.log-actions {
  display: flex;
  gap: 0.5rem;
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

.simulation-form {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.simulation-form .input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.simulation-form input,
.simulation-form select {
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary, #666);
}

.empty-icon {
  font-size: 1rem;
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  margin-bottom: 0.5rem;
  background: var(--surface-100, #f3f4f6);
  color: var(--text-color-secondary, #6b7280);
  border-radius: 6px;
  display: inline-block;
}

.contact-type {
  font-weight: 600;
  color: var(--text-color, #374151);
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-card-bg, #fff);
  padding: 1.5rem;
  border-radius: 8px;
  min-width: 400px;
  max-width: 90%;
}

.modal h4 {
  margin-top: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
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
