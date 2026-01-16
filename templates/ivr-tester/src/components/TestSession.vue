<script setup lang="ts">
/**
 * TestSession - Test session management component
 *
 * Handles starting/stopping tests, loading saved sessions,
 * and exporting results.
 */
import { ref, computed } from 'vue'
import type { IvrSession, ExportFormat } from '@/composables/useIvrTester'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Textarea from 'primevue/textarea'

interface Props {
  /** Current session */
  currentSession: IvrSession | null
  /** Saved sessions */
  savedSessions: IvrSession[]
  /** Whether a test is active */
  isTestActive: boolean
  /** Whether call is connected */
  isCallActive: boolean
  /** Call status message */
  callStatus: string
  /** Call duration in seconds */
  callDuration: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Start new test */
  (e: 'start-test', targetNumber: string, sessionName?: string): void
  /** End current test */
  (e: 'end-test'): void
  /** Load a session */
  (e: 'load-session', sessionId: string): void
  /** Delete a session */
  (e: 'delete-session', sessionId: string): void
  /** Export session */
  (e: 'export-session', format: ExportFormat, sessionId?: string): void
  /** Import session */
  (e: 'import-session', jsonData: string): void
  /** Clear all sessions */
  (e: 'clear-all-sessions'): void
  /** Add session note */
  (e: 'add-note', note: string): void
}>()

// Local state
const showNewTestDialog = ref(false)
const showSessionsDialog = ref(false)
const showExportDialog = ref(false)
const showImportDialog = ref(false)
const showNotesDialog = ref(false)

const newTestNumber = ref('')
const newTestName = ref('')
const importData = ref('')
const exportFormat = ref<ExportFormat>('markdown')
const sessionNotes = ref('')

const exportFormats = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
]

// Computed
const hasCurrentSession = computed(() => props.currentSession !== null)

/**
 * Format duration for display
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Open new test dialog
 */
function openNewTestDialog(): void {
  newTestNumber.value = ''
  newTestName.value = ''
  showNewTestDialog.value = true
}

/**
 * Start new test
 */
function handleStartTest(): void {
  if (newTestNumber.value.trim()) {
    emit('start-test', newTestNumber.value.trim(), newTestName.value.trim() || undefined)
    showNewTestDialog.value = false
  }
}

/**
 * End current test
 */
function handleEndTest(): void {
  emit('end-test')
}

/**
 * Load session
 */
function handleLoadSession(session: IvrSession): void {
  emit('load-session', session.id)
  showSessionsDialog.value = false
}

/**
 * Delete session
 */
function handleDeleteSession(session: IvrSession): void {
  if (confirm(`Delete session "${session.name}"?`)) {
    emit('delete-session', session.id)
  }
}

/**
 * Export current session
 */
function handleExport(): void {
  emit('export-session', exportFormat.value, props.currentSession?.id)
  showExportDialog.value = false
}

/**
 * Import session from JSON
 */
function handleImport(): void {
  if (importData.value.trim()) {
    emit('import-session', importData.value.trim())
    showImportDialog.value = false
    importData.value = ''
  }
}

/**
 * Open notes dialog
 */
function openNotesDialog(): void {
  sessionNotes.value = props.currentSession?.notes ?? ''
  showNotesDialog.value = true
}

/**
 * Save session notes
 */
function handleSaveNotes(): void {
  emit('add-note', sessionNotes.value)
  showNotesDialog.value = false
}

/**
 * Clear all sessions
 */
function handleClearAll(): void {
  if (confirm('Delete all saved sessions? This cannot be undone.')) {
    emit('clear-all-sessions')
  }
}
</script>

