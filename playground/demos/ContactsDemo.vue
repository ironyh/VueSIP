<template>
  <div class="contacts-demo">
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

    <!-- Configuration Panel -->
    <div v-if="!isAmiConnected" class="config-panel">
      <h3>Contacts/Phonebook Demo</h3>
      <p class="info-text">
        Manage contacts stored in Asterisk's internal database (AstDB). Contacts are stored
        server-side and accessible from any device.
      </p>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <input
          id="ami-url"
          v-model="amiConfig.url"
          type="text"
          placeholder="ws://pbx.example.com:8080"
          :disabled="connecting"
        />
        <small>amiws WebSocket proxy URL</small>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!amiConfig.url || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect to AMI' }}
      </button>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-item">
          <span class="status-dot connected"></span>
          <span>AMI Connected</span>
        </div>
        <div class="status-item">
          <span>Contacts: {{ contactCount }}</span>
        </div>
        <div class="status-item">
          <span>Groups: {{ groups.length }}</span>
        </div>
        <button class="btn btn-sm btn-secondary" @click="handleExport" title="Export contacts">
          Export
        </button>
        <input
          ref="importInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImportFile"
        />
        <button class="btn btn-sm btn-secondary" @click="triggerImport" title="Import contacts">
          Import
        </button>
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">Disconnect</button>
      </div>

      <!-- Main Content -->
      <div class="contacts-layout">
        <!-- Sidebar: Groups -->
        <div class="sidebar">
          <h4>Groups</h4>
          <div class="groups-list">
            <button
              v-for="group in groups"
              :key="group"
              class="group-btn"
              :class="{ active: selectedGroup === group }"
              @click="selectGroup(group)"
            >
              {{ group }}
              <span class="count">{{ getGroupCount(group) }}</span>
            </button>
          </div>
          <div class="add-group">
            <input
              v-model="newGroupName"
              type="text"
              placeholder="New group name"
              @keyup.enter="addGroup"
            />
            <button
              class="btn btn-sm btn-primary"
              @click="addGroup"
              :disabled="!newGroupName.trim()"
            >
              +
            </button>
          </div>
        </div>

        <!-- Main: Contacts List -->
        <div class="main-content">
          <!-- Search & Add -->
          <div class="toolbar">
            <div class="search-box">
              <input v-model="searchQuery" type="text" placeholder="Search contacts..." />
            </div>
            <button class="btn btn-primary" @click="showAddDialog">+ Add Contact</button>
          </div>

          <!-- Contacts List -->
          <div v-if="filteredContacts.length === 0" class="empty-state">
            <p>No contacts found</p>
            <p class="info-text">
              {{
                searchQuery
                  ? 'Try a different search term.'
                  : 'Add your first contact to get started.'
              }}
            </p>
          </div>

          <div v-else class="contacts-list">
            <div v-for="contact in filteredContacts" :key="contact.id" class="contact-card">
              <div class="contact-avatar">
                {{ getInitials(contact.name) }}
              </div>
              <div class="contact-info">
                <div class="contact-name">{{ contact.name }}</div>
                <div class="contact-number">{{ contact.number }}</div>
                <div v-if="contact.email" class="contact-email">{{ contact.email }}</div>
                <div v-if="contact.company" class="contact-company">{{ contact.company }}</div>
              </div>
              <div class="contact-group">
                <span class="group-badge">{{ contact.group || 'Default' }}</span>
              </div>
              <div class="contact-actions">
                <button class="btn btn-sm btn-icon" title="Call" @click="handleCall(contact)">
                  Call
                </button>
                <button class="btn btn-sm btn-icon" title="Edit" @click="editContact(contact)">
                  Edit
                </button>
                <button
                  class="btn btn-sm btn-icon btn-danger"
                  title="Delete"
                  @click="confirmDelete(contact)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Contact Dialog -->
      <div v-if="showContactDialog" class="dialog-overlay" @click.self="closeDialog">
        <div class="dialog">
          <h3>{{ editingContact ? 'Edit Contact' : 'Add Contact' }}</h3>

          <div class="form-group">
            <label>Name *</label>
            <input v-model="contactForm.name" type="text" placeholder="John Doe" />
          </div>

          <div class="form-group">
            <label>Phone Number *</label>
            <input v-model="contactForm.number" type="tel" placeholder="+1234567890" />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input v-model="contactForm.email" type="email" placeholder="john@example.com" />
          </div>

          <div class="form-group">
            <label>Company</label>
            <input v-model="contactForm.company" type="text" placeholder="Acme Corp" />
          </div>

          <div class="form-group">
            <label>Group</label>
            <select v-model="contactForm.group">
              <option v-for="group in groups" :key="group" :value="group">
                {{ group }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="contactForm.notes" placeholder="Additional notes..."></textarea>
          </div>

          <div class="dialog-actions">
            <button class="btn btn-primary" :disabled="!isFormValid || saving" @click="saveContact">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
            <button class="btn btn-secondary" @click="closeDialog">Cancel</button>
          </div>

          <div v-if="formError" class="error-message">
            {{ formError }}
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <div v-if="deleteTarget" class="dialog-overlay" @click.self="cancelDelete">
        <div class="dialog">
          <h3>Delete Contact</h3>
          <p>
            Are you sure you want to delete <strong>{{ deleteTarget.name }}</strong
            >?
          </p>
          <div class="dialog-actions">
            <button class="btn btn-danger" @click="handleDelete">Delete</button>
            <button class="btn btn-secondary" @click="cancelDelete">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch as _watch } from 'vue'
