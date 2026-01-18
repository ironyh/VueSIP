// @ts-nocheck - WIP: Dialog subscription methods not yet implemented in SipClient
/**
 * Dialog/BLF Composable
 *
 * Provides SIP dialog event subscription (BLF - Busy Lamp Field) functionality
 * for monitoring extension states on Asterisk/FreePBX PBX systems.
 *
 * @module composables/useDialog
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { SipClient } from '../core/SipClient'
import {
  DialogState,
  DEFAULT_DIALOG_DISPLAY,
  type DialogStatus,
  type DialogSubscription,
  type DialogEvent,
  type DialogSubscriptionOptions,
  type PresenceDisplayConfig,
  type StateDisplayOptions,
} from '../types/presence.types'
import { createLogger } from '../utils/logger'
import { SipEventNames } from '@/types/event-names'
import { validateSipUri } from '../utils/validators'

const log = createLogger('useDialog')

/**
 * Return type for useDialog composable
 */
export interface UseDialogReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Map of watched extensions and their dialog status */
  watchedExtensions: Ref<Map<string, DialogStatus>>
  /** Active subscriptions */
  subscriptions: Ref<Map<string, DialogSubscription>>
  /** Number of active subscriptions */
  subscriptionCount: ComputedRef<number>
  /** Display configuration */
  displayConfig: Ref<PresenceDisplayConfig>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Subscribe to an extension's dialog state (BLF) */
  subscribe: (uri: string, options?: DialogSubscriptionOptions) => Promise<string>
  /** Unsubscribe from an extension's dialog state */
  unsubscribe: (uri: string) => Promise<void>
  /** Subscribe to multiple extensions at once */
  subscribeMany: (uris: string[], options?: DialogSubscriptionOptions) => Promise<string[]>
  /** Unsubscribe from all extensions */
  unsubscribeAll: () => Promise<void>
  /** Get dialog status for a specific extension */
  getStatus: (uri: string) => DialogStatus | undefined
  /** Get display options for a dialog state */
  getDisplayOptions: (state: DialogState) => StateDisplayOptions
  /** Set custom display configuration */
  setDisplayConfig: (config: Partial<PresenceDisplayConfig>) => void
  /** Listen for dialog events */
  onDialogEvent: (callback: (event: DialogEvent) => void) => () => void
}

/**
 * Dialog/BLF Composable
 *
 * Manages SIP dialog subscriptions for monitoring extension states.
 * Supports Asterisk/FreePBX BLF (Busy Lamp Field) functionality.
 *
 * @param sipClient - SIP client instance
 * @returns Dialog state and methods
 *
 * @example
 * ```typescript
 * const { subscribe, watchedExtensions, getDisplayOptions } = useDialog(sipClient)
 *
 * // Subscribe to extension 6001
 * await subscribe('sip:6001@pbx.example.com')
 *
 * // Check status with display options
 * watchedExtensions.value.forEach((status, uri) => {
 *   const display = getDisplayOptions(status.state)
 *   console.log(`${uri}: ${display.icon} ${display.label}`)
 * })
 * ```
 */
