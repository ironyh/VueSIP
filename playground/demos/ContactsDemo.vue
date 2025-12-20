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

    <!-- Main Demo Card -->
    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">📇</span>
          <div>
            <h2>Contacts/Phonebook Demo</h2>
            <p class="demo-subtitle">
              Manage contacts stored in Asterisk's internal database (AstDB)
            </p>
          </div>
        </div>
      </template>

      <template #content>
        <!-- Configuration Panel -->
        <Panel v-if="!isAmiConnected" header="AMI Configuration" class="config-panel">
          <Message severity="info" :closable="false" class="info-message">
            Contacts are stored server-side and accessible from any device.
          </Message>

          <div class="form-group">
            <label for="ami-url">AMI WebSocket URL</label>
            <InputText
              id="ami-url"
              v-model="amiConfig.url"
              placeholder="ws://pbx.example.com:8080"
              :disabled="connecting"
              class="w-full"
            />
            <small>amiws WebSocket proxy URL</small>
          </div>

          <Button
            label="Connect to AMI"
            icon="pi pi-link"
            :loading="connecting"
            :disabled="!amiConfig.url"
            @click="handleConnect"
            class="connect-btn"
          />

          <Message v-if="connectionError" severity="error" :closable="false" class="mt-3">
            {{ connectionError }}
          </Message>
        </Panel>

        <!-- Connected Interface -->
        <div v-else class="connected-interface">
          <!-- Status Toolbar -->
          <div class="status-toolbar">
            <div class="status-items">
              <div class="status-item">
                <span class="status-indicator connected"></span>
                <span>AMI Connected</span>
              </div>
              <Divider layout="vertical" />
              <div class="status-item">
                <i class="pi pi-users"></i>
                <span>{{ contactCount }} Contacts</span>
              </div>
              <Divider layout="vertical" />
              <div class="status-item">
                <i class="pi pi-tag"></i>
                <span>{{ groups.length }} Groups</span>
              </div>
            </div>
            <div class="status-actions">
              <Button
                label="Export"
                icon="pi pi-download"
                severity="secondary"
                size="small"
                @click="handleExport"
              />
              <input
                ref="importInput"
                type="file"
                accept=".json"
                style="display: none"
                @change="handleImportFile"
              />
              <Button
                label="Import"
                icon="pi pi-upload"
                severity="secondary"
                size="small"
                @click="triggerImport"
              />
              <Button
                label="Disconnect"
                icon="pi pi-times"
                severity="danger"
                size="small"
                @click="handleDisconnect"
              />
            </div>
          </div>

          <Divider />

          <!-- Main Content Grid -->
          <div class="contacts-layout">
            <!-- Sidebar: Groups -->
            <Card class="groups-sidebar">
              <template #title>
                <div class="sidebar-header">
                  <i class="pi pi-tag"></i>
                  <span>Groups</span>
                </div>
              </template>
              <template #content>
                <div class="groups-list">
                  <Button
                    v-for="group in groups"
                    :key="group"
                    :label="group"
                    :severity="selectedGroup === group ? 'primary' : 'secondary'"
                    :outlined="selectedGroup !== group"
                    size="small"
                    class="group-btn"
                    @click="selectGroup(group)"
                  >
                    <template #default>
                      <span class="group-label">{{ group }}</span>
                      <Tag
                        :value="getGroupCount(group).toString()"
                        severity="secondary"
                        class="group-count"
                      />
                    </template>
                  </Button>
                </div>

                <Divider />

                <div class="add-group">
                  <InputText
                    v-model="newGroupName"
                    placeholder="New group name"
                    size="small"
                    class="flex-1"
                    @keyup.enter="addGroup"
                  />
                  <Button
                    icon="pi pi-plus"
                    size="small"
                    :disabled="!newGroupName.trim()"
                    @click="addGroup"
                  />
                </div>
              </template>
            </Card>

            <!-- Main: Contacts List -->
            <div class="main-content">
              <!-- Search & Add Toolbar -->
              <div class="toolbar">
                <div class="search-box">
                  <span class="p-input-icon-left w-full">
                    <i class="pi pi-search" ></i>
                    <InputText
                      v-model="searchQuery"
                      placeholder="Search contacts..."
                      class="w-full"
                    />
                  </span>
                </div>
                <Button
                  label="Add Contact"
                  icon="pi pi-plus"
                  @click="showAddDialog"
                  class="add-contact-btn"
                />
              </div>

              <!-- Empty State -->
              <div v-if="filteredContacts.length === 0" class="empty-state">
                <i class="pi pi-users empty-icon"></i>
                <h3>No Contacts Found</h3>
                <p class="empty-text">
                  {{
                    searchQuery
                      ? 'Try a different search term.'
                      : 'Add your first contact to get started.'
                  }}
                </p>
              </div>

              <!-- Contacts List -->
              <div v-else class="contacts-list">
                <Card
                  v-for="contact in filteredContacts"
                  :key="contact.id"
                  class="contact-card"
                >
                  <template #content>
                    <div class="contact-card-content">
                      <div class="contact-avatar">
                        {{ getInitials(contact.name) }}
                      </div>

                      <div class="contact-info">
                        <div class="contact-name">{{ contact.name }}</div>
                        <div class="contact-number">
                          <i class="pi pi-phone"></i>
                          {{ contact.number }}
                        </div>
                        <div v-if="contact.email" class="contact-detail">
                          <i class="pi pi-envelope"></i>
                          {{ contact.email }}
                        </div>
                        <div v-if="contact.company" class="contact-detail">
                          <i class="pi pi-building"></i>
                          {{ contact.company }}
                        </div>
                      </div>

                      <div class="contact-group">
                        <Tag
                          :value="contact.group || 'Default'"
                          severity="secondary"
                          icon="pi pi-tag"
                        />
                      </div>

                      <div class="contact-actions">
                        <Button
                          icon="pi pi-phone"
                          severity="success"
                          size="small"
                          rounded
                          text
                          v-tooltip.top="'Call'"
                          @click="handleCall(contact)"
                        />
                        <Button
                          icon="pi pi-pencil"
                          severity="info"
                          size="small"
                          rounded
                          text
                          v-tooltip.top="'Edit'"
                          @click="editContact(contact)"
                        />
                        <Button
                          icon="pi pi-trash"
                          severity="danger"
                          size="small"
                          rounded
                          text
                          v-tooltip.top="'Delete'"
                          @click="confirmDelete(contact)"
                        />
                      </div>
                    </div>
                  </template>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Add/Edit Contact Dialog -->
    <Dialog
      v-model:visible="showContactDialog"
      :header="editingContact ? 'Edit Contact' : 'Add Contact'"
      :modal="true"
      :closable="true"
      :draggable="false"
      class="contact-dialog"
      @hide="closeDialog"
    >
      <div class="dialog-content">
        <div class="form-group">
          <label for="contact-name">Name *</label>
          <InputText
            id="contact-name"
            v-model="contactForm.name"
            placeholder="John Doe"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label for="contact-number">Phone Number *</label>
          <InputText
            id="contact-number"
            v-model="contactForm.number"
            type="tel"
            placeholder="+1234567890"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label for="contact-email">Email</label>
          <InputText
            id="contact-email"
            v-model="contactForm.email"
            type="email"
            placeholder="john@example.com"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label for="contact-company">Company</label>
          <InputText
            id="contact-company"
            v-model="contactForm.company"
            placeholder="Acme Corp"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label for="contact-group">Group</label>
          <Dropdown
            id="contact-group"
            v-model="contactForm.group"
            :options="groups"
            placeholder="Select a group"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label for="contact-notes">Notes</label>
          <Textarea
            id="contact-notes"
            v-model="contactForm.notes"
            placeholder="Additional notes..."
            rows="3"
            class="w-full"
          />
        </div>

        <Message v-if="formError" severity="error" :closable="false" class="mt-2">
          {{ formError }}
        </Message>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="closeDialog"
        />
        <Button
          :label="saving ? 'Saving...' : 'Save'"
          :loading="saving"
          :disabled="!isFormValid || saving"
          @click="saveContact"
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Delete Contact"
      :modal="true"
      :closable="true"
      :draggable="false"
      class="delete-dialog"
    >
      <div class="dialog-content">
        <Message severity="warn" :closable="false">
          <p>
            Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong>?
          </p>
          <p class="mt-2">This action cannot be undone.</p>
        </Message>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="cancelDelete" />
        <Button label="Delete" severity="danger" @click="handleDelete" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch as _watch } from 'vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
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
const showDeleteDialog = computed(() => deleteTarget.value !== null)
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

