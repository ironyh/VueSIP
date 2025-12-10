/**
 * FreePBX Presence Composable
 *
 * Vue 3 composable for managing FreePBX presence subscriptions with
 * reactive state for presence status and return time tracking.
 *
 * @module composables/useFreePBXPresence
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { FreePBXPresenceBridge } from '@/core/FreePBXPresenceBridge'
import {
  FreePBXPresenceCode,
  type FreePBXPresenceStatus,
  type FreePBXPresenceEvent,
  type FreePBXPresenceBridgeConfig,
  type ReturnTimeSpec,
} from '@/types/freepbx-presence.types'
import { PresenceState } from '@/types/presence.types'
import type { UA } from 'jssip/lib/UA'
import { createLogger } from '@/utils/logger'

const log = createLogger('useFreePBXPresence')

/**
 * Extension presence status with computed helpers
 */
export interface ExtensionPresence {
  /** Extension number */
  extension: string
  /** Current presence status */
  status: FreePBXPresenceStatus
  /** Is the extension available */
  isAvailable: boolean
  /** Is the extension busy (on phone or in meeting) */
  isBusy: boolean
  /** Is the extension away */
  isAway: boolean
  /** Has an expected return time */
  hasReturnTime: boolean
  /** Is return time overdue */
  isOverdue: boolean
  /** Formatted return time string */
  returnTimeDisplay: string | null
  /** Formatted remaining time string */
  remainingTimeDisplay: string | null
}

/**
 * Return type for useFreePBXPresence composable
 */
export interface UseFreePBXPresenceReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Map of all presence statuses by extension */
  presenceMap: Ref<Map<string, FreePBXPresenceStatus>>

  /** Array of presence statuses for iteration */
  presenceList: ComputedRef<ExtensionPresence[]>

  /** Currently selected/focused extension */
  selectedExtension: Ref<string | null>

  /** Presence status of selected extension */
  selectedPresence: ComputedRef<ExtensionPresence | null>

  /** Is currently subscribed to presence updates */
  isSubscribed: Ref<boolean>

  /** Last presence event received */
  lastEvent: Ref<FreePBXPresenceEvent | null>

  /** Connection/subscription error if any */
  error: Ref<string | null>

  // ============================================================================
  // Computed Helpers
  // ============================================================================

  /** Count of available extensions */
  availableCount: ComputedRef<number>

  /** Count of busy extensions */
  busyCount: ComputedRef<number>

  /** Count of away extensions */
  awayCount: ComputedRef<number>

  /** Count of extensions with return time set */
  withReturnTimeCount: ComputedRef<number>

  /** Count of overdue extensions */
  overdueCount: ComputedRef<number>

  /** List of overdue extensions */
  overdueExtensions: ComputedRef<ExtensionPresence[]>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Initialize the presence bridge with configuration */
  initialize: (config: FreePBXPresenceBridgeConfig) => void

  /** Set the JsSIP User Agent for SIP subscriptions */
  setUserAgent: (ua: UA | null) => void

  /** Subscribe to presence updates for extensions */
  subscribe: (extensions: string[] | 'all') => Promise<void>

  /** Unsubscribe from specific extension */
  unsubscribe: (extension: string) => void

  /** Unsubscribe from all extensions */
  unsubscribeAll: () => void

  /** Get presence status for an extension */
  getPresence: (extension: string) => ExtensionPresence | null

  /** Set return time for an extension */
  setReturnTime: (extension: string, returnTime: Date | number) => void

  /** Clear return time for an extension */
  clearReturnTime: (extension: string) => void

  /** Select/focus an extension */
  selectExtension: (extension: string | null) => void

  /** Check if extension is available */
  isExtensionAvailable: (extension: string) => boolean

  /** Check if extension is busy */
  isExtensionBusy: (extension: string) => boolean

  /** Filter extensions by presence state */
  filterByState: (state: PresenceState) => ExtensionPresence[]

  /** Destroy and cleanup */
  destroy: () => void
}

