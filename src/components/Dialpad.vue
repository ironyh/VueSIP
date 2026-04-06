<template>
  <div class="dialpad" role="group" aria-label="Dial pad">
    <div class="dialpad-display">
      <input
        v-model="number"
        type="tel"
        class="dialpad-input"
        data-testid="dialpad-input"
        placeholder="Enter number"
        aria-label="Phone number"
        autocomplete="tel"
        @keydown.delete="handleBackspace"
      />
    </div>
    <div class="dialpad-buttons" role="group" aria-label="Dial buttons">
      <button
        v-for="button in buttons"
        :key="button.digit"
        class="dialpad-button"
        :data-testid="`dtmf-${button.digit}`"
        :aria-label="`${button.digit}${button.letters ? ' ' + button.letters : ''}`"
        @click="handleDigit(button.digit)"
      >
        <span class="digit" aria-hidden="true">{{ button.digit }}</span>
        <span class="letters" aria-hidden="true">{{ button.letters }}</span>
      </button>
      <button
        class="dialpad-button call-button"
        data-testid="call-button"
        :disabled="!number || isCalling"
        aria-label="Place call"
        @click="handleCall"
      >
        <i class="pi pi-phone" aria-hidden="true"></i>
      </button>
      <button
        class="dialpad-button backspace-button"
        aria-label="Delete last digit"
        @click="handleBackspace"
      >
        <i class="pi pi-times" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  digit: [digit: string]
  call: [number: string]
}>()

defineProps<{
  isCalling?: boolean
}>()

const number = ref('')

const buttons = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
]

const handleDigit = (digit: string) => {
  number.value += digit
  emit('digit', digit)
}

const handleCall = () => {
  if (number.value) {
    emit('call', number.value)
  }
}

const handleBackspace = () => {
  number.value = number.value.slice(0, -1)
}

// Expose method for testing purposes
const setNumberForTest = (value: string) => {
  number.value = value
}

defineExpose({
  setNumberForTest,
})
</script>

<style scoped>
.dialpad {
  max-width: 320px;
  margin: 0 auto;
  padding: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.dialpad-display {
  margin-bottom: 1rem;
}

.dialpad-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1.5rem;
  text-align: center;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  box-sizing: border-box;
}

.dialpad-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.dialpad-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.dialpad-button {
  aspect-ratio: 1;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  min-height: 48px;
  min-width: 48px;
}

.dialpad-button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.dialpad-button:active {
  transform: scale(0.92);
  background: #e5e7eb;
}

.dialpad-button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.dialpad-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.digit {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1.2;
}

.letters {
  font-size: 0.625rem;
  color: #9ca3af;
  letter-spacing: 0.05em;
  line-height: 1;
}

.call-button {
  background: #10b981;
  color: white;
  border: none;
}

.call-button:hover:not(:disabled) {
  background: #059669;
}

.call-button:active:not(:disabled) {
  background: #047857;
}

.backspace-button {
  color: #6b7280;
}

.backspace-button:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #ef4444;
}

/* Responsive: larger touch targets on small screens */
@media (max-width: 360px) {
  .dialpad {
    padding: 0.5rem;
  }

  .dialpad-button {
    min-height: 44px;
    min-width: 44px;
  }

  .digit {
    font-size: 1.25rem;
  }
}

@media (min-width: 640px) {
  .dialpad {
    max-width: 360px;
  }

  .dialpad-button {
    min-height: 56px;
    min-width: 56px;
  }
}
</style>
