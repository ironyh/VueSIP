<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'

const props = defineProps<{
  callState: string
  isOnHold: boolean
  isMuted: boolean
  remoteUri: string
  remoteDisplayName: string
  duration: number
  agentState: string
}>()

const emit = defineEmits<{
  answer: []
  hangup: []
  hold: []
  unhold: []
  mute: []
  unmute: []
  transfer: [target: string]
  dial: [number: string]
  dtmf: [digit: string]
  disposition: [code: string, notes: string]
  clearWrapUp: []
}>()

const dialNumber = ref('')
const showTransferDialog = ref(false)
const transferTarget = ref('')
const showDispositionDialog = ref(false)
const dispositionCode = ref('')
const dispositionNotes = ref('')

const dispositionCodes = [
  { label: 'Resolved', value: 'resolved' },
  { label: 'Follow-up Required', value: 'followup' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Customer Callback', value: 'callback' },
  { label: 'No Answer', value: 'no-answer' },
  { label: 'Wrong Number', value: 'wrong-number' },
]

const isRinging = computed(() => props.callState === 'ringing')
const isActive = computed(() => props.callState === 'active' || props.callState === 'held')
const isCalling = computed(() => props.callState === 'calling')
const isWrapUp = computed(() => props.agentState === 'wrap-up')

const displayName = computed(() =>
  props.remoteDisplayName || props.remoteUri || 'Unknown Caller'
)

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleDial() {
  if (dialNumber.value) {
    emit('dial', dialNumber.value)
    dialNumber.value = ''
  }
}

function handleDTMF(digit: string) {
  emit('dtmf', digit)
}

function handleTransfer() {
  if (transferTarget.value) {
    emit('transfer', transferTarget.value)
    showTransferDialog.value = false
    transferTarget.value = ''
  }
}

function handleDisposition() {
  if (dispositionCode.value) {
    emit('disposition', dispositionCode.value, dispositionNotes.value)
    emit('clearWrapUp')
    showDispositionDialog.value = false
    dispositionCode.value = ''
    dispositionNotes.value = ''
  }
}

function skipDisposition() {
  emit('clearWrapUp')
}

const dtmfKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
</script>

<template>
  <div class="call-panel">
    <!-- Idle State - Dial Pad -->
    <div v-if="callState === 'idle' && agentState === 'available'" class="dial-section">
      <div class="dial-input">
        <InputText
          v-model="dialNumber"
          placeholder="Enter number to dial"
          class="w-full"
          @keyup.enter="handleDial"
        />
        <Button
          icon="pi pi-phone"
          class="p-button-success"
          :disabled="!dialNumber"
          @click="handleDial"
        />
      </div>
    </div>

    <!-- Incoming Call -->
    <div v-else-if="isRinging" class="incoming-call">
      <div class="caller-info">
        <i class="pi pi-phone incoming-icon" />
        <div class="caller-details">
          <span class="caller-name">{{ displayName }}</span>
          <span class="caller-number">{{ remoteUri }}</span>
        </div>
      </div>
      <div class="call-actions">
        <Button
          icon="pi pi-phone"
          label="Answer"
          class="p-button-success p-button-lg"
          @click="emit('answer')"
        />
        <Button
          icon="pi pi-phone"
          label="Reject"
          class="p-button-danger p-button-lg"
          @click="emit('hangup')"
        />
      </div>
    </div>

    <!-- Active Call -->
    <div v-else-if="isActive || isCalling" class="active-call">
      <div class="call-info">
        <span class="caller-name">{{ displayName }}</span>
        <span class="call-duration">{{ formatDuration(duration) }}</span>
        <span v-if="isOnHold" class="hold-indicator">ON HOLD</span>
      </div>

      <!-- Call Controls -->
      <div class="call-controls">
        <Button
          :icon="isMuted ? 'pi pi-microphone-slash' : 'pi pi-microphone'"
          :class="isMuted ? 'p-button-warning' : 'p-button-secondary'"
          class="p-button-rounded"
          @click="isMuted ? emit('unmute') : emit('mute')"
        />
        <Button
          :icon="isOnHold ? 'pi pi-play' : 'pi pi-pause'"
          :class="isOnHold ? 'p-button-success' : 'p-button-secondary'"
          class="p-button-rounded"
          @click="isOnHold ? emit('unhold') : emit('hold')"
        />
        <Button
          icon="pi pi-arrow-right-arrow-left"
          class="p-button-secondary p-button-rounded"
          @click="showTransferDialog = true"
        />
        <Button
          icon="pi pi-phone"
          class="p-button-danger p-button-rounded p-button-lg"
          @click="emit('hangup')"
        />
      </div>

      <!-- DTMF Pad -->
      <div class="dtmf-pad">
        <Button
          v-for="key in dtmfKeys"
          :key="key"
          :label="key"
          class="p-button-outlined dtmf-key"
          @click="handleDTMF(key)"
        />
      </div>
    </div>

    <!-- Wrap-up State -->
    <div v-else-if="isWrapUp" class="wrap-up">
      <div class="wrap-up-header">
        <i class="pi pi-file-edit" />
        <span>Call Disposition</span>
      </div>
      <p>Complete call notes for {{ displayName }}</p>
      <div class="wrap-up-actions">
        <Button
          label="Add Disposition"
          icon="pi pi-check"
          class="p-button-primary"
          @click="showDispositionDialog = true"
        />
        <Button
          label="Skip"
          class="p-button-text"
          @click="skipDisposition"
        />
      </div>
    </div>

    <!-- Transfer Dialog -->
    <Dialog
      v-model:visible="showTransferDialog"
      header="Transfer Call"
      :style="{ width: '300px' }"
      modal
    >
      <div class="transfer-form">
        <label for="transfer-target">Transfer to:</label>
        <InputText
          id="transfer-target"
          v-model="transferTarget"
          placeholder="Enter extension or number"
          class="w-full"
        />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          class="p-button-text"
          @click="showTransferDialog = false"
        />
        <Button
          label="Transfer"
          icon="pi pi-arrow-right-arrow-left"
          :disabled="!transferTarget"
          @click="handleTransfer"
        />
      </template>
    </Dialog>

    <!-- Disposition Dialog -->
    <Dialog
      v-model:visible="showDispositionDialog"
      header="Call Disposition"
      :style="{ width: '400px' }"
      modal
    >
      <div class="disposition-form">
        <div class="form-field">
          <label for="disposition-code">Disposition Code</label>
          <Dropdown
            id="disposition-code"
            v-model="dispositionCode"
            :options="dispositionCodes"
            option-label="label"
            option-value="value"
            placeholder="Select disposition"
            class="w-full"
          />
        </div>
        <div class="form-field">
          <label for="disposition-notes">Notes</label>
          <InputText
            id="disposition-notes"
            v-model="dispositionNotes"
            placeholder="Additional notes (optional)"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button
          label="Cancel"
          class="p-button-text"
          @click="showDispositionDialog = false"
        />
        <Button
          label="Save"
          icon="pi pi-check"
          :disabled="!dispositionCode"
          @click="handleDisposition"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.call-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--surface-card);
  border-radius: 8px;
}

.dial-section .dial-input {
  display: flex;
  gap: 8px;
}

.w-full {
  width: 100%;
}

.incoming-call {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px;
}

.caller-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.incoming-icon {
  font-size: 3rem;
  color: var(--green-500);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.caller-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.caller-name {
  font-size: 1.25rem;
  font-weight: 600;
}

.caller-number {
  color: var(--text-color-secondary);
}

.call-actions {
  display: flex;
  gap: 16px;
}

.active-call {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.call-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.call-duration {
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.hold-indicator {
  padding: 4px 12px;
  background: var(--orange-500);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.call-controls {
  display: flex;
  gap: 12px;
}

.dtmf-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 200px;
}

.dtmf-key {
  width: 56px;
  height: 56px;
  font-size: 1.25rem;
}

.wrap-up {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.wrap-up-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 600;
}

.wrap-up-header i {
  font-size: 1.5rem;
  color: var(--primary-500);
}

.wrap-up p {
  color: var(--text-color-secondary);
  margin: 0;
}

.wrap-up-actions {
  display: flex;
  gap: 12px;
}

.transfer-form,
.disposition-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
