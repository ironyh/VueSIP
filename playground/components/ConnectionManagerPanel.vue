<template>
  <div class="connection-manager">
    <!-- Header with Add Button -->
    <div class="manager-header">
      <h3>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        SIP Connections
      </h3>
      <div class="header-actions">
        <div v-if="isCurrentlyConnected" class="connection-status connected">
          <span class="status-dot"></span>
          <span>Connected</span>
          <span v-if="isRegistered" class="badge badge-registered">Registered</span>
        </div>
        <button class="btn-icon btn-add" @click="openAddModal" title="Add new connection">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Active Connection Info -->
    <div v-if="isCurrentlyConnected && activeConnectionInfo" class="active-connection-panel">
      <div class="active-connection-info">
        <div class="info-row">
          <span class="info-label">Server</span>
          <span class="info-value">{{ activeConnectionInfo.uri }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">SIP URI</span>
          <span class="info-value">{{ activeConnectionInfo.sipUri }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Display Name</span>
          <span class="info-value">{{ activeConnectionInfo.displayName || 'Not set' }}</span>
        </div>
      </div>
      <button class="btn btn-danger btn-disconnect" @click="handleDisconnect">
        Disconnect
      </button>
    </div>

    <!-- Connection Error -->
    <div v-if="connectionError" class="connection-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ connectionError }}</span>
    </div>

    <!-- Connection List -->
    <div v-if="hasConnections" class="connection-list">
      <div
        v-for="connection in sortedConnections"
        :key="connection.id"
        :class="['connection-item', {
          active: activeConnectionId === connection.id,
          default: defaultConnectionId === connection.id,
          connected: isCurrentlyConnected && activeConnectionId === connection.id
        }]"
      >
        <div class="connection-main" @click="selectConnection(connection)">
          <div class="connection-info">
            <div class="connection-name">
              <span class="name">{{ connection.name }}</span>
              <span v-if="defaultConnectionId === connection.id" class="badge badge-default">Default</span>
              <span v-if="isCurrentlyConnected && activeConnectionId === connection.id" class="badge badge-connected">Connected</span>
            </div>
            <div class="connection-details">
              <span class="detail-item">{{ extractUsername(connection.sipUri) }}</span>
              <span class="detail-separator">@</span>
              <span class="detail-item server">{{ extractServer(connection.uri) }}</span>
            </div>
          </div>
        </div>

        <div class="connection-actions">
          <!-- Connect button (only when not connected or connected to different connection) -->
          <button
            v-if="!isCurrentlyConnected || activeConnectionId !== connection.id"
            class="btn btn-connect btn-sm"
            :disabled="connecting"
            @click.stop="connectToConnection(connection)"
          >
            {{ connecting ? 'Connecting...' : 'Connect' }}
          </button>
          <button
            v-if="defaultConnectionId !== connection.id"
            class="btn-icon btn-small"
            @click.stop="setAsDefault(connection.id)"
            title="Set as default"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          <button
            class="btn-icon btn-small"
            @click.stop="openEditModal(connection)"
            title="Edit connection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            class="btn-icon btn-small btn-icon-danger"
            @click.stop="confirmDelete(connection)"
            title="Delete connection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <p>No saved connections yet</p>
      <button class="btn btn-primary btn-sm" @click="openAddModal">
        Add Your First Connection
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h4>{{ isEditing ? 'Edit Connection' : 'Add New Connection' }}</h4>
            <button class="btn-icon btn-close" @click="closeModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveConnection" class="modal-body">
            <div class="form-group">
              <label for="conn-name">Connection Name *</label>
              <input
                id="conn-name"
                v-model="form.name"
                type="text"
                placeholder="e.g., Office PBX, Home Server"
                required
                :class="{ error: formErrors.name }"
              />
              <small v-if="formErrors.name" class="error-text">{{ formErrors.name }}</small>
            </div>

            <div class="form-group">
              <label for="conn-uri">Server URI (WebSocket) *</label>
              <input
                id="conn-uri"
                v-model="form.uri"
                type="text"
                placeholder="wss://sip.example.com:7443"
                required
              />
              <small>Example: wss://sip.yourdomain.com:7443</small>
            </div>

            <div class="form-group">
              <label for="conn-sip-uri">SIP URI *</label>
              <input
                id="conn-sip-uri"
                v-model="form.sipUri"
                type="text"
                placeholder="sip:username@example.com"
                required
              />
              <small>Example: sip:1000@yourdomain.com</small>
            </div>

            <div class="form-group">
              <label for="conn-password">Password</label>
              <input
                id="conn-password"
                v-model="form.password"
                type="password"
                placeholder="Enter your SIP password"
              />
            </div>

            <div class="form-group">
              <label for="conn-display">Display Name</label>
              <input
                id="conn-display"
                v-model="form.displayName"
                type="text"
                placeholder="Your Name"
              />
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.savePassword" />
                <span>Save password</span>
              </label>
              <div v-if="form.savePassword" class="security-warning">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>Password will be stored in browser localStorage (not encrypted)</span>
              </div>
            </div>

            <div class="form-group" v-if="!isEditing">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.setAsDefault" />
                <span>Set as default connection</span>
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="!isFormValid">
                {{ isEditing ? 'Save Changes' : 'Add Connection' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-content modal-small">
          <div class="modal-header">
            <h4>Delete Connection</h4>
            <button class="btn-icon btn-close" @click="cancelDelete">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <p>
              Are you sure you want to delete <strong>{{ connectionToDelete?.name }}</strong>?
            </p>
            <p class="text-muted">This action cannot be undone.</p>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="cancelDelete">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" @click="executeDelete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useConnectionManager, type SavedConnection } from '../composables/useConnectionManager'

// Types
interface ActiveConnectionInfo {
  uri: string
  sipUri: string
  displayName: string
}

// Props and Emits
const props = defineProps<{
  isConnected?: boolean
  isRegistered?: boolean
  activeConnectionInfo?: ActiveConnectionInfo | null
  connectionError?: string
  connecting?: boolean
}>()

const emit = defineEmits<{
  (e: 'connect', connection: SavedConnection): void
  (e: 'disconnect'): void
}>()

// Connection Manager
const manager = useConnectionManager()
const {
  sortedConnections,
  hasConnections,
  defaultConnectionId,
  activeConnectionId,
  addConnection,
  updateConnection,
  deleteConnection,
  setDefaultConnection,
  setActiveConnection,
  isNameTaken,
} = manager

// Computed from props
const isCurrentlyConnected = computed(() => props.isConnected ?? false)
const isRegistered = computed(() => props.isRegistered ?? false)
const activeConnectionInfo = computed(() => props.activeConnectionInfo ?? null)
const connectionError = computed(() => props.connectionError ?? '')
const connecting = computed(() => props.connecting ?? false)

// Modal State
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

// Form State
const form = reactive({
  name: '',
  uri: '',
  sipUri: '',
  password: '',
  displayName: '',
  savePassword: false,
  setAsDefault: false,
})

const formErrors = reactive({
  name: '',
})

// Delete Confirmation State
const showDeleteConfirm = ref(false)
const connectionToDelete = ref<SavedConnection | null>(null)

// Computed
const isFormValid = computed(() => {
  return form.name.trim() && form.uri.trim() && form.sipUri.trim() && !formErrors.name
})

// Helper Methods
function extractUsername(sipUri: string): string {
  const match = sipUri.match(/sips?:([^@]+)@/)
  return match ? match[1] : sipUri
}

function extractServer(uri: string): string {
  const match = uri.match(/wss?:\/\/([^:/]+)/)
  return match ? match[1] : uri
}

// Modal Methods
function openAddModal() {
  isEditing.value = false
  editingId.value = null
  resetForm()
  showModal.value = true
}

function openEditModal(connection: SavedConnection) {
  isEditing.value = true
  editingId.value = connection.id
  form.name = connection.name
  form.uri = connection.uri
  form.sipUri = connection.sipUri
  form.password = connection.password || ''
  form.displayName = connection.displayName
  form.savePassword = connection.savePassword
  form.setAsDefault = false
  formErrors.name = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

function resetForm() {
  form.name = ''
  form.uri = ''
  form.sipUri = ''
  form.password = ''
  form.displayName = ''
  form.savePassword = false
  form.setAsDefault = false
  formErrors.name = ''
}

// Validation
function validateName(): boolean {
  if (!form.name.trim()) {
    formErrors.name = 'Name is required'
    return false
  }
  if (isNameTaken(form.name, editingId.value || undefined)) {
    formErrors.name = 'A connection with this name already exists'
    return false
  }
  formErrors.name = ''
  return true
}

// Save Connection
function saveConnection() {
  if (!validateName()) return

  if (isEditing.value && editingId.value) {
    // Update existing
    updateConnection(editingId.value, {
      name: form.name.trim(),
      uri: form.uri.trim(),
      sipUri: form.sipUri.trim(),
      password: form.savePassword ? form.password : undefined,
      displayName: form.displayName.trim(),
      savePassword: form.savePassword,
    })
  } else {
    // Add new
    const newConn = addConnection({
      name: form.name.trim(),
      uri: form.uri.trim(),
      sipUri: form.sipUri.trim(),
      password: form.savePassword ? form.password : undefined,
      displayName: form.displayName.trim(),
      savePassword: form.savePassword,
    })

    if (form.setAsDefault) {
      setDefaultConnection(newConn.id)
    }
  }

  closeModal()
}

// Selection (visual highlight, no action)
function selectConnection(connection: SavedConnection) {
  // Just toggle visual selection - actual connect happens via Connect button
  if (activeConnectionId.value === connection.id && !isCurrentlyConnected.value) {
    setActiveConnection(null)
  } else if (!isCurrentlyConnected.value) {
    setActiveConnection(connection.id)
  }
}

// Connect/Disconnect
function connectToConnection(connection: SavedConnection) {
  emit('connect', connection)
}

function handleDisconnect() {
  emit('disconnect')
}

function setAsDefault(id: string) {
  setDefaultConnection(id)
}

// Delete
function confirmDelete(connection: SavedConnection) {
  connectionToDelete.value = connection
  showDeleteConfirm.value = true
}

function cancelDelete() {
  connectionToDelete.value = null
  showDeleteConfirm.value = false
}

function executeDelete() {
  if (connectionToDelete.value) {
    deleteConnection(connectionToDelete.value.id)
  }
  cancelDelete()
}
</script>

<style scoped>
.connection-manager {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.manager-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.manager-header h3 svg {
  color: var(--primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.connection-status.connected {
  color: #10b981;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.badge-registered {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
}

/* Active Connection Panel */
.active-connection-panel {
  padding: 1rem 1.25rem;
  background: rgba(16, 185, 129, 0.06);
  border-bottom: 1px solid rgba(16, 185, 129, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.active-connection-info {
  flex: 1;
  min-width: 0;
}

.info-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8125rem;
  margin-bottom: 0.25rem;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: var(--text-secondary);
  font-weight: 500;
  flex-shrink: 0;
  min-width: 80px;
}

.info-value {
  color: var(--text-primary);
  word-break: break-all;
}

.btn-disconnect {
  flex-shrink: 0;
}

/* Connection Error */
.connection-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(239, 68, 68, 0.08);
  border-bottom: 1px solid rgba(239, 68, 68, 0.15);
  color: #dc2626;
  font-size: 0.8125rem;
}

.connection-error svg {
  flex-shrink: 0;
}

/* Connection List */
.connection-list {
  max-height: 320px;
  overflow-y: auto;
}

.connection-item {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}

.connection-item:last-child {
  border-bottom: none;
}

.connection-item:hover {
  background: var(--bg-secondary);
}

.connection-item.active {
  background: rgba(99, 102, 241, 0.08);
}

.connection-item.connected {
  background: rgba(16, 185, 129, 0.08);
}

.connection-main {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.connection-info {
  min-width: 0;
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.connection-name .name {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge-default {
  background: var(--primary);
  color: white;
}

.badge-connected {
  background: #10b981;
  color: white;
}

.connection-details {
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.detail-separator {
  margin: 0 0.125rem;
  color: var(--text-tertiary);
}

.detail-item.server {
  color: var(--text-tertiary);
}

/* Connection Actions */
.connection-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.connection-item:hover .connection-actions {
  opacity: 1;
}

/* Buttons */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-icon.btn-add {
  background: var(--primary);
  color: white;
}

.btn-icon.btn-add:hover {
  background: #4f46e5;
}

.btn-icon.btn-small {
  padding: 0.375rem;
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-icon.btn-close {
  color: var(--text-secondary);
}

.btn-icon.btn-close:hover {
  color: var(--text-primary);
}

/* Empty State */
.empty-state {
  padding: 2.5rem 1.5rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state svg {
  color: var(--text-tertiary);
  margin-bottom: 1rem;
}

.empty-state p {
  margin: 0 0 1rem 0;
  font-size: 0.9375rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-content.modal-small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h4 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
}

.modal-body .text-muted {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

/* Form */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input.error {
  border-color: #ef4444;
}

.form-group small {
  display: block;
  margin-top: 0.375rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.form-group .error-text {
  color: #ef4444;
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal !important;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.checkbox-label span {
  font-size: 0.875rem;
  color: var(--text-primary);
}

/* Security Warning */
.security-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #b45309;
}

.security-warning svg {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), #4f46e5);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-primary);
  border-color: var(--primary);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
}

/* Connect Button */
.btn-connect {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.btn-connect:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-connect:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Always show Connect button */
.connection-item .btn-connect {
  opacity: 1;
}
</style>
