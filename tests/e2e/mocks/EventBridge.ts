/**
 * EventBridge - State synchronization layer between Playwright tests and the Vue app
 *
 * This bridges the gap between the test runner (Node.js/Playwright) and the browser
 * context where the Vue app runs. It provides event-driven state synchronization
 * instead of timing-based polling.
 */

export interface SipState {
  connection: 'disconnected' | 'connecting' | 'connected'
  registration: 'unregistered' | 'registering' | 'registered' | 'failed'
  call: CallState | null
  error: string | null
}

export interface CallState {
  id: string
  direction: 'incoming' | 'outgoing'
  state: 'initiating' | 'ringing' | 'answered' | 'held' | 'ended'
  remoteUri: string
  startTime: number | null
  endTime: number | null
  holdState: 'none' | 'local' | 'remote' | 'both'
  muted: boolean
  dtmfBuffer: string
}

export interface SipEvent {
  type: SipEventType
  timestamp: number
  data?: Record<string, unknown>
}

export type SipEventType =
  | 'connection:connecting'
  | 'connection:connected'
  | 'connection:disconnected'
  | 'connection:error'
  | 'registration:registering'
  | 'registration:registered'
  | 'registration:unregistered'
  | 'registration:failed'
  | 'call:initiating'
  | 'call:ringing'
  | 'call:answered'
  | 'call:held'
  | 'call:unheld'
  | 'call:ended'
  | 'call:failed'
  | 'call:incoming'
  | 'dtmf:sent'
  | 'media:ready'
  | 'media:error'

/**
 * EventBridge class that gets injected into the browser context
 * and provides reliable state synchronization for tests
 */
export class EventBridge {
  private state: SipState
  private eventLog: SipEvent[]
  private listeners: Map<string, Set<(event: SipEvent) => void>>
  private statePromises: Map<string, { resolve: () => void; condition: () => boolean }[]>

  constructor() {
    this.state = {
      connection: 'disconnected',
      registration: 'unregistered',
      call: null,
      error: null,
    }
    this.eventLog = []
    this.listeners = new Map()
    this.statePromises = new Map()
  }

  /**
   * Get current state snapshot
   */
  getState(): SipState {
    return { ...this.state }
  }

  /**
   * Get full event log for debugging
   */
  getEventLog(): SipEvent[] {
    return [...this.eventLog]
  }

