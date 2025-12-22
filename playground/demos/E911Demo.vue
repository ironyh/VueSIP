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

    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">🚨</span>
          <span>E911 Emergency Services</span>
        </div>
      </template>
      <template #subtitle>
        Configure emergency locations, notifications, and monitor E911 calls for Kari's Law and RAY
        BAUM's Act compliance
      </template>
      <template #content>
        <!-- Warning Banner -->
        <Message severity="warn" :closable="false" class="compliance-warning">
          <div class="warning-content">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>Production Deployment Notice:</strong> This is a demonstration system. In
              production, ensure proper E911 service provider integration, dispatchable location
              verification, and compliance validation.
            </div>
          </div>
        </Message>

        <!-- Compliance Status Card -->
        <Panel
          header="Compliance Status"
          class="compliance-panel"
          :pt="{ header: { class: 'compliance-panel-header' } }"
        >
          <div class="compliance-status-card" :class="{ compliant: complianceStatus.compliant }">
            <div class="status-header">
              <Tag
                :severity="complianceStatus.compliant ? 'success' : 'danger'"
                :value="complianceStatus.compliant ? '✓ System Compliant' : '⚠ Issues Detected'"
                class="status-tag"
              />
              <span class="status-subtitle">
                {{
                  complianceStatus.compliant
                    ? 'All requirements met'
                    : `${complianceStatus.issues.length} issues require attention`
                }}
              </span>
            </div>

            <div v-if="!complianceStatus.compliant" class="issues-list">
              <div v-for="issue in complianceStatus.issues" :key="issue" class="issue-item">
                <span class="issue-bullet">•</span>
                <span>{{ issue }}</span>
              </div>
            </div>
          </div>
        </Panel>

        <!-- Active Emergency Alert -->
        <Message
          v-if="hasActiveEmergency"
          severity="error"
          :closable="false"
          class="emergency-alert"
        >
          <div class="alert-content">
            <div class="alert-header">
              <span class="alert-badge">🚨 ACTIVE EMERGENCY</span>
              <span class="alert-count">{{ activeCalls.size }} active call(s)</span>
            </div>
            <div class="active-calls-grid">
              <div v-for="call in activeCallList" :key="call.id" class="emergency-call-card">
                <div class="call-details">
                  <div class="caller-info">
                    <strong>{{ call.callerIdName || 'Unknown Caller' }}</strong>
                    <span class="phone-number">{{ call.callerIdNum }}</span>
                  </div>
                  <div class="call-metadata">
                    <span class="metadata-item">
                      <span class="metadata-label">Extension:</span>
                      {{ call.callerExtension }}
                    </span>
                    <span v-if="call.location" class="metadata-item">
                      <span class="metadata-label">Location:</span>
                      {{ call.location.name }}
                    </span>
                    <span class="metadata-item">
                      <span class="metadata-label">Started:</span>
                      {{ formatTime(call.startTime) }}
                    </span>
                  </div>
                </div>
                <Tag :value="call.status.replace('_', ' ').toUpperCase()" severity="danger" />
              </div>
            </div>
          </div>
        </Message>

        <!-- Main Content Tabs -->
        <TabView class="demo-tabs">
          <!-- Locations Tab -->
          <TabPanel header="📍 Locations">
            <div class="tab-header">
              <h3>Emergency Locations</h3>
              <Button
                label="Add Location"
                icon="pi pi-map-marker"
                @click="showAddLocation = true"
              />
            </div>

            <div v-if="locationList.length > 0" class="locations-grid">
              <div
                v-for="location in locationList"
                :key="location.id"
                class="location-card"
                :class="{
                  'is-default': location.isDefault,
                  'is-verified': location.isVerified,
                }"
              >
                <div class="location-header">
                  <div class="location-title">
                    <span class="location-icon">📍</span>
                    <strong>{{ location.name }}</strong>
                  </div>
                  <div class="location-badges">
                    <Tag v-if="location.isDefault" value="Default" severity="info" />
                    <Tag
                      :value="location.isVerified ? 'Verified' : 'Unverified'"
                      :severity="location.isVerified ? 'success' : 'warning'"
                    />
                  </div>
                </div>

                <div class="location-address">
                  {{ formatLocationAddress(location) }}
                </div>

                <div class="location-extensions">
                  <span class="extensions-label">Assigned Extensions:</span>
                  <div class="extensions-tags">
                    <Tag
                      v-for="ext in location.extensions"
                      :key="ext"
                      :value="ext"
                      severity="secondary"
                    />
                    <span v-if="location.extensions.length === 0" class="no-extensions"
                    >None assigned</span
                    >
                  </div>
                </div>

                <div class="location-actions">
                  <Button
                    v-if="!location.isDefault"
                    label="Set Default"
                    size="small"
                    severity="secondary"
                    @click="handleSetDefault(location.id)"
                  />
                  <Button
                    v-if="!location.isVerified"
                    label="Verify"
                    size="small"
                    severity="success"
                    @click="handleVerify(location.id)"
                  />
                  <Button
                    label="Remove"
                    size="small"
                    severity="danger"
                    @click="handleRemoveLocation(location.id)"
                  />
                </div>
              </div>
            </div>

            <div v-else class="empty-state">
              <span class="empty-icon">📍</span>
              <strong>No Locations Configured</strong>
              <p>Add dispatchable locations to enable compliant E911 emergency services</p>
              <Button
                label="Add Your First Location"
                severity="info"
                @click="showAddLocation = true"
              />
            </div>
          </TabPanel>

          <!-- Recipients Tab -->
          <TabPanel header="👤 Recipients">
            <div class="tab-header">
              <h3>Notification Recipients</h3>
              <Button
                label="Add Recipient"
                icon="pi pi-user-plus"
                @click="showAddRecipient = true"
              />
            </div>

            <div v-if="config.recipients.length > 0" class="recipients-grid">
              <div
                v-for="recipient in config.recipients"
                :key="recipient.id"
                class="recipient-card"
                :class="{ disabled: !recipient.enabled }"
              >
                <div class="recipient-header">
                  <div class="recipient-name">
                    <span class="recipient-icon">👤</span>
                    <strong>{{ recipient.name }}</strong>
                  </div>
                  <Tag
                    :value="`Priority ${recipient.priority}`"
                    :severity="recipient.priority === 1 ? 'danger' : 'info'"
                  />
                </div>

                <div class="recipient-contacts">
                  <div v-if="recipient.email" class="contact-item">
                    <span class="contact-icon">✉️</span>
                    <span>{{ recipient.email }}</span>
                  </div>
                  <div v-if="recipient.phone" class="contact-item">
                    <span class="contact-icon">📱</span>
                    <span>{{ recipient.phone }}</span>
                  </div>
                  <div class="notification-types">
                    <span class="types-label">Notification Methods:</span>
                    <Tag
                      v-for="type in recipient.notificationTypes"
                      :key="type"
                      :value="type"
                      severity="secondary"
                    />
                  </div>
                </div>

                <div class="recipient-actions">
                  <Button
                    :label="recipient.enabled ? 'Disable' : 'Enable'"
                    :severity="recipient.enabled ? 'warning' : 'success'"
                    size="small"
                    @click="handleToggleRecipient(recipient.id)"
                  />
                  <Button
                    label="Remove"
                    severity="danger"
                    size="small"
                    @click="handleRemoveRecipient(recipient.id)"
                  />
                </div>
              </div>
            </div>

            <div v-else class="empty-state">
              <span class="empty-icon">👤</span>
              <strong>No Recipients Configured</strong>
              <p>
                Add notification recipients for Kari's Law compliance (on-site notification
                requirement)
              </p>
              <Button
                label="Add Your First Recipient"
                severity="info"
                @click="showAddRecipient = true"
              />
            </div>

            <div v-if="config.recipients.length > 0" class="test-notification-section">
              <Button
                label="Send Test Notification"
                severity="secondary"
                @click="handleTestNotification"
              />
            </div>
          </TabPanel>

          <!-- Settings Tab -->
          <TabPanel header="⚙️ Settings">
            <Panel header="E911 Configuration" class="settings-panel">
              <div class="settings-form">
                <div class="form-field">
                  <label>
                    Default Callback Number
                    <span class="field-hint">Required for PSAP callbacks</span>
                  </label>
                  <InputText
                    v-model="settingsForm.callbackNumber"
                    placeholder="+15551234567"
                  />
                  <small class="field-help">Number for emergency services to call back</small>
                </div>

                <Divider />

                <h4 class="settings-section-title">Compliance Settings</h4>

                <div class="checkbox-field">
                  <Checkbox
                    v-model="settingsForm.directDialing"
                    :binary="true"
                    inputId="directDialing"
                  />
                  <label for="directDialing">
                    <strong>Direct 911 Dialing (Kari's Law)</strong>
                    <span class="checkbox-hint"
                    >Allow 911 dialing without prefix or access codes</span
                    >
                  </label>
                </div>

                <div class="checkbox-field">
                  <Checkbox
                    v-model="settingsForm.onSiteNotification"
                    :binary="true"
                    inputId="onSiteNotification"
                  />
                  <label for="onSiteNotification">
                    <strong>On-Site Notification (Kari's Law)</strong>
                    <span class="checkbox-hint"
                    >Notify security/front desk personnel on all 911 calls</span
                    >
                  </label>
                </div>

                <div class="checkbox-field">
                  <Checkbox
                    v-model="settingsForm.dispatchableLocation"
                    :binary="true"
                    inputId="dispatchableLocation"
                  />
                  <label for="dispatchableLocation">
                    <strong>Require Dispatchable Location (RAY BAUM's Act)</strong>
                    <span class="checkbox-hint"
                    >Require verified location assignment for all extensions</span
                    >
                  </label>
                </div>

                <Divider />

                <h4 class="settings-section-title">Additional Options</h4>

                <div class="checkbox-field">
                  <Checkbox
                    v-model="settingsForm.recordCalls"
                    :binary="true"
                    inputId="recordCalls"
                  />
                  <label for="recordCalls">
                    <strong>Record Emergency Calls</strong>
                  </label>
                </div>

                <div class="checkbox-field">
                  <Checkbox
                    v-model="settingsForm.autoAnswerCallback"
                    :binary="true"
                    inputId="autoAnswerCallback"
                  />
                  <label for="autoAnswerCallback">
                    <strong>Auto-Answer PSAP Callbacks</strong>
                  </label>
                </div>

                <Button label="Save Settings" severity="success" @click="handleSaveSettings" />
              </div>
            </Panel>
          </TabPanel>

          <!-- Logs Tab -->
          <TabPanel header="📋 Logs">
            <div class="tab-header">
              <h3>Compliance Logs</h3>
              <div class="log-actions">
                <Button
                  label="Export JSON"
                  severity="secondary"
                  size="small"
                  @click="handleExportLogs('json')"
                />
                <Button
                  label="Export CSV"
                  severity="secondary"
                  size="small"
                  @click="handleExportLogs('csv')"
                />
              </div>
            </div>

            <div v-if="recentLogs.length > 0" class="logs-list">
              <div
                v-for="log in recentLogs"
                :key="log.id"
                class="log-entry"
                :class="log.severity"
              >
                <div class="log-time">{{ formatTime(log.timestamp) }}</div>
                <Tag
                  :value="log.event.replace('_', ' ')"
                  :severity="
                    log.severity === 'critical'
                      ? 'danger'
                      : log.severity === 'warning'
                        ? 'warning'
                        : 'info'
                  "
                />
                <div class="log-description">{{ log.description }}</div>
              </div>
            </div>

            <div v-else class="empty-state">
              <span class="empty-icon">📋</span>
              <strong>No Compliance Logs</strong>
              <p>Activity logs will appear here for compliance tracking and audit purposes</p>
            </div>
          </TabPanel>
        </TabView>

        <!-- Simulation Section -->
        <Panel header="🧪 Test Emergency Call" class="simulation-panel">
          <div class="simulation-form">
            <div class="form-field">
              <label>Extension</label>
              <InputText v-model="simExtension" placeholder="1001" />
            </div>
            <div class="form-field">
              <label>Emergency Number</label>
              <Dropdown v-model="simNumber" :options="emergencyOptions" />
            </div>
            <Button label="Simulate Call" severity="danger" @click="simulateEmergencyCall" />
            <Button
              v-if="hasActiveEmergency"
              label="End Call"
              severity="secondary"
              @click="simulateEndCall"
            />
          </div>
        </Panel>

        <Divider />

        <h4>Code Example</h4>
        <pre class="code-block">{{ codeExample }}</pre>
      </template>
    </Card>

    <!-- Add Location Dialog -->
    <Dialog
      v-model:visible="showAddLocation"
      header="Add Emergency Location"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label>Location Name *</label>
          <InputText v-model="locationForm.name" placeholder="Main Office, Floor 3" />
        </div>

        <div class="form-field">
          <label>Street Address *</label>
          <InputText v-model="locationForm.streetAddress" placeholder="123 Main Street" />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>City *</label>
            <InputText v-model="locationForm.city" placeholder="Anytown" />
          </div>
          <div class="form-field">
            <label>State *</label>
            <InputText v-model="locationForm.state" placeholder="CA" maxlength="2" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>ZIP Code *</label>
            <InputText v-model="locationForm.zip" placeholder="12345" />
          </div>
          <div class="form-field">
            <label>Country</label>
            <InputText v-model="locationForm.country" placeholder="US" />
          </div>
        </div>

        <div class="form-field">
          <label>Additional Info</label>
          <InputText
            v-model="locationForm.additionalInfo"
            placeholder="Suite 301, Building A"
          />
          <small class="field-help">Floor, suite, building, or other location details</small>
        </div>

        <div class="form-field">
          <label>Extension Numbers</label>
          <InputText
            v-model="locationForm.extensions"
            placeholder="1001, 1002, 1003"
          />
          <small class="field-help">Comma-separated list of extensions at this location</small>
        </div>

        <div class="checkbox-field">
          <Checkbox v-model="locationForm.isDefault" :binary="true" inputId="isDefault" />
          <label for="isDefault">Set as default location</label>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showAddLocation = false" />
        <Button label="Add Location" @click="handleAddLocation" />
      </template>
    </Dialog>

    <!-- Add Recipient Dialog -->
    <Dialog
      v-model:visible="showAddRecipient"
      header="Add Notification Recipient"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label>Name *</label>
          <InputText v-model="recipientForm.name" placeholder="Security Team, Front Desk" />
        </div>

        <div class="form-field">
          <label>Email Address</label>
          <InputText
            v-model="recipientForm.email"
            type="email"
            placeholder="security@company.com"
          />
          <small class="field-help">For email notifications</small>
        </div>

        <div class="form-field">
          <label>Phone Number</label>
          <InputText v-model="recipientForm.phone" placeholder="+15551234567" />
          <small class="field-help">For SMS notifications (include country code)</small>
        </div>

        <div class="form-field">
          <label>Priority (1 = Highest)</label>
          <InputNumber
            v-model="recipientForm.priority"
            :min="1"
            :max="10"
            showButtons
          />
          <small class="field-help">Lower numbers receive notifications first</small>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showAddRecipient = false" />
        <Button label="Add Recipient" @click="handleAddRecipient" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onUnmounted } from 'vue'
import type {
  E911Config,
  E911Location,
  E911Call,
  E911ComplianceLog,
  E911NotificationRecipient,
} from '../../src/types/e911.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Dropdown from 'primevue/dropdown'
import Divider from 'primevue/divider'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Emergency number options for dropdown
const emergencyOptions = ref([
  { label: '911 (Emergency)', value: '911' },
  { label: '933 (Test)', value: '933' },
])

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
const showAddLocation = ref(false)
const showAddRecipient = ref(false)
const simExtension = ref('1001')
const simNumber = ref('911')

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
  alert('Settings saved successfully')
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

const codeExample = `import { useSipClient, useSipE911 } from 'vuesip'

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
    city: 'Anytown',
    state: 'CA',
    postalCode: '12345',
    country: 'US'
  },
  isDefault: true,
  isVerified: true,
  extensions: ['1001', '1002']
})

// Check compliance
const { compliant, issues } = checkCompliance()
startMonitoring()`

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
  max-width: 1200px;
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

/* Warning Banner */
.compliance-warning {
  margin-bottom: 1.5rem;
}

.warning-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.warning-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

/* Compliance Status */
.compliance-panel {
  margin-bottom: 1.5rem;
  border-radius: 12px;
  overflow: hidden;
}

.compliance-status-card {
  padding: 1.5rem;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--red-50) 0%, rgba(239, 68, 68, 0.05) 100%);
  border: 2px solid var(--red-300);
  transition: all 0.3s ease;
}

