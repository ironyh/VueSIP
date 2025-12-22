<template>
  <div class="user-management-demo">
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

    <!-- AMI Info Banner -->
    <div class="ami-info-banner">
      <div class="banner-icon">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <line x1="9" y1="11" x2="15" y2="11" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <div class="banner-content">
        <h4>AMI Feature</h4>
        <p>
          This demo requires an AMI WebSocket connection to your Asterisk/FreePBX server. AMI
          (Asterisk Manager Interface) enables advanced PBX management features like user
          provisioning, queue management, and system monitoring.
        </p>
      </div>
    </div>

    <!-- Configuration Panel -->
    <div v-if="!amiConnected" key="config-panel" class="config-panel">
      <h3>AMI Server Configuration</h3>
      <p class="info-text">
        Connect to your AMI WebSocket server to manage SIP users. You can add, edit, and remove SIP
        extensions directly from this interface.
      </p>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <InputText
          id="ami-url"
          v-model="config.url"
          type="text"
          placeholder="ws://pbx.example.com:8080/ami"
          :disabled="connecting"
        />
        <small>Example: ws://your-pbx:8080/ami</small>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="ami-username">Username <small>(optional)</small></label>
          <InputText
            id="ami-username"
            v-model="config.username"
            type="text"
            placeholder="admin"
            :disabled="connecting"
          />
        </div>

        <div class="form-group">
          <label for="ami-password">Password <small>(optional)</small></label>
          <Password
            id="ami-password"
            v-model="config.password"
            placeholder="Enter password"
            :disabled="connecting"
            :feedback="false"
            toggleMask
          />
        </div>
      </div>

      <Button
        :label="connecting ? 'Connecting...' : 'Connect to AMI'"
        :disabled="!isConfigValid || connecting"
        @click="handleConnect"
      />

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> This demo requires an AMI WebSocket proxy. Make sure your Asterisk
        server has the AMI interface configured and a WebSocket proxy is running. You need admin
        privileges to manage users.
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else key="connected-interface" class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-items">
          <div class="status-item">
            <span class="status-dot connected"></span>
            <span>AMI Connected</span>
          </div>
          <div class="status-item">
            <span class="status-icon">Users:</span>
            <span>{{ users.length }}</span>
          </div>
        </div>
        <Button label="Disconnect" severity="secondary" size="small" @click="handleDisconnect" />
      </div>

      <!-- Main Panel -->
      <div class="main-panel">
        <!-- Add User Section -->
        <div class="add-user-section">
          <h3>{{ editingUser ? 'Edit User' : 'Add New User' }}</h3>

          <div class="user-form">
            <div class="form-row">
              <div class="form-group">
                <label for="user-extension">Extension</label>
                <InputText
                  id="user-extension"
                  v-model="newUser.extension"
                  type="text"
                  placeholder="1001"
                  :disabled="isLoading || editingUser !== null"
                />
                <small>Numeric extension (e.g., 1001)</small>
              </div>

              <div class="form-group">
                <label for="user-name">Display Name</label>
                <InputText
                  id="user-name"
                  v-model="newUser.displayName"
                  type="text"
                  placeholder="John Doe"
                  :disabled="isLoading"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="user-secret">SIP Password</label>
                <Password
                  id="user-secret"
                  v-model="newUser.secret"
                  placeholder="Enter SIP password"
                  :disabled="isLoading"
                  :feedback="false"
                  toggleMask
                />
                <small>Used for SIP registration</small>
              </div>

              <div class="form-group">
                <label for="user-email">Email (Optional)</label>
                <InputText
                  id="user-email"
                  v-model="newUser.email"
                  type="email"
                  placeholder="john@example.com"
                  :disabled="isLoading"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="user-context">Dial Context</label>
                <Dropdown
                  id="user-context"
                  v-model="newUser.context"
                  :options="[
                    { label: 'from-internal (Internal calls)', value: 'from-internal' },
                    { label: 'from-internal-additional', value: 'from-internal-additional' },
                    { label: 'from-pstn (External calls)', value: 'from-pstn' },
                  ]"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="isLoading"
                />
              </div>

              <div class="form-group">
                <label for="user-transport">Transport</label>
                <Dropdown
                  id="user-transport"
                  v-model="newUser.transport"
                  :options="[
                    { label: 'UDP', value: 'udp' },
                    { label: 'TCP', value: 'tcp' },
                    { label: 'TLS', value: 'tls' },
                    { label: 'WSS (WebRTC)', value: 'wss' },
                  ]"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="isLoading"
                />
              </div>
            </div>

            <div class="form-row checkbox-row">
              <label class="checkbox-label">
                <Checkbox v-model="newUser.voicemailEnabled" :binary="true" :disabled="isLoading" />
                <span>Enable Voicemail</span>
              </label>

              <label class="checkbox-label">
                <Checkbox
                  v-model="newUser.callWaitingEnabled"
                  :binary="true"
                  :disabled="isLoading"
                />
                <span>Enable Call Waiting</span>
              </label>

              <label class="checkbox-label">
                <Checkbox v-model="newUser.enabled" :binary="true" :disabled="isLoading" />
                <span>User Enabled</span>
              </label>
            </div>

            <div class="form-actions">
              <Button
                v-if="editingUser"
                label="Cancel"
                severity="secondary"
                :disabled="isLoading"
                @click="cancelEdit"
              />
              <Button
                :label="isLoading ? 'Saving...' : editingUser ? 'Update User' : 'Add User'"
                :disabled="!isUserFormValid || isLoading"
                @click="editingUser ? handleUpdateUser() : handleAddUser()"
              />
            </div>
          </div>
        </div>

        <!-- Users List -->
        <div class="users-section">
          <div class="section-header">
            <h3>SIP Users</h3>
            <div class="search-box">
              <InputText
                v-model="searchQuery"
                type="text"
                placeholder="Search users..."
                class="search-input"
              />
            </div>
          </div>

          <div v-if="filteredUsers.length === 0" key="no-users" class="no-users">
            <span class="no-users-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <p>{{ searchQuery ? 'No users match your search' : 'No users configured yet' }}</p>
            <p class="hint">
              {{ searchQuery ? 'Try a different search term' : 'Add your first SIP user above' }}
            </p>
          </div>

          <div v-else key="users-list" class="users-list">
            <div
              v-for="user in filteredUsers"
              :key="user.extension"
              class="user-card"
              :class="{ disabled: !user.enabled }"
            >
              <div class="user-avatar">
                {{ getInitials(user.displayName) }}
              </div>
              <div class="user-info">
                <div class="user-header">
                  <span class="user-name">{{ user.displayName }}</span>
                  <span class="user-extension">ext. {{ user.extension }}</span>
                </div>
                <div class="user-details">
                  <span v-if="user.email" class="detail">
                    <span class="detail-icon">Email:</span>
                    {{ user.email }}
                  </span>
                  <span class="detail">
                    <span class="detail-icon">Transport:</span>
                    {{ user.transport.toUpperCase() }}
                  </span>
                  <span v-if="user.voicemailEnabled" class="detail">
                    <span class="detail-icon">VM</span>
                  </span>
                </div>
                <div class="user-status">
                  <span :class="['status-badge', user.enabled ? 'enabled' : 'disabled']">
                    {{ user.enabled ? 'Active' : 'Disabled' }}
                  </span>
                  <span
                    v-if="user.registrationStatus"
                    :class="['status-badge', user.registrationStatus]"
                  >
                    {{ formatRegistrationStatus(user.registrationStatus) }}
                  </span>
                </div>
              </div>
              <div class="user-actions">
                <Button
                  label="Edit"
                  class="btn-icon"
                  size="small"
                  title="Edit user"
                  :disabled="isLoading"
                  @click="handleEditUser(user)"
                />
                <Button
                  :label="user.enabled ? 'Disable' : 'Enable'"
                  class="btn-icon"
                  size="small"
                  :title="user.enabled ? 'Disable user' : 'Enable user'"
                  :disabled="isLoading"
                  @click="handleToggleUser(user)"
                />
                <Button
                  label="Delete"
                  class="btn-icon"
                  severity="danger"
                  size="small"
                  title="Delete user"
                  :disabled="isLoading"
                  @click="handleDeleteUser(user)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div v-if="users.length > 0" class="bulk-actions">
          <h4>Bulk Actions</h4>
          <div class="actions-row">
            <Button
              label="Export Users"
              severity="secondary"
              :disabled="isLoading"
              @click="handleExportUsers"
            />
            <Button
              label="Refresh Status"
              severity="secondary"
              :disabled="isLoading"
              @click="handleRefreshRegistrations"
            />
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { playgroundAmiClient, loadAmiConfig, saveAmiConfig } from '../sipClient'
import { useAmiPeers } from '@/composables/useAmiPeers'
import type { PeerInfo } from '@/types/ami.types'
import { Button, InputText, Password, Dropdown, Checkbox } from './shared-components'

