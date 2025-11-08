<template>
  <div class="video-call-controls" role="region" aria-label="Video call controls">
    <!-- Call Initiation (when not in a call) -->
    <div v-if="!isCallActive" class="call-initiation">
      <div class="input-group">
        <label for="target-uri" class="sr-only">Enter SIP URI to call</label>
        <input
          id="target-uri"
          v-model="targetUri"
          type="text"
          placeholder="Enter SIP URI (e.g., sip:1002@domain.com)"
          class="uri-input"
          aria-describedby="target-uri-hint"
          @keyup.enter="handleMakeCall"
        />
        <span id="target-uri-hint" class="sr-only">Enter the SIP address of the person you want to call, then press Enter or click the Start Video Call button</span>
        <button
          @click="handleMakeCall"
          class="call-button"
          :disabled="!targetUri.trim()"
          aria-label="Start video call"
        >
          <span class="icon" aria-hidden="true">📞</span>
          <span class="text">Start Video Call</span>
        </button>
      </div>
    </div>

    <!-- Call Controls (during call) -->
    <div v-else class="call-controls">
      <div class="controls-container" role="toolbar" aria-label="Video call action buttons">
        <!-- Mute Audio Button -->
        <button
          @click="$emit('toggle-mute')"
          class="control-button"
          :class="{ active: isMuted }"
          :aria-label="isMuted ? 'Unmute microphone' : 'Mute microphone'"
          :aria-pressed="isMuted"
        >
          <span class="icon" aria-hidden="true">{{ isMuted ? '🔇' : '🎤' }}</span>
          <span class="label">{{ isMuted ? 'Unmute' : 'Mute' }}</span>
          <span class="sr-only">{{ isMuted ? 'Microphone is currently muted' : 'Microphone is currently active' }}</span>
        </button>

        <!-- Toggle Video Button -->
        <button
          @click="$emit('toggle-video')"
          class="control-button"
          :class="{ active: !hasLocalVideo }"
          :aria-label="hasLocalVideo ? 'Turn off camera' : 'Turn on camera'"
          :aria-pressed="!hasLocalVideo"
        >
          <span class="icon" aria-hidden="true">{{ hasLocalVideo ? '📹' : '🚫' }}</span>
          <span class="label">{{ hasLocalVideo ? 'Stop Video' : 'Start Video' }}</span>
          <span class="sr-only">{{ hasLocalVideo ? 'Camera is currently on' : 'Camera is currently off' }}</span>
        </button>

        <!-- Hang Up Button (prominent) -->
        <button
          v-if="callState !== 'ringing'"
          @click="$emit('hangup')"
          class="control-button hangup-button"
          aria-label="Hang up and end call"
        >
          <span class="icon" aria-hidden="true">📵</span>
          <span class="label">Hang Up</span>
        </button>

        <!-- Answer Button (for incoming calls) -->
        <button
          v-if="callState === 'ringing'"
          @click="$emit('answer')"
          class="control-button answer-button"
          aria-label="Answer incoming call"
        >
          <span class="icon" aria-hidden="true">✅</span>
          <span class="label">Answer</span>
        </button>

        <!-- Reject Button (for incoming calls) -->
        <button
          v-if="callState === 'ringing'"
          @click="$emit('reject')"
          class="control-button hangup-button"
          aria-label="Reject incoming call"
        >
          <span class="icon" aria-hidden="true">❌</span>
          <span class="label">Reject</span>
        </button>

        <!-- Hold Button (only during active call) -->
        <button
          v-if="callState === 'active'"
          @click="$emit('toggle-hold')"
          class="control-button"
          :class="{ active: isOnHold }"
          :aria-label="isOnHold ? 'Resume call from hold' : 'Put call on hold'"
          :aria-pressed="isOnHold"
        >
          <span class="icon" aria-hidden="true">{{ isOnHold ? '▶️' : '⏸️' }}</span>
          <span class="label">{{ isOnHold ? 'Resume' : 'Hold' }}</span>
          <span class="sr-only">{{ isOnHold ? 'Call is currently on hold' : 'Call is currently active' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// ============================================================================
// Props
// ============================================================================

interface Props {
  isCallActive: boolean
  callState: string
  isMuted: boolean
  hasLocalVideo: boolean
  isOnHold: boolean
}

defineProps<Props>()

// ============================================================================
// Events
// ============================================================================

interface Emits {
  (e: 'make-call', targetUri: string): void
  (e: 'answer'): void
  (e: 'reject'): void
  (e: 'hangup'): void
  (e: 'toggle-mute'): void
  (e: 'toggle-video'): void
  (e: 'toggle-hold'): void
}

const emit = defineEmits<Emits>()

// ============================================================================
// Local State
// ============================================================================

const targetUri = ref('')

// ============================================================================
// Methods
// ============================================================================

/**
 * Handle make call
 */
function handleMakeCall() {
  const uri = targetUri.value.trim()
  if (uri) {
    emit('make-call', uri)
  }
}
</script>

<style scoped>
/* ============================================================================
   Video Call Controls Container
   ============================================================================ */

.video-call-controls {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* ============================================================================
   Call Initiation
   ============================================================================ */

.call-initiation {
  width: 100%;
}

.input-group {
  display: flex;
  gap: 12px;
  width: 100%;
}

.uri-input {
  flex: 1;
  padding: 14px 18px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
  background: white;
}

.uri-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.call-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.call-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.call-button:active:not(:disabled) {
  transform: translateY(0);
}

.call-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.call-button .icon {
  font-size: 20px;
}

/* ============================================================================
   Call Controls
   ============================================================================ */

.call-controls {
  width: 100%;
}

.controls-container {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.control-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.control-button:hover {
  background: #e5e7eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.control-button:active {
  transform: translateY(0);
}

.control-button .icon {
  font-size: 28px;
}

.control-button .label {
  font-size: 13px;
  font-weight: 600;
}

/* Active State (Muted, Video Off, On Hold) */
.control-button.active {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.control-button.active:hover {
  background: #fee2e2;
}

/* Hang Up Button (Red) */
.hangup-button {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.hangup-button:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* Answer Button (Green) */
.answer-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.answer-button:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ============================================================================
   Responsive Design
   ============================================================================ */

@media (max-width: 768px) {
  .video-call-controls {
    padding: 16px;
  }

  .input-group {
    flex-direction: column;
  }

  .uri-input {
    width: 100%;
  }

  .call-button {
    width: 100%;
    justify-content: center;
  }

  .controls-container {
    gap: 12px;
  }

  .control-button {
    min-width: 80px;
    padding: 12px 16px;
  }

  .control-button .icon {
    font-size: 24px;
  }

  .control-button .label {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .control-button {
    min-width: 70px;
    padding: 10px 12px;
    gap: 6px;
  }

  .control-button .icon {
    font-size: 22px;
  }

  .control-button .label {
    font-size: 10px;
  }
}

/* ============================================================================
   Accessibility
   ============================================================================ */

/* Screen reader only content */
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

/* Focus visible styles for keyboard navigation */
.control-button:focus-visible,
.call-button:focus-visible,
.uri-input:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

/* Enhanced focus for critical actions */
.hangup-button:focus-visible {
  outline: 3px solid #dc2626;
  outline-offset: 2px;
}

.answer-button:focus-visible {
  outline: 3px solid #10b981;
  outline-offset: 2px;
}

/* Ensure pressed state is visually distinguishable for accessibility */
.control-button[aria-pressed="true"] {
  border: 2px solid #dc2626;
}
</style>
