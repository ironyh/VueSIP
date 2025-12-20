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
        <input
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
          <input
            id="ami-username"
            v-model="config.username"
            type="text"
            placeholder="admin"
            :disabled="connecting"
          />
        </div>

        <div class="form-group">
          <label for="ami-password">Password <small>(optional)</small></label>
          <input
            id="ami-password"
            v-model="config.password"
            type="password"
            placeholder="Enter password"
            :disabled="connecting"
          />
        </div>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!isConfigValid || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect to AMI' }}
      </button>

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
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">Disconnect</button>
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
                <input
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
                <input
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
                <input
                  id="user-secret"
                  v-model="newUser.secret"
                  type="password"
                  placeholder="Enter SIP password"
                  :disabled="isLoading"
                />
                <small>Used for SIP registration</small>
              </div>

              <div class="form-group">
                <label for="user-email">Email (Optional)</label>
                <input
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
                <select id="user-context" v-model="newUser.context" :disabled="isLoading">
                  <option value="from-internal">from-internal (Internal calls)</option>
                  <option value="from-internal-additional">from-internal-additional</option>
                  <option value="from-pstn">from-pstn (External calls)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="user-transport">Transport</label>
                <select id="user-transport" v-model="newUser.transport" :disabled="isLoading">
                  <option value="udp">UDP</option>
                  <option value="tcp">TCP</option>
                  <option value="tls">TLS</option>
                  <option value="wss">WSS (WebRTC)</option>
                </select>
              </div>
            </div>

            <div class="form-row checkbox-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="newUser.voicemailEnabled" :disabled="isLoading" />
                <span>Enable Voicemail</span>
              </label>

              <label class="checkbox-label">
                <input type="checkbox" v-model="newUser.callWaitingEnabled" :disabled="isLoading" />
                <span>Enable Call Waiting</span>
              </label>

              <label class="checkbox-label">
                <input type="checkbox" v-model="newUser.enabled" :disabled="isLoading" />
                <span>User Enabled</span>
              </label>
            </div>

            <div class="form-actions">
              <button
                v-if="editingUser"
                class="btn btn-secondary"
                :disabled="isLoading"
                @click="cancelEdit"
              >
                Cancel
              </button>
              <button
                class="btn btn-primary"
                :disabled="!isUserFormValid || isLoading"
                @click="editingUser ? handleUpdateUser() : handleAddUser()"
              >
                {{ isLoading ? 'Saving...' : editingUser ? 'Update User' : 'Add User' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Users List -->
        <div class="users-section">
          <div class="section-header">
            <h3>SIP Users</h3>
            <div class="search-box">
              <input
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
                <button
                  class="btn btn-sm btn-icon"
                  title="Edit user"
                  :disabled="isLoading"
                  @click="handleEditUser(user)"
                >
                  Edit
                </button>
                <button
                  class="btn btn-sm btn-icon"
                  :title="user.enabled ? 'Disable user' : 'Enable user'"
                  :disabled="isLoading"
                  @click="handleToggleUser(user)"
                >
                  {{ user.enabled ? 'Disable' : 'Enable' }}
                </button>
                <button
                  class="btn btn-sm btn-icon btn-danger"
                  title="Delete user"
                  :disabled="isLoading"
                  @click="handleDeleteUser(user)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div v-if="users.length > 0" class="bulk-actions">
          <h4>Bulk Actions</h4>
          <div class="actions-row">
            <button class="btn btn-secondary" :disabled="isLoading" @click="handleExportUsers">
              Export Users
            </button>
            <button
              class="btn btn-secondary"
              :disabled="isLoading"
              @click="handleRefreshRegistrations"
            >
              Refresh Status
            </button>
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
/* Import global theme system for light/dark mode support */
@import '../styles/themes.css';

.user-management-demo {
  max-width: 1000px;
  margin: 0 auto;
  font-family: var(--font-sans);
  color: var(--text-primary);
}

/* AMI Info Banner */
.ami-info-banner {
  position: relative;
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-info-light);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xl);
  overflow: hidden;
  transition: all var(--transition-base);
}

.ami-info-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-blue);
  opacity: 1;
}

.ami-info-banner:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-info);
}

.banner-icon {
  font-size: var(--text-3xl);
  flex-shrink: 0;
  color: var(--color-info);
}

.banner-content h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.banner-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.6;
}

/* Config Panel */
.config-panel {
  position: relative;
  padding: var(--spacing-2xl);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-base);
}

.config-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-indigo);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.config-panel:hover::before {
  opacity: 1;
}

