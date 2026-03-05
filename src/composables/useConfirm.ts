/**
 * Confirmation Dialog Composable
 *
 * Provides a reusable confirmation dialog system for dangerous or irreversible
 * actions like ending calls, leaving conferences, or deleting recordings.
 *
 * @module composables/useConfirm
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * Confirmation dialog options
 */
export interface ConfirmOptions {
  /** Confirmation title */
  title?: string
  /** Confirmation message */
  message: string
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Confirm button variant */
  variant?: 'primary' | 'danger' | 'warning' | 'info'
  /** Show cancel button */
  showCancel?: boolean
  /** Dialog width */
  width?: string
  /** Custom icon */
  icon?: string
  /** Close on click outside */
  closeOnClickOutside?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Confirmation result
 */
export interface ConfirmResult {
  confirmed: boolean
  payload?: unknown
}

/**
 * Return type for useConfirm composable
 */
export interface UseConfirmReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Whether the confirmation dialog is currently visible */
  isOpen: Ref<boolean>
  /** Current confirmation options */
  options: Ref<ConfirmOptions | null>
  /** Whether a confirmation is pending */
  isConfirming: Ref<boolean>

  // ============================================================================
  // Computed
  // ============================================================================

  /** Check if dialog is visible */
  isVisible: ComputedRef<boolean>

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Open confirmation dialog and return a promise that resolves with the result
   */
  confirm: (options: ConfirmOptions) => Promise<ConfirmResult>
  /**
   * Open confirmation dialog with callback-style handler
   */
  confirmAsync: (options: ConfirmOptions, onConfirm: () => Promise<void>, onCancel?: () => void) => Promise<void>
  /**
   * Close the confirmation dialog
   */
  close: () => void
  /**
   * Confirm the current dialog
   */
  confirmCurrent: (payload?: unknown) => void
  /**
   * Cancel the current dialog
   */
  cancelCurrent: () => void
  /**
   * Reset the composable state
   */
  reset: () => void
}

/**
 * Default confirmation options
 */
const DEFAULT_OPTIONS: Required<ConfirmOptions> = {
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'primary',
  showCancel: true,
  width: '400px',
  icon: '',
  closeOnClickOutside: true,
  className: '',
}

// Singleton state for cross-component confirmation dialogs
let globalConfirmResolve: ((result: ConfirmResult) => void) | null = null

/**
 * Confirmation Dialog Composable
 *
 * Provides a reusable confirmation dialog system for dangerous or irreversible
 * actions. Uses a singleton pattern to allow calling from anywhere in the app.
 *
 * @param options - Default options for all confirmations
 * @returns Confirmation dialog methods and state
 *
 * @example
 * ```typescript
 * const { confirm, isOpen } = useConfirm()
 *
 * // Simple confirmation
 * const result = await confirm({
 *   message: 'End this call?',
 *   variant: 'danger'
 * })
 *
 * if (result.confirmed) {
 *   // User confirmed
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Callback-style
 * await confirmAsync(
 *   { message: 'Leave conference?' },
 *   () => leaveConference(),
 *   () => console.log('Cancelled')
 * )
 * ```
 */
