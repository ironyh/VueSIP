/**
 * Type-safe Event Bus implementation
 * @packageDocumentation
 */

import type {
  EventHandler,
  EventListenerOptions,
  EventMap,
  WildcardPattern,
} from '@/types/events.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('EventBus')

/**
 * Internal event listener structure
 */
interface EventListener<T = any> {
  handler: EventHandler<T>
  once: boolean
  priority: number
  id: string
}

/**
 * Type-safe Event Bus for managing application events
 */
export class EventBus {
  private listeners: Map<string, EventListener[]> = new Map()
  private listenerIdCounter = 0
  private eventBuffer: Map<string, Array<{ data: any; timestamp: number }>> = new Map()
  private bufferEnabled = true
  private readonly MAX_BUFFER_SIZE = 50
  private readonly BUFFER_TTL = 5000 // 5 seconds

  /**
   * Add an event listener
   */
  on<K extends keyof EventMap>(
    event: K | WildcardPattern,
    handler: EventHandler<EventMap[K]>,
    options: EventListenerOptions = {}
  ): string {
    const { once = false, priority = 0, id = this.generateListenerId() } = options

    const eventName = String(event)
    const listener: EventListener<EventMap[K]> = {
      handler,
      once,
      priority,
      id,
    }

    // Get or create listener array for this event
    const existingListeners = this.listeners.get(eventName) || []

    // Insert listener based on priority (higher priority first)
    const insertIndex = existingListeners.findIndex((l) => l.priority < priority)
    if (insertIndex === -1) {
      existingListeners.push(listener)
    } else {
      existingListeners.splice(insertIndex, 0, listener)
    }

    this.listeners.set(eventName, existingListeners)

    logger.debug(`Listener added for event: ${eventName} (id: ${id}, priority: ${priority})`)

    // BUFFERING: Replay buffered events for this listener if any exist
    if (this.bufferEnabled && this.eventBuffer.has(eventName)) {
      const bufferedEvents = this.eventBuffer.get(eventName)!
      const now = Date.now()

      logger.debug(`Found ${bufferedEvents.length} buffered events for ${eventName}, replaying...`)

      // Filter out expired events and replay valid ones
      const validEvents = bufferedEvents.filter((e) => now - e.timestamp < this.BUFFER_TTL)

      for (const bufferedEvent of validEvents) {
        try {
          logger.debug(`Replaying buffered event for ${eventName}`)
          const result = handler(bufferedEvent.data)
          if (result instanceof Promise) {
            result.catch((error) => {
              logger.error(`Error in replayed event handler for ${eventName}:`, error)
            })
          }
        } catch (error) {
          logger.error(`Error replaying buffered event for ${eventName}:`, error)
        }
      }

      // Clean up expired events
      if (validEvents.length < bufferedEvents.length) {
        this.eventBuffer.set(eventName, validEvents)
      }
    }

    return id
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof EventMap>(
    event: K | WildcardPattern,
    handler: EventHandler<EventMap[K]>
  ): string {
    return this.on(event, handler, { once: true })
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof EventMap>(
    event: K | WildcardPattern,
    handlerOrId: EventHandler<EventMap[K]> | string
  ): boolean {
    const eventName = String(event)
    const listeners = this.listeners.get(eventName)

    if (!listeners) {
      return false
    }

    // Remove by handler function or ID
    const index =
      typeof handlerOrId === 'string'
        ? listeners.findIndex((l) => l.id === handlerOrId)
        : listeners.findIndex((l) => l.handler === handlerOrId)

    if (index === -1) {
      return false
    }

    listeners.splice(index, 1)

    if (listeners.length === 0) {
      this.listeners.delete(eventName)
    }

    logger.debug(`Listener removed for event: ${eventName}`)

    return true
  }

  /**
   * Remove an event listener by ID (across all events)
   */
  removeById(id: string): boolean {
    for (const [eventName, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex((l) => l.id === id)
      if (index !== -1) {
        listeners.splice(index, 1)
        if (listeners.length === 0) {
          this.listeners.delete(eventName)
        }
        logger.debug(`Listener ${id} removed from event: ${eventName}`)
        return true
      }
    }
    return false
  }

  /**
   * Emit an event
   */
  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const eventName = String(event)

    logger.debug(`Emitting event: ${eventName}`, data)

    // Get direct listeners
    const directListeners = [...(this.listeners.get(eventName) || [])]

    // Get wildcard listeners
    const wildcardListeners = this.getWildcardListeners(eventName)

    // Combine and sort by priority
    const allListeners = [...directListeners, ...wildcardListeners].sort(
      (a, b) => b.priority - a.priority
    )

    // BUFFERING: If no listeners and buffering is enabled, buffer this event
    if (allListeners.length === 0 && this.bufferEnabled) {
      logger.debug(`No listeners for ${eventName}, buffering event for future listeners`)

      const bufferedEvents = this.eventBuffer.get(eventName) || []
      bufferedEvents.push({ data, timestamp: Date.now() })

      // Limit buffer size per event
      if (bufferedEvents.length > this.MAX_BUFFER_SIZE) {
        bufferedEvents.shift() // Remove oldest event
      }

      this.eventBuffer.set(eventName, bufferedEvents)
      return
    }

    // Execute handlers
    const handlersToRemove: Array<{ event: string; listener: EventListener }> = []

    for (const listener of allListeners) {
      try {
        // Execute handler with error boundary
        const result = listener.handler(data)

        // Handle async handlers
        if (result instanceof Promise) {
          await result
        }

        // Mark for removal if it's a one-time listener
        if (listener.once) {
          handlersToRemove.push({ event: eventName, listener })
        }
      } catch (error) {
        logger.error(`Error in event handler for ${eventName}:`, error)
        // Continue executing other handlers even if one fails
      }
    }

    // Remove one-time listeners
    for (const { event, listener } of handlersToRemove) {
      this.off(event as K, listener.id)
    }

    // BUFFERING: Clear buffer for this event after successful emission to listeners
    if (this.bufferEnabled && this.eventBuffer.has(eventName)) {
      logger.debug(`Clearing buffer for ${eventName} after successful emission`)
      this.eventBuffer.delete(eventName)
    }
  }

  /**
   * Emit an event synchronously (fire and forget)
   */
  emitSync<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    // Fire and forget - don't wait for async handlers
    this.emit(event, data).catch((error) => {
      logger.error(`Error emitting event ${String(event)}:`, error)
    })
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: keyof EventMap | WildcardPattern): void {
    if (event) {
      const eventName = String(event)
      this.listeners.delete(eventName)
      logger.debug(`All listeners removed for event: ${eventName}`)
    } else {
      this.listeners.clear()
      logger.debug('All listeners removed')
    }
  }

  /**
   * Wait for an event to be emitted
   */
  waitFor<K extends keyof EventMap>(event: K, timeout?: number): Promise<EventMap[K]> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | number | undefined

      let listenerId: string | undefined

      // Setup timeout if specified
      if (timeout) {
        timeoutId = setTimeout(() => {
          if (listenerId) {
            this.off(event, listenerId)
          }
          reject(new Error(`Timeout waiting for event: ${String(event)}`))
        }, timeout)
      }

      // Setup one-time listener
      listenerId = this.once(event, (data) => {
        if (timeoutId) {
          clearTimeout(timeoutId as number)
        }
        resolve(data)
      })
    })
  }

  /**
   * Get wildcard listeners that match the event name
   */
  private getWildcardListeners(eventName: string): EventListener[] {
    const wildcardListeners: EventListener[] = []

    // Check for exact wildcard match (*)
    const allWildcard = this.listeners.get('*')
    if (allWildcard) {
      wildcardListeners.push(...allWildcard)
    }

    // Check for namespace wildcards (e.g., "call:*")
    for (const [pattern, listeners] of this.listeners.entries()) {
      if (pattern.endsWith(':*')) {
        const namespace = pattern.slice(0, -2)
        if (eventName.startsWith(namespace + ':')) {
          wildcardListeners.push(...listeners)
        }
      }
    }

    return wildcardListeners
  }

  /**
   * Generate a unique listener ID
   */
  private generateListenerId(): string {
    return `listener_${++this.listenerIdCounter}_${Date.now()}`
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: keyof EventMap | WildcardPattern): number {
    const eventName = String(event)
    const listeners = this.listeners.get(eventName)
    return listeners ? listeners.length : 0
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: keyof EventMap | WildcardPattern): boolean {
    return this.listenerCount(event) > 0
  }

  /**
   * Enable or disable event buffering
   */
  setBufferingEnabled(enabled: boolean): void {
    this.bufferEnabled = enabled
    if (!enabled) {
      this.eventBuffer.clear()
      logger.debug('Event buffering disabled and buffer cleared')
    } else {
      logger.debug('Event buffering enabled')
    }
  }

  /**
   * Clear all event listeners and reset state
   */
  destroy(): void {
    this.removeAllListeners()
    this.eventBuffer.clear()
    this.listenerIdCounter = 0
    logger.debug('EventBus destroyed')
  }
}

/**
 * Create a new EventBus instance
 */
export function createEventBus(): EventBus {
  return new EventBus()
}

/**
 * Global event bus singleton (can be used for application-wide events)
 *
 * WARNING: When using this singleton, ensure you call cleanupGlobalEventBus()
 * when your application unmounts or during hot module replacement to prevent
 * memory leaks from accumulated event listeners.
 */
export const globalEventBus = createEventBus()

/**
 * Cleanup the global event bus
 *
 * Call this function when your Vue application unmounts or during
 * hot module replacement (HMR) to prevent memory leaks from accumulated
 * event listeners on the singleton.
 *
 * @example
 * ```ts
 * // In your main.ts or App.vue
 * import { cleanupGlobalEventBus } from '@/core/EventBus'
 *
 * // Vue 3 app unmount hook
 * app.unmount()
 * cleanupGlobalEventBus()
 *
 * // Or in Vite HMR
 * if (import.meta.hot) {
 *   import.meta.hot.dispose(() => {
 *     cleanupGlobalEventBus()
 *   })
 * }
 * ```
 */
export function cleanupGlobalEventBus(): void {
  globalEventBus.destroy()
}
