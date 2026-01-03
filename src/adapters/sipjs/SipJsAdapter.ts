/**
 * SIP.js Adapter Implementation (Stub)
 *
 * This is a placeholder implementation for the SIP.js library adapter.
 * Full implementation requires installing the sip.js package.
 *
 * To use SIP.js adapter:
 * 1. Install: npm install sip.js
 * 2. Implement the full adapter following the SIP.js UserAgent API
 *
 * SIP.js Resources:
 * - Website: https://sipjs.com/
 * - GitHub: https://github.com/onsip/SIP.js
 * - npm: https://www.npmjs.com/package/sip.js
 */

import { EventEmitter } from '../../utils/EventEmitter'
import type {
  ISipAdapter,
  ICallSession,
  AdapterEvents,
  CallOptions,
} from '../types'
import type { SipClientConfig } from '../../types/config.types'
import { ConnectionState, RegistrationState } from '../../types/sip.types'

/**
 * SIP.js Adapter (Stub)
 *
 * This stub provides the interface for SIP.js but throws errors
 * indicating full implementation is pending.
 *
 * See JsSipAdapter for a reference implementation.
 */
export class SipJsAdapter extends EventEmitter<AdapterEvents> implements ISipAdapter {
  // Adapter metadata
  readonly adapterName = 'SIP.js Adapter'
  readonly adapterVersion = '1.0.0'
  readonly libraryName = 'SIP.js'
  readonly libraryVersion = '0.21.x'

  // Internal state
  private _connectionState: ConnectionState = ConnectionState.Disconnected
  private _registrationState: RegistrationState = RegistrationState.Unregistered
  private config: SipClientConfig | null = null

  /** Library-specific options (used when full implementation is available) */
  protected libraryOptions: Record<string, unknown> = {}

  constructor(options?: Record<string, unknown>) {
    super()
    this.libraryOptions = options ?? {}
  }

  // ========== Read-only Properties ==========

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
    // SIP.js initialization would go here
    // Example: this.userAgent = new UserAgent(config)
  }

  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Adapter not initialized. Call initialize() first.')
    }

    throw new Error(
      'SIP.js adapter not fully implemented. ' +
      'To use SIP.js:\n' +
      '1. Install: npm install sip.js\n' +
      '2. Implement SipJsAdapter.connect() using SIP.js UserAgent.start()\n' +
      'See https://sipjs.com/api/ for documentation.'
    )
  }

  async disconnect(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  async register(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  async unregister(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  // ========== Call Methods ==========

  async call(_target: string, _options?: CallOptions): Promise<ICallSession> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  async sendMessage(_target: string, _content: string, _contentType?: string): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  async sendDTMF(_callId: string, _tone: string): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  // ========== Presence Methods ==========

  async subscribe(_target: string, _event: string, _expires?: number): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  async unsubscribe(_target: string, _event: string): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  async publish(_event: string, _state: unknown): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented.')
  }

  // ========== Session Management ==========

  getActiveCalls(): ICallSession[] {
    return []
  }

  getCallSession(_callId: string): ICallSession | null {
    return null
  }

  async destroy(): Promise<void> {
    this.removeAllListeners()
    this.config = null
  }
}

/**
 * Check if SIP.js is available
 *
 * This can be used to dynamically check if the sip.js package is installed.
 */
export async function isSipJsAvailable(): Promise<boolean> {
  try {
    // Dynamic import to check if sip.js is available
    // @ts-expect-error - sip.js may not be installed, this is expected
    await import('sip.js')
    return true
  } catch {
    return false
  }
}
