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
    call(): unknown {
      return {}
    }
    sendMessage(): void {}
    getLogger() {
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

import { UA as MockUA } from 'jssip'
import { createEventBus } from '../EventBus'
import { SipClient } from '../SipClient'

describe('SipClient mock test', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockUA.lastConfig = {}
    MockUA.lastInstance = null
    vi.clearAllMocks()
  })

  it('should create SipClient and start', async () => {
    const eventBus = createEventBus()

    // Check if MockUA is properly set
    console.log('MockUA type:', typeof MockUA)
    console.log('MockUA.lastInstance before:', MockUA.lastInstance)

    const client = new SipClient(
      {
        uri: 'wss://192.168.1.100/ws',
        sipUri: 'sip:test@192.168.1.100',
        password: 'test',
        wsOptions: { connectionTimeout: 5000, maxReconnectionAttempts: 5, reconnectionDelay: 2000 },
      },
      eventBus
    )

    console.log('MockUA.lastInstance after constructor:', MockUA.lastInstance)
    console.log('MockUA.lastConfig:', MockUA.lastConfig)

    // Start with a timeout to detect hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout - start() hanging')), 3000)
    })

    const startPromise = client.start()

    console.log('After start() call, before advanceTimers')

    // Try advancing timers
    try {
      vi.advanceTimersByTime(0)
      console.log('After advanceTimersByTime(0)')

      if (MockUA.lastInstance) {
        console.log('Simulating connect...')
        MockUA.lastInstance.simulateConnect()
        console.log('After simulateConnect')
      } else {
        console.log('ERROR: MockUA.lastInstance is null!')
      }
    } catch (e) {
      console.log('Error during timers:', e)
    }

    // Race between start and timeout
    const result = await Promise.race([startPromise, timeoutPromise])
    console.log('Result:', result)

    expect(client.connectionState).toBe(0) // Connected
  }, 10000)
})
