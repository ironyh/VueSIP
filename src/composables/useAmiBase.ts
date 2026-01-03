/**
 * Base AMI Composable
 *
 * Provides shared functionality for all AMI feature composables to reduce
 * code duplication and ensure consistency across all AMI features.
 *
 * @module composables/useAmiBase
 */

import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { BaseAmiOptions, BaseAmiReturn, EventCleanup } from '@/types/common'
import { createErrorMessage } from '@/utils/ami-helpers'

/**
 * Event handler function type
 */
export type AmiEventHandler = (...args: any[]) => void

/**
 * Options for base AMI composable
 */
export interface UseAmiBaseOptions<T> extends BaseAmiOptions {
  /**
   * Function to fetch data from AMI
   */
  fetchData?: (client: AmiClient) => Promise<T[]>

  /**
   * Function to parse event data
   */
  parseEvent?: (event: any) => T | null

  /**
   * Event names to listen for
   */
  eventNames?: string[]

  /**
   * Function to extract ID from item
   */
  getItemId?: (item: T) => string

  /**
   * Custom error context for error messages
   */
  errorContext?: string
}

/**
 * Return type for base AMI composable
 */
export interface UseAmiBaseReturn<T> extends BaseAmiReturn<T> {
  /**
   * Setup event listeners (call this manually if needed)
   */
  setupEvents: () => void

  /**
   * Cleanup event listeners
   */
  cleanupEvents: () => void

  /**
   * Add a custom event listener
   */
  addEventListener: (event: string, handler: AmiEventHandler) => EventCleanup

  /**
   * Remove a custom event listener
   */
  removeEventListener: (event: string, handler: AmiEventHandler) => void
}

/**
 * Base AMI Composable
 *
 * Provides common functionality for AMI feature composables:
 * - State management (Map-based storage)
 * - Loading/error state
 * - Event subscription and cleanup
 * - Automatic client watching
 * - Lifecycle management
 *
 * @template T - The item type
 * @param client - AMI client (can be null or Ref)
 * @param options - Configuration options
 * @returns Base AMI interface with common functionality
 *
 * @example
 * ```typescript
 * interface MyItem {
 *   id: string
 *   name: string
 * }
 *
 * export function useAmiMyFeature(
 *   client: AmiClient | null,
 *   options: UseAmiMyFeatureOptions = {}
 * ) {
 *   const base = useAmiBase<MyItem>(client, {
 *     fetchData: async (client) => {
 *       const response = await client.send({ Action: 'MyFeatureList' })
 *       return parseResponse(response)
 *     },
 *     parseEvent: (event) => {
 *       if (event.Event === 'MyFeatureAdded') {
 *         return { id: event.ID, name: event.Name }
 *       }
 *       return null
 *     },
 *     eventNames: ['MyFeatureAdded', 'MyFeatureUpdated', 'MyFeatureRemoved'],
 *     getItemId: (item) => item.id,
 *     errorContext: 'MyFeature',
 *     ...options
 *   })
 *
 *   // Add custom methods
 *   const addItem = async (name: string) => {
 *     // ... custom logic
 *   }
 *
 *   return {
 *     ...base,
 *     addItem
 *   }
 * }
 * ```
 */
