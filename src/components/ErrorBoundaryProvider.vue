<template>
  <ErrorBoundary
    :error-title="errorTitle"
    :error-description="errorDescription"
    :show-details="showDetails"
    :component="component"
    :severity="severity"
    :allow-retry="allowRetry"
    :max-retries="maxRetries"
    @error="onError"
    @retry="onRetry"
    @dismiss="onDismiss"
  >
    <slot></slot>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { provide, reactive, onMounted, onUnmounted } from 'vue'
import { ErrorSeverity } from '../utils/errorContext'
import ErrorBoundary from './ErrorBoundary.vue'

export interface ErrorBoundaryProviderOptions {
  /** Enable global window error handlers */
  enableGlobal?: boolean
  /** Error boundary props */
  errorTitle?: string
  errorDescription?: string
  showDetails?: boolean
  component?: string
  severity?: ErrorSeverity
  allowRetry?: boolean
  maxRetries?: number
  /** Auto-dismiss notifications after timeout (ms) */
  autoDismissTimeout?: number
}

const {
  enableGlobal = true,
  errorTitle,
  errorDescription,
  showDetails = false,
  component = 'ErrorBoundaryProvider',
  severity = ErrorSeverity.HIGH,
  allowRetry = true,
  maxRetries = 3,
} = defineProps<ErrorBoundaryProviderOptions>()

const emit = defineEmits<{
  error: [error: unknown, info: unknown]
  retry: []
  dismiss: []
  globalError: [error: unknown]
}>()

// Shared error state for children via inject
const errorState = reactive({
  lastError: null as unknown,
  errorCount: 0,
})

provide('errorBoundaryState', errorState)

const onError = (error: unknown, info: unknown) => {
  errorState.lastError = error
  errorState.errorCount++
  emit('error', error, info)
}

const onRetry = () => {
  emit('retry')
}

const onDismiss = () => {
  errorState.lastError = null
  emit('dismiss')
}

// Global error handlers
const handleGlobalError = (event: ErrorEvent) => {
  if (!enableGlobal) return
  errorState.lastError = event.error
  errorState.errorCount++
  emit('globalError', event.error)
}

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  if (!enableGlobal) return
  errorState.lastError = event.reason
  errorState.errorCount++
  emit('globalError', event.reason)
}

onMounted(() => {
  if (enableGlobal) {
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
  }
})

onUnmounted(() => {
  if (enableGlobal) {
    window.removeEventListener('error', handleGlobalError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
})
</script>
