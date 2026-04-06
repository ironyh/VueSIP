<template>
  <div class="error-boundary">
    <!-- Error display slot when an error occurs -->
    <slot v-if="error" name="error" :error="error" :error-info="errorInfo" :retry="handleRetry">
      <!-- Default error display -->
      <div class="error-boundary__fallback">
        <div class="error-boundary__icon">⚠️</div>
        <h3 class="error-boundary__title">
          {{ errorTitle || 'Something went wrong' }}
        </h3>
        <p class="error-boundary__message">
          {{ errorDescription || 'We encountered an unexpected error. Please try again.' }}
        </p>
        <div v-if="showDetails" class="error-boundary__details">
          <details>
            <summary>Error details</summary>
            <pre class="error-boundary__stack">{{ errorInfo?.stack }}</pre>
          </details>
        </div>
        <div class="error-boundary__actions">
          <button @click="handleRetry" class="error-boundary__retry">
            {{ retryButtonText || 'Try Again' }}
          </button>
          <button @click="handleDismiss" class="error-boundary__dismiss">
            {{ dismissButtonText || 'Dismiss' }}
          </button>
        </div>
      </div>
    </slot>

    <!-- Normal content slot when no error -->
    <slot v-else></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { ErrorSeverity, createErrorContext, formatError } from '../utils/errorContext'
import { formatUnknownError } from '../utils/errorHelpers'

export interface ErrorBoundaryProps {
  /** Custom error title */
  errorTitle?: string
  /** Custom error description */
  errorDescription?: string
  /** Retry button text */
  retryButtonText?: string
  /** Dismiss button text */
  dismissButtonText?: string
  /** Show error details (stack trace) */
  showDetails?: boolean
  /** Component name for error tracking */
  component?: string
  /** Operation name for error tracking */
  operation?: string
  /** Error severity level */
  severity?: ErrorSeverity
  /** Whether to allow retry */
  allowRetry?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
  /** Function to determine if error should be retried */
  shouldRetry?: (error: unknown) => boolean
}

const props = withDefaults(defineProps<ErrorBoundaryProps>(), {
  errorTitle: 'Something went wrong',
  errorDescription: 'We encountered an unexpected error. Please try again.',
  retryButtonText: 'Try Again',
  dismissButtonText: 'Dismiss',
  showDetails: false,
  component: 'ErrorBoundary',
  operation: 'render',
  severity: ErrorSeverity.HIGH,
  allowRetry: true,
  maxRetries: 3,
  shouldRetry: () => true,
})

const emit = defineEmits<{
  error: [error: unknown, errorInfo: unknown]
  retry: []
  dismiss: []
}>()

const error = ref<unknown>(null)
const retryCount = ref(0)
const errorInfo = ref<ReturnType<typeof formatUnknownError> | null>(null)

onErrorCaptured((err, instance, info) => {
  error.value = err
  errorInfo.value = formatUnknownError(err)

  // Create error context
  const context = createErrorContext(
    props.operation || 'render',
    props.component || 'ErrorBoundary',
    props.severity,
    {
      context: {
        component: instance?.$options?.name || 'Unknown',
        info,
        retryCount: retryCount.value,
        allowRetry: props.allowRetry,
        maxRetries: props.maxRetries,
      },
      state: {
        hasError: true,
        retryCount: retryCount.value,
      },
    }
  )

  // Log the error with context
  const formattedError = formatError(`Error captured in ${props.component}`, err, context)

  // TODO: Integrate with global error logger
  console.error('ErrorBoundary caught error:', formattedError)

  // Emit error event
  emit('error', err, errorInfo.value)

  return false // Prevent error from propagating further
})

const handleRetry = () => {
  if (!props.allowRetry || retryCount.value >= props.maxRetries) {
    handleDismiss()
    return
  }

  // Check if error should be retried
  if (!props.shouldRetry(error.value)) {
    handleDismiss()
    return
  }

  retryCount.value++

  // Clear error to allow retry
  error.value = null
  errorInfo.value = null

  // Emit retry event
  emit('retry')
}

const handleDismiss = () => {
  // Clear error
  error.value = null
  errorInfo.value = null
  retryCount.value = 0

  // Emit dismiss event
  emit('dismiss')
}
</script>

<style scoped>
.error-boundary {
  display: block;
  width: 100%;
}

.error-boundary__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 2px solid var(--error-color, #e53e3e);
  border-radius: 8px;
  background-color: var(--error-background, #fed7d7);
  color: var(--error-text, #742a2a);
  text-align: center;
  min-height: 200px;
}

.error-boundary__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-boundary__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--error-title-color, #742a2a);
}

.error-boundary__message {
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
  max-width: 400px;
}

.error-boundary__details {
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 500px;
}

.error-boundary__stack {
  background-color: var(--code-background, #2d3748);
  color: var(--code-color, #e2e8f0);
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-boundary__actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.error-boundary__retry,
.error-boundary__dismiss {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.error-boundary__retry {
  background-color: var(--retry-button-bg, #3182ce);
  color: white;
}

.error-boundary__retry:hover {
  background-color: var(--retry-button-hover, #2c5282);
}

.error-boundary__dismiss {
  background-color: var(--dismiss-button-bg, #718096);
  color: white;
}

.error-boundary__dismiss:hover {
  background-color: var(--dismiss-button-hover, #4a5568);
}

/* Responsive design */
@media (max-width: 640px) {
  .error-boundary__fallback {
    padding: 1.5rem;
  }

  .error-boundary__title {
    font-size: 1.25rem;
  }

  .error-boundary__message {
    font-size: 0.875rem;
    padding: 0 1rem;
  }

  .error-boundary__actions {
    flex-direction: column;
    width: 100%;
  }

  .error-boundary__retry,
  .error-boundary__dismiss {
    width: 100%;
  }
}
</style>
