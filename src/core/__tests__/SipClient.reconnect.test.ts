/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionState } from '@/types/sip.types'
import type { SipClientConfig } from '@/types/config.types'

// Mock jssip with a comprehensive mock that integrates with the existing setup.ts mock
vi.mock('jssip', () => {
  class MockUA {
    static lastConfig: Record<string, unknown> = {}
    static lastInstance: MockUA | null = null

    private _eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()
    private _onceHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()
    private _isConnected = false
    private _isRegistered = false
    readonly _config: Record<string, unknown>

    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!this._eventHandlers.has(event)) this._eventHandlers.set(event, new Set())
      this._eventHandlers.get(event)!.add(handler)
    })

    off = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      this._eventHandlers.get(event)?.delete(handler)
      this._onceHandlers.get(event)?.delete(handler)
    })

    once = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!this._onceHandlers.has(event)) this._onceHandlers.set(event, new Set())
      this._onceHandlers.get(event)!.add(handler)
    })

    constructor(config: Record<string, unknown>) {
      this._config = config
      MockUA.lastConfig = { ...config }
      MockUA.lastInstance = this
    }

    simulateConnect(): void {
      this._isConnected = true
      const args = [{ socket: { url: 'wss://example.com/ws' } }]
      // once handlers fire first (and are removed)
      const onceH = this._onceHandlers.get('connected')
      if (onceH) {
        for (const h of [...onceH]) h(...args)
        this._onceHandlers.delete('connected')
      }
      // regular handlers fire after
      const handlers = this._eventHandlers.get('connected')
      if (handlers) for (const h of [...handlers]) h(...args)
    }

    simulateDisconnect(err?: unknown): void {
      this._isConnected = false
      const args = [{ error: err }]
      const onceH = this._onceHandlers.get('disconnected')
      if (onceH) {
        for (const h of [...onceH]) h(...args)
        this._onceHandlers.delete('disconnected')
      }
      const handlers = this._eventHandlers.get('disconnected')
      if (handlers) for (const h of [...handlers]) h(...args)
    }

    // Methods required by SipClient
    isConnected(): boolean {
      return this._isConnected
    }
    isRegistered(): boolean {
      return this._isRegistered
    }
    start(): void {}
    stop(): void {
      this._isConnected = false
      this._isRegistered = false
      const args = [{ error: undefined }]
      const onceH = this._onceHandlers.get('disconnected')
      if (onceH) {
        for (const h of [...onceH]) h(...args)
        this._onceHandlers.delete('disconnected')
      }
      const handlers = this._eventHandlers.get('disconnected')
      if (handlers) for (const h of [...handlers]) h(...args)
    }
    register(): void {}
    unregister(): void {
      this._isRegistered = false
    }
    getOwnedSessions(): unknown[] {
      return []
    }
    call(target: string, _options?: unknown): unknown {
      return { id: `mock-call-${target}`, local_identity: {}, remote_identity: {} }
    }
    sendMessage(_target: unknown, _body: string, _options?: unknown): void {}
    getLogger(): unknown {
      return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    }
  }

  const mock = {
    UA: MockUA as any,
    UserAgent: MockUA as any,
    WebSocketInterface: vi.fn(),
    debug: { enable: vi.fn(), disable: vi.fn() },
    version: '3.10.0',
    name: 'JsSIP',
  }

  return { ...mock, default: mock }
})

// Import the MockUA class reference to access lastConfig/lastInstance
import { UA as MockUA } from 'jssip'
import { createEventBus, type EventBus } from '../EventBus'
import { SipClient } from '../SipClient'

// ============================================================================
// Test helpers
// ============================================================================

const VALID_WS_URL = 'wss://192.168.1.100/ws'

const defaultSipConfig: SipClientConfig = {
  uri: VALID_WS_URL,
  sipUri: 'sip:test@192.168.1.100',
  password: 'testpassword',
  wsOptions: {
    connectionTimeout: 10000,
    maxReconnectionAttempts: 5,
    reconnectionDelay: 2000,
  },
}

function createTestEventBus(): EventBus {
  return createEventBus()
}

/** Start the client and immediately simulate successful connection */
async function startClientAndConnect(client: SipClient): Promise<void> {
  const startPromise = client.start()
  // Advance timers so pending promises resolve
  vi.advanceTimersByTime(0)
  // Simulate the UA connecting
  MockUA.lastInstance?.simulateConnect()
  await startPromise
}