import { useAmi, useAmiDatabase } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import type { AmiContact } from '../../src/types/ami.types'

// AMI Configuration
const amiConfig = ref({ url: '' })
const connecting = ref(false)
const connectionError = ref('')

// UI State
const searchQuery = ref('')
const selectedGroup = ref<string | null>(null)
const showContactDialog = ref(false)
const editingContact = ref<AmiContact | null>(null)
const deleteTarget = ref<AmiContact | null>(null)
const saving = ref(false)
const formError = ref('')
const newGroupName = ref('')
const importInput = ref<HTMLInputElement | null>(null)

// Contact Form
const contactForm = ref({
  name: '',
  number: '',
  email: '',
  company: '',
  group: 'Default',
  notes: '',
})

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Client
const {
  connect: amiConnect,
  disconnect: amiDisconnect,
  isConnected: realIsAmiConnected,
  getClient,
} = useAmi()

// Effective values for simulation
const isAmiConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsAmiConnected.value
)

// Database composable
const dbComposable = ref<ReturnType<typeof useAmiDatabase> | null>(null)

// Computed
const contactCount = computed(() => dbComposable.value?.contactCount.value ?? 0)
const groups = computed(() => dbComposable.value?.groups.value ?? ['Default'])
const contactList = computed(() => dbComposable.value?.contactList.value ?? [])

const filteredContacts = computed(() => {
  let result = contactList.value

  // Filter by group
  if (selectedGroup.value) {
    result = result.filter((c) => c.group === selectedGroup.value)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.number?.includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query)
    )
  }

  return result
})

const isFormValid = computed(() => {
  return contactForm.value.name.trim() && contactForm.value.number.trim()
})

// Helpers
const getInitials = (name: string): string => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getGroupCount = (group: string): number => {
  return contactList.value.filter((c) => (c.group || 'Default') === group).length
}