<template>
  <div class="test-session">
    <!-- Current Session Info -->
    <div v-if="hasCurrentSession" class="current-session">
      <div class="session-info">
        <div class="session-header">
          <h3>{{ currentSession?.name }}</h3>
          <span class="session-status" :class="{ active: isCallActive }">
            <span class="status-dot" />
            {{ callStatus }}
          </span>
        </div>

        <div class="session-details">
          <div class="detail">
            <i class="pi pi-phone" />
            <span>{{ currentSession?.targetNumber }}</span>
          </div>
          <div class="detail">
            <i class="pi pi-clock" />
            <span>{{ formatDuration(callDuration) }}</span>
          </div>
          <div class="detail">
            <i class="pi pi-th-large" />
            <span>{{ currentSession?.dtmfHistory.length ?? 0 }} DTMF</span>
          </div>
        </div>
      </div>

      <div class="session-actions">
        <Button
          v-if="isTestActive"
          label="End Test"
          icon="pi pi-stop-circle"
          class="p-button-danger"
          @click="handleEndTest"
        />
        <Button
          v-else
          label="New Test"
          icon="pi pi-play"
          class="p-button-success"
          @click="openNewTestDialog"
        />
        <Button
          icon="pi pi-file-edit"
          class="p-button-text"
          title="Session Notes"
          @click="openNotesDialog"
        />
        <Button
          icon="pi pi-download"
          class="p-button-text"
          title="Export"
          @click="showExportDialog = true"
        />
      </div>
    </div>

    <!-- No Session State -->
    <div v-else class="no-session">
      <div class="no-session-content">
        <i class="pi pi-phone" />
        <h3>No Active Test</h3>
        <p>Start a new test to call an IVR system</p>
        <Button
          label="New Test"
          icon="pi pi-play"
          class="p-button-success"
          @click="openNewTestDialog"
        />
      </div>
    </div>

    <!-- Quick Actions Bar -->
    <div class="quick-actions">
      <Button
        label="Sessions"
        icon="pi pi-folder-open"
        class="p-button-outlined p-button-sm"
        :badge="savedSessions.length.toString()"
        badge-class="p-badge-info"
        @click="showSessionsDialog = true"
      />
      <Button
        label="Import"
        icon="pi pi-upload"
        class="p-button-outlined p-button-sm"
        @click="showImportDialog = true"
      />
    </div>

    <!-- New Test Dialog -->
    <Dialog
      v-model:visible="showNewTestDialog"
      header="Start New IVR Test"
      :style="{ width: '400px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-field">
          <label for="target-number">Phone Number *</label>
          <InputText
            id="target-number"
            v-model="newTestNumber"
            placeholder="+1 555 123 4567"
            class="w-full"
            autofocus
          />
          <small>Enter the IVR phone number to test</small>
        </div>

        <div class="form-field">
          <label for="session-name">Session Name</label>
          <InputText
            id="session-name"
            v-model="newTestName"
            placeholder="e.g., Customer Service IVR"
            class="w-full"
          />
          <small>Optional name for this test session</small>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showNewTestDialog = false" />
        <Button
          label="Start Test"
          icon="pi pi-play"
          class="p-button-success"
          :disabled="!newTestNumber.trim()"
          @click="handleStartTest"
        />
      </template>
    </Dialog>

    <!-- Sessions Dialog -->
    <Dialog
      v-model:visible="showSessionsDialog"
      header="Saved Sessions"
      :style="{ width: '600px' }"
      modal
    >
      <div v-if="savedSessions.length === 0" class="empty-sessions">
        <i class="pi pi-folder-open" />
        <p>No saved sessions yet</p>
      </div>

      <DataTable v-else :value="savedSessions" responsive-layout="scroll" class="sessions-table">
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="session-name-cell">
              <span class="name">{{ data.name }}</span>
              <span class="number">{{ data.targetNumber }}</span>
            </div>
          </template>
        </Column>

        <Column field="startTime" header="Date" sortable>
          <template #body="{ data }">
            {{ formatDate(data.startTime) }}
          </template>
        </Column>

        <Column field="dtmfHistory" header="DTMF">
          <template #body="{ data }">
            {{ data.dtmfHistory.length }}
          </template>
        </Column>

        <Column header="Actions" :style="{ width: '120px' }">
          <template #body="{ data }">
            <div class="table-actions">
              <Button
                icon="pi pi-folder-open"
                class="p-button-text p-button-sm"
                title="Load"
                @click="handleLoadSession(data)"
              />
              <Button
                icon="pi pi-trash"
                class="p-button-text p-button-sm p-button-danger"
                title="Delete"
                @click="handleDeleteSession(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <template #footer>
        <Button
          v-if="savedSessions.length > 0"
          label="Clear All"
          icon="pi pi-trash"
          class="p-button-danger p-button-text"
          @click="handleClearAll"
        />
        <Button label="Close" class="p-button-text" @click="showSessionsDialog = false" />
      </template>
    </Dialog>

    <!-- Export Dialog -->
    <Dialog
      v-model:visible="showExportDialog"
      header="Export Session"
      :style="{ width: '350px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-field">
          <label for="export-format">Format</label>
          <Dropdown
            id="export-format"
            v-model="exportFormat"
            :options="exportFormats"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showExportDialog = false" />
        <Button label="Export" icon="pi pi-download" @click="handleExport" />
      </template>
    </Dialog>

    <!-- Import Dialog -->
    <Dialog
      v-model:visible="showImportDialog"
      header="Import Session"
      :style="{ width: '500px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-field">
          <label for="import-data">Session JSON</label>
          <Textarea
            id="import-data"
            v-model="importData"
            rows="10"
            class="w-full"
            placeholder="Paste session JSON here..."
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showImportDialog = false" />
        <Button
          label="Import"
          icon="pi pi-upload"
          :disabled="!importData.trim()"
          @click="handleImport"
        />
      </template>
    </Dialog>

    <!-- Notes Dialog -->
    <Dialog
      v-model:visible="showNotesDialog"
      header="Session Notes"
      :style="{ width: '500px' }"
      modal
    >
      <div class="dialog-form">
        <Textarea
          v-model="sessionNotes"
          rows="8"
          class="w-full"
          placeholder="Add notes about this test session..."
          autofocus
        />
      </div>

      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showNotesDialog = false" />
        <Button label="Save" icon="pi pi-check" @click="handleSaveNotes" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.test-session {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.current-session {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-200);
}

.session-info {
  flex: 1;
}

.session-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.session-header h3 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text-color);
}

.session-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  padding: 4px 8px;
  background: var(--surface-100);
  border-radius: 4px;
}

.session-status.active {
  color: var(--green-600);
  background: var(--green-50);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.session-status.active .status-dot {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.session-details {
  display: flex;
  gap: 16px;
}

.detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.detail i {
  font-size: 0.75rem;
  color: var(--primary-500);
}

.session-actions {
  display: flex;
  gap: 8px;
}

.no-session {
  padding: 48px 24px;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px dashed var(--surface-300);
}

.no-session-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.no-session-content i {
  font-size: 3rem;
  color: var(--text-color-secondary);
  opacity: 0.5;
  margin-bottom: 16px;
}

.no-session-content h3 {
  margin: 0 0 8px;
  color: var(--text-color);
}

.no-session-content p {
  margin: 0 0 16px;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
}

.form-field small {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.w-full {
  width: 100%;
}

.empty-sessions {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  color: var(--text-color-secondary);
}

.empty-sessions i {
  font-size: 2rem;
  margin-bottom: 8px;
  opacity: 0.5;
}

.sessions-table {
  margin-top: 8px;
}

.session-name-cell {
  display: flex;
  flex-direction: column;
}

.session-name-cell .name {
  font-weight: 500;
  color: var(--text-color);
}

.session-name-cell .number {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.table-actions {
  display: flex;
  gap: 4px;
}
</style>