// ============================================================================
// Tests
// ============================================================================

describe('SipClient reconnection backoff strategy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockUA.lastConfig = {}
    MockUA.lastInstance = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --------------------------------------------------------------------------
  // Connection recovery configuration
  // --------------------------------------------------------------------------

  describe('connection recovery configuration', () => {
    it('should set connection_recovery_min_interval from wsOptions.reconnectionDelay', async () => {
      const config: SipClientConfig = {
        ...defaultSipConfig,
        wsOptions: { ...defaultSipConfig.wsOptions!, reconnectionDelay: 3000 },
      }

      const eventBus = createTestEventBus()
      const client = new SipClient(config, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_min_interval']).toBe(3000)
    })

    it('should default connection_recovery_min_interval to 2 when not specified', async () => {
      const config: SipClientConfig = {
        ...defaultSipConfig,
        wsOptions: { connectionTimeout: 10000, maxReconnectionAttempts: 5 },
      }

      const eventBus = createTestEventBus()
      const client = new SipClient(config, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_min_interval']).toBe(2)
    })

    it('should set connection_recovery_max_interval to 30', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_max_interval']).toBe(30)
    })

    it('should include both recovery intervals in UA config', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig).toHaveProperty('connection_recovery_min_interval')
      expect(MockUA.lastConfig).toHaveProperty('connection_recovery_max_interval')
    })
  })

  // --------------------------------------------------------------------------
  // Exponential backoff behavior
  // --------------------------------------------------------------------------

  describe('exponential backoff behavior', () => {
    it('should use 2000ms min_interval (default) for first reconnection', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_min_interval']).toBe(2000)
    })

    it('should cap reconnection delay at max_interval (30s)', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_max_interval']).toBe(30)
    })

    it('should use custom reconnectionDelay when provided', async () => {
      const config: SipClientConfig = {
        ...defaultSipConfig,
        wsOptions: { ...defaultSipConfig.wsOptions!, reconnectionDelay: 5000 },
      }

      const eventBus = createTestEventBus()
      const client = new SipClient(config, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_min_interval']).toBe(5000)
    })
  })

  // --------------------------------------------------------------------------
  // Connection failure recovery events
  // --------------------------------------------------------------------------

  describe('connection failure recovery events', () => {
    it('should emit sip:disconnected event when UA disconnects', async () => {
      const eventBus = createTestEventBus()
      const disconnectedHandler = vi.fn()
      eventBus.on('sip:disconnected', disconnectedHandler)

      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      MockUA.lastInstance?.simulateDisconnect(new Error('Network lost'))

      expect(disconnectedHandler).toHaveBeenCalled()
      const event = disconnectedHandler.mock.calls[0][0]
      expect(event.type).toBe('sip:disconnected')
    })

    it('should emit sip:connected event when UA reconnects', async () => {
      const eventBus = createTestEventBus()
      const connectedHandler = vi.fn()
      eventBus.on('sip:connected', connectedHandler)

      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      MockUA.lastInstance?.simulateConnect()

      expect(connectedHandler).toHaveBeenCalled()
      const event = connectedHandler.mock.calls[0][0]
      expect(event.type).toBe('sip:connected')
    })

    it('should update connectionState to Disconnected on UA disconnect', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      expect(client.connectionState).toBe(ConnectionState.Connected)

      MockUA.lastInstance?.simulateDisconnect()

      expect(client.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should update connectionState to Connected on successful reconnect', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      MockUA.lastInstance?.simulateDisconnect()
      expect(client.connectionState).toBe(ConnectionState.Disconnected)

      MockUA.lastInstance?.simulateConnect()
      expect(client.connectionState).toBe(ConnectionState.Connected)
    })

    it('should not duplicate disconnected events when disconnect fires multiple times', async () => {
      const eventBus = createTestEventBus()
      const disconnectedHandler = vi.fn()
      eventBus.on('sip:disconnected', disconnectedHandler)

      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      MockUA.lastInstance?.simulateDisconnect()
      MockUA.lastInstance?.simulateDisconnect()

      // ensureDisconnectedEvent guards against duplicates
      expect(disconnectedHandler).toHaveBeenCalledTimes(1)
    })
  })

  // --------------------------------------------------------------------------
  // Connection failure scenarios
  // --------------------------------------------------------------------------

  describe('connection failure scenarios', () => {
    it('should transition to Disconnected state when network failure occurs', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      expect(client.connectionState).toBe(ConnectionState.Connected)

      MockUA.lastInstance?.simulateDisconnect(new Error('Network error'))

      expect(client.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should report isConnected=false after network failure', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      MockUA.lastInstance?.simulateDisconnect()

      expect(client.isConnected).toBe(false)
    })

    it('should recover connectionState after successful reconnect', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      MockUA.lastInstance?.simulateDisconnect()
      expect(client.connectionState).toBe(ConnectionState.Disconnected)

      MockUA.lastInstance?.simulateConnect()
      expect(client.connectionState).toBe(ConnectionState.Connected)
    })

    it('should emit error info on disconnect with error argument', async () => {
      const eventBus = createTestEventBus()
      const disconnectedHandler = vi.fn()
      eventBus.on('sip:disconnected', disconnectedHandler)

      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      const networkError = new Error('Connection refused')
      MockUA.lastInstance?.simulateDisconnect(networkError)

      expect(disconnectedHandler).toHaveBeenCalled()
      const event = disconnectedHandler.mock.calls[0][0]
      expect(event.error).toBe(networkError)
    })
  })

  // --------------------------------------------------------------------------
  // Multiple reconnection attempts
  // --------------------------------------------------------------------------

  describe('multiple reconnection attempts', () => {
    it('should handle rapid disconnect/reconnect cycle', async () => {
      const eventBus = createTestEventBus()
      const connectedHandler = vi.fn()
      const disconnectedHandler = vi.fn()
      eventBus.on('sip:connected', connectedHandler)
      eventBus.on('sip:disconnected', disconnectedHandler)

      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      // Rapid cycle: disconnect -> reconnect -> disconnect -> reconnect
      MockUA.lastInstance?.simulateDisconnect()
      expect(client.connectionState).toBe(ConnectionState.Disconnected)

      MockUA.lastInstance?.simulateConnect()
      expect(client.connectionState).toBe(ConnectionState.Connected)

      MockUA.lastInstance?.simulateDisconnect()
      expect(client.connectionState).toBe(ConnectionState.Disconnected)

      MockUA.lastInstance?.simulateConnect()
      expect(client.connectionState).toBe(ConnectionState.Connected)

      expect(disconnectedHandler).toHaveBeenCalledTimes(2)
      expect(connectedHandler).toHaveBeenCalledTimes(2)
    })

    it('should maintain correct state through multiple failures', async () => {
      const eventBus = createTestEventBus()
      const client = new SipClient(defaultSipConfig, eventBus)
      await startClientAndConnect(client)

      // 3 failures followed by success
      for (let i = 0; i < 3; i++) {
        MockUA.lastInstance?.simulateDisconnect()
        expect(client.connectionState).toBe(ConnectionState.Disconnected)
        MockUA.lastInstance?.simulateConnect()
        expect(client.connectionState).toBe(ConnectionState.Connected)
      }
    })
  })

  // --------------------------------------------------------------------------
  // Reconnection configuration edge cases
  // --------------------------------------------------------------------------

  describe('reconnection configuration edge cases', () => {
    it('should handle zero reconnectionDelay gracefully', async () => {
      const config: SipClientConfig = {
        ...defaultSipConfig,
        wsOptions: { ...defaultSipConfig.wsOptions!, reconnectionDelay: 0 },
      }

      const eventBus = createTestEventBus()
      const client = new SipClient(config, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_min_interval']).toBe(0)
      expect(client.connectionState).toBe(ConnectionState.Connected)
    })

    it('should handle very large reconnectionDelay', async () => {
      const config: SipClientConfig = {
        ...defaultSipConfig,
        wsOptions: { ...defaultSipConfig.wsOptions!, reconnectionDelay: 60000 },
      }

      const eventBus = createTestEventBus()
      const client = new SipClient(config, eventBus)
      await startClientAndConnect(client)

      expect(MockUA.lastConfig['connection_recovery_min_interval']).toBe(60000)
    })

    it('should handle missing wsOptions gracefully', async () => {
      const config: SipClientConfig = {
        uri: VALID_WS_URL,
        sipUri: 'sip:test@192.168.1.100',
        password: 'testpassword',
        // wsOptions not provided
      }

      const eventBus = createTestEventBus()
      const client = new SipClient(config, eventBus)
      await startClientAndConnect(client)

      // Should default to 2
      expect(MockUA.lastConfig['connection_recovery_min_interval']).toBe(2)
      expect(client.connectionState).toBe(ConnectionState.Connected)
    })
  })
})
