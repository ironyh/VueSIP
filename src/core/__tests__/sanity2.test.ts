import { describe, it, expect, vi, beforeEach } from 'vitest'

// Override setup.ts mock with our own that has simulation methods
vi.mock('jssip', () => {
  class MockUA {
    static lastConfig: Record<string, unknown> = {}
    static lastInstance: MockUA | null = null

    private _eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()
    private _onceHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()
    private _isConnected = false
    readonly _config: Record<string, unknown>

    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!this._eventHandlers.has(event)) this._eventHandlers.set(event, new Set())
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._eventHandlers.get(event)!.add(handler)
    })

    off = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      this._eventHandlers.get(event)?.delete(handler)
      this._onceHandlers.get(event)?.delete(handler)
    })

    once = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!this._onceHandlers.has(event)) this._onceHandlers.set(event, new Set())
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      const onceH = this._onceHandlers.get('connected')
      if (onceH) {
        for (const h of [...onceH]) h(...args)
        this._onceHandlers.delete('connected')
      }
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

    isConnected(): boolean {
      return this._isConnected
    }
    isRegistered = vi.fn(() => false)
    start(): void {}
    stop(): void {
      this._isConnected = false
    }
    register(): void {}
    unregister(): void {}
    getOwnedSessions(): unknown[] {
      return []
    }
    getLogger() {
      return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    }
  }

  const mock = {
    UA: MockUA as unknown as typeof MockUA,
    UserAgent: MockUA as unknown as typeof MockUA,
    WebSocketInterface: vi.fn(),
    debug: { enable: vi.fn(), disable: vi.fn() },
    version: '3.10.0',
    name: 'JsSIP',
  }

  return { ...mock, default: mock }
})

// Import the MockUA class reference
import { UA as MockUA } from 'jssip'

describe('mock with vi.mock factory', () => {
  beforeEach(() => {
    MockUA.lastConfig = {}
    MockUA.lastInstance = null
    vi.clearAllMocks()
  })

  it('should pass event to connected handler', () => {
    const ua = new MockUA({ uri: 'wss://test' })
    const handler = vi.fn()
    ua.on('connected', handler)
    ua.simulateConnect()
    expect(handler).toHaveBeenCalled()
    expect(handler.mock.calls[0][0]).toEqual({ socket: { url: 'wss://example.com/ws' } })
  })

  it('should work with SipClient', async () => {
    vi.useFakeTimers()
    const { createEventBus } = await import('../EventBus')
    const { SipClient } = await import('../SipClient')

    const eventBus = createEventBus()
    const disconnectedHandler = vi.fn()
    eventBus.on('sip:disconnected', disconnectedHandler)

    const client = new SipClient(
      {
        uri: 'wss://192.168.1.100/ws',
        sipUri: 'sip:test@192.168.1.100',
        password: 'test',
        wsOptions: {
          connectionTimeout: 10000,
          maxReconnectionAttempts: 5,
          reconnectionDelay: 2000,
        },
      },
      eventBus
    )

    // Start the client
    const startPromise = client.start()
    vi.advanceTimersByTime(0)
    MockUA.lastInstance?.simulateConnect()
    await startPromise

    expect(client.connectionState).toBe(0 /* Connected */)

    MockUA.lastInstance?.simulateDisconnect(new Error('test'))
    expect(client.connectionState).toBe(1 /* Disconnected */)
    expect(disconnectedHandler).toHaveBeenCalled()
  })
})