export function useAmiBase<T>(
  client: AmiClient | Ref<AmiClient | null> | null,
  options: UseAmiBaseOptions<T> = {}
): UseAmiBaseReturn<T> {
  const {
    useEvents = true,
    pollingInterval = 30000,
    autoRefresh = true,
    debug = false,
    fetchData,
    parseEvent,
    eventNames = [],
    getItemId = (item: T) => String((item as any).id),
    errorContext = 'AMI Operation',
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const items = ref<Map<string, T>>(new Map()) as Ref<Map<string, T>>
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Track event listeners for cleanup
  const eventCleanups: EventCleanup[] = []

  // Poll timer for fallback polling
  let pollTimer: ReturnType<typeof setInterval> | null = null

  // Get reactive client reference
  const clientRef = computed(() => {
    if (client === null) return null
    if ('value' in client) return client.value
    return client
  })

  // ============================================================================
  // Computed
  // ============================================================================

  const itemList = computed(() => Array.from(items.value.values()))

  // ============================================================================
  // Debug Logging
  // ============================================================================

  function log(...args: any[]): void {
    if (debug) {
      console.log(`[useAmiBase:${errorContext}]`, ...args)
    }
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add an event listener with cleanup tracking
   */
  function addEventListener(event: string, handler: AmiEventHandler): EventCleanup {
    const currentClient = clientRef.value
    if (!currentClient) {
      log('Cannot add event listener: no client')
      return () => {}
    }

    currentClient.on(event as any, handler)

    const cleanup = () => {
      currentClient.off(event as any, handler)
      // Note: No need to splice - cleanupEvents() clears the entire array (line 280)
    }

    eventCleanups.push(cleanup)
    log(`Added event listener for: ${event}`)

    return cleanup
  }

  /**
   * Remove an event listener
   */
  function removeEventListener(event: string, handler: AmiEventHandler): void {
    const currentClient = clientRef.value
    if (!currentClient) return

    currentClient.off(event as any, handler)
    log(`Removed event listener for: ${event}`)
  }

  /**
   * Setup event listeners for real-time updates
   */
  function setupEvents(): void {
    if (!useEvents || !parseEvent || eventNames.length === 0) {
      log('Events disabled or not configured')
      return
    }

    const currentClient = clientRef.value
    if (!currentClient) {
      log('Cannot setup events: no client')
      return
    }

    log('Setting up event listeners', eventNames)

    // Generic event handler that uses parseEvent
    const handleEvent = (event: any) => {
      const item = parseEvent(event)
      if (item) {
        const id = getItemId(item)
        items.value.set(id, item)
        log(`Item updated from event:`, id)
      }
    }

    // Subscribe to all event names
    for (const eventName of eventNames) {
      addEventListener(eventName, handleEvent)
    }
  }

  /**
   * Cleanup all event listeners
   */
  function cleanupEvents(): void {
    log('Cleaning up event listeners', eventCleanups.length)
    eventCleanups.forEach((cleanup) => cleanup())
    eventCleanups.length = 0
  }

  // ============================================================================
  // Data Fetching
  // ============================================================================

  /**
   * Refresh data from AMI
   */
  async function refresh(): Promise<void> {
    const currentClient = clientRef.value

    if (!currentClient) {
      error.value = 'AMI client not connected'
      log('Refresh failed: no client')
      return
    }

    if (!fetchData) {
      error.value = 'No fetch function provided'
      log('Refresh failed: no fetchData function')
      return
    }

    isLoading.value = true
    error.value = null
    log('Refreshing data...')

    try {
      const data = await fetchData(currentClient)

      // Update items map
      items.value.clear()
      for (const item of data) {
        const id = getItemId(item)
        items.value.set(id, item)
      }

      log(`Refreshed ${data.length} items`)
    } catch (err) {
      error.value = createErrorMessage(err, `${errorContext} failed`)
      log('Refresh error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get item by ID
   */
  function getItem(id: string): T | undefined {
    return items.value.get(id)
  }

  /**
   * Clear all data
   */
  function clear(): void {
    items.value.clear()
    error.value = null
    log('Cleared all data')
  }

  // ============================================================================
  // Polling
  // ============================================================================

  /**
   * Start polling for updates (fallback when events not available)
   */
  function startPolling(): void {
    if (pollTimer || !pollingInterval) return

    log(`Starting polling every ${pollingInterval}ms`)

    pollTimer = setInterval(() => {
      if (!isLoading.value) {
        refresh().catch((err) => {
          log('Poll refresh error:', err)
        })
      }
    }, pollingInterval)
  }

  /**
   * Stop polling
   */
  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
      log('Stopped polling')
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Watch for client changes
  watch(
    clientRef,
    (newClient, oldClient) => {
      log('Client changed', { hasNew: !!newClient, hadOld: !!oldClient })

      // Cleanup old client
      if (oldClient) {
        cleanupEvents()
        stopPolling()
      }

      // Setup new client
      if (newClient) {
        setupEvents()

        // Initial refresh if auto-refresh enabled
        if (autoRefresh) {
          refresh().catch((err) => {
            log('Initial refresh error:', err)
          })
        }

        // Start polling if events not enabled
        if (!useEvents && pollingInterval) {
          startPolling()
        }
      }
    },
    { immediate: true }
  )

  // Cleanup on unmount
  onUnmounted(() => {
    log('Component unmounting, cleaning up')
    cleanupEvents()
    stopPolling()
    items.value.clear()
  })

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    items,
    isLoading,
    error,

    // Computed
    itemList,

    // Core methods
    refresh,
    getItem,
    clear,

    // Event management
    setupEvents,
    cleanupEvents,
    addEventListener,
    removeEventListener,
  }
}