// Types
interface SipUser {
  extension: string
  displayName: string
  secret: string
  email?: string
  context: string
  transport: 'udp' | 'tcp' | 'tls' | 'wss'
  voicemailEnabled: boolean
  callWaitingEnabled: boolean
  enabled: boolean
  registrationStatus?: 'registered' | 'unregistered' | 'unknown'
  createdAt: Date
  updatedAt: Date
}

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI composables - use shared playground client
const ami = playgroundAmiClient
let amiPeers: ReturnType<typeof useAmiPeers> | null = null

// Connection state
const amiConnected = ref(false)
const connecting = ref(false)
const connectionError = ref('')

// Configuration - load from localStorage
const savedConfig = loadAmiConfig()
const config = reactive({
  url: savedConfig.url || 'ws://localhost:8080/ami',
  username: savedConfig.username || 'admin',
  password: '',
})

// Load saved config on mount and sync connection state
onMounted(() => {
  // Check if already connected via shared client
  if (ami.isConnected.value) {
    amiConnected.value = true
    // Initialize peer tracking
    const client = ami.getClient()
    if (client) {
      amiPeers = useAmiPeers(client, {
        useEvents: true,
        includeSip: true,
        includePjsip: true,
        onPeerUpdate: (peer) => {
          const idx = users.value.findIndex((u) => u.extension === peer.objectName)
          if (idx >= 0) {
            users.value[idx] = peerInfoToSipUser(peer)
          }
        },
      })
      loadPeersAsUsers()
    }
  }
})