.compliance-status-card.compliant {
  background: linear-gradient(135deg, var(--green-50) 0%, rgba(34, 197, 94, 0.05) 100%);
  border-color: var(--green-400);
}

.status-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-tag {
  font-size: 1rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
}

.status-subtitle {
  font-size: 0.95rem;
  color: var(--text-color-secondary);
}

.issues-list {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid var(--surface-border);
}

.issue-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.issue-bullet {
  color: var(--red-500);
  font-weight: 700;
  font-size: 1.25rem;
  line-height: 1;
}

/* Emergency Alert */
.emergency-alert {
  margin-bottom: 1.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.9;
  }
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-badge {
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.alert-count {
  font-weight: 600;
  font-size: 1.1rem;
}

.active-calls-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.emergency-call-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  gap: 1rem;
}

.call-details {
  flex: 1;
}

.caller-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.caller-info strong {
  font-size: 1.1rem;
}

.phone-number {
  font-size: 0.9rem;
  opacity: 0.9;
}

.call-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9rem;
}

.metadata-item {
  display: flex;
  gap: 0.5rem;
}

.metadata-label {
  font-weight: 600;
}

/* Tabs */
.demo-tabs {
  margin-top: 1.5rem;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tab-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

/* Locations Grid */
.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.25rem;
}

