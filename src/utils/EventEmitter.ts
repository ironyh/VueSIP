/**
 * EventEmitter - Simple type-safe event emitter
 *
 * Provides a lightweight event emitter implementation with TypeScript support.
 * Used as a base for adapters and other event-driven components.
 */

export type EventHandler<T = unknown> = (data: T) => void

/**
 * EventEmitter base class
 *
 * Provides event subscription, emission, and cleanup capabilities.
 */
export class EventEmitter<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  protected listeners: Map<string, Set<EventHandler<unknown>>> = new Map()

  /**
   * Subscribe to an event
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    const eventKey = event as string
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, new Set())
    }

    const handlers = this.listeners.get(eventKey)
    if (handlers) {
      handlers.add(handler as EventHandler<unknown>)
    }

    // Return unsubscribe function - capture handlers in closure safely
    return () => {
      const currentHandlers = this.listeners.get(eventKey)
      if (currentHandlers) {
        currentHandlers.delete(handler as EventHandler<unknown>)
        if (currentHandlers.size === 0) {
          this.listeners.delete(eventKey)
        }
      }
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first emission)
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    const wrappedHandler = (data: TEvents[K]) => {
      handler(data)
      unsubscribe()
    }

    const unsubscribe = this.on(event, wrappedHandler)
    return unsubscribe
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - Event name
   * @param handler - Event handler function to remove (optional - removes all if not specified)
   */
  off<K extends keyof TEvents>(event: K, handler?: EventHandler<TEvents[K]>): void {
    const eventKey = event as string
    const handlers = this.listeners.get(eventKey)
    if (!handlers) return

    if (handler) {
      handlers.delete(handler as EventHandler<unknown>)
      if (handlers.size === 0) {
        this.listeners.delete(eventKey)
      }
    } else {
      // Remove all handlers for this event
      this.listeners.delete(eventKey)
    }
  }

  /**
   * Emit an event
   *
   * @param event - Event name
   * @param data - Event data
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const eventKey = event as string
    const handlers = this.listeners.get(eventKey)
    if (!handlers) return

    // Create a copy of handlers to avoid issues if handlers modify the set during iteration
    const handlersArray = Array.from(handlers)
    for (const handler of handlersArray) {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for "${eventKey}":`, error)
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * Get the number of listeners for an event
   *
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const eventKey = event as string
    const handlers = this.listeners.get(eventKey)
    return handlers ? handlers.size : 0
  }

  /**
   * Get all event names that have listeners
   *
   * @returns Array of event names
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys())
  }
}
