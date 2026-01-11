/**
 * Provider-Agnostic Agent Queue Composable
 *
 * Provides reactive queue management that works with any CallCenterProvider.
 * Handles queue membership, pausing per-queue, and queue statistics.
 *
 * @module composables/useAgentQueue
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import type {
  CallCenterProvider,
  AgentState,
  QueueInfo,
  QueueEventCallback,
  Unsubscribe,
} from '@/providers/call-center/types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAgentQueue')

/**
 * Return type for useAgentQueue
 */
export interface UseAgentQueueReturn {
  // State
  /** All queues agent is member of */
  queues: ComputedRef<QueueInfo[]>
  /** Active (not paused) queues */
  activeQueues: ComputedRef<QueueInfo[]>
  /** Paused queues */
  pausedQueues: ComputedRef<QueueInfo[]>
  /** Total queue count */
  totalQueues: ComputedRef<number>
  /** Total calls handled across all queues */
  totalCallsHandled: ComputedRef<number>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message */
  error: Ref<string | null>

  // Methods
  /** Join a queue */
  joinQueue: (queue: string, penalty?: number) => Promise<void>
  /** Leave a queue */
  leaveQueue: (queue: string) => Promise<void>
  /** Pause in specific queue */
  pauseInQueue: (queue: string, reason: string) => Promise<void>
  /** Unpause in specific queue */
  unpauseInQueue: (queue: string) => Promise<void>
  /** Check if member of queue */
  isMemberOf: (queue: string) => boolean
  /** Check if paused in queue */
  isPausedIn: (queue: string) => boolean
  /** Get queue by name */
  getQueue: (queue: string) => QueueInfo | undefined
  /** Subscribe to queue events */
  onQueueEvent: (callback: QueueEventCallback) => Unsubscribe
}

/**
 * Provider-agnostic queue management composable
 *
 * @param providerRef - Ref to the CallCenterProvider instance
 * @returns Reactive queue state and methods
 *
 * @example
 * ```typescript
 * const { provider } = useCallCenterProvider(config)
 * const {
 *   queues,
 *   activeQueues,
 *   joinQueue,
 *   leaveQueue,
 *   pauseInQueue,
 * } = useAgentQueue(provider)
 *
 * // Join a new queue
 * await joinQueue('billing', 5)
 *
 * // Pause in specific queue
 * await pauseInQueue('support', 'Training')
 * ```
 */
export function useAgentQueue(
  providerRef: ShallowRef<CallCenterProvider | null> | Ref<CallCenterProvider | null>
): UseAgentQueueReturn {
  // Internal state
  const agentState = ref<AgentState | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let stateUnsubscribe: Unsubscribe | null = null

  // Computed properties
  const queues = computed(() => agentState.value?.queues ?? [])
  const activeQueues = computed(() => queues.value.filter((q) => q.isMember && !q.isPaused))
  const pausedQueues = computed(() => queues.value.filter((q) => q.isMember && q.isPaused))
  const totalQueues = computed(() => queues.value.length)
  const totalCallsHandled = computed(() => queues.value.reduce((sum, q) => sum + q.callsHandled, 0))

  // Subscribe to provider state changes
  function subscribeToState() {
    if (!providerRef.value || stateUnsubscribe) return

    stateUnsubscribe = providerRef.value.onStateChange((newState) => {
      agentState.value = newState
    })
  }

  // Unsubscribe from state changes
  function unsubscribeFromState() {
    if (stateUnsubscribe) {
      stateUnsubscribe()
      stateUnsubscribe = null
    }
  }

  // Watch for provider changes
  watch(
    providerRef,
    (newProvider, oldProvider) => {
      if (oldProvider) {
        unsubscribeFromState()
        agentState.value = null
      }
      if (newProvider) {
        subscribeToState()
      }
    },
    { immediate: true }
  )

  // Methods
  async function joinQueue(queue: string, penalty?: number): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      await providerRef.value.joinQueue(queue, penalty)
      logger.info(`Joined queue: ${queue}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Join queue failed'
      logger.error('Join queue failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function leaveQueue(queue: string): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true

    try {
      await providerRef.value.leaveQueue(queue)
      logger.info(`Left queue: ${queue}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Leave queue failed'
      logger.error('Leave queue failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function pauseInQueue(queue: string, reason: string): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true

    try {
      await providerRef.value.pause({ queues: [queue], reason })
      logger.info(`Paused in queue: ${queue}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Pause in queue failed'
      logger.error('Pause in queue failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function unpauseInQueue(queue: string): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true

    try {
      await providerRef.value.unpause([queue])
      logger.info(`Unpaused in queue: ${queue}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unpause in queue failed'
      logger.error('Unpause in queue failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function isMemberOf(queue: string): boolean {
    return queues.value.some((q) => q.name === queue && q.isMember)
  }

  function isPausedIn(queue: string): boolean {
    return queues.value.some((q) => q.name === queue && q.isPaused)
  }

  function getQueue(queue: string): QueueInfo | undefined {
    return queues.value.find((q) => q.name === queue)
  }

  function onQueueEvent(callback: QueueEventCallback): Unsubscribe {
    if (!providerRef.value) {
      logger.warn('Cannot subscribe to queue events: provider not initialized')
      return () => {}
    }
    return providerRef.value.onQueueEvent(callback)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeFromState()
  })

  return {
    // State
    queues,
    activeQueues,
    pausedQueues,
    totalQueues,
    totalCallsHandled,
    isLoading,
    error,

    // Methods
    joinQueue,
    leaveQueue,
    pauseInQueue,
    unpauseInQueue,
    isMemberOf,
    isPausedIn,
    getQueue,
    onQueueEvent,
  }
}