  /**
   * Emit an event and update state accordingly
   */
  emit(type: SipEventType, data?: Record<string, unknown>): void {
    const event: SipEvent = {
      type,
      timestamp: Date.now(),
      data,
    }

    this.eventLog.push(event)
    this.updateState(type, data)
    this.notifyListeners(type, event)
    this.checkStatePromises()

    // Also emit to window for test debugging
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sip:event', {
          detail: event,
        })
      )
    }
  }

  /**
   * Update internal state based on event type
   */
  private updateState(type: SipEventType, data?: Record<string, unknown>): void {
    switch (type) {
      case 'connection:connecting':
        this.state.connection = 'connecting'
        break
      case 'connection:connected':
        this.state.connection = 'connected'
        break
      case 'connection:disconnected':
        this.state.connection = 'disconnected'
        this.state.registration = 'unregistered'
        break
      case 'connection:error':
        this.state.connection = 'disconnected'
        this.state.error = (data?.message as string) || 'Connection error'
        break

      case 'registration:registering':
        this.state.registration = 'registering'
        break
      case 'registration:registered':
        this.state.registration = 'registered'
        break
      case 'registration:unregistered':
        this.state.registration = 'unregistered'
        break
      case 'registration:failed':
        this.state.registration = 'failed'
        this.state.error = (data?.message as string) || 'Registration failed'
        break

      case 'call:initiating':
        this.state.call = {
          id: (data?.callId as string) || `call-${Date.now()}`,
          direction: (data?.direction as 'incoming' | 'outgoing') || 'outgoing',
          state: 'initiating',
          remoteUri: (data?.remoteUri as string) || '',
          startTime: null,
          endTime: null,
          holdState: 'none',
          muted: false,
          dtmfBuffer: '',
        }
        break
      case 'call:incoming':
        this.state.call = {
          id: (data?.callId as string) || `call-${Date.now()}`,
          direction: 'incoming',
          state: 'ringing',
          remoteUri: (data?.remoteUri as string) || '',
          startTime: null,
          endTime: null,
          holdState: 'none',
          muted: false,
          dtmfBuffer: '',
        }
        break
      case 'call:ringing':
        if (this.state.call) {
          this.state.call.state = 'ringing'
        }
        break
      case 'call:answered':
        if (this.state.call) {
          this.state.call.state = 'answered'
          this.state.call.startTime = Date.now()
        }
        break
      case 'call:held':
        if (this.state.call) {
          this.state.call.state = 'held'
          this.state.call.holdState = (data?.holdType as 'local' | 'remote' | 'both') || 'local'
        }
        break
      case 'call:unheld':
        if (this.state.call) {
          this.state.call.state = 'answered'
          this.state.call.holdState = 'none'
        }
        break
      case 'call:ended':
      case 'call:failed':
        if (this.state.call) {
          this.state.call.state = 'ended'
          this.state.call.endTime = Date.now()
        }
        // Keep call state for a moment for tests to read final state
        setTimeout(() => {
          if (this.state.call?.state === 'ended') {
            this.state.call = null
          }
        }, 100)
        break

      case 'dtmf:sent':
        if (this.state.call) {
          this.state.call.dtmfBuffer += (data?.tone as string) || ''
        }
        break
    }
  }

  /**
   * Subscribe to specific event types
   */
  on(type: SipEventType | '*', callback: (event: SipEvent) => void): () => void {
    const key = type
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback)
    }
  }

  /**
   * Wait for a specific state condition
   */
  waitForState(condition: () => boolean, timeout = 10000): Promise<void> {
    // Check if already satisfied
    if (condition()) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const key = `state-${Date.now()}-${Math.random()}`
      const timeoutId = setTimeout(() => {
        this.statePromises.delete(key)
        reject(new Error(`Timeout waiting for state condition after ${timeout}ms`))
      }, timeout)

      this.statePromises.set(key, [
        {
          resolve: () => {
            clearTimeout(timeoutId)
            this.statePromises.delete(key)
            resolve()
          },
          condition,
        },
      ])
    })
  }

  /**
   * Wait for connection state
   */
  waitForConnection(state: 'connected' | 'disconnected', timeout = 10000): Promise<void> {
    return this.waitForState(() => this.state.connection === state, timeout)
  }

  /**
   * Wait for registration state
   */
  waitForRegistration(
    state: 'registered' | 'unregistered' | 'failed',
    timeout = 10000
  ): Promise<void> {
    return this.waitForState(() => this.state.registration === state, timeout)
  }

  /**
   * Wait for call state
   */
  waitForCallState(
    state: 'initiating' | 'ringing' | 'answered' | 'held' | 'ended',
    timeout = 10000
  ): Promise<void> {
    return this.waitForState(() => this.state.call?.state === state, timeout)
  }

  /**
   * Wait for incoming call
   */
  waitForIncomingCall(timeout = 30000): Promise<void> {
    return this.waitForState(
      () => this.state.call?.direction === 'incoming' && this.state.call?.state === 'ringing',
      timeout
    )
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(type: SipEventType, event: SipEvent): void {
    // Notify specific listeners
    this.listeners.get(type)?.forEach((cb) => cb(event))
    // Notify wildcard listeners
    this.listeners.get('*')?.forEach((cb) => cb(event))
  }

  /**
   * Check all pending state promises
   */
  private checkStatePromises(): void {
    this.statePromises.forEach((promises) => {
      promises.forEach((p) => {
        if (p.condition()) {
          p.resolve()
        }
      })
    })
  }

  /**
   * Reset state (for test cleanup)
   */
  reset(): void {
    this.state = {
      connection: 'disconnected',
      registration: 'unregistered',
      call: null,
      error: null,
    }
    this.eventLog = []
    this.statePromises.clear()
  }

  /**
   * Get serializable state for cross-context transfer
   */
  toJSON(): { state: SipState; eventLog: SipEvent[] } {
    return {
      state: this.state,
      eventLog: this.eventLog,
    }
  }
}

/**
 * Create and expose EventBridge on window for browser context
 */
export function initializeEventBridge(): EventBridge {
  const bridge = new EventBridge()

  if (typeof window !== 'undefined') {
    ;(window as any).__sipEventBridge = bridge
    ;(window as any).__sipState = bridge.getState.bind(bridge)
  }

  return bridge
}

/**
 * Get the EventBridge instance from window
 */
export function getEventBridge(): EventBridge | null {
  if (typeof window !== 'undefined') {
    return (window as any).__sipEventBridge || null
  }
  return null
}
