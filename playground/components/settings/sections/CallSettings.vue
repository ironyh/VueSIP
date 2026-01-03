<template>
  <div class="call-settings">
    <!-- Call Behavior -->
    <div class="settings-section">
      <h3 class="section-title">Call Behavior</h3>

      <!-- Auto-Answer -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.autoAnswer"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Auto-answer incoming calls</span>
        </label>
        <p class="help-text">Automatically accept incoming calls without user interaction</p>
      </div>

      <!-- Auto-Answer Delay -->
      <div v-if="localSettings.autoAnswer" class="form-group">
        <label class="form-label">
          Auto-answer Delay
          <span class="volume-value">{{ localSettings.autoAnswerDelay }}ms</span>
        </label>
        <input
          v-model.number="localSettings.autoAnswerDelay"
          type="range"
          class="range-slider"
          min="0"
          max="5000"
          step="100"
          @change="emitUpdate"
        />
        <p class="help-text">Delay before automatically answering call (0-5000ms)</p>
      </div>

      <!-- Do Not Disturb -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.doNotDisturb"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Do Not Disturb mode</span>
        </label>
        <p class="help-text">Reject all incoming calls automatically</p>
      </div>

      <!-- Max Concurrent Calls -->
      <div class="form-group">
        <label for="max-calls" class="form-label">Maximum Concurrent Calls</label>
        <select
          id="max-calls"
          v-model.number="localSettings.maxConcurrentCalls"
          class="form-select"
          @change="emitUpdate"
        >
          <option :value="1">1 call (default)</option>
          <option :value="2">2 calls</option>
          <option :value="3">3 calls</option>
          <option :value="5">5 calls</option>
          <option :value="10">10 calls</option>
        </select>
        <p class="help-text">Maximum number of simultaneous active calls</p>
      </div>

      <!-- Call Timeout -->
      <div class="form-group">
        <label class="form-label">
          Call Timeout
          <span class="volume-value">{{ localSettings.callTimeout / 1000 }}s</span>
        </label>
        <input
          v-model.number="localSettings.callTimeout"
          type="range"
          class="range-slider"
          min="15000"
          max="120000"
          step="5000"
          @change="emitUpdate"
        />
        <p class="help-text">
          Maximum time to wait for call establishment (15-120 seconds, default: 60s)
        </p>
      </div>
    </div>

    <!-- Session Timers -->
    <div class="settings-section">
      <h3 class="section-title">Session Timers</h3>

      <!-- Enable Session Timers -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.sessionTimers"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Enable session timers</span>
        </label>
        <p class="help-text">
          Use SIP Session Timers (RFC 4028) to detect dead calls and prevent hanging sessions
        </p>
      </div>

      <!-- Refresh Method -->
      <div v-if="localSettings.sessionTimers" class="form-group">
        <label for="refresh-method" class="form-label">Session Refresh Method</label>
        <select
          id="refresh-method"
          v-model="localSettings.sessionTimersRefreshMethod"
          class="form-select"
          @change="emitUpdate"
        >
          <option value="UPDATE">UPDATE (Recommended)</option>
          <option value="INVITE">INVITE (re-INVITE)</option>
        </select>
        <p class="help-text">
          Method used to refresh sessions. UPDATE is lighter weight than re-INVITE.
        </p>
      </div>
    </div>

    <!-- DTMF Settings -->
    <div class="settings-section">
      <h3 class="section-title">DTMF (Dual-Tone Multi-Frequency)</h3>

      <!-- Enable DTMF -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.enableDtmfTones"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Enable DTMF tones</span>
        </label>
        <p class="help-text">
          Play audible tones when sending DTMF digits (like phone keypad sounds)
        </p>
      </div>

      <!-- DTMF Duration -->
      <div v-if="localSettings.enableDtmfTones" class="form-group">
        <label class="form-label">
          DTMF Tone Duration
          <span class="volume-value">{{ dtmfDuration }}ms</span>
        </label>
        <input
          v-model.number="dtmfDuration"
          type="range"
          class="range-slider"
          min="50"
          max="500"
          step="10"
          @change="emitUpdate"
        />
        <p class="help-text">Length of DTMF tones (50-500ms, default: 100ms)</p>
      </div>
    </div>

    <!-- Call Waiting -->
    <div class="settings-section">
      <h3 class="section-title">Call Waiting</h3>

      <!-- Enable Call Waiting -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.enableCallWaiting"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Enable call waiting</span>
        </label>
        <p class="help-text">
          Allow incoming calls while already on a call (plays beep notification)
        </p>
      </div>

      <!-- Call Waiting Beep -->
      <div v-if="localSettings.enableCallWaiting" class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.playCallWaitingBeep"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Play call waiting beep</span>
        </label>
        <p class="help-text">Play audible beep when receiving call waiting notification</p>
      </div>
    </div>

    <!-- Call Forwarding -->
    <div class="settings-section">
      <h3 class="section-title">Call Forwarding</h3>

      <!-- Forward All Calls -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.forwardAllCalls"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Forward all calls</span>
        </label>
        <p class="help-text">Automatically forward all incoming calls to another number</p>
      </div>

      <!-- Forward To -->
      <div v-if="localSettings.forwardAllCalls" class="form-group">
        <label for="forward-to" class="form-label">Forward To</label>
        <input
          id="forward-to"
          v-model="localSettings.forwardToUri"
          type="text"
          class="form-input"
          :class="{ 'input-error': forwardUriError }"
          placeholder="sip:user@domain.com or +1234567890"
          @blur="validateForwardUri"
        />
        <p v-if="forwardUriError" class="error-text">{{ forwardUriError }}</p>
        <p class="help-text">SIP URI or phone number to forward calls to</p>
      </div>

      <!-- Forward on Busy -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.forwardOnBusy"
            type="checkbox"
            class="checkbox-input"
            :disabled="localSettings.forwardAllCalls"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Forward when busy</span>
        </label>
        <p class="help-text">Forward calls when already on another call</p>
      </div>

      <!-- Forward on No Answer -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.forwardOnNoAnswer"
            type="checkbox"
            class="checkbox-input"
            :disabled="localSettings.forwardAllCalls"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Forward when no answer</span>
        </label>
        <p class="help-text">Forward calls if not answered within timeout period</p>
      </div>

      <!-- No Answer Timeout -->
      <div
        v-if="localSettings.forwardOnNoAnswer && !localSettings.forwardAllCalls"
        class="form-group"
      >
        <label class="form-label">
          No Answer Timeout
          <span class="volume-value">{{ noAnswerTimeout }}s</span>
        </label>
        <input
          v-model.number="noAnswerTimeout"
          type="range"
          class="range-slider"
          min="10"
          max="60"
          step="5"
          @change="emitUpdate"
        />
        <p class="help-text">
          Seconds to wait before forwarding unanswered calls (10-60s, default: 20s)
        </p>
      </div>
    </div>

    <!-- Advanced Call Options -->
    <div class="settings-section">
      <h3 class="section-title">Advanced Options</h3>

      <!-- Early Media -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.enableEarlyMedia"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Enable early media</span>
        </label>
        <p class="help-text">
          Allow media to flow before call is answered (e.g., ringback tones, announcements)
        </p>
      </div>

      <!-- ICE Support -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.enableIce"
            type="checkbox"
            class="checkbox-input"
            @change="emitUpdate"
          />
          <span class="checkbox-text">Enable ICE (Interactive Connectivity Establishment)</span>
        </label>
        <p class="help-text">Use ICE for NAT traversal and better connectivity (Recommended: ON)</p>
      </div>

      <!-- Reset to Defaults -->
      <button class="btn btn-secondary" @click="resetToDefaults">🔄 Reset to Defaults</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

