<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const emit = defineEmits<{
  call: [number: string]
  digit: [digit: string]
}>()

const phoneNumber = ref('')

const dialpadKeys = [
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

function handleDigit(digit: string) {
  phoneNumber.value += digit
  emit('digit', digit)
}

function handleBackspace() {
  phoneNumber.value = phoneNumber.value.slice(0, -1)
}

function handleCall() {
  if (phoneNumber.value) {
    emit('call', phoneNumber.value)
  }
}

function handleClear() {
  phoneNumber.value = ''
}
</script>

<template>
  <div class="dialpad">
    <div class="display">
      <InputText
        v-model="phoneNumber"
        class="phone-input"
        placeholder="Enter number"
        @keyup.enter="handleCall"
      />
      <Button
        v-if="phoneNumber"
        icon="pi pi-times"
        class="p-button-text p-button-rounded"
        @click="handleClear"
      />
    </div>

    <div class="keys">
      <Button
        v-for="key in dialpadKeys"
        :key="key.digit"
        class="dialpad-key"
        @click="handleDigit(key.digit)"
      >
        <span class="digit">{{ key.digit }}</span>
        <span v-if="key.letters" class="letters">{{ key.letters }}</span>
      </Button>
    </div>

    <div class="actions">
      <Button
        icon="pi pi-phone"
        class="p-button-success p-button-lg call-button"
        :disabled="!phoneNumber"
        @click="handleCall"
      />
      <Button
        icon="pi pi-delete-left"
        class="p-button-secondary p-button-lg"
        :disabled="!phoneNumber"
        @click="handleBackspace"
      />
    </div>
  </div>
</template>

<style scoped>
.dialpad {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 300px;
  margin: 0 auto;
}

.display {
  display: flex;
  gap: 8px;
  align-items: center;
}

.phone-input {
  flex: 1;
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 2px;
}

.keys {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.dialpad-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60px;
  font-size: 1.25rem;
  background: var(--surface-100);
  border: 1px solid var(--surface-300);
  color: var(--text-color);
}

.dialpad-key:hover {
  background: var(--surface-200);
}

.digit {
  font-size: 1.5rem;
  font-weight: 600;
}

.letters {
  font-size: 0.65rem;
  color: var(--text-color-secondary);
  margin-top: 2px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.call-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
}
</style>