export function useDialog(sipClient: Ref<SipClient | null>): UseDialogReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  const watchedExtensions = ref<Map<string, DialogStatus>>(new Map())
  const subscriptions = ref<Map<string, DialogSubscription>>(new Map())
  const dialogEventListeners = ref<Array<(event: DialogEvent) => void>>([])
  const displayConfig = ref<PresenceDisplayConfig>({
    mode: 'emoji',
    animations: true,
  })

  // Cleanup functions for event listeners
  const cleanupFunctions: Array<() => void> = []

  // ============================================================================
  // Computed Values
  // ============================================================================

  const subscriptionCount = computed(() => subscriptions.value.size)

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Emit dialog event to listeners
   */
  const emitDialogEvent = (event: DialogEvent): void => {
    log.debug('Dialog event:', event)
    dialogEventListeners.value.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        log.error('Error in dialog event listener:', error)
      }
    })
  }

  /**
   * Handle dialog notification from SipClient
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SipClient event data structure varies
  const handleDialogNotify = (data: any): void => {
    const { uri, status } = data

    if (!uri || !status) return

    log.debug(`Dialog update for ${uri}:`, status)

    // Update watched extensions map
    watchedExtensions.value.set(uri, status)

    // Update subscription last status
    const subscription = subscriptions.value.get(uri)
    if (subscription) {
      subscription.lastStatus = status
    }

    // Emit event
    emitDialogEvent({
      type: 'updated',
      uri,
      status,
      timestamp: new Date(),
    })
  }

  /**
   * Set up event listeners on SipClient
   */
  const setupEventListeners = (): void => {
    const client = sipClient.value
    if (!client) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing internal eventBus property requires type assertion
    const eventBus = (client as any).eventBus || (client as any).getEventBus?.()
    if (!eventBus) {
      log.warn('EventBus not available on SipClient')
      return
    }

    // Listen for dialog NOTIFY events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event handler receives varied data structure
    const notifyHandler = (data: any) => handleDialogNotify(data)
    eventBus.on(SipEventNames.DialogNotify, notifyHandler)
    cleanupFunctions.push(() => eventBus.off(SipEventNames.DialogNotify, notifyHandler))

    // Listen for subscription events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event handler receives varied data structure
    const subscribeHandler = (data: any) => {
      const { uri, subscriptionId, expires } = data
      if (uri && subscriptionId) {
        const sub: DialogSubscription = {
          id: subscriptionId,
          targetUri: uri,
          state: 'active',
          expires: expires || 600,
          expiresAt: new Date(Date.now() + (expires || 600) * 1000),
        }
        subscriptions.value.set(uri, sub)
        emitDialogEvent({
          type: 'subscribed',
          uri,
          subscription: sub,
          timestamp: new Date(),
        })
      }
    }
    eventBus.on(SipEventNames.DialogSubscribe, subscribeHandler)
    cleanupFunctions.push(() => eventBus.off(SipEventNames.DialogSubscribe, subscribeHandler))

    // Listen for unsubscribe events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event handler receives varied data structure
    const unsubscribeHandler = (data: any) => {
      const { uri } = data
      if (uri) {
        const sub = subscriptions.value.get(uri)
        subscriptions.value.delete(uri)
        watchedExtensions.value.delete(uri)
        emitDialogEvent({
          type: 'unsubscribed',
          uri,
          subscription: sub,
          timestamp: new Date(),
        })
      }
    }
    eventBus.on(SipEventNames.DialogUnsubscribe, unsubscribeHandler)
    cleanupFunctions.push(() => eventBus.off(SipEventNames.DialogUnsubscribe, unsubscribeHandler))

    // Listen for refresh events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event handler receives varied data structure
    const refreshHandler = (data: any) => {
      const { uri } = data
      const sub = subscriptions.value.get(uri)
      if (sub) {
        sub.expiresAt = new Date(Date.now() + sub.expires * 1000)
        emitDialogEvent({
          type: 'refreshed',
          uri,
          subscription: sub,
          timestamp: new Date(),
        })
      }
    }
    eventBus.on(SipEventNames.DialogRefreshed, refreshHandler)
    cleanupFunctions.push(() => eventBus.off(SipEventNames.DialogRefreshed, refreshHandler))

    log.debug('Dialog event listeners set up')
  }

  // Set up listeners when sipClient is available
  if (sipClient.value) {
    setupEventListeners()
  }

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Subscribe to an extension's dialog state
   */
  const subscribe = async (uri: string, options?: DialogSubscriptionOptions): Promise<string> => {
    const client = sipClient.value
    if (!client) {
      throw new Error('SIP client not available')
    }

    // Validate URI
    const validation = validateSipUri(uri)
    if (!validation.valid) {
      throw new Error(`Invalid SIP URI: ${uri}`)
    }

    // Ensure event listeners are set up
    if (cleanupFunctions.length === 0) {
      setupEventListeners()
    }

    log.info('Subscribing to dialog:', uri)

    try {
      const subscriptionId = await client.subscribeDialog(uri, options)
      return subscriptionId
    } catch (error) {
      log.error('Failed to subscribe to dialog:', error)
      emitDialogEvent({
        type: 'error',
        uri,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Unsubscribe from an extension's dialog state
   */
  const unsubscribe = async (uri: string): Promise<void> => {
    const client = sipClient.value
    if (!client) {
      throw new Error('SIP client not available')
    }

    log.info('Unsubscribing from dialog:', uri)

    try {
      await client.unsubscribeDialog(uri)
    } catch (error) {
      log.error('Failed to unsubscribe from dialog:', error)
      throw error
    }
  }

  /**
   * Subscribe to multiple extensions at once
   */
  const subscribeMany = async (
    uris: string[],
    options?: DialogSubscriptionOptions
  ): Promise<string[]> => {
    const results: string[] = []

    for (const uri of uris) {
      try {
        const id = await subscribe(uri, options)
        results.push(id)
      } catch (error) {
        log.error(`Failed to subscribe to ${uri}:`, error)
        // Continue with other subscriptions
      }
    }

    return results
  }

  /**
   * Unsubscribe from all watched extensions
   */
  const unsubscribeAll = async (): Promise<void> => {
    const client = sipClient.value
    if (!client) return

    try {
      await client.unsubscribeAllDialogs()
      subscriptions.value.clear()
      watchedExtensions.value.clear()
    } catch (error) {
      log.error('Failed to unsubscribe all:', error)
    }
  }

  /**
   * Get dialog status for a specific extension
   */
  const getStatus = (uri: string): DialogStatus | undefined => {
    return watchedExtensions.value.get(uri)
  }

  /**
   * Get display options for a dialog state
   */
  const getDisplayOptions = (state: DialogState): StateDisplayOptions => {
    // Check custom display config first
    const custom = displayConfig.value.stateDisplay?.[state]
    if (custom) {
      return { ...DEFAULT_DIALOG_DISPLAY[state], ...custom }
    }

    // Fall back to defaults
    return DEFAULT_DIALOG_DISPLAY[state] || DEFAULT_DIALOG_DISPLAY[DialogState.Unknown]
  }

  /**
   * Set custom display configuration
   */
  const setDisplayConfig = (config: Partial<PresenceDisplayConfig>): void => {
    displayConfig.value = {
      ...displayConfig.value,
      ...config,
    }
  }

  /**
   * Listen for dialog events
   */
  const onDialogEvent = (callback: (event: DialogEvent) => void): (() => void) => {
    dialogEventListeners.value.push(callback)

    return () => {
      const index = dialogEventListeners.value.indexOf(callback)
      if (index !== -1) {
        dialogEventListeners.value.splice(index, 1)
      }
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  onUnmounted(() => {
    // Clean up event listeners
    cleanupFunctions.forEach((cleanup) => cleanup())
    cleanupFunctions.length = 0

    // Clear state
    dialogEventListeners.value = []
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    watchedExtensions,
    subscriptions,
    subscriptionCount,
    displayConfig,

    // Methods
    subscribe,
    unsubscribe,
    subscribeMany,
    unsubscribeAll,
    getStatus,
    getDisplayOptions,
    setDisplayConfig,
    onDialogEvent,
  }
}