export function useConfirm(options?: Partial<ConfirmOptions>): UseConfirmReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  const isOpen = ref<boolean>(false)
  const currentOptions = ref<ConfirmOptions | null>(null)
  const isConfirming = ref<boolean>(false)
  const currentPayload = ref<unknown>(undefined)

  // ============================================================================
  // Computed
  // ============================================================================

  const isVisible = computed(() => isOpen.value)

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Merge options with defaults
   */
  const mergeOptions = (opts: ConfirmOptions): Required<ConfirmOptions> => {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      ...opts,
    }
  }

  /**
   * Resolve the current confirmation
   */
  const resolveConfirmation = (confirmed: boolean, payload?: unknown): void => {
    if (globalConfirmResolve) {
      globalConfirmResolve({
        confirmed,
        payload: payload ?? currentPayload.value,
      })
      globalConfirmResolve = null
    }
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Open confirmation dialog and return a promise
   */
  const confirm = (opts: ConfirmOptions): Promise<ConfirmResult> => {
    return new Promise((resolve) => {
      // Store resolver for this confirmation
      globalConfirmResolve = resolve

      // Set options and open dialog
      currentOptions.value = mergeOptions(opts)
      currentPayload.value = undefined
      isOpen.value = true

      // Clean up after a timeout as safety net (60 seconds)
      setTimeout(() => {
        if (globalConfirmResolve === resolve) {
          resolve({ confirmed: false })
          globalConfirmResolve = null
          isOpen.value = false
        }
      }, 60000)
    })
  }

  /**
   * Callback-style confirmation
   */
  const confirmAsync = async (
    opts: ConfirmOptions,
    onConfirm: () => Promise<void>,
    onCancel?: () => void
  ): Promise<void> => {
    const result = await confirm(opts)

    if (result.confirmed) {
      try {
        isConfirming.value = true
        await onConfirm()
      } finally {
        isConfirming.value = false
      }
    } else if (onCancel) {
      onCancel()
    }

    close()
  }

  /**
   * Close the dialog
   */
  const close = (): void => {
    resolveConfirmation(false)
    isOpen.value = false
    currentOptions.value = null
    currentPayload.value = undefined
  }

  /**
   * Confirm current dialog
   */
  const confirmCurrent = (payload?: unknown): void => {
    resolveConfirmation(true, payload)
    isOpen.value = false
    currentOptions.value = null
    currentPayload.value = undefined
  }

  /**
   * Cancel current dialog
   */
  const cancelCurrent = (): void => {
    resolveConfirmation(false)
    isOpen.value = false
    currentOptions.value = null
    currentPayload.value = undefined
  }

  /**
   * Reset state
   */
  const reset = (): void => {
    globalConfirmResolve = null
    isOpen.value = false
    currentOptions.value = null
    isConfirming.value = false
    currentPayload.value = undefined
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    isOpen,
    options: currentOptions,
    isConfirming,

    // Computed
    isVisible,

    // Methods
    confirm,
    confirmAsync,
    close,
    confirmCurrent,
    cancelCurrent,
    reset,
  }
}

/**
 * Create a simple confirmation dialog for common actions
 * Useful for quick confirmations without setup
 *
 * @example
 * ```typescript
 * import { confirmEndCall, confirmLeaveConference, confirmDeleteRecording } from './useConfirm'
 *
 * // Quick confirmations
 * if (await confirmEndCall()) {
 *   endCall()
 * }
 *
 * await confirmLeaveConference(conferenceId)
 * ```
 */

/**
 * Confirm ending a call
 */
export const confirmEndCall = (): Promise<ConfirmResult> => {
  const { confirm } = useConfirm()
  return confirm({
    title: 'End Call',
    message: 'Are you sure you want to end this call?',
    confirmText: 'End Call',
    variant: 'danger',
  })
}

/**
 * Confirm leaving a conference
 */
export const confirmLeaveConference = (conferenceName?: string): Promise<ConfirmResult> => {
  const { confirm } = useConfirm()
  return confirm({
    title: 'Leave Conference',
    message: conferenceName
      ? `Are you sure you want to leave "${conferenceName}"?`
      : 'Are you sure you want to leave this conference?',
    confirmText: 'Leave',
    variant: 'warning',
  })
}

/**
 * Confirm deleting a recording
 */
export const confirmDeleteRecording = (recordingName?: string): Promise<ConfirmResult> => {
  const { confirm } = useConfirm()
  return confirm({
    title: 'Delete Recording',
    message: recordingName
      ? `Are you sure you want to delete "${recordingName}"? This action cannot be undone.`
      : 'Are you sure you want to delete this recording? This action cannot be undone.',
    confirmText: 'Delete',
    variant: 'danger',
  })
}

/**
 * Confirm muting a participant
 */
export const confirmMuteParticipant = (participantName: string): Promise<ConfirmResult> => {
  const { confirm } = useConfirm()
  return confirm({
    title: 'Mute Participant',
    message: `Are you sure you want to mute ${participantName}?`,
    confirmText: 'Mute',
    variant: 'warning',
  })
}

/**
 * Confirm removing a participant
 */
export const confirmRemoveParticipant = (participantName: string): Promise<ConfirmResult> => {
  const { confirm } = useConfirm()
  return confirm({
    title: 'Remove Participant',
    message: `Are you sure you want to remove ${participantName} from the call?`,
    confirmText: 'Remove',
    variant: 'danger',
  })
}

/**
 * Confirm transferring a call
 */
export const confirmTransferCall = (target: string): Promise<ConfirmResult> => {
  const { confirm } = useConfirm()
  return confirm({
    title: 'Transfer Call',
    message: `Are you sure you want to transfer this call to ${target}?`,
    confirmText: 'Transfer',
    variant: 'info',
  })
}

/**
 * Confirm enabling recording
 */
export const confirmStartRecording = (): Promise<ConfirmResult> => {
  const { confirm } = useConfirm()
  return confirm({
    title: 'Start Recording',
    message: 'Are you sure you want to start recording this call?',
    confirmText: 'Start Recording',
    variant: 'info',
  })
}
