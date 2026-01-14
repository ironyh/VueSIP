<script setup lang="ts">
/**
 * DtmfKeypad - Touch-friendly DTMF keypad component
 *
 * Large buttons for DTMF input with visual feedback,
 * keyboard shortcuts, and optional tone playback.
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  /** Whether the keypad is enabled */
  disabled?: boolean
  /** Whether to play DTMF tones locally */
  playTones?: boolean
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  playTones: true,
  size: 'medium',
})

const emit = defineEmits<{
  /** Emitted when a digit is pressed */
  (e: 'digit', digit: string): void
  /** Emitted when a sequence is entered (after delay) */
  (e: 'sequence', digits: string): void
}>()

// Keypad layout
const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

// Key labels (sub-text)
const keyLabels: Record<string, string> = {
  '1': '',
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
  '*': '',
  '0': '+',
  '#': '',
}

// Active key state for visual feedback
const activeKey = ref<string | null>(null)

// Audio context for DTMF tones
let audioContext: AudioContext | null = null

// DTMF frequency pairs
const dtmfFrequencies: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
  A: [697, 1633],
  B: [770, 1633],
  C: [852, 1633],
  D: [941, 1633],
}

/**
 * Initialize audio context on first interaction
 */
function initAudio(): void {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
}

/**
 * Play DTMF tone
 */
function playDtmfTone(digit: string): void {
  if (!props.playTones) return

  initAudio()
  if (!audioContext) return

  const frequencies = dtmfFrequencies[digit.toUpperCase()]
  if (!frequencies) return

  const duration = 0.15 // 150ms
  const now = audioContext.currentTime

  // Create oscillators for the two frequencies
  const osc1 = audioContext.createOscillator()
  const osc2 = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  osc1.frequency.value = frequencies[0]
  osc2.frequency.value = frequencies[1]
  osc1.type = 'sine'
  osc2.type = 'sine'

  gainNode.gain.setValueAtTime(0.2, now)
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration)

  osc1.connect(gainNode)
  osc2.connect(gainNode)
  gainNode.connect(audioContext.destination)

  osc1.start(now)
  osc2.start(now)
  osc1.stop(now + duration)
  osc2.stop(now + duration)
}

/**
 * Handle key press
 */
function handleKeyPress(digit: string): void {
  if (props.disabled) return

  // Visual feedback
  activeKey.value = digit
  setTimeout(() => {
    activeKey.value = null
  }, 150)

  // Play tone
  playDtmfTone(digit)

  // Emit event
  emit('digit', digit)
}

/**
 * Handle keyboard input
 */
function handleKeyboardInput(event: KeyboardEvent): void {
  if (props.disabled) return

  const key = event.key.toUpperCase()
  if (dtmfFrequencies[key]) {
    event.preventDefault()
    handleKeyPress(key)
  }
}

// Setup keyboard listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeyboardInput)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardInput)
  if (audioContext) {
    audioContext.close()
  }
})

/**
 * Get size classes
 */
function getSizeClass(): string {
  return `keypad-${props.size}`
}
</script>

<template>
  <div class="dtmf-keypad" :class="[getSizeClass(), { disabled }]">
    <div class="keypad-grid">
      <template v-for="(row, rowIndex) in keys" :key="rowIndex">
        <button
          v-for="digit in row"
          :key="digit"
          class="key-button"
          :class="{ active: activeKey === digit }"
          :disabled="disabled"
          @click="handleKeyPress(digit)"
          @touchstart.prevent="handleKeyPress(digit)"
        >
          <span class="key-digit">{{ digit }}</span>
          <span v-if="keyLabels[digit]" class="key-label">{{ keyLabels[digit] }}</span>
        </button>
      </template>
    </div>

    <!-- Extended keys (A, B, C, D) - optional -->
    <div class="extended-keys">
      <button
        v-for="letter in ['A', 'B', 'C', 'D']"
        :key="letter"
        class="ext-key-button"
        :class="{ active: activeKey === letter }"
        :disabled="disabled"
        @click="handleKeyPress(letter)"
      >
        {{ letter }}
      </button>
    </div>

    <div class="keyboard-hint">
      <i class="pi pi-info-circle" />
      <span>Use keyboard: 0-9, *, #, A-D</span>
    </div>
  </div>
</template>

<style scoped>
.dtmf-keypad {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.dtmf-keypad.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* Size variants */
.keypad-small .key-button {
  width: 56px;
  height: 56px;
}

.keypad-medium .key-button {
  width: 72px;
  height: 72px;
}

.keypad-large .key-button {
  width: 88px;
  height: 88px;
}

.key-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--surface-200);
  cursor: pointer;
  transition: all 0.1s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.key-button:hover {
  background: var(--surface-300);
  transform: scale(1.02);
}

.key-button:active,
.key-button.active {
  background: var(--primary-500);
  transform: scale(0.95);
}

.key-button.active .key-digit {
  color: white;
}

.key-digit {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1;
}

.keypad-small .key-digit {
  font-size: 1.25rem;
}

.keypad-large .key-digit {
  font-size: 1.75rem;
}

.key-label {
  font-size: 0.625rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.extended-keys {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--surface-200);
}

.ext-key-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--surface-300);
  border-radius: 8px;
  background: var(--surface-100);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition: all 0.1s ease;
}

.ext-key-button:hover {
  background: var(--surface-200);
  color: var(--text-color);
}

.ext-key-button.active {
  background: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.keyboard-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.keyboard-hint i {
  font-size: 0.75rem;
}
</style>