.config-panel h3 {
  margin-bottom: var(--spacing-lg);
  color: var(--text-primary);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

.info-text {
  margin-bottom: var(--spacing-xl);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.form-group {
  margin-bottom: var(--spacing-xl);
}

.form-row {
  display: flex;
  gap: var(--spacing-lg);
}

.form-row .form-group {
  flex: 1;
}

.checkbox-row {
  flex-wrap: wrap;
  margin-bottom: var(--spacing-xl);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.checkbox-label:hover {
  color: var(--text-primary);
}

.checkbox-label input[type='checkbox'] {
  width: auto;
  cursor: pointer;
  accent-color: var(--color-info);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  background: var(--bg-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.form-group small {
  display: block;
  margin-top: var(--spacing-xs);
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-top: var(--spacing-xl);
}

/* Buttons with Gradient */
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-sans);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover:not(:disabled) {
  background: var(--gradient-blue-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-blue);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-color-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-danger {
  background: var(--gradient-red);
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-sm);
}

.btn-danger:hover:not(:disabled) {
  background: var(--gradient-red-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-xs);
}

.btn-icon {
  padding: var(--spacing-xs);
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  min-width: 36px;
  color: var(--text-primary);
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--color-info);
  transform: translateY(-2px);
}

.btn-icon.btn-danger {
  background: var(--bg-primary);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.btn-icon.btn-danger:hover:not(:disabled) {
  background: var(--bg-danger-light);
  border-color: var(--color-danger);
  transform: translateY(-2px);
}

.error-message {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-danger-light);
  border: 2px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  font-size: var(--text-sm);
  animation: fadeIn 0.3s ease-out;
}

.success-message {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-success-light);
  border: 2px solid var(--color-success);
  border-radius: var(--radius-sm);
  color: var(--color-success);
  font-size: var(--text-sm);
  animation: fadeIn 0.3s ease-out;
}

.demo-tip {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--bg-info-light);
  border-left: 4px solid var(--color-info);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.demo-tip strong {
  color: var(--color-info);
  font-weight: var(--font-semibold);
}

/* Connected Interface */
.connected-interface {
  padding: var(--spacing-xl);
}

.status-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xl);
  overflow: hidden;
  transition: all var(--transition-base);
}

.status-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-green);
  opacity: 1;
}

.status-bar:hover {
  box-shadow: var(--shadow-md);
}

.status-items {
  display: flex;
  gap: var(--spacing-xl);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: var(--font-medium);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.status-dot.connected {
  background: var(--color-success);
}

.status-icon {
  font-size: var(--text-xl);
  color: var(--color-info);
}

/* Main Panel */
.main-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.add-user-section,
.users-section,
.bulk-actions {
  position: relative;
  padding: var(--spacing-xl);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-base);
}

.add-user-section::before,
.users-section::before,
.bulk-actions::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-purple);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.add-user-section:hover::before,
.users-section:hover::before,
.bulk-actions:hover::before {
  opacity: 1;
}

.add-user-section h3,
.users-section h3,
.bulk-actions h4 {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.section-header h3 {
  margin: 0;
}

.search-box {
  width: 300px;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Users List */
.users-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.user-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  overflow: hidden;
}

.user-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-blue);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.user-card:hover {
  border-color: var(--color-info);
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.user-card:hover::before {
  opacity: 1;
}

.user-card.disabled {
  opacity: 0.6;
  background: var(--bg-tertiary);
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--gradient-indigo);
  color: var(--text-on-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-header {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xs);
}

.user-name {
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  color: var(--text-primary);
}

.user-extension {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-variant-numeric: tabular-nums;
}

.user-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}

.detail {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.detail-icon {
  font-size: var(--text-sm);
  color: var(--color-info);
}

.user-status {
  display: flex;
  gap: var(--spacing-sm);
}

.status-badge {
  font-size: var(--text-xs);
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.enabled {
  background: var(--gradient-green);
  color: var(--text-on-gradient);
}

.status-badge.disabled {
  background: var(--bg-neutral-light);
  color: var(--color-neutral);
}

.status-badge.registered {
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
}

.status-badge.unregistered {
  background: var(--gradient-orange);
  color: var(--text-on-gradient);
}

.status-badge.unknown {
  background: var(--bg-neutral-light);
  color: var(--color-neutral);
}

.user-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

/* No Users */
.no-users {
  text-align: center;
  padding: var(--spacing-3xl) var(--spacing-lg);
  color: var(--text-tertiary);
}

.no-users-icon {
  font-size: var(--text-4xl);
  display: block;
  margin-bottom: var(--spacing-lg);
  opacity: 0.4;
  color: var(--text-muted);
}

.no-users p {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.no-users .hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* Bulk Actions */
.actions-row {
  display: flex;
  gap: var(--spacing-md);
}

/* Responsive */
@media (max-width: 768px) {
  .user-management-demo {
    padding: 0 var(--spacing-sm);
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .status-bar {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .status-items {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .section-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .user-card {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    padding: var(--spacing-md);
  }

  .user-avatar {
    margin: 0 auto;
    width: 64px;
    height: 64px;
  }

  .user-header {
    justify-content: center;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .user-details {
    justify-content: center;
  }

  .user-status {
    justify-content: center;
  }

  .user-actions {
    justify-content: center;
    flex-wrap: wrap;
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
    padding: var(--spacing-md);
  }

  .banner-icon {
    margin: 0 auto;
  }

  .config-panel,
  .connected-interface,
  .add-user-section,
  .users-section,
  .bulk-actions {
    padding: var(--spacing-md);
  }
}

/* Accessibility - Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
