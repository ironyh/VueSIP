<script setup lang="ts">
import { computed } from 'vue'
import type { CallSession } from '@/types/call.types'
import { getCauseExplanation, getCauseSuggestions } from 'vuesip'

const props = defineProps<{
  visible: boolean
  session?: CallSession | null
}>()

const emit = defineEmits<{
  dismiss: []
  retry: []
}>()

// Get diagnostic info from the session
const diagnostics = computed(() => {
  if (!props.session?.terminationCause) {
    return null
  }

  const cause = props.session.terminationCause
  const explanation = getCauseExplanation(cause)
  const suggestions = getCauseSuggestions(cause)

  return {
    cause,
    explanation,
    suggestions,
    responseCode: props.session.lastResponseCode,
    reasonPhrase: props.session.lastReasonPhrase,
  }
})

// Format response code with description
const responseDescription = computed(() => {
  const code = diagnostics.value?.responseCode
  if (!code) return null

  const descriptions: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    480: 'Temporarily Unavailable',
    486: 'Busy Here',
    487: 'Request Terminated',
    488: 'Not Acceptable Here',
    500: 'Server Internal Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Server Timeout',
  }

  return descriptions[code] || diagnostics.value?.reasonPhrase || 'Unknown Error'
})
</script>

<template>
  <Transition name="fade">
    <div v-if="visible && diagnostics" class="failure-overlay" role="alert" aria-live="polite">
      <div class="failure-card">
        <div class="failure-header">
          <div class="failure-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 class="failure-title">Samtalet misslyckades</h3>
          <p class="failure-subtitle">{{ diagnostics.explanation }}</p>
        </div>

        <!-- Technical Details -->
        <div v-if="responseDescription" class="tech-details">
          <span class="tech-code">{{ diagnostics.responseCode }}</span>
          <span class="tech-desc">{{ responseDescription }}</span>
        </div>

        <!-- Suggestions -->
        <div class="suggestions">
          <h4>Förslag på åtgärder:</h4>
          <ul>
            <li v-for="(suggestion, index) in diagnostics.suggestions" :key="index">
              {{ suggestion }}
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="failure-actions">
          <button class="btn-retry" @click="emit('retry')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Försök igen
          </button>
          <button class="btn-dismiss" @click="emit('dismiss')">Stäng</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.failure-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 300;
}

.failure-card {
  background: var(--bg-primary, #1f2937);
  border-radius: 1rem;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color, #374151);
}

.failure-header {
  text-align: center;
  margin-bottom: 1.25rem;
}

.failure-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 1rem;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.failure-icon svg {
  width: 28px;
  height: 28px;
  color: #ef4444;
}

.failure-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #f9fafb);
  margin: 0 0 0.5rem;
}

.failure-subtitle {
  font-size: 0.9375rem;
  color: var(--text-secondary, #9ca3af);
  margin: 0;
  line-height: 1.5;
}

.tech-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 0.5rem;
  margin-bottom: 1.25rem;
}

.tech-code {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ef4444;
  padding: 0.25rem 0.5rem;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 0.25rem;
}

.tech-desc {
  font-size: 0.875rem;
  color: var(--text-secondary, #9ca3af);
}

.suggestions {
  margin-bottom: 1.5rem;
}

.suggestions h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #f9fafb);
  margin: 0 0 0.75rem;
}

.suggestions ul {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--text-secondary, #9ca3af);
}

.suggestions li {
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.suggestions li:last-child {
  margin-bottom: 0;
}

.failure-actions {
  display: flex;
  gap: 0.75rem;
}

.failure-actions button {
  flex: 1;
  padding: 0.875rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-retry {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.btn-retry:hover {
  background: #2563eb;
}

.btn-retry svg {
  width: 18px;
  height: 18px;
}

.btn-dismiss {
  background: var(--bg-tertiary, #374151);
  color: var(--text-secondary, #9ca3af);
}

.btn-dismiss:hover {
  background: #4b5563;
  color: white;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
