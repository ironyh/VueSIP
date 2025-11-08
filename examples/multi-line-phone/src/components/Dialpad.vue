<template>
  <form class="dialpad" role="region" aria-labelledby="dialpad-heading" @submit.prevent="handleCall">
    <div class="dialpad__header">
      <h3 id="dialpad-heading">Make a Call</h3>
    </div>

    <!-- Number Display -->
    <div class="dialpad__display">
      <label for="dialpad-input" class="sr-only">Phone number or SIP URI</label>
      <input
        id="dialpad-input"
        ref="dialpadInput"
        v-model="internalNumber"
        type="text"
        placeholder="Enter SIP URI or number"
        class="number-input"
        @keyup.enter="handleCall"
        :disabled="disabled"
        aria-describedby="dialpad-hint"
      />
      <div id="dialpad-hint" class="sr-only">
        Enter a phone number or SIP URI, then press Enter or click Call button. You can also use your keyboard number keys to dial.
      </div>
      <button
        v-if="internalNumber"
        @click="handleClear"
        type="button"
        class="btn-clear"
        aria-label="Clear phone number"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>

    <!-- Dialpad Grid -->
    <div class="dialpad__grid" role="group" aria-label="Dialpad keys">
      <button
        v-for="key in dialpadKeys"
        :key="key.value"
        @click="handleKeyPress(key.value)"
        type="button"
        class="dialpad-key"
        :class="{ 'dialpad-key--wide': key.wide }"
        :disabled="disabled"
        :aria-label="`Dial ${key.digit}${key.letters ? ' ' + key.letters : ''}`"
        :aria-keyshortcuts="key.value"
      >
        <span class="key-digit">{{ key.digit }}</span>
        <span v-if="key.letters" class="key-letters" aria-hidden="true">{{ key.letters }}</span>
      </button>
    </div>

    <!-- Call Button -->
    <button
      type="submit"
      @click="handleCall"
      class="dialpad__call-btn"
      :disabled="disabled || !internalNumber.trim()"
      aria-label="Make call"
    >
      <span class="call-icon" aria-hidden="true">📞</span>
      <span>Call</span>
    </button>

    <!-- Quick Dial (Optional) -->
    <div v-if="quickDial.length > 0" class="dialpad__quick-dial">
      <h4 id="quick-dial-heading">Quick Dial</h4>
      <ul class="quick-dial-list" role="list" aria-labelledby="quick-dial-heading">
        <li
          v-for="(contact, index) in quickDial"
          :key="index"
          role="listitem"
        >
          <button
            @click="handleQuickDial(contact.uri)"
            type="button"
            class="quick-dial-btn"
            :disabled="disabled"
            :aria-label="`Quick dial ${contact.name} at ${contact.uri}`"
          >
            <span class="contact-name">{{ contact.name }}</span>
            <span class="contact-uri">{{ contact.uri }}</span>
          </button>
        </li>
      </ul>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

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
const dialpadInput = ref<HTMLInputElement | null>(null)

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
  // Return focus to input
  dialpadInput.value?.focus()
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

// Keyboard event handler for number keys
function handleKeyboardInput(e: KeyboardEvent) {
  // Only handle if dialpad is active and not disabled
  if (props.disabled) return

  // Don't interfere if user is typing in input
  if (document.activeElement?.tagName === 'INPUT') return

  const key = e.key

  // Handle number keys, *, #
  if (/^[0-9*#]$/.test(key)) {
    e.preventDefault()
    handleKeyPress(key)
  }

  // Handle Backspace to delete
  if (key === 'Backspace' && internalNumber.value) {
    e.preventDefault()
    internalNumber.value = internalNumber.value.slice(0, -1)
    emit('update:number', internalNumber.value)
  }
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

// Add keyboard event listener on mount
onMounted(() => {
  window.addEventListener('keydown', handleKeyboardInput)

  // Auto-focus the input when dialpad becomes visible
  setTimeout(() => {
    dialpadInput.value?.focus()
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardInput)
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
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
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

.btn-clear:focus {
  outline: 3px solid #dc3545;
  outline-offset: 2px;
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

.dialpad-key:focus {
  outline: 3px solid #667eea;
  outline-offset: 2px;
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

.dialpad__call-btn:focus {
  outline: 3px solid #28a745;
  outline-offset: 2px;
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
  list-style: none;
  padding: 0;
  margin: 0;
}

.quick-dial-btn {
  width: 100%;
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

.quick-dial-btn:focus {
  outline: 3px solid #667eea;
  outline-offset: 2px;
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

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .dialpad-key,
  .dialpad__call-btn,
  .quick-dial-btn {
    transition-duration: 0.01ms !important;
  }
}
</style>