/**
 * FreePBX Presence Composable
 *
 * Provides reactive presence state management for FreePBX extensions
 * with automatic return time tracking and countdown updates.
 *
 * @param initialConfig - Optional initial bridge configuration
 * @returns Presence state and methods
 *
 * @example
 * ```typescript
 * const {
 *   presenceList,
 *   selectedPresence,
 *   subscribe,
 *   setReturnTime,
 *   overdueExtensions,
 * } = useFreePBXPresence({
 *   host: 'pbx.example.com',
 *   apiToken: 'your-api-token',
 * })
 *
 * // Subscribe to specific extensions
 * await subscribe(['101', '102', '103'])
 *
 * // Or subscribe to all extensions
 * await subscribe('all')
 *
 * // Set return time (30 minutes from now)
 * setReturnTime('101', 30)
 *
 * // Or set specific time
 * setReturnTime('101', new Date('2024-01-15T14:30:00'))
 * ```
 */
export function useFreePBXPresence(
  initialConfig?: FreePBXPresenceBridgeConfig
): UseFreePBXPresenceReturn {
  // ============================================================================
  // State
  // ============================================================================

  const bridge = ref<FreePBXPresenceBridge | null>(null)
  const presenceMap = ref<Map<string, FreePBXPresenceStatus>>(new Map())
  const selectedExtension = ref<string | null>(null)
  const isSubscribed = ref(false)
  const lastEvent = ref<FreePBXPresenceEvent | null>(null)
  const error = ref<string | null>(null)

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Convert FreePBXPresenceStatus to ExtensionPresence with computed helpers
   */
  const toExtensionPresence = (status: FreePBXPresenceStatus): ExtensionPresence => {
    const presenceCode = status.presenceCode
    const returnTime = status.returnTime

    return {
      extension: status.extension || '',
      status,
      isAvailable: presenceCode === FreePBXPresenceCode.Available,
      isBusy: [
        FreePBXPresenceCode.OnPhone,
        FreePBXPresenceCode.Busy,
        FreePBXPresenceCode.InMeeting,
      ].includes(presenceCode),
      isAway: [
        FreePBXPresenceCode.Away,
        FreePBXPresenceCode.ExtendedAway,
        FreePBXPresenceCode.Lunch,
      ].includes(presenceCode),
      hasReturnTime: !!returnTime,
      isOverdue: returnTime?.isOverdue ?? false,
      returnTimeDisplay: returnTime?.formattedTime ?? null,
      remainingTimeDisplay: returnTime?.formattedRemaining ?? null,
    }
  }

  // ============================================================================
  // Computed
  // ============================================================================

  const presenceList = computed<ExtensionPresence[]>(() => {
    return Array.from(presenceMap.value.values()).map(toExtensionPresence)
  })

  const selectedPresence = computed<ExtensionPresence | null>(() => {
    if (!selectedExtension.value) return null

    const status = presenceMap.value.get(selectedExtension.value)
    if (!status) return null

    return toExtensionPresence(status)
  })

  const availableCount = computed(() => {
    return presenceList.value.filter((p) => p.isAvailable).length
  })

  const busyCount = computed(() => {
    return presenceList.value.filter((p) => p.isBusy).length
  })

  const awayCount = computed(() => {
    return presenceList.value.filter((p) => p.isAway).length
  })

  const withReturnTimeCount = computed(() => {
    return presenceList.value.filter((p) => p.hasReturnTime).length
  })

  const overdueCount = computed(() => {
    return presenceList.value.filter((p) => p.isOverdue).length
  })

  const overdueExtensions = computed(() => {
    return presenceList.value.filter((p) => p.isOverdue)
  })

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle presence update events from bridge
   */
  const handlePresenceUpdate = (event: FreePBXPresenceEvent): void => {
    log.debug('Presence update event:', event.type, event.extension)

    // Store last event
    lastEvent.value = event

    // Update presence map
    if (event.currentStatus) {
      presenceMap.value.set(event.extension, event.currentStatus)
      // Trigger reactivity
      presenceMap.value = new Map(presenceMap.value)
    }

    // Handle error events
    if (event.type === 'error' && event.error) {
      error.value = event.error
      log.error('Presence error:', event.error)
    } else {
      error.value = null
    }
  }

  /**
   * Handle return time update callback
   */
  const handleReturnTimeUpdate = (extension: string, returnTime: ReturnTimeSpec | null): void => {
    const status = presenceMap.value.get(extension)
    if (status) {
      presenceMap.value.set(extension, {
        ...status,
        returnTime: returnTime || undefined,
      })
      // Trigger reactivity
      presenceMap.value = new Map(presenceMap.value)
    }
  }

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Initialize the presence bridge
   */
  const initialize = (config: FreePBXPresenceBridgeConfig): void => {
    // Destroy existing bridge if any
    if (bridge.value) {
      bridge.value.destroy()
    }

    bridge.value = new FreePBXPresenceBridge(config)
    error.value = null

    log.info('FreePBX presence bridge initialized', { host: config.host })
  }

  /**
   * Set the JsSIP User Agent
   */
  const setUserAgent = (ua: UA | null): void => {
    if (bridge.value) {
      bridge.value.setUserAgent(ua)
    } else {
      log.warn('Cannot set UA: Bridge not initialized')
    }
  }

  /**
   * Subscribe to presence updates
   */
  const subscribe = async (extensions: string[] | 'all'): Promise<void> => {
    if (!bridge.value) {
      throw new Error('Bridge not initialized. Call initialize() first.')
    }

    try {
      await bridge.value.subscribe({
        extensions,
        onPresenceUpdate: handlePresenceUpdate,
        onReturnTimeUpdate: handleReturnTimeUpdate,
      })

      isSubscribed.value = true
      error.value = null

      log.info('Subscribed to presence updates', { extensions })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      log.error('Failed to subscribe:', err)
      throw err
    }
  }

  /**
   * Unsubscribe from specific extension
   */
  const unsubscribe = (extension: string): void => {
    if (bridge.value) {
      bridge.value.unsubscribe(extension)
      presenceMap.value.delete(extension)
      presenceMap.value = new Map(presenceMap.value)

      if (selectedExtension.value === extension) {
        selectedExtension.value = null
      }
    }
  }

  /**
   * Unsubscribe from all extensions
   */
  const unsubscribeAll = (): void => {
    if (bridge.value) {
      bridge.value.unsubscribeAll()
      presenceMap.value.clear()
      presenceMap.value = new Map(presenceMap.value)
      isSubscribed.value = false
      selectedExtension.value = null
    }
  }

  /**
   * Get presence for specific extension
   */
  const getPresence = (extension: string): ExtensionPresence | null => {
    const status = presenceMap.value.get(extension)
    if (!status) return null
    return toExtensionPresence(status)
  }

  /**
   * Set return time for an extension
   */
  const setReturnTime = (extension: string, returnTime: Date | number): void => {
    if (bridge.value) {
      bridge.value.setReturnTime(extension, returnTime)
    } else {
      log.warn('Cannot set return time: Bridge not initialized')
    }
  }

  /**
   * Clear return time for an extension
   */
  const clearReturnTime = (extension: string): void => {
    if (bridge.value) {
      bridge.value.clearReturnTime(extension)
    }
  }

  /**
   * Select/focus an extension
   */
  const selectExtension = (extension: string | null): void => {
    selectedExtension.value = extension
  }

  /**
   * Check if extension is available
   */
  const isExtensionAvailable = (extension: string): boolean => {
    const status = presenceMap.value.get(extension)
    return status?.presenceCode === FreePBXPresenceCode.Available
  }

  /**
   * Check if extension is busy
   */
  const isExtensionBusy = (extension: string): boolean => {
    const status = presenceMap.value.get(extension)
    if (!status) return false
    return [
      FreePBXPresenceCode.OnPhone,
      FreePBXPresenceCode.Busy,
      FreePBXPresenceCode.InMeeting,
    ].includes(status.presenceCode)
  }

  /**
   * Filter extensions by presence state
   */
  const filterByState = (state: PresenceState): ExtensionPresence[] => {
    return presenceList.value.filter((p) => p.status.state === state)
  }

  /**
   * Destroy and cleanup
   */
  const destroy = (): void => {
    if (bridge.value) {
      bridge.value.destroy()
      bridge.value = null
    }

    presenceMap.value.clear()
    selectedExtension.value = null
    isSubscribed.value = false
    lastEvent.value = null
    error.value = null

    log.info('useFreePBXPresence destroyed')
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Initialize if config provided
  if (initialConfig) {
    initialize(initialConfig)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    destroy()
  })

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // State
    presenceMap,
    presenceList,
    selectedExtension,
    selectedPresence,
    isSubscribed,
    lastEvent,
    error,

    // Computed
    availableCount,
    busyCount,
    awayCount,
    withReturnTimeCount,
    overdueCount,
    overdueExtensions,

    // Methods
    initialize,
    setUserAgent,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    getPresence,
    setReturnTime,
    clearReturnTime,
    selectExtension,
    isExtensionAvailable,
    isExtensionBusy,
    filterByState,
    destroy,
  }
}
