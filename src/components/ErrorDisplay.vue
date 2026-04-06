<template>
  <div class="error-display" :class="errorClass">
    <div v-if="icon" class="error-display__icon">
      {{ icon }}
    </div>

    <div class="error-display__content">
      <h3 v-if="title" class="error-display__title">
        {{ title }}
      </h3>

      <p v-if="message" class="error-display__message">
        {{ message }}
      </p>

      <div v-if="description" class="error-display__description">
        {{ description }}
      </div>

      <div v-if="suggestions.length > 0" class="error-display__suggestions">
        <h4 v-if="showSuggestionTitle" class="error-display__suggestions-title">
          What you can do:
        </h4>
        <ul class="error-display__suggestions-list">
          <li v-for="(suggestion, index) in suggestions" :key="index">
            {{ suggestion }}
          </li>
        </ul>
      </div>

      <div v-if="showTechnicalDetails" class="error-display__technical">
        <details class="error-display__details">
          <summary>
            Technical Details
            <span class="error-display__toggle-icon">▼</span>
          </summary>

          <div class="error-display__details-content">
            <div v-if="error.code" class="error-display__detail">
              <strong>Error Code:</strong> {{ error.code }}
            </div>

            <div v-if="error.name" class="error-display__detail">
              <strong>Error Type:</strong> {{ error.name }}
            </div>

            <div v-if="error.stack" class="error-display__detail">
              <strong>Stack Trace:</strong>
              <pre class="error-display__stack">{{ error.stack }}</pre>
            </div>

            <div v-if="context" class="error-display__detail">
              <strong>Context:</strong>
              <pre class="error-display__context">{{ JSON.stringify(context, null, 2) }}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>

    <div v-if="actions.length > 0" class="error-display__actions">
      <button
        v-for="(action, index) in actions"
        :key="index"
        @click="handleAction(action)"
        class="error-display__action"
        :class="action.class"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ErrorSeverity } from '../utils/errorContext'

export interface ErrorAction {
  label: string
  action: () => void
  class?: string
}

export interface ErrorDisplayProps {
  /** Error object with formatted error information */
  error: {
    message: string
    name?: string
    code?: string | number
    stack?: string
  }
  /** Error title */
  title?: string
  /** Error message */
  message?: string
  /** Detailed error description */
  description?: string
  /** Error icon (emoji or text) */
  icon?: string
  /** Error severity for styling */
  severity?: ErrorSeverity
  /** Context information */
  context?: Record<string, unknown>
  /** User-friendly suggestions */
  suggestions?: string[]
  /** Show suggestion title */
  showSuggestionTitle?: boolean
  /** Show technical details */
  showTechnicalDetails?: boolean
  /** Available actions */
  actions?: ErrorAction[]
}

const props = withDefaults(defineProps<ErrorDisplayProps>(), {
  severity: ErrorSeverity.HIGH,
  suggestions: () => [],
  showSuggestionTitle: true,
  showTechnicalDetails: true,
  actions: () => [],
})

const emit = defineEmits<{
  action: [action: ErrorAction]
}>()

const errorClass = computed(() => ({
  'error-display--low': props.severity === ErrorSeverity.LOW,
  'error-display--medium': props.severity === ErrorSeverity.MEDIUM,
  'error-display--high': props.severity === ErrorSeverity.HIGH,
  'error-display--critical': props.severity === ErrorSeverity.CRITICAL,
}))

const handleAction = (action: ErrorAction) => {
  emit('action', action)
}
</script>

<style scoped>
.error-display {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid;
  background-color: var(--error-display-bg, white);
  color: var(--error-display-text, #2d3748);
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.error-display--low {
  border-left-color: var(--info-color, #3182ce);
  background-color: var(--info-background, #bee3f8);
  color: var(--info-text, #2a69ac);
}

.error-display--medium {
  border-left-color: var(--warning-color, #d69e2e);
  background-color: var(--warning-background, #faf089);
  color: var(--warning-text, #744210);
}

.error-display--high {
  border-left-color: var(--error-color, #e53e3e);
  background-color: var(--error-background, #fed7d7);
  color: var(--error-text, #742a2a);
}

.error-display--critical {
  border-left-color: var(--critical-color, #9f1239);
  background-color: var(--critical-background, #fecaca);
  color: var(--critical-text, #742a2a);
}

.error-display__icon {
  font-size: 2rem;
  line-height: 1;
  align-self: flex-start;
  margin-top: 0.25rem;
}

.error-display__content {
  flex: 1;
}

.error-display__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: inherit;
}

.error-display__message {
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  font-weight: 500;
}

.error-display__description {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  opacity: 0.8;
}

.error-display__suggestions {
  margin: 1rem 0;
}

.error-display__suggestions-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: inherit;
}

.error-display__suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.error-display__suggestions-list li {
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 0.25rem 0;
  position: relative;
  padding-left: 1.5rem;
}

.error-display__suggestions-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: currentColor;
  opacity: 0.8;
}

.error-display__technical {
  margin-top: 1rem;
}

.error-display__details {
  cursor: pointer;
}

.error-display__toggle-icon {
  display: inline-block;
  margin-left: 0.5rem;
  font-size: 0.875rem;
  transition: transform 0.2s ease;
}

.error-display__details[open] .error-display__toggle-icon {
  transform: rotate(180deg);
}

.error-display__details-content {
  margin-top: 1rem;
}

.error-display__detail {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.4;
}

.error-display__detail strong {
  font-weight: 600;
  color: inherit;
}

.error-display__stack,
.error-display__context {
  background-color: var(--code-background, #2d3748);
  color: var(--code-color, #e2e8f0);
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin-top: 0.5rem;
  font-family: 'Courier New', monospace;
}

.error-display__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.error-display__action {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.error-display__action--primary {
  background-color: var(--primary-color, #3182ce);
  color: white;
}

.error-display__action--primary:hover {
  background-color: var(--primary-hover, #2c5282);
}

.error-display__action--secondary {
  background-color: var(--secondary-color, #718096);
  color: white;
}

.error-display__action--secondary:hover {
  background-color: var(--secondary-hover, #4a5568);
}

.error-display__action--outline {
  background-color: transparent;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-color, #2d3748);
}

.error-display__action--outline:hover {
  background-color: var(--hover-background, #f7fafc);
}

.error-display__action--danger {
  background-color: var(--danger-color, #e53e3e);
  color: white;
}

.error-display__action--danger:hover {
  background-color: var(--danger-hover, #c53030);
}

/* Responsive design */
@media (max-width: 640px) {
  .error-display {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .error-display__icon {
    align-self: flex-start;
    margin-top: 0;
  }

  .error-display__actions {
    flex-direction: column;
    width: 100%;
  }

  .error-display__action {
    width: 100%;
    justify-content: center;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-display {
    background-color: var(--dark-background, #1a202c);
    color: var(--dark-text, #e2e8f0);
  }

  .error-display__stack,
  .error-display__context {
    background-color: var(--dark-code-background, #2d3748);
    color: var(--dark-code-color, #e2e8f0);
  }
}
</style>