/* Configuration Panel */
.config-panel {
  margin-top: 1rem;
}

.info-message {
  margin-bottom: 1.5rem;
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

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.connect-btn {
  width: 100%;
}

/* Connected Interface */
.connected-interface {
  margin-top: 1rem;
}

.status-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
  border-radius: 10px;
  margin-bottom: 1.5rem;
}

.status-items {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-color);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--red-500);
  box-shadow: 0 0 8px var(--red-500);
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background: var(--green-500);
  box-shadow: 0 0 8px var(--green-500);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Layout */
.contacts-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
}

/* Groups Sidebar */
.groups-sidebar {
  height: fit-content;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  text-align: left;
}

.group-label {
  flex: 1;
}

.group-count {
  margin-left: auto;
}

.add-group {
  display: flex;
  gap: 0.5rem;
}

.flex-1 {
  flex: 1;
}

/* Main Content */
.main-content {
  min-width: 0;
}

.toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.search-box {
  flex: 1;
}

.add-contact-btn {
  flex-shrink: 0;
}

/* Empty State */
.empty-state {
  padding: 4rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
  border: 2px dashed var(--surface-300);
  border-radius: 12px;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 4rem;
  color: var(--surface-400);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.empty-text {
  margin: 0;
  font-size: 0.875rem;
}

/* Contacts List */
.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-card {
  transition: all 0.2s ease;
}

.contact-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.contact-card-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.contact-avatar {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--primary-400) 0%, var(--primary-600) 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.125rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.contact-number {
  color: var(--primary-500);
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
}

.contact-detail {
  color: var(--text-color-secondary);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.125rem;
}

.contact-group {
  padding: 0 0.75rem;
  flex-shrink: 0;
}

.contact-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* Dialog */
.contact-dialog,
.delete-dialog {
  max-width: 500px;
  width: 90%;
}

.dialog-content {
  padding: 1rem 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .contacts-layout {
    grid-template-columns: 1fr;
  }

  .groups-sidebar {
    order: 2;
  }
}

@media (max-width: 768px) {
  .status-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .status-items {
    justify-content: center;
  }

  .status-actions {
    justify-content: center;
  }

  .toolbar {
    flex-direction: column;
  }

  .contact-card-content {
    flex-wrap: wrap;
  }

  .contact-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
}

.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-3 {
  margin-top: 1rem;
}
</style>