.location-card {
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 12px;
  border: 2px solid var(--surface-border);
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.location-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.location-card.is-default {
  border-color: var(--blue-400);
  background: linear-gradient(135deg, var(--blue-50) 0%, rgba(96, 165, 250, 0.05) 100%);
}

.location-card.is-verified {
  border-color: var(--green-400);
}

.location-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--surface-border);
}

.location-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.15rem;
}

.location-icon {
  font-size: 1.5rem;
}

.location-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.location-address {
  font-size: 0.95rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.location-extensions {
  margin-bottom: 1rem;
}

.extensions-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.extensions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.no-extensions {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
  font-style: italic;
}

.location-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Recipients Grid */
.recipients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.25rem;
}

.recipient-card {
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 12px;
  border: 2px solid var(--surface-border);
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.recipient-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.recipient-card.disabled {
  opacity: 0.6;
  background: var(--surface-ground);
}

.recipient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--surface-border);
}

.recipient-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.15rem;
}

.recipient-icon {
  font-size: 1.5rem;
}

.recipient-contacts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.contact-icon {
  font-size: 1.25rem;
}

.notification-types {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.types-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recipient-actions {
  display: flex;
  gap: 0.5rem;
}

.test-notification-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--surface-border);
}

/* Settings Panel */
.settings-panel {
  margin-top: 1rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  color: var(--text-color);
}