// Users state
const users = ref<SipUser[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const editingUser = ref<SipUser | null>(null)

// New user form
const newUser = reactive({
  extension: '',
  displayName: '',
  secret: '',
  email: '',
  context: 'from-internal',
  transport: 'wss' as 'udp' | 'tcp' | 'tls' | 'wss',
  voicemailEnabled: true,
  callWaitingEnabled: true,
  enabled: true,
})

// Computed
const isConfigValid = computed(
  () => !!config.url // username/password optional - some AMI setups allow unauthenticated connections
)

const isUserFormValid = computed(
  () =>
    newUser.extension && newUser.displayName && newUser.secret && /^\d+$/.test(newUser.extension)
)

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return users.value

  const query = searchQuery.value.toLowerCase()
  return users.value.filter(
    (user) =>
      user.extension.includes(query) ||
      user.displayName.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query))
  )
})

// Helper functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatRegistrationStatus(status: string): string {
  const labels: Record<string, string> = {
    registered: 'Online',
    unregistered: 'Offline',
    unknown: 'Unknown',
  }
  return labels[status] || status
}

function showSuccess(message: string): void {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, 3000)
}

function resetForm(): void {
  newUser.extension = ''
  newUser.displayName = ''
  newUser.secret = ''
  newUser.email = ''
  newUser.context = 'from-internal'
  newUser.transport = 'wss'
  newUser.voicemailEnabled = true
  newUser.callWaitingEnabled = true
  newUser.enabled = true
  editingUser.value = null
}

