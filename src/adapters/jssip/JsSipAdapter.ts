/**
 * JsSIP Adapter Implementation
 *
 * Provides a unified adapter interface for the JsSIP SIP library.
 * Implements ISipAdapter to allow VueSip to work with JsSIP transparently.
 */

import JsSIP, { type UA, WebSocketInterface } from 'jssip'
import type { UAConfiguration } from 'jssip/lib/UA'
import { EventEmitter } from '../../utils/EventEmitter'
import type { ISipAdapter, ICallSession, AdapterEvents, CallOptions } from '../types'
import { AdapterNotSupportedError } from '../types'
import type { SipClientConfig } from '../../types/config.types'
import { ConnectionState, RegistrationState } from '../../types/sip.types'
import { JsSipCallSession } from './JsSipCallSession'

/**
 * JsSIP incoming message event data structure
 */
interface JsSipMessageEventData {
  originator?: 'local' | 'remote'
  request?: {
    from?: {
      uri?: {
        toString(): string
      }
    }
  }
  message?: {
    body?: string
    content_type?: string
  }
}

/**
 * JsSIP Adapter
 *
 * Wraps JsSIP's User Agent to provide a standardized SIP adapter interface.
 */
export class JsSipAdapter extends EventEmitter<AdapterEvents> implements ISipAdapter {
  // Adapter metadata
  readonly adapterName = 'JsSIP Adapter'
  readonly adapterVersion = '1.0.0'
  readonly libraryName = 'JsSIP'

  // Internal state
  private ua: UA | null = null
  private config: SipClientConfig | null = null
  private _connectionState: ConnectionState = ConnectionState.Disconnected
  private _registrationState: RegistrationState = RegistrationState.Unregistered
  private activeSessions = new Map<string, JsSipCallSession>()
  private libraryOptions: Record<string, unknown> = {}

  constructor(options?: Record<string, unknown>) {
    super()
    this.libraryOptions = options ?? {}
  }

  // ========== Read-only Properties ==========

  get libraryVersion(): string {
    return JsSIP.version || '3.x'
  }

  get isConnected(): boolean {
    return this._connectionState === ConnectionState.Connected
  }

  get connectionState(): ConnectionState {
    return this._connectionState
  }

  get isRegistered(): boolean {
    return this._registrationState === RegistrationState.Registered
  }

  get registrationState(): RegistrationState {
    return this._registrationState
  }

  // ========== Lifecycle Methods ==========

