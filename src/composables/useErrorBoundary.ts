import { ref, reactive, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { ErrorSeverity, createErrorContext, logErrorWithContext } from '../utils/errorContext'
import { formatUnknownError } from '../utils/errorHelpers'

export interface UseErrorBoundaryOptions {
  /** Enable global error handling */
  enableGlobal?: boolean
  /** Enable automatic error recovery */
  enableRecovery?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
  /** Error severity level */
  severity?: ErrorSeverity
  /** Component name for error tracking */
  component?: string
  /** Operation name for error tracking */
  operation?: string
  /** Function to determine if error should be retried */
  shouldRetry?: (error: unknown) => boolean
}

export interface RecoveryOption {
  label: string
  action: () => Promise<void> | void
  shortcut?: string
  primary?: boolean
  disabled?: boolean
  processing?: string
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: unknown
  errorInfo: ReturnType<typeof formatUnknownError> | null
  retryCount: number
  isRetrying: boolean
  isDismissing: boolean
}

export interface UseErrorBoundaryReturn {
  // State
  state: ErrorBoundaryState

  // Computed properties
  hasError: Ref<boolean>
  error: Ref<unknown>
  errorInfo: Ref<ReturnType<typeof formatUnknownError> | null>
  retryCount: Ref<number>
  isRetrying: Ref<boolean>
  isDismissing: Ref<boolean>

  // Methods
  handleError: (error: unknown, context?: Record<string, unknown>) => void
  clearError: () => void
  retry: () => Promise<void>
  dismiss: () => void

  // Recovery methods
  addRecoveryOption: (option: RecoveryOption) => void
  removeRecoveryOption: (label: string) => void
  recoveryOptions: Ref<RecoveryOption[]>

  // Error classification
  isPermissionError: Ref<boolean>
  isNetworkError: Ref<boolean>
  isTimeoutError: Ref<boolean>
  isSessionError: Ref<boolean>
  isRecoverableError: Ref<boolean>
}

export function useErrorBoundary(options: UseErrorBoundaryOptions = {}): UseErrorBoundaryReturn {
  const {
    enableGlobal = true,
    enableRecovery = true,
    maxRetries = 3,
    severity = ErrorSeverity.HIGH,
    component = 'Component',
    operation = 'render',
    shouldRetry = () => true,
  } = options

  // State
  const state = reactive<ErrorBoundaryState>({
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
    isRetrying: false,
    isDismissing: false,
  })

  // Refs for reactive state
  const hasError = computed(() => state.hasError)
  const error = computed(() => state.error)
  const errorInfo = computed(() => state.errorInfo)
  const retryCount = computed(() => state.retryCount)
  const isRetrying = computed(() => state.isRetrying)
  const isDismissing = computed(() => state.isDismissing)

  // Recovery options
  const recoveryOptions = ref<RecoveryOption[]>([])

  // Error classification flags
  const isPermissionError = ref(false)
  const isNetworkError = ref(false)
  const isTimeoutError = ref(false)
  const isSessionError = ref(false)
  const isRecoverableError = ref(false)

  // Global error handler
  const handleGlobalError = (event: ErrorEvent) => {
    if (!enableGlobal) return

    handleError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  }

  // Unhandled promise rejection handler
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!enableGlobal) return

    handleError(event.reason, {
      promise: event.promise,
    })
  }

  // Main error handler
  const handleError = (error: unknown, context: Record<string, unknown> = {}) => {
    // Update state
    state.hasError = true
    state.error = error
    state.errorInfo = formatUnknownError(error)

    // Set error classification flags
    updateErrorClassification(error)

    // Create error context for logging
    createErrorContext(operation, component, severity, {
      context: {
        ...context,
        recoveryOptions: recoveryOptions.value,
        hasRecovery: recoveryOptions.value.length > 0,
      },
      state: {
        hasError: true,
        retryCount: state.retryCount,
        maxRetries,
      },
    })

    // Log the error
    logErrorWithContext(
      console,
      `Error occurred in ${component}`,
      error,
      operation,
      component,
      severity,
      {
        context,
        duration: context.duration as number,
        includeStack: true,
      }
    )

    // Check if error is recoverable
    isRecoverableError.value = enableRecovery && shouldRetry(error)
  }

  // Update error classification based on error type
  const updateErrorClassification = (error: unknown) => {
    isPermissionError.value = isPermissionErrorFunc(error)
    isNetworkError.value = isNetworkErrorFunc(error)
    isTimeoutError.value = isTimeoutErrorFunc(error)
    isSessionError.value = isSessionErrorFunc(error)
  }

  // Error classification functions (from errorHelpers)
  const isPermissionErrorFunc = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false
    return (
      error.name === 'NotAllowedError' ||
      error.name === 'PermissionDeniedError' ||
      error.name === 'SecurityError'
    )
  }

  const isNetworkErrorFunc = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false
    return (
      error.name === 'NetworkError' ||
      error.name === 'TypeError' ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('connection')
    )
  }

  const isTimeoutErrorFunc = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false
    const timeoutErrorNames = ['TimeoutError', 'AbortError', 'RequestTimeout', 'GatewayTimeout']
    const message = error.message.toLowerCase()
    return (
      timeoutErrorNames.some((name) => error.name === name) ||
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('deadline exceeded')
    )
  }

  const isSessionErrorFunc = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false
    const sessionErrorNames = [
      'RequestTimeout',
      'SessionDescriptionHandlerError',
      'InviteClientError',
      'ServerError',
    ]
    const message = error.message.toLowerCase()
    return (
      sessionErrorNames.some((name) => error.name === name) ||
      message.includes('session') ||
      message.includes('invite') ||
      message.includes('byedone') ||
      message.includes('prack') ||
      message.includes('ack')
    )
  }

  // Clear error
  const clearError = () => {
    state.hasError = false
    state.error = null
    state.errorInfo = null
    state.retryCount = 0
    state.isRetrying = false
    state.isDismissing = false
  }

  // Retry error
  const retry = async (): Promise<void> => {
    if (
      !state.hasError ||
      state.retryCount >= maxRetries ||
      !enableRecovery ||
      !shouldRetry(state.error)
    ) {
      clearError()
      return
    }

    state.isRetrying = true
    state.retryCount++

    try {
      // Trigger retry actions from recovery options
      const retryOption = recoveryOptions.value.find(
        (option) =>
          option.label.toLowerCase().includes('retry') ||
          option.label.toLowerCase().includes('refresh')
      )

      if (retryOption) {
        await retryOption.action()
      }

      // Clear error if retry was successful
      clearError()
    } catch (retryError) {
      // Check if we should continue retrying
      if (state.retryCount >= maxRetries || !shouldRetry(retryError)) {
        state.error = retryError
        state.errorInfo = formatUnknownError(retryError)
        updateErrorClassification(retryError)
      } else {
        // Keep current error, increment retry count
        state.error = retryError
        state.errorInfo = formatUnknownError(retryError)
        updateErrorClassification(retryError)
      }
    } finally {
      state.isRetrying = false
    }
  }

  // Dismiss error
  const dismiss = () => {
    state.isDismissing = true
    setTimeout(() => {
      clearError()
      state.isDismissing = false
    }, 300) // Allow time for dismissal animation
  }

  // Add recovery option
  const addRecoveryOption = (option: RecoveryOption) => {
    const existingIndex = recoveryOptions.value.findIndex((opt) => opt.label === option.label)
    if (existingIndex > -1) {
      recoveryOptions.value[existingIndex] = option
    } else {
      recoveryOptions.value.push(option)
    }
  }

  // Remove recovery option
  const removeRecoveryOption = (label: string) => {
    const index = recoveryOptions.value.findIndex((opt) => opt.label === label)
    if (index > -1) {
      recoveryOptions.value.splice(index, 1)
    }
  }

  // Setup global error handlers
  onMounted(() => {
    if (enableGlobal) {
      window.addEventListener('error', handleGlobalError)
      window.addEventListener('unhandledrejection', handleUnhandledRejection)
    }
  })

  // Cleanup global error handlers
  onUnmounted(() => {
    if (enableGlobal) {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  })

  return {
    state,
    hasError,
    error,
    errorInfo,
    retryCount,
    isRetrying,
    isDismissing,
    handleError,
    clearError,
    retry,
    dismiss,
    addRecoveryOption,
    removeRecoveryOption,
    recoveryOptions,
    isPermissionError,
    isNetworkError,
    isTimeoutError,
    isSessionError,
    isRecoverableError,
  }
}
