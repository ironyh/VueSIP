<template>
  <div class="dialpad">
    <div class="dialpad__header">
      <h3>Make a Call</h3>
    </div>

    <!-- Number Display -->
    <div class="dialpad__display">
      <input
        v-model="internalNumber"
        type="text"
        placeholder="Enter SIP URI or number"
        class="number-input"
        @keyup.enter="handleCall"
        :disabled="disabled"
      />
      <button
        v-if="internalNumber"
        @click="handleClear"
        class="btn-clear"
        title="Clear"
      >
        ×
      </button>
    </div>

    <!-- Dialpad Grid -->
    <div class="dialpad__grid">
      <button
        v-for="key in dialpadKeys"
        :key="key.value"
        @click="handleKeyPress(key.value)"
        class="dialpad-key"
        :class="{ 'dialpad-key--wide': key.wide }"
        :disabled="disabled"
      >
        <span class="key-digit">{{ key.digit }}</span>
        <span v-if="key.letters" class="key-letters">{{ key.letters }}</span>
      </button>
    </div>

    <!-- Call Button -->
    <button
      @click="handleCall"
      class="dialpad__call-btn"
      :disabled="disabled || !internalNumber.trim()"
    >
      <span class="call-icon">📞</span>
      <span>Call</span>
    </button>

    <!-- Quick Dial (Optional) -->
    <div v-if="quickDial.length > 0" class="dialpad__quick-dial">
      <h4>Quick Dial</h4>
      <div class="quick-dial-list">
        <button
          v-for="(contact, index) in quickDial"
          :key="index"
          @click="handleQuickDial(contact.uri)"
          class="quick-dial-btn"
          :disabled="disabled"
        >
          <span class="contact-name">{{ contact.name }}</span>
          <span class="contact-uri">{{ contact.uri }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// Props
interface Props {
  number?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  number: '',
  disabled: false,
})

// Emits
const emit = defineEmits<{
  'update:number': [value: string]
  call: []
}>()

// Local state
const internalNumber = ref(props.number)

// Dialpad keys configuration
const dialpadKeys = [
  { digit: '1', value: '1', letters: '' },
  { digit: '2', value: '2', letters: 'ABC' },
  { digit: '3', value: '3', letters: 'DEF' },
  { digit: '4', value: '4', letters: 'GHI' },
  { digit: '5', value: '5', letters: 'JKL' },
  { digit: '6', value: '6', letters: 'MNO' },
  { digit: '7', value: '7', letters: 'PQRS' },
  { digit: '8', value: '8', letters: 'TUV' },
  { digit: '9', value: '9', letters: 'WXYZ' },
  { digit: '*', value: '*', letters: '' },
  { digit: '0', value: '0', letters: '+' },
  { digit: '#', value: '#', letters: '' },
]

// Quick dial contacts (can be loaded from localStorage or props)
interface QuickDialContact {
  name: string
  uri: string
}

const quickDial = ref<QuickDialContact[]>([])

// Load quick dial from localStorage
try {
  const saved = localStorage.getItem('quickDial')
  if (saved) {
    quickDial.value = JSON.parse(saved)
  }
} catch (error) {
  console.error('Failed to load quick dial:', error)
}

// Methods
function handleKeyPress(value: string) {
  internalNumber.value += value
  emit('update:number', internalNumber.value)
}

function handleClear() {
  internalNumber.value = ''
  emit('update:number', internalNumber.value)
}

function handleCall() {
  if (internalNumber.value.trim() && !props.disabled) {
    emit('call')
  }
}

function handleQuickDial(uri: string) {
  internalNumber.value = uri
  emit('update:number', internalNumber.value)
  handleCall()
}

// Watch for external number changes
watch(
  () => props.number,
  (newValue) => {
    internalNumber.value = newValue
  }
)

// Sync internal number with parent
watch(internalNumber, (newValue) => {
  emit('update:number', newValue)
})
</script>

<style scoped>
.dialpad {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dialpad__header {
  margin-bottom: 15px;
}

.dialpad__header h3 {
  color: #333;
  font-size: 1.2em;
  margin: 0;
}

.dialpad__display {
  position: relative;
  margin-bottom: 20px;
}

.number-input {
  width: 100%;
  padding: 12px 40px 12px 12px;
  font-size: 1.1em;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  transition: border-color 0.3s;
  font-family: 'Courier New', monospace;
}

.number-input:focus {
  outline: none;
  border-color: #667eea;
}

.number-input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.btn-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border: none;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  font-size: 1.5em;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-clear:hover {
  background: #c82333;
}

.dialpad__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.dialpad-key {
  padding: 16px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 70px;
}

.dialpad-key:hover:not(:disabled) {
  background: #667eea;
  border-color: #667eea;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.dialpad-key:active:not(:disabled) {
  transform: translateY(0);
}

.dialpad-key:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.key-digit {
  font-size: 1.8em;
  font-weight: 600;
}

.key-letters {
  font-size: 0.7em;
  text-transform: uppercase;
  color: #6c757d;
  font-weight: 500;
}

.dialpad-key:hover:not(:disabled) .key-letters {
  color: rgba(255, 255, 255, 0.8);
}

.dialpad__call-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.dialpad__call-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(40, 167, 69, 0.4);
}

.dialpad__call-btn:active:not(:disabled) {
  transform: translateY(0);
}

.dialpad__call-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.call-icon {
  font-size: 1.3em;
}

/* Quick Dial */
.dialpad__quick-dial {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e9ecef;
}

.dialpad__quick-dial h4 {
  color: #333;
  font-size: 1em;
  margin-bottom: 12px;
}

.quick-dial-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-dial-btn {
  padding: 12px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quick-dial-btn:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #667eea;
}

.quick-dial-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.contact-name {
  font-weight: 600;
  color: #333;
}

.contact-uri {
  font-size: 0.85em;
  color: #6c757d;
}
</style>