.field-hint {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  font-weight: 400;
  margin-left: 0.5rem;
}

.field-help {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  font-style: italic;
}

.checkbox-field {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
}

.checkbox-field label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checkbox-hint {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  font-weight: 400;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-field {
  flex: 1;
}

/* Logs */
.log-actions {
  display: flex;
  gap: 0.5rem;
}

.logs-list {
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: 8px;
  border-left: 4px solid var(--surface-border);
  transition: all 0.2s ease;
}

.log-entry:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.log-entry.critical {
  border-left-color: var(--red-500);
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, var(--surface-card) 100%);
}

.log-entry.warning {
  border-left-color: var(--orange-500);
  background: linear-gradient(90deg, rgba(255, 167, 38, 0.05) 0%, var(--surface-card) 100%);
}

.log-time {
  color: var(--text-color-secondary);
  font-size: 0.85rem;
  min-width: 90px;
  font-weight: 500;
}

.log-description {
  flex: 1;
  font-size: 0.95rem;
}

/* Simulation Panel */
.simulation-panel {
  margin-top: 1.5rem;
}

.simulation-form {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  background: var(--surface-ground);
  border-radius: 12px;
  border: 2px dashed var(--surface-border);
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.5;
  filter: grayscale(0.3);
}

.empty-state strong {
  font-size: 1.25rem;
  color: var(--text-color);
}

.empty-state p {
  text-align: center;
  color: var(--text-color-secondary);
  max-width: 400px;
  margin: 0;
}

/* Dialogs */
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Code Block */
.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.25rem;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* Dark mode enhancements */
@media (prefers-color-scheme: dark) {
  .demo-card {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  .location-card:hover,
  .recipient-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  .log-entry:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}
</style>