/**
 * Convert PeerInfo from AMI to SipUser format for display
 */
function peerInfoToSipUser(peer: PeerInfo): SipUser {
  // Determine registration status from peer status
  let registrationStatus: 'registered' | 'unregistered' | 'unknown' = 'unknown'
  const status = peer.status?.toLowerCase() || ''
  if (
    status.includes('ok') ||
    status.includes('registered') ||
    status.includes('reachable') ||
    status.includes('not in use')
  ) {
    registrationStatus = 'registered'
  } else if (
    status.includes('unreachable') ||
    status.includes('unavailable') ||
    status.includes('unknown')
  ) {
    registrationStatus = 'unregistered'
  }

  // Determine transport from peer data
  let transport: 'udp' | 'tcp' | 'tls' | 'wss' = 'udp'
  if (peer.channelType === 'PJSIP') {
    // PJSIP endpoints often use wss for WebRTC
    transport = 'wss'
  }

  return {
    extension: peer.objectName,
    displayName: peer.callerIdName || peer.objectName,
    secret: '***', // Never expose secrets
    email: undefined,
    context: peer.context || 'from-internal',
    transport,
    voicemailEnabled: false, // Would need separate query
    callWaitingEnabled: false, // Would need separate query
    enabled: status !== 'unknown' && status !== '',
    registrationStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Load peers from AMI and convert to users
 */
async function loadPeersAsUsers(): Promise<void> {
  if (!amiPeers) return

  try {
    await amiPeers.refresh()

    // Convert peers to SipUser format
    const peerList = amiPeers.peerList.value
    users.value = peerList.map(peerInfoToSipUser)

    console.log(`Loaded ${users.value.length} users from AMI`)
  } catch (err) {
    console.error('Failed to load peers:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load users'
  }
}

// Connection handlers
async function handleConnect() {
  connecting.value = true
  connectionError.value = ''

  try {
    // Connect to real AMI WebSocket via shared client
    await ami.connect({
      url: config.url,
      username: config.username || undefined,
      password: config.password || undefined,
    })

    // Save config to localStorage on successful connection
    saveAmiConfig(config.url, config.username)

    // Initialize peer tracking after connection
    const client = ami.getClient()
    if (client) {
      amiPeers = useAmiPeers(client, {
        useEvents: true,
        includeSip: true,
        includePjsip: true,
        onPeerUpdate: (peer) => {
          // Update user list when peer status changes
          const idx = users.value.findIndex((u) => u.extension === peer.objectName)
          if (idx >= 0) {
            users.value[idx] = peerInfoToSipUser(peer)
          }
        },
      })

      // Load initial peer data
      await loadPeersAsUsers()
    }

    amiConnected.value = true
    showSuccess('Connected to AMI successfully')
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
    console.error('AMI connection failed:', err)
  } finally {
    connecting.value = false
  }
}

async function handleDisconnect() {
  // Disconnect from real AMI
  ami.disconnect()
  amiPeers = null

  users.value = []
  resetForm()
  amiConnected.value = false
}

// User management handlers
async function handleAddUser() {
  if (!isUserFormValid.value) return

  // Check for duplicate extension
  if (users.value.some((u) => u.extension === newUser.extension)) {
    error.value = `Extension ${newUser.extension} already exists`
    return
  }

  isLoading.value = true
  error.value = null

  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const user: SipUser = {
      extension: newUser.extension,
      displayName: newUser.displayName,
      secret: '***',
      email: newUser.email || undefined,
      context: newUser.context,
      transport: newUser.transport,
      voicemailEnabled: newUser.voicemailEnabled,
      callWaitingEnabled: newUser.callWaitingEnabled,
      enabled: newUser.enabled,
      registrationStatus: 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    users.value.push(user)
    resetForm()
    showSuccess(`User ${user.displayName} (ext. ${user.extension}) created successfully`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add user'
  } finally {
    isLoading.value = false
  }
}

function handleEditUser(user: SipUser) {
  editingUser.value = user
  newUser.extension = user.extension
  newUser.displayName = user.displayName
  newUser.secret = ''
  newUser.email = user.email || ''
  newUser.context = user.context
  newUser.transport = user.transport
  newUser.voicemailEnabled = user.voicemailEnabled
  newUser.callWaitingEnabled = user.callWaitingEnabled
  newUser.enabled = user.enabled
}

function cancelEdit() {
  resetForm()
}

async function handleUpdateUser() {
  if (!editingUser.value || !isUserFormValid.value) return

  isLoading.value = true
  error.value = null

  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const idx = users.value.findIndex((u) => u.extension === editingUser.value!.extension)
    if (idx >= 0) {
      users.value[idx] = {
        ...users.value[idx],
        displayName: newUser.displayName,
        email: newUser.email || undefined,
        context: newUser.context,
        transport: newUser.transport,
        voicemailEnabled: newUser.voicemailEnabled,
        callWaitingEnabled: newUser.callWaitingEnabled,
        enabled: newUser.enabled,
        updatedAt: new Date(),
      }
    }

    showSuccess(`User ${newUser.displayName} updated successfully`)
    resetForm()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update user'
  } finally {
    isLoading.value = false
  }
}

async function handleToggleUser(user: SipUser) {
  isLoading.value = true
  error.value = null

  try {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const idx = users.value.findIndex((u) => u.extension === user.extension)
    if (idx >= 0) {
      users.value[idx].enabled = !users.value[idx].enabled
      users.value[idx].updatedAt = new Date()
    }

    showSuccess(`User ${user.displayName} ${users.value[idx]?.enabled ? 'enabled' : 'disabled'}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to toggle user'
  } finally {
    isLoading.value = false
  }
}

async function handleDeleteUser(user: SipUser) {
  if (
    !confirm(`Are you sure you want to delete user ${user.displayName} (ext. ${user.extension})?`)
  ) {
    return
  }

  isLoading.value = true
  error.value = null

  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const idx = users.value.findIndex((u) => u.extension === user.extension)
    if (idx >= 0) {
      users.value.splice(idx, 1)
    }

    showSuccess(`User ${user.displayName} deleted successfully`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete user'
  } finally {
    isLoading.value = false
  }
}

function handleExportUsers() {
  const exportData = users.value.map((u) => ({
    extension: u.extension,
    displayName: u.displayName,
    email: u.email,
    context: u.context,
    transport: u.transport,
    voicemailEnabled: u.voicemailEnabled,
    callWaitingEnabled: u.callWaitingEnabled,
    enabled: u.enabled,
  }))

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sip-users.json'
  a.click()
  URL.revokeObjectURL(url)

  showSuccess('Users exported successfully')
}

async function handleRefreshRegistrations() {
  isLoading.value = true

  try {
    // Refresh real peer data from AMI
    if (amiPeers) {
      await loadPeersAsUsers()
      showSuccess('Registration status refreshed from AMI')
    } else {
      // Fallback for when not connected
      showSuccess('Not connected to AMI')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to refresh registrations'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.user-management-demo {
  max-width: 1000px;
  margin: 0 auto;
}

/* AMI Info Banner */
.ami-info-banner {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, var(--indigo-50) 0%, var(--indigo-100) 100%);
  border: 1px solid var(--indigo-200);
  border-radius: 10px;
  margin-bottom: 1.5rem;
}

.banner-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.banner-content h4 {
  margin: 0 0 0.5rem 0;
  color: var(--indigo-700);
  font-size: 1rem;
}

.banner-content p {
  margin: 0;
  color: var(--indigo-600);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Config Panel */
.config-panel {
  padding: 2rem;
}

.config-panel h3 {
  margin-bottom: 1rem;
  color: var(--vuesip-text-primary);
}

.info-text {
  margin-bottom: 1.5rem;
  color: var(--vuesip-text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.checkbox-row {
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--vuesip-text-primary);
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--vuesip-text-primary);
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--vuesip-text-tertiary);
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Custom button styling */
.btn-icon {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--vuesip-border);
  min-width: 36px;
}

.btn-icon:hover:not(:disabled) {
  background: var(--vuesip-bg-secondary);
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--vuesip-danger-light);
  border: 1px solid var(--vuesip-danger);
  border-radius: var(--vuesip-border-radius);
  color: var(--vuesip-danger-dark);
  font-size: 0.875rem;
}

.success-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--vuesip-success-light);
  border: 1px solid var(--vuesip-success);
  border-radius: var(--vuesip-border-radius);
  color: var(--vuesip-success-dark);
  font-size: 0.875rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--vuesip-info-light);
  border-left: 4px solid var(--vuesip-info);
  border-radius: var(--vuesip-border-radius);
  font-size: 0.875rem;
  color: var(--vuesip-info-dark);
}

/* Connected Interface */
.connected-interface {
  padding: 1.5rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius-lg);
  margin-bottom: 1.5rem;
}

.status-items {
  display: flex;
  gap: 1.5rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--vuesip-text-primary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vuesip-danger);
}

.status-dot.connected {
  background: var(--vuesip-success);
}

.status-icon {
  font-size: 1.25rem;
}

/* Main Panel */
.main-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.add-user-section,
.users-section,
.bulk-actions {
  padding: 1.5rem;
  background: var(--vuesip-bg-primary);
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
}

.add-user-section h3,
.users-section h3,
.bulk-actions h4 {
  margin: 0 0 1rem 0;
  color: var(--vuesip-text-primary);
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

.search-box {
  width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius);
  font-size: 0.875rem;
}

/* Users List */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--vuesip-bg-secondary);
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
  transition: all var(--vuesip-transition);
}

.user-card:hover {
  border-color: var(--indigo-200);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.user-card.disabled {
  opacity: 0.6;
  background: var(--vuesip-bg-secondary);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vuesip-primary), var(--indigo-600));
  color: var(--surface-0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: var(--vuesip-text-primary);
}

.user-extension {
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
  background: var(--vuesip-border);
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.user-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.detail {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
}

.detail-icon {
  font-size: 0.875rem;
}

.user-status {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.enabled {
  background: var(--vuesip-success-light);
  color: var(--vuesip-success-dark);
}

.status-badge.disabled {
  background: var(--vuesip-bg-secondary);
  color: var(--vuesip-text-tertiary);
}

.status-badge.registered {
  background: var(--vuesip-info-light);
  color: var(--vuesip-info-dark);
}

.status-badge.unregistered {
  background: var(--vuesip-warning-light);
  color: var(--vuesip-warning-dark);
}

.status-badge.unknown {
  background: var(--vuesip-bg-secondary);
  color: var(--vuesip-text-tertiary);
}

.user-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* No Users */
.no-users {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--vuesip-text-tertiary);
}

.no-users-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-users p {
  margin: 0 0 0.5rem 0;
}

.no-users .hint {
  font-size: 0.875rem;
  color: var(--vuesip-text-tertiary);
}

/* Bulk Actions */
.actions-row {
  display: flex;
  gap: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .status-bar {
    flex-direction: column;
    gap: 1rem;
  }

  .status-items {
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .user-card {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .user-avatar {
    margin: 0 auto;
  }

  .user-header {
    justify-content: center;
  }

  .user-details {
    justify-content: center;
  }

  .user-status {
    justify-content: center;
  }

  .user-actions {
    justify-content: center;
  }

  .actions-row {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }

  .ami-info-banner {
    flex-direction: column;
    text-align: center;
  }
}
</style>
