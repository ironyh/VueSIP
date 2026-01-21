<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  outboundPrimary?: string
  outboundSecondary?: string
  outboundTitle?: string
  canCycleOutbound?: boolean
}>()

const emit = defineEmits<{
  call: [number: string]
  digit: [digit: string]
  cycleOutbound: [direction: 'prev' | 'next']
}>()

const phoneNumber = ref('')
const hasNumber = computed(() => !!phoneNumber.value)

const swipeStartX = ref<number | null>(null)
const swipePointerId = ref<number | null>(null)

const revealSecondary = ref(false)
let revealTimer: number | null = null
let pressTimer: number | null = null

function clearRevealTimer() {
  if (revealTimer !== null) {
    window.clearTimeout(revealTimer)
    revealTimer = null
  }
}

function clearPressTimer() {
  if (pressTimer !== null) {
    window.clearTimeout(pressTimer)
    pressTimer = null
  }
}

function startRevealSecondary() {
  if (!props.outboundSecondary) return
  revealSecondary.value = true
  clearRevealTimer()
  revealTimer = window.setTimeout(() => {
    revealSecondary.value = false
    revealTimer = null
  }, 2500)
}

function handleOutboundPointerDown() {
  if (!props.outboundSecondary) return
  clearPressTimer()
  pressTimer = window.setTimeout(() => {
    startRevealSecondary()
    pressTimer = null
  }, 450)
}

function handleOutboundPointerUp() {
  clearPressTimer()
}

function handleCycle(direction: 'prev' | 'next') {
  emit('cycleOutbound', direction)
  if (navigator.vibrate) {
    navigator.vibrate(15)
  }
}

function handleCallSwipePointerDown(e: PointerEvent) {
  if (!props.canCycleOutbound) return
  swipeStartX.value = e.clientX
  swipePointerId.value = e.pointerId

  try {
    ;(e.currentTarget as HTMLElement | null)?.setPointerCapture(e.pointerId)
  } catch {
    // ignore
  }
}

function handleCallSwipePointerUp(e: PointerEvent) {
  const startX = swipeStartX.value
  const pointerId = swipePointerId.value
  swipeStartX.value = null
  swipePointerId.value = null

  if (!props.canCycleOutbound || startX === null || pointerId !== e.pointerId) {
    // Not a swipe: if we have a number, treat as call.
    if (hasNumber.value) handleCall()
    return
  }

  const dx = e.clientX - startX
  const threshold = 40

  if (Math.abs(dx) >= threshold) {
    handleCycle(dx > 0 ? 'next' : 'prev')
    return
  }

  if (hasNumber.value) handleCall()
}

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
  // Haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}

function handleBackspace() {
  phoneNumber.value = phoneNumber.value.slice(0, -1)
}

function handleLongPressZero() {
  // Long press on 0 to add +
  phoneNumber.value = phoneNumber.value.slice(0, -1) + '+'
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
    <!-- Number Display -->
    <div class="display">
      <input
        v-model="phoneNumber"
        type="tel"
        class="phone-input"
        placeholder="Enter number"
        @keyup.enter="handleCall"
      />
      <button v-if="phoneNumber" class="clear-btn" @click="handleClear" aria-label="Clear">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Dialpad Keys -->
    <div class="keys">
      <button
        v-for="key in dialpadKeys"
        :key="key.digit"
        class="dialpad-key"
        @click="handleDigit(key.digit)"
        @contextmenu.prevent="key.digit === '0' && handleLongPressZero()"
      >
        <span class="digit">{{ key.digit }}</span>
        <span v-if="key.letters" class="letters">{{ key.letters }}</span>
      </button>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <button
        class="action-btn secondary"
        :disabled="!phoneNumber"
        @click="handleBackspace"
        aria-label="Backspace"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
          />
        </svg>
      </button>
      <div
        class="call-swipe"
        @pointerdown="handleCallSwipePointerDown"
        @pointerup="handleCallSwipePointerUp"
      >
        <div class="call-button-wrap">
          <div v-if="props.canCycleOutbound" class="cycle-hint left" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>

          <button class="action-btn call" :disabled="!hasNumber" aria-label="Call">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>

          <div v-if="props.canCycleOutbound" class="cycle-hint right" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        </div>
        <div
          v-if="props.outboundPrimary"
          class="outbound-label"
          :title="props.outboundTitle || props.outboundSecondary || props.outboundPrimary"
          @pointerdown="handleOutboundPointerDown"
          @pointerup="handleOutboundPointerUp"
          @pointercancel="handleOutboundPointerUp"
          @contextmenu.prevent
        >
          <div class="outbound-primary">{{ props.outboundPrimary }}</div>
          <div v-if="props.outboundSecondary && revealSecondary" class="outbound-secondary">
            {{ props.outboundSecondary }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialpad {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
}

.phone-input {
  flex: 1;
  text-align: center;
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: 2px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  outline: none;
}

.phone-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}

.clear-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn svg {
  width: 20px;
  height: 20px;
}

.keys {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 0 0.5rem;
}

.dialpad-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1.2;
  min-height: 64px;
  background: var(--bg-secondary);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.dialpad-key:hover {
  background: var(--bg-tertiary);
}

.dialpad-key:active {
  transform: scale(0.95);
  background: var(--color-primary);
}

.dialpad-key:active .digit,
.dialpad-key:active .letters {
  color: white;
}

.digit {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1;
}

.letters {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding: 0.5rem;
}

.call-swipe {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  touch-action: pan-y;
  user-select: none;
}

.call-button-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cycle-hint {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  color: rgba(255, 255, 255, 0.85);
  pointer-events: none;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25));
  animation: nudge 2.4s ease-in-out infinite;
}

.cycle-hint.left {
  left: -26px;
}

.cycle-hint.right {
  right: -26px;
  animation-delay: 0.3s;
}

.cycle-hint svg {
  width: 22px;
  height: 22px;
}

@keyframes nudge {
  0%,
  100% {
    opacity: 0.6;
    transform: translateY(-50%) translateX(0);
  }
  50% {
    opacity: 0.95;
    transform: translateY(-50%) translateX(2px);
  }
}

.outbound-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  max-width: 180px;
  text-align: center;
  line-height: 1.1;
}

.outbound-primary {
  color: var(--text-secondary);
}

.outbound-secondary {
  margin-top: 2px;
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

.action-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn svg {
  width: 28px;
  height: 28px;
}

.action-btn.secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.action-btn.secondary:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.action-btn.call {
  background: var(--color-success);
  color: white;
}

.action-btn.call:hover:not(:disabled) {
  background: var(--color-success-dark);
  transform: scale(1.05);
}

.action-btn.call:active:not(:disabled) {
  transform: scale(0.95);
}
</style>