interface CallSettingsConfig {
  autoAnswer: boolean
  autoAnswerDelay: number
  doNotDisturb: boolean
  maxConcurrentCalls: number
  callTimeout: number
  sessionTimers: boolean
  sessionTimersRefreshMethod: 'UPDATE' | 'INVITE'
  enableDtmfTones: boolean
  enableCallWaiting: boolean
  playCallWaitingBeep: boolean
  forwardAllCalls: boolean
  forwardToUri: string
  forwardOnBusy: boolean
  forwardOnNoAnswer: boolean
  enableEarlyMedia: boolean
  enableIce: boolean
}

interface Props {
  modelValue: Partial<CallSettingsConfig>
}

interface Emits {
  (e: 'update:modelValue', value: Partial<CallSettingsConfig>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local settings
const localSettings = reactive<CallSettingsConfig>({
  autoAnswer: props.modelValue.autoAnswer ?? false,
  autoAnswerDelay: props.modelValue.autoAnswerDelay || 0,
  doNotDisturb: props.modelValue.doNotDisturb ?? false,
  maxConcurrentCalls: props.modelValue.maxConcurrentCalls || 1,
  callTimeout: props.modelValue.callTimeout || 60000,
  sessionTimers: props.modelValue.sessionTimers ?? true,
  sessionTimersRefreshMethod: props.modelValue.sessionTimersRefreshMethod || 'UPDATE',
  enableDtmfTones: props.modelValue.enableDtmfTones ?? true,
  enableCallWaiting: props.modelValue.enableCallWaiting ?? true,
  playCallWaitingBeep: props.modelValue.playCallWaitingBeep ?? true,
  forwardAllCalls: props.modelValue.forwardAllCalls ?? false,
  forwardToUri: props.modelValue.forwardToUri || '',
  forwardOnBusy: props.modelValue.forwardOnBusy ?? false,
  forwardOnNoAnswer: props.modelValue.forwardOnNoAnswer ?? false,
  enableEarlyMedia: props.modelValue.enableEarlyMedia ?? true,
  enableIce: props.modelValue.enableIce ?? true,
})

const dtmfDuration = ref(100)
const noAnswerTimeout = ref(20)
const forwardUriError = ref('')

// Validate forward URI
function validateForwardUri() {
  if (!localSettings.forwardToUri) {
    forwardUriError.value = 'Forward URI is required'
    return false
  }

  // Check for SIP URI format or phone number
  const sipPattern = /^sip:.+@.+/
  const phonePattern = /^\+?\d{10,15}$/

  if (
    !sipPattern.test(localSettings.forwardToUri) &&
    !phonePattern.test(localSettings.forwardToUri)
  ) {
    forwardUriError.value = 'Must be valid SIP URI (sip:user@domain) or phone number'
    return false
  }

  forwardUriError.value = ''
  return true
}

// Reset to defaults
function resetToDefaults() {
  localSettings.autoAnswer = false
  localSettings.autoAnswerDelay = 0
  localSettings.doNotDisturb = false
  localSettings.maxConcurrentCalls = 1
  localSettings.callTimeout = 60000
  localSettings.sessionTimers = true
  localSettings.sessionTimersRefreshMethod = 'UPDATE'
  localSettings.enableDtmfTones = true
  localSettings.enableCallWaiting = true
  localSettings.playCallWaitingBeep = true
  localSettings.forwardAllCalls = false
  localSettings.forwardToUri = ''
  localSettings.forwardOnBusy = false
  localSettings.forwardOnNoAnswer = false
  localSettings.enableEarlyMedia = true
  localSettings.enableIce = true

  dtmfDuration.value = 100
  noAnswerTimeout.value = 20
  forwardUriError.value = ''

  emitUpdate()
}

// Emit updates
function emitUpdate() {
  emit('update:modelValue', { ...localSettings })
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    Object.assign(localSettings, newValue)
  },
  { deep: true }
)
</script>

<style scoped>
.call-settings {
  max-width: 800px;
}

.settings-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.volume-value {
  color: #667eea;
  font-weight: 600;
  font-size: 0.8125rem;
}

.form-select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.input-error {
  border-color: #dc2626;
}

.range-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.checkbox-input {
  width: 1.125rem;
  height: 1.125rem;
  margin-right: 0.625rem;
  cursor: pointer;
  accent-color: #667eea;
}

.checkbox-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-text {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.help-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.error-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #dc2626;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}
</style>
