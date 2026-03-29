import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    isRegistered(): boolean {
      return this._isRegistered
    }
    start(): void {}
    stop(): void {}
    register(): void {}
    unregister(): void {}
    getOwnedSessions(): unknown[] {
      return []
    }
    call(_target: string, _options?: unknown): unknown {
      return { id: `mock-call-${_target}` }
    }
    sendMessage(): void {}
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

import { UA as MockUA } from 'jssip'
import { createEventBus } from '../EventBus'
import { SipClient } from '../SipClient'

describe('SipClient with mock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockUA.lastConfig = {}
    MockUA.lastInstance = null
    vi.clearAllMocks()
  })

  it('should work', async () => {
    const eventBus = createEventBus()
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

    const startPromise = client.start()
    vi.advanceTimersByTime(0)

    console.log('MockUA.lastInstance:', MockUA.lastInstance)
    console.log('MockUA.lastInstance type:', typeof MockUA.lastInstance)
    console.log('MockUA.lastInstance.isRegistered:', MockUA.lastInstance?.isRegistered)
    console.log('MockUA.lastInstance methods:', Object.keys(MockUA.lastInstance || {}))

    if (MockUA.lastInstance) {
      MockUA.lastInstance.simulateConnect()
    }
    await startPromise
    expect(client.connectionState).toBe(0)
  })
})