// Handlers
async function handleConnect() {
  if (!amiConfig.value.url) return

  connecting.value = true
  connectionError.value = ''

  try {
    await amiConnect({ url: amiConfig.value.url })

    const client = getClient()
    if (client) {
      dbComposable.value = useAmiDatabase(client, {
        contactFamily: 'contacts',
        groups: ['Default', 'VIP', 'Work', 'Personal'],
        onContactSaved: (contact) => {
          console.log('Contact saved:', contact.name)
        },
        onContactDeleted: (contact) => {
          console.log('Contact deleted:', contact.name)
        },
      })

      // Note: For demo purposes, we don't call refresh() since
      // AstDB doesn't support listing keys natively
      // In production, you'd need to track keys separately
    }

    localStorage.setItem('vuesip-ami-url', amiConfig.value.url)
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

function handleDisconnect() {
  amiDisconnect()
  dbComposable.value = null
}

function selectGroup(group: string | null) {
  selectedGroup.value = selectedGroup.value === group ? null : group
}

function addGroup() {
  if (!newGroupName.value.trim() || !dbComposable.value) return
  dbComposable.value.addGroup(newGroupName.value.trim())
  newGroupName.value = ''
}

function showAddDialog() {
  editingContact.value = null
  contactForm.value = {
    name: '',
    number: '',
    email: '',
    company: '',
    group: selectedGroup.value || 'Default',
    notes: '',
  }
  formError.value = ''
  showContactDialog.value = true
}

function editContact(contact: AmiContact) {
  editingContact.value = contact
  contactForm.value = {
    name: contact.name || '',
    number: contact.number || '',
    email: contact.email || '',
    company: contact.company || '',
    group: contact.group || 'Default',
    notes: contact.notes || '',
  }
  formError.value = ''
  showContactDialog.value = true
}

function closeDialog() {
  showContactDialog.value = false
  editingContact.value = null
  formError.value = ''
}

async function saveContact() {
  if (!dbComposable.value || !isFormValid.value) return

  saving.value = true
  formError.value = ''

  try {
    await dbComposable.value.saveContact({
      id: editingContact.value?.id,
      name: contactForm.value.name.trim(),
      number: contactForm.value.number.trim(),
      email: contactForm.value.email.trim() || undefined,
      company: contactForm.value.company.trim() || undefined,
      group: contactForm.value.group,
      notes: contactForm.value.notes.trim() || undefined,
    })

    closeDialog()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to save contact'
  } finally {
    saving.value = false
  }
}

function confirmDelete(contact: AmiContact) {
  deleteTarget.value = contact
}

function cancelDelete() {
  deleteTarget.value = null
}

async function handleDelete() {
  if (!dbComposable.value || !deleteTarget.value) return

  try {
    await dbComposable.value.deleteContact(deleteTarget.value.id)
  } catch (err) {
    console.error('Delete failed:', err)
  } finally {
    deleteTarget.value = null
  }
}

function handleCall(contact: AmiContact) {
  // In a real app, this would integrate with useAmiCalls
  alert(`Calling ${contact.name} at ${contact.number}`)
}

function handleExport() {
  if (!dbComposable.value) return

  const contacts = dbComposable.value.exportContacts()
  const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contacts-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importInput.value?.click()
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !dbComposable.value) return

  try {
    const text = await file.text()
    const contacts = JSON.parse(text) as Array<{
      name: string
      number: string
      [key: string]: unknown
    }>

    const imported = await dbComposable.value.importContacts(contacts)
    alert(`Successfully imported ${imported.length} contacts`)
  } catch (err) {
    alert(`Import failed: ${err instanceof Error ? err.message : 'Invalid JSON file'}`)
  } finally {
    // Reset input
    input.value = ''
  }
}

// Load saved settings
onMounted(() => {
  const savedUrl = localStorage.getItem('vuesip-ami-url')
  if (savedUrl) {
    amiConfig.value.url = savedUrl
  }
})
</script>

<style scoped>
.contacts-demo {
  max-width: 1100px;
  margin: 0 auto;
}

.config-panel {
  padding: 2rem;
}

.config-panel h3 {
  margin-bottom: 1rem;
  color: #333;
}

.info-text {
  margin-bottom: 1.5rem;
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: #667eea;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}
.btn-secondary {
  background: #6b7280;
  color: white;
}
.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}
.btn-danger {
  background: #ef4444;
  color: white;
}
.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}
.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
.btn-icon {
  padding: 0.5rem;
  min-width: 36px;
  background: #f3f4f6;
  color: #374151;
}
.btn-icon:hover {
  background: #e5e7eb;
}
.btn-icon.btn-danger {
  background: #fee2e2;
  color: #991b1b;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 0.875rem;
}

/* Connected Interface */
.connected-interface {
  padding: 2rem;
}

.status-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.connected {
  background: #10b981;
}

/* Layout */
.contacts-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 2rem;
}

/* Sidebar */
.sidebar {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  height: fit-content;
}

.sidebar h4 {
  margin-bottom: 1rem;
  color: #374151;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.group-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.group-btn:hover {
  background: #f3f4f6;
}

.group-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.group-btn .count {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.add-group {
  display: flex;
  gap: 0.5rem;
}

.add-group input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

/* Main Content */
.main-content {
  min-width: 0;
}

.toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-box {
  flex: 1;
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

/* Contacts List */
.empty-state {
  padding: 3rem;
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  color: #6b7280;
}

.empty-state p:first-child {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.contact-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.contact-avatar {
  width: 48px;
  height: 48px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.contact-number {
  color: #667eea;
  font-size: 0.875rem;
}

.contact-email,
.contact-company {
  color: #6b7280;
  font-size: 0.75rem;
}

.contact-group {
  padding: 0 1rem;
}

.group-badge {
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #374151;
}

.contact-actions {
  display: flex;
  gap: 0.5rem;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog h3 {
  margin-bottom: 1.5rem;
}

.dialog p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .contacts-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: 2;
  }

  .toolbar {
    flex-direction: column;
  }

  .contact-card {
    flex-wrap: wrap;
  }

  .contact-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
}
</style>
