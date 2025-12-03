/**
 * AMI Callback Queue Composable
 *
 * Vue composable for managing scheduled callback queues via AMI.
 * Supports scheduling callbacks, automatic execution, and AstDB persistence.
 *
 * @module composables/useAmiCallback
 */

import { ref, computed, onUnmounted } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  CallbackStatus,
  CallbackPriority,
  CallbackRequest,
  CallbackQueueStats,
  ScheduleCallbackOptions,
  ExecuteCallbackOptions,
  UseAmiCallbackOptions,
  UseAmiCallbackReturn,
} from '@/types/callback.types'
import type { AmiMessage, AmiHangupEvent, AmiNewStateEvent } from '@/types/ami.types'
import { ChannelState } from '@/types/ami.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiCallback')

// Re-export types for convenience
export type {
  CallbackStatus,
  CallbackPriority,
  CallbackRequest,
  CallbackQueueStats,
  ScheduleCallbackOptions,
  ExecuteCallbackOptions,
  UseAmiCallbackOptions,
  UseAmiCallbackReturn,
}

/**
 * Generate a unique callback ID
 */
function generateCallbackId(): string {
  return `cb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Validate phone number format
 * Allows digits, plus sign, hyphens, parentheses, spaces
 */
function isValidPhoneNumber(number: string): boolean {
  if (!number || number.length < 3 || number.length > 32) {
    return false
  }
  // Allow digits, +, -, (), spaces, and extension notation (x, ext)
  return /^[\d\s+\-().]+(?:\s*(?:x|ext\.?)\s*\d+)?$/i.test(number)
}

/**
 * Sanitize user input to prevent XSS when displayed in UI
 * Removes HTML tags and trims whitespace
 */
function sanitizeInput(input: string | undefined): string | undefined {
  if (!input) return input
  // Remove HTML tags and trim
  return input.replace(/<[^>]*>/g, '').trim()
}

/**
 * Priority weight for sorting
 */
const PRIORITY_WEIGHT: Record<CallbackPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
}

/**
 * AMI Callback Queue Composable
 *
 * Provides reactive callback queue management for Vue components.
 * Supports scheduling, execution, and persistence via AstDB.
 *
 * @param client - AMI client instance (from useAmi().getClient())
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * await ami.connect({ url: 'ws://pbx.example.com:8080' })
 *
 * const {
 *   callbacks,
 *   pendingCallbacks,
 *   scheduleCallback,
 *   executeCallback,
 *   executeNext,
 * } = useAmiCallback(ami.getClient()!, {
 *   defaultQueue: 'sales',
 *   defaultMaxAttempts: 3,
 *   autoExecute: true,
 *   onCallbackCompleted: (cb) => console.log('Callback completed:', cb.callerNumber),
 * })
 *
 * // Schedule a callback
 * await scheduleCallback({
 *   callerNumber: '+1-555-123-4567',
 *   callerName: 'John Doe',
 *   reason: 'Sales inquiry',
 *   priority: 'high',
 * })
 *
 * // Execute next pending callback
 * await executeNext()
 * ```
 */
export function useAmiCallback(
  client: AmiClient | null,
  options: UseAmiCallbackOptions = {}
): UseAmiCallbackReturn {
  // ============================================================================
  // Configuration with defaults
  // ============================================================================

  const config = {
    defaultQueue: options.defaultQueue ?? 'default',
    defaultCallerId: options.defaultCallerId ?? 'Callback',
    defaultMaxAttempts: options.defaultMaxAttempts ?? 3,
    defaultTimeout: options.defaultTimeout ?? 30,
    defaultContext: options.defaultContext ?? 'from-internal',
    retryDelay: options.retryDelay ?? 300, // 5 minutes
    autoExecute: options.autoExecute ?? false,
    autoExecuteInterval: options.autoExecuteInterval ?? 60000, // 1 minute
    storage: {
      dbFamily: options.storage?.dbFamily ?? 'vuesip/callbacks',
      maxInMemory: options.storage?.maxInMemory ?? 1000,
      cleanupAge: options.storage?.cleanupAge ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      persistEnabled: options.storage?.persistEnabled ?? true,
    },
    onCallbackAdded: options.onCallbackAdded,
    onCallbackStarted: options.onCallbackStarted,
    onCallbackCompleted: options.onCallbackCompleted,
    onCallbackFailed: options.onCallbackFailed,
    onCallbackCancelled: options.onCallbackCancelled,
  }

  // ============================================================================
  // State
  // ============================================================================

  const callbacks = ref<CallbackRequest[]>([])
  const activeCallback = ref<CallbackRequest | null>(null)
  const stats = ref<CallbackQueueStats>({
    pending: 0,
    scheduled: 0,
    inProgress: 0,
    completedToday: 0,
    failedToday: 0,
    avgCallbackTime: 0,
    successRate: 0,
    byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const autoExecuteEnabled = ref(config.autoExecute)

  // Timers and cleanups
  let autoExecuteTimer: ReturnType<typeof setInterval> | null = null
  let callbackTimer: ReturnType<typeof setInterval> | null = null
  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const pendingCallbacks = computed(() =>
    callbacks.value
      .filter((cb) => cb.status === 'pending' || cb.status === 'scheduled')
      .filter((cb) => !cb.scheduledAt || cb.scheduledAt <= new Date())
      .sort((a, b) => {
        // Sort by priority (highest first), then by requested time (oldest first)
        const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.requestedAt.getTime() - b.requestedAt.getTime()
      })
  )

  const scheduledCallbacks = computed(() =>
    callbacks.value
      .filter((cb) => cb.status === 'scheduled' && cb.scheduledAt && cb.scheduledAt > new Date())
      .sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0))
  )

  const completedCallbacks = computed(() =>
    callbacks.value.filter((cb) => cb.status === 'completed')
  )

  const failedCallbacks = computed(() =>
    callbacks.value.filter((cb) => cb.status === 'failed')
  )

  const isExecuting = computed(() => activeCallback.value !== null)

  const nextCallback = computed(() => pendingCallbacks.value[0] ?? null)

  const pendingCount = computed(() => pendingCallbacks.value.length)

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Update callback stats
   */
  const refreshStats = (): void => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const pending = callbacks.value.filter(
      (cb) => cb.status === 'pending' && (!cb.scheduledAt || cb.scheduledAt <= now)
    )
    const scheduled = callbacks.value.filter(
      (cb) => cb.status === 'scheduled' && cb.scheduledAt && cb.scheduledAt > now
    )
    const inProgress = callbacks.value.filter((cb) => cb.status === 'in_progress')
    const completedToday = callbacks.value.filter(
      (cb) => cb.status === 'completed' && cb.completedAt && cb.completedAt >= todayStart
    )
    const failedToday = callbacks.value.filter(
      (cb) => cb.status === 'failed' && cb.completedAt && cb.completedAt >= todayStart
    )

    // Calculate average callback time
    const completedWithDuration = callbacks.value.filter(
      (cb) => cb.status === 'completed' && cb.duration !== undefined
    )
    const avgCallbackTime =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, cb) => sum + (cb.duration ?? 0), 0) /
          completedWithDuration.length
        : 0

    // Calculate success rate
    const totalAttempted = completedToday.length + failedToday.length
    const successRate = totalAttempted > 0 ? (completedToday.length / totalAttempted) * 100 : 0

    // Count by priority
    const byPriority: Record<CallbackPriority, number> = { low: 0, normal: 0, high: 0, urgent: 0 }
    pending.forEach((cb) => {
      byPriority[cb.priority]++
    })

    stats.value = {
      pending: pending.length,
      scheduled: scheduled.length,
      inProgress: inProgress.length,
      completedToday: completedToday.length,
      failedToday: failedToday.length,
      avgCallbackTime: Math.round(avgCallbackTime),
      successRate: Math.round(successRate * 10) / 10,
      byPriority,
    }
  }

  /**
   * Update a callback in the list
   */
  const updateCallback = (callbackId: string, updates: Partial<CallbackRequest>): void => {
    const idx = callbacks.value.findIndex((cb) => cb.id === callbackId)
    const existing = callbacks.value[idx]
    if (idx !== -1 && existing) {
      callbacks.value[idx] = {
        ...existing,
        ...updates,
        // Ensure required fields are never undefined
        id: existing.id,
        callerNumber: existing.callerNumber,
        priority: updates.priority ?? existing.priority,
        status: updates.status ?? existing.status,
        attempts: updates.attempts ?? existing.attempts,
        maxAttempts: updates.maxAttempts ?? existing.maxAttempts,
        requestedAt: updates.requestedAt ?? existing.requestedAt,
      }
      refreshStats()
    }
  }

  /**
   * Start callback duration timer
   */
  const startCallbackTimer = (callbackId: string): void => {
    if (callbackTimer) {
      clearInterval(callbackTimer)
    }
    const startTime = Date.now()
    callbackTimer = setInterval(() => {
      const cb = callbacks.value.find((c) => c.id === callbackId)
      if (cb && cb.status === 'in_progress') {
        updateCallback(callbackId, {
          duration: Math.floor((Date.now() - startTime) / 1000),
        })
      }
    }, 1000)
  }

  /**
   * Stop callback duration timer
   */
  const stopCallbackTimer = (): void => {
    if (callbackTimer) {
      clearInterval(callbackTimer)
      callbackTimer = null
    }
  }

  /**
   * Complete a callback
   */
  const completeCallback = (
    callbackId: string,
    disposition: CallbackRequest['disposition']
  ): void => {
    const cb = callbacks.value.find((c) => c.id === callbackId)
    if (!cb) return

    stopCallbackTimer()

    const updates: Partial<CallbackRequest> = {
      status: disposition === 'answered' ? 'completed' : 'failed',
      completedAt: new Date(),
      disposition,
    }

    updateCallback(callbackId, updates)

    if (activeCallback.value?.id === callbackId) {
      activeCallback.value = null
    }

    // Trigger callbacks
    const updatedCb = callbacks.value.find((c) => c.id === callbackId)
    if (updatedCb) {
      if (updates.status === 'completed') {
        config.onCallbackCompleted?.(updatedCb)
        logger.debug('Callback completed', { callbackId, disposition })
      } else {
        // Check if we should retry
        if (cb.attempts < cb.maxAttempts) {
          // Schedule retry
          updateCallback(callbackId, {
            status: 'pending',
            scheduledAt: new Date(Date.now() + config.retryDelay * 1000),
          })
          logger.debug('Callback retry scheduled', {
            callbackId,
            attempt: cb.attempts,
            maxAttempts: cb.maxAttempts,
          })
        } else {
          config.onCallbackFailed?.(updatedCb, `Max attempts (${cb.maxAttempts}) reached`)
          logger.debug('Callback failed after max attempts', { callbackId })
        }
      }
    }
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Schedule a new callback
   */
  const scheduleCallback = async (
    scheduleOptions: ScheduleCallbackOptions
  ): Promise<CallbackRequest> => {
    if (!isValidPhoneNumber(scheduleOptions.callerNumber)) {
      throw new Error('Invalid phone number format')
    }

    const callback: CallbackRequest = {
      id: generateCallbackId(),
      callerNumber: scheduleOptions.callerNumber,
      callerName: sanitizeInput(scheduleOptions.callerName),
      targetQueue: sanitizeInput(scheduleOptions.targetQueue) ?? config.defaultQueue,
      targetAgent: sanitizeInput(scheduleOptions.targetAgent),
      reason: sanitizeInput(scheduleOptions.reason),
      priority: scheduleOptions.priority ?? 'normal',
      status: scheduleOptions.scheduledAt ? 'scheduled' : 'pending',
      requestedAt: new Date(),
      scheduledAt: scheduleOptions.scheduledAt,
      attempts: 0,
      maxAttempts: scheduleOptions.maxAttempts ?? config.defaultMaxAttempts,
      metadata: scheduleOptions.metadata,
    }

    callbacks.value.push(callback)
    refreshStats()

    config.onCallbackAdded?.(callback)
    logger.debug('Callback scheduled', {
      id: callback.id,
      callerNumber: callback.callerNumber,
      priority: callback.priority,
    })

    // Persist if enabled
    if (config.storage.persistEnabled && client) {
      try {
        await saveCallbackToDb(callback)
      } catch (err) {
        logger.warn('Failed to persist callback to AstDB', err)
      }
    }

    return callback
  }

  /**
   * Execute a specific callback
   */
  const executeCallback = async (
    callbackId: string,
    execOptions: ExecuteCallbackOptions = {}
  ): Promise<void> => {
    if (!client) {
      throw new Error('AMI client not connected')
    }

    if (isExecuting.value) {
      throw new Error('Another callback is already in progress')
    }

    const callback = callbacks.value.find((cb) => cb.id === callbackId)
    if (!callback) {
      throw new Error(`Callback not found: ${callbackId}`)
    }

    if (callback.status === 'completed' || callback.status === 'cancelled') {
      throw new Error(`Callback already ${callback.status}`)
    }

    isLoading.value = true
    error.value = null

    try {
      // Update status
      updateCallback(callbackId, {
        status: 'in_progress',
        attempts: callback.attempts + 1,
        executedAt: new Date(),
      })

      activeCallback.value = callbacks.value.find((cb) => cb.id === callbackId) ?? null

      if (activeCallback.value) {
        config.onCallbackStarted?.(activeCallback.value)
      }

      // Build originate parameters
      const callerId = execOptions.callerId ?? config.defaultCallerId
      const timeout = (execOptions.timeout ?? config.defaultTimeout) * 1000
      const context = execOptions.context ?? config.defaultContext
      const extension = execOptions.extension ?? 's'

      // Execute the callback via AMI Originate
      const result = await client.originate({
        channel: `Local/${callback.callerNumber}@${context}`,
        context: callback.targetQueue ? `queue-${callback.targetQueue}` : context,
        exten: extension,
        priority: 1,
        callerId: `${callerId} <${callback.callerNumber}>`,
        timeout,
        variables: {
          ...execOptions.variables,
          CALLBACK_ID: callbackId,
          CALLBACK_NUMBER: callback.callerNumber,
          CALLBACK_NAME: callback.callerName ?? '',
          CALLBACK_REASON: callback.reason ?? '',
        },
        async: true,
      })

      if (!result.success) {
        throw new Error(result.message || 'Failed to initiate callback')
      }

      // Update with channel info
      updateCallback(callbackId, { channel: result.channel })
      // Refresh activeCallback to include the channel
      activeCallback.value = callbacks.value.find((cb) => cb.id === callbackId) ?? null
      startCallbackTimer(callbackId)

      logger.debug('Callback execution started', {
        callbackId,
        channel: result.channel,
        callerNumber: callback.callerNumber,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute callback'
      error.value = errorMsg

      // Get updated callback with incremented attempts
      const updatedCallback = callbacks.value.find((cb) => cb.id === callbackId)
      const currentAttempts = updatedCallback?.attempts ?? callback.attempts + 1

      // Mark attempt as failed but allow retry if attempts remaining
      if (currentAttempts < callback.maxAttempts) {
        updateCallback(callbackId, {
          status: 'pending',
          scheduledAt: new Date(Date.now() + config.retryDelay * 1000),
        })
      } else {
        updateCallback(callbackId, {
          status: 'failed',
          completedAt: new Date(),
        })
        config.onCallbackFailed?.(updatedCallback ?? callback, errorMsg)
      }

      activeCallback.value = null
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Execute next pending callback
   */
  const executeNext = async (execOptions: ExecuteCallbackOptions = {}): Promise<void> => {
    const next = nextCallback.value
    if (!next) {
      throw new Error('No pending callbacks')
    }

    await executeCallback(next.id, execOptions)
  }

  /**
   * Cancel a callback
   */
  const cancelCallback = async (callbackId: string, reason?: string): Promise<void> => {
    const callback = callbacks.value.find((cb) => cb.id === callbackId)
    if (!callback) {
      throw new Error(`Callback not found: ${callbackId}`)
    }

    // If in progress, try to hang up
    if (callback.status === 'in_progress' && callback.channel && client) {
      try {
        await client.hangupChannel(callback.channel)
      } catch (err) {
        logger.warn('Failed to hangup callback channel', err)
      }
    }

    stopCallbackTimer()

    updateCallback(callbackId, {
      status: 'cancelled',
      completedAt: new Date(),
      notes: reason ? `Cancelled: ${reason}` : callback.notes,
    })

    if (activeCallback.value?.id === callbackId) {
      activeCallback.value = null
    }

    const cancelledCallback = callbacks.value.find((cb) => cb.id === callbackId)
    if (cancelledCallback) {
      config.onCallbackCancelled?.(cancelledCallback)
    }

    logger.debug('Callback cancelled', { callbackId, reason })
  }

  /**
   * Reschedule a callback
   */
  const rescheduleCallback = async (callbackId: string, newTime: Date): Promise<void> => {
    const callback = callbacks.value.find((cb) => cb.id === callbackId)
    if (!callback) {
      throw new Error(`Callback not found: ${callbackId}`)
    }

    if (callback.status === 'completed' || callback.status === 'cancelled') {
      throw new Error(`Cannot reschedule ${callback.status} callback`)
    }

    if (callback.status === 'in_progress') {
      throw new Error('Cannot reschedule callback in progress')
    }

    updateCallback(callbackId, {
      status: 'scheduled',
      scheduledAt: newTime,
    })

    logger.debug('Callback rescheduled', { callbackId, newTime })
  }

  /**
   * Update callback priority
   */
  const updatePriority = (callbackId: string, priority: CallbackPriority): void => {
    const callback = callbacks.value.find((cb) => cb.id === callbackId)
    if (!callback) {
      throw new Error(`Callback not found: ${callbackId}`)
    }

    updateCallback(callbackId, { priority })
    logger.debug('Callback priority updated', { callbackId, priority })
  }

  /**
   * Add notes to callback
   */
  const addNotes = (callbackId: string, notes: string): void => {
    const callback = callbacks.value.find((cb) => cb.id === callbackId)
    if (!callback) {
      throw new Error(`Callback not found: ${callbackId}`)
    }

    const sanitizedNotes = sanitizeInput(notes) || ''
    const existingNotes = callback.notes ? `${callback.notes}\n` : ''
    updateCallback(callbackId, { notes: `${existingNotes}${sanitizedNotes}` })
  }

  /**
   * Mark callback as completed manually
   */
  const markCompleted = (
    callbackId: string,
    disposition: CallbackRequest['disposition'] = 'answered'
  ): void => {
    completeCallback(callbackId, disposition)
  }

  /**
   * Get callback by ID
   */
  const getCallback = (callbackId: string): CallbackRequest | undefined => {
    return callbacks.value.find((cb) => cb.id === callbackId)
  }

  /**
   * Get callbacks for specific number
   */
  const getCallbacksForNumber = (phoneNumber: string): CallbackRequest[] => {
    const normalizedNumber = phoneNumber.replace(/\D/g, '')
    return callbacks.value.filter((cb) => cb.callerNumber.replace(/\D/g, '').includes(normalizedNumber))
  }

  // ============================================================================
  // Queue Management
  // ============================================================================

  /**
   * Start auto-execute mode
   */
  const startAutoExecute = (): void => {
    if (autoExecuteTimer) {
      clearInterval(autoExecuteTimer)
    }

    autoExecuteEnabled.value = true

    autoExecuteTimer = setInterval(async () => {
      if (!isExecuting.value && pendingCallbacks.value.length > 0) {
        try {
          await executeNext()
        } catch (err) {
          logger.warn('Auto-execute failed', err)
        }
      }
    }, config.autoExecuteInterval)

    logger.debug('Auto-execute started', { interval: config.autoExecuteInterval })
  }

  /**
   * Stop auto-execute mode
   */
  const stopAutoExecute = (): void => {
    if (autoExecuteTimer) {
      clearInterval(autoExecuteTimer)
      autoExecuteTimer = null
    }

    autoExecuteEnabled.value = false
    logger.debug('Auto-execute stopped')
  }

  /**
   * Clear completed callbacks
   */
  const clearCompleted = (): void => {
    callbacks.value = callbacks.value.filter((cb) => cb.status !== 'completed')
    refreshStats()
  }

  /**
   * Clear failed callbacks
   */
  const clearFailed = (): void => {
    callbacks.value = callbacks.value.filter((cb) => cb.status !== 'failed')
    refreshStats()
  }

  // ============================================================================
  // Persistence (AstDB)
  // ============================================================================

  /**
   * Save a callback to AstDB
   */
  const saveCallbackToDb = async (callback: CallbackRequest): Promise<void> => {
    if (!client) return

    const value = JSON.stringify({
      ...callback,
      requestedAt: callback.requestedAt.toISOString(),
      scheduledAt: callback.scheduledAt?.toISOString(),
      executedAt: callback.executedAt?.toISOString(),
      completedAt: callback.completedAt?.toISOString(),
    })

    await client.sendAction({
      Action: 'DBPut',
      Family: config.storage.dbFamily,
      Key: callback.id,
      Val: value,
    })
  }

  /**
   * Load callbacks from AstDB
   */
  const loadFromStorage = async (): Promise<void> => {
    if (!client) {
      throw new Error('AMI client not connected')
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await client.sendAction({
        Action: 'DBGetTree',
        Family: config.storage.dbFamily,
      })

      // DBGetTree returns entries in the data field
      const responseData = response?.data as Record<string, string> | undefined
      if (responseData) {
        const loadedCallbacks: CallbackRequest[] = []

        // The response contains key-value pairs from the database
        for (const [, value] of Object.entries(responseData)) {
          if (!value || value === 'Success') continue
          try {
            const data = JSON.parse(value)
            loadedCallbacks.push({
              ...data,
              requestedAt: new Date(data.requestedAt),
              scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
              executedAt: data.executedAt ? new Date(data.executedAt) : undefined,
              completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
            })
          } catch {
            logger.warn('Failed to parse stored callback', { value })
          }
        }

        // Merge with existing callbacks, preferring in-memory state
        const existingIds = new Set(callbacks.value.map((cb) => cb.id))
        const newCallbacks = loadedCallbacks.filter((cb) => !existingIds.has(cb.id))
        callbacks.value = [...callbacks.value, ...newCallbacks]

        // Apply cleanup
        const cutoff = Date.now() - config.storage.cleanupAge
        callbacks.value = callbacks.value.filter((cb) => {
          if (cb.status === 'completed' || cb.status === 'cancelled' || cb.status === 'failed') {
            return cb.completedAt && cb.completedAt.getTime() > cutoff
          }
          return true
        })

        // Limit to max in memory
        if (callbacks.value.length > config.storage.maxInMemory) {
          callbacks.value = callbacks.value.slice(-config.storage.maxInMemory)
        }

        refreshStats()
        logger.debug('Callbacks loaded from storage', { count: newCallbacks.length })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load callbacks'
      error.value = errorMsg
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save all callbacks to AstDB
   */
  const saveToStorage = async (): Promise<void> => {
    if (!client) {
      throw new Error('AMI client not connected')
    }

    isLoading.value = true
    error.value = null

    try {
      for (const callback of callbacks.value) {
        await saveCallbackToDb(callback)
      }
      logger.debug('Callbacks saved to storage', { count: callbacks.value.length })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save callbacks'
      error.value = errorMsg
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear all stored callbacks
   */
  const clearStorage = async (): Promise<void> => {
    if (!client) {
      throw new Error('AMI client not connected')
    }

    isLoading.value = true
    error.value = null

    try {
      await client.sendAction({
        Action: 'DBDelTree',
        Family: config.storage.dbFamily,
      })
      logger.debug('Callback storage cleared')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear storage'
      error.value = errorMsg
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleHangup = (event: AmiMessage<AmiHangupEvent>): void => {
    if (!activeCallback.value) return

    const data = event.data
    const channel = data.Channel || ''

    // Check if this hangup is for our callback channel
    // Use case-insensitive comparison and check if either contains the other
    // This handles Local/xxx@context-00000001;1 vs Local/xxx@context-00000001
    const activeChannel = activeCallback.value.channel?.toLowerCase() || ''
    const eventChannel = channel.toLowerCase()
    const isMatch = activeChannel && (
      eventChannel.includes(activeChannel) ||
      activeChannel.includes(eventChannel.replace(/;[12]$/, ''))
    )

    if (isMatch) {
      const cause = parseInt(data.Cause || '0', 10)
      let disposition: CallbackRequest['disposition'] = 'failed'

      // Map hangup causes to dispositions
      if (cause === 16) {
        // Normal clearing
        disposition = 'answered'
      } else if (cause === 17) {
        // User busy
        disposition = 'busy'
      } else if (cause === 18 || cause === 19) {
        // No answer
        disposition = 'no_answer'
      }

      completeCallback(activeCallback.value.id, disposition)
    }
  }

  const handleNewState = (event: AmiMessage<AmiNewStateEvent>): void => {
    if (!activeCallback.value) return

    const data = event.data
    const state = parseInt(data.ChannelState || '0', 10) as ChannelState

    // Track when callback connects
    if (state === ChannelState.Up) {
      updateCallback(activeCallback.value.id, {
        handledBy: data.CallerIDNum ?? undefined,
      })
    }
  }

  // ============================================================================
  // Setup Event Listeners
  // ============================================================================

  const setupEventListeners = (): void => {
    if (!client) return

    const hangupHandler = (event: AmiMessage<AmiHangupEvent>) => handleHangup(event)
    const stateHandler = (event: AmiMessage<AmiNewStateEvent>) => handleNewState(event)

    client.on('hangup', hangupHandler)
    client.on('newState', stateHandler)

    eventCleanups.push(() => {
      client.off('hangup', hangupHandler)
      client.off('newState', stateHandler)
    })
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  if (client) {
    setupEventListeners()
  }

  // Start auto-execute if configured
  if (config.autoExecute) {
    startAutoExecute()
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    stopCallbackTimer()
    stopAutoExecute()
    eventCleanups.forEach((cleanup) => cleanup())

    // Cancel active callback
    if (activeCallback.value && client) {
      cancelCallback(activeCallback.value.id, 'Component unmounted').catch(() => {
        // Ignore errors during cleanup
      })
    }
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive State
    callbacks,
    activeCallback,
    stats,
    isLoading,
    error,
    autoExecuteEnabled,

    // Computed
    pendingCallbacks,
    scheduledCallbacks,
    completedCallbacks,
    failedCallbacks,
    isExecuting,
    nextCallback,
    pendingCount,

    // Methods
    scheduleCallback,
    executeCallback,
    executeNext,
    cancelCallback,
    rescheduleCallback,
    updatePriority,
    addNotes,
    markCompleted,
    getCallback,
    getCallbacksForNumber,

    // Queue Management
    startAutoExecute,
    stopAutoExecute,
    clearCompleted,
    clearFailed,
    refreshStats,

    // Persistence
    loadFromStorage,
    saveToStorage,
    clearStorage,
  }
}