  async initialize(config: SipClientConfig): Promise<void> {
    this.config = config

    // Enable JsSIP debug if configured
    if (config.debug) {
      JsSIP.debug.enable('JsSIP:*')
    } else {
      JsSIP.debug.disable()
    }
  }

  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Adapter not initialized. Call initialize() first.')
    }

    if (this.ua && this.isConnected) {
      return // Already connected
    }

    this.updateConnectionState(ConnectionState.Connecting)
    this.emit('connection:connecting', undefined)

    try {
      const uaConfig = this.createUAConfiguration()
      this.ua = new JsSIP.UA(uaConfig)
      this.setupEventHandlers()
      this.ua.start()

      // Wait for connection
      await this.waitForConnection()
    } catch (error) {
      this.updateConnectionState(ConnectionState.ConnectionFailed)
      this.emit('connection:failed', {
        error: error instanceof Error ? error : new Error(String(error)),
      })
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.ua) {
      return
    }

    // Terminate all active sessions
    for (const session of this.activeSessions.values()) {
      try {
        await session.terminate()
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.activeSessions.clear()

    this.ua.stop()
    this.ua = null
    this.updateConnectionState(ConnectionState.Disconnected)
    this.emit('connection:disconnected', { reason: 'User initiated disconnect' })
  }

  async register(): Promise<void> {
    if (!this.ua) {
      throw new Error('Not connected. Call connect() first.')
    }

    if (this.isRegistered) {
      return // Already registered
    }

    this.updateRegistrationState(RegistrationState.Registering)
    this.emit('registration:registering', undefined)

    // Capture ua reference before entering Promise to satisfy TypeScript
    const ua = this.ua

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Registration timeout'))
      }, 30000)

      const onRegistered = (data: {
        response?: { getHeader: (name: string) => string | undefined }
      }) => {
        cleanup()
        const expires = parseInt(data.response?.getHeader('Expires') ?? '600', 10)
        this.updateRegistrationState(RegistrationState.Registered)
        this.emit('registration:registered', { expires })
        resolve()
      }

      const onFailed = (data: { response?: { status_code: number }; cause: string }) => {
        cleanup()
        this.updateRegistrationState(RegistrationState.RegistrationFailed)
        this.emit('registration:failed', {
          error: new Error(data.cause),
          statusCode: data.response?.status_code,
        })
        reject(new Error(`Registration failed: ${data.cause}`))
      }

      const cleanup = () => {
        clearTimeout(timeout)
        ua.off('registered', onRegistered)
        ua.off('registrationFailed', onFailed)
      }

      ua.once('registered', onRegistered)
      ua.once('registrationFailed', onFailed)
      ua.register()
    })
  }

  async unregister(): Promise<void> {
    if (!this.ua || !this.isRegistered) {
      return
    }

    // Capture ua reference before entering Promise to satisfy TypeScript
    const ua = this.ua

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        // Unregister usually succeeds even without response
        this.updateRegistrationState(RegistrationState.Unregistered)
        this.emit('registration:unregistered', undefined)
        resolve()
      }, 10000)

      const onUnregistered = () => {
        cleanup()
        this.updateRegistrationState(RegistrationState.Unregistered)
        this.emit('registration:unregistered', undefined)
        resolve()
      }

      const cleanup = () => {
        clearTimeout(timeout)
        ua.off('unregistered', onUnregistered)
      }

      ua.once('unregistered', onUnregistered)

      try {
        ua.unregister()
      } catch (error) {
        cleanup()
        reject(error)
      }
    })
  }

  // ========== Call Methods ==========

  async call(target: string, options?: CallOptions): Promise<ICallSession> {
    if (!this.ua) {
      throw new Error('Not connected')
    }

    console.log('[JsSipAdapter] Making call to:', target)
    console.log('[JsSipAdapter] Call options:', options)

    const jssipOptions: Record<string, unknown> = {
      mediaConstraints: options?.mediaConstraints ?? { audio: true, video: false },
    }

    // Pass pre-acquired mediaStream if provided (takes precedence over mediaConstraints)
    if (options?.mediaStream) {
      jssipOptions.mediaStream = options.mediaStream
      console.log('[JsSipAdapter] Using pre-acquired mediaStream for call')
    }

    if (options?.extraHeaders) {
      jssipOptions.extraHeaders = options.extraHeaders
    }

    if (options?.anonymous) {
      jssipOptions.anonymous = options.anonymous
    }

    if (options?.pcConfig) {
      jssipOptions.pcConfig = options.pcConfig
    }

    const rtcSession = this.ua.call(target, jssipOptions)
    const session = new JsSipCallSession(rtcSession)
    this.activeSessions.set(session.id, session)

    // Clean up when session ends
    session.on('ended', () => {
      this.activeSessions.delete(session.id)
    })
    session.on('failed', () => {
      this.activeSessions.delete(session.id)
    })

    this.emit('call:outgoing', { session })
    return session
  }

  async sendMessage(target: string, content: string, contentType = 'text/plain'): Promise<void> {
    if (!this.ua) {
      throw new Error('Not connected')
    }

    // Capture ua reference before entering Promise to satisfy TypeScript
    const ua = this.ua

    return new Promise((resolve, reject) => {
      const message = ua.sendMessage(target, content, {
        contentType,
        eventHandlers: {
          succeeded: () => resolve(),
          failed: (data: { cause: string }) => reject(new Error(`Message failed: ${data.cause}`)),
        },
      })

      if (!message) {
        reject(new Error('Failed to create message'))
      }
    })
  }

  async sendDTMF(callId: string, tone: string): Promise<void> {
    const session = this.activeSessions.get(callId)
    if (!session) {
      throw new Error(`Call session not found: ${callId}`)
    }
    return session.sendDTMF(tone)
  }

  // ========== Presence Methods ==========
  // Note: JsSIP does not have native SUBSCRIBE/PUBLISH support.
  // These methods throw AdapterNotSupportedError with helpful suggestions.

  /**
   * Subscribe to SIP event notifications.
   *
   * **Not supported by JsSIP.** JsSIP does not include native SUBSCRIBE
   * functionality for presence or event packages. The library focuses on
   * call management (INVITE/BYE) and messaging (MESSAGE).
   *
   * @param target - SIP URI to subscribe to
   * @param event - Event package name (e.g., 'presence', 'dialog')
   * @param expires - Subscription duration in seconds
   * @throws {@link AdapterNotSupportedError} Always throws - JsSIP doesn't support SUBSCRIBE
   *
   * @remarks
   * If you need presence functionality, consider:
   * 1. Using a SIP server with built-in presence (like Ooma, Twilio)
   * 2. Implementing presence via a separate WebSocket/REST API
   * 3. Using a library with presence support (e.g., SIP.js with custom extensions)
   *
   * @see RFC 3265 - SIP-Specific Event Notification
   * @see RFC 3856 - A Presence Event Package for SIP
   */
  async subscribe(target: string, event: string, expires = 3600): Promise<void> {
    // Ensure all parameters are used to satisfy interface contract
    void target
    void event
    void expires

    throw new AdapterNotSupportedError(
      'subscribe',
      this.adapterName,
      'JsSIP does not include native SUBSCRIBE support for presence/events. ' +
        'Consider using a server-side presence solution or a custom implementation.'
    )
  }

  /**
   * Unsubscribe from SIP event notifications.
   *
   * **Not supported by JsSIP.** Since JsSIP doesn't support SUBSCRIBE,
   * unsubscribe is also not available.
   *
   * @param target - SIP URI to unsubscribe from
   * @param event - Event package name
   * @throws {@link AdapterNotSupportedError} Always throws - JsSIP doesn't support SUBSCRIBE
   */
  async unsubscribe(target: string, event: string): Promise<void> {
    void target
    void event

    throw new AdapterNotSupportedError(
      'unsubscribe',
      this.adapterName,
      'JsSIP does not include native SUBSCRIBE support.'
    )
  }

  /**
   * Publish presence or event state.
   *
   * **Not supported by JsSIP.** JsSIP does not include native PUBLISH
   * functionality for presence state publication.
   *
   * @param event - Event type (e.g., 'presence')
   * @param state - State data to publish
   * @throws {@link AdapterNotSupportedError} Always throws - JsSIP doesn't support PUBLISH
   *
   * @remarks
   * If you need to publish presence, consider:
   * 1. Using your SIP server's presence API (if available)
   * 2. Implementing a custom REST/WebSocket presence service
   * 3. Using SIP.js or another library with PUBLISH support
   *
   * @see RFC 3903 - SIP Extension for Event State Publication
   */
  async publish(event: string, state: unknown): Promise<void> {
    void event
    void state

    throw new AdapterNotSupportedError(
      'publish',
      this.adapterName,
      'JsSIP does not include native PUBLISH support. ' +
        'Consider using a server-side presence API or custom implementation.'
    )
  }

  // ========== Session Management ==========

  getActiveCalls(): ICallSession[] {
    return Array.from(this.activeSessions.values())
  }

  getCallSession(callId: string): ICallSession | null {
    return this.activeSessions.get(callId) ?? null
  }

  async destroy(): Promise<void> {
    try {
      if (this.isRegistered) {
        await this.unregister()
      }
      await this.disconnect()
    } catch {
      // Ignore errors during cleanup
    }

    this.activeSessions.clear()
    this.removeAllListeners()
    this.config = null
  }

  // ========== Private Methods ==========

  private createUAConfiguration(): UAConfiguration {
    if (!this.config) {
      throw new Error('Config not set')
    }

    const socket = new WebSocketInterface(this.config.uri) as import('jssip').Socket

    const uaConfig: UAConfiguration = {
      sockets: [socket],
      uri: this.config.sipUri,
      password: this.config.password,
      display_name: this.config.displayName,
      authorization_user: this.config.authorizationUsername,
      register: false, // We handle registration manually
      register_expires: this.config.registrationOptions?.expires ?? 600,
      session_timers: this.config.sessionOptions?.sessionTimers ?? true,
      connection_recovery_min_interval: this.config.wsOptions?.reconnectionDelay
        ? Math.floor(this.config.wsOptions.reconnectionDelay / 1000)
        : 4,
      connection_recovery_max_interval: this.config.wsOptions?.maxReconnectionAttempts
        ? Math.floor((this.config.wsOptions.reconnectionDelay ?? 4000) / 1000)
        : 30,
      ...this.libraryOptions,
    }

    return uaConfig
  }

  private setupEventHandlers(): void {
    if (!this.ua) return

    // Connection events
    this.ua.on('connecting', () => {
      this.updateConnectionState(ConnectionState.Connecting)
      this.emit('connection:connecting', undefined)
    })

    this.ua.on('connected', () => {
      this.updateConnectionState(ConnectionState.Connected)
      this.emit('connection:connected', undefined)
    })

    this.ua.on('disconnected', () => {
      this.updateConnectionState(ConnectionState.Disconnected)
      this.emit('connection:disconnected', { reason: 'Disconnected from server' })
    })

    // Registration events
    this.ua.on(
      'registered',
      (data: { response?: { getHeader: (name: string) => string | undefined } }) => {
        const expires = parseInt(data.response?.getHeader('Expires') ?? '600', 10)
        this.updateRegistrationState(RegistrationState.Registered)
        this.emit('registration:registered', { expires })
      }
    )

    this.ua.on('unregistered', () => {
      this.updateRegistrationState(RegistrationState.Unregistered)
      this.emit('registration:unregistered', undefined)
    })

    this.ua.on(
      'registrationFailed',
      (data: { response?: { status_code: number }; cause: string }) => {
        this.updateRegistrationState(RegistrationState.RegistrationFailed)
        this.emit('registration:failed', {
          error: new Error(data.cause),
          statusCode: data.response?.status_code,
        })
      }
    )

    // Incoming call
    this.ua.on(
      'newRTCSession',
      (data: { originator: string; session: import('jssip').RTCSession }) => {
        if (data.originator === 'remote') {
          const session = new JsSipCallSession(data.session)
          this.activeSessions.set(session.id, session)

          // Clean up when session ends
          session.on('ended', () => {
            this.activeSessions.delete(session.id)
          })
          session.on('failed', () => {
            this.activeSessions.delete(session.id)
          })

          this.emit('call:incoming', { session })
        }
      }
    )

    // Incoming message handler - use type assertion for JsSIP event not in type definitions
    ;(
      this.ua as unknown as {
        on: (event: string, handler: (data: JsSipMessageEventData) => void) => void
      }
    ).on('newMessage', (data: JsSipMessageEventData) => {
      if (data?.originator === 'remote') {
        this.emit('message:received', {
          from: data.request?.from?.uri?.toString() ?? 'unknown',
          content: data.message?.body ?? '',
          contentType: data.message?.content_type ?? 'text/plain',
        })
      }
    })
  }

  private async waitForConnection(): Promise<void> {
    if (this.isConnected) {
      return
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Connection timeout'))
      }, 30000)

      const onConnected = () => {
        cleanup()
        resolve()
      }

      const onDisconnected = () => {
        cleanup()
        reject(new Error('Connection failed'))
      }

      const cleanup = () => {
        clearTimeout(timeout)
        this.ua?.off('connected', onConnected)
        this.ua?.off('disconnected', onDisconnected)
      }

      this.ua?.once('connected', onConnected)
      this.ua?.once('disconnected', onDisconnected)
    })
  }

  private updateConnectionState(state: ConnectionState): void {
    this._connectionState = state
  }

  private updateRegistrationState(state: RegistrationState): void {
    this._registrationState = state
  }
}
