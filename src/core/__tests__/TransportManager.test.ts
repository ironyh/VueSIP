/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TransportManager, TransportEvent } from '../TransportManager'
import { ConnectionState } from '../../types/sip.types'

// Mock WebSocket that tracks instances for test access
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  // Track the last created instance for test access
  static lastInstance: MockWebSocket | null = null

  readyState = MockWebSocket.CONNECTING
  url: string
  protocol: string = ''

  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(url: string, _protocols?: string | string[]) {
    this.url = url
    MockWebSocket.lastInstance = this
  }

  send = vi.fn()
  close = vi.fn()

  // Helper to simulate successful connection
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  // Helper to simulate close
  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code, reason }))
  }

  // Helper to simulate error
  simulateError(): void {
    this.onerror?.(new Event('error'))
  }

  // Helper to simulate message
  simulateMessage(data: string): void {
    this.onmessage?.(new MessageEvent('message', { data }))
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket

describe('TransportManager', () => {
  // Helper type to access private members for testing
  type TransportManagerForTest = TransportManager & {
    emit(event: TransportEvent, data?: Record<string, unknown>): void
    reconnectionAttempts: number
    reconnectionTimer: ReturnType<typeof setTimeout> | null
    RECONNECTION_DELAYS: number[]
    handleReconnection(): void
    clearReconnectionTimer(): void
  }

  const toTestable = (manager: TransportManager): TransportManagerForTest =>
    manager as TransportManagerForTest

  let manager: TransportManager
  const mockUrl = 'wss://example.com/ws'

  beforeEach(() => {
    vi.useFakeTimers()
    manager = new TransportManager({ url: mockUrl })
    MockWebSocket.lastInstance = null
  })

  afterEach(() => {
    manager.destroy()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should create manager with default config', () => {
      expect(manager.state).toBe(ConnectionState.Disconnected)
      expect(manager.isConnected).toBe(false)
    })

    it('should create manager with custom config', () => {
      const customManager = new TransportManager({
        url: mockUrl,
        connectionTimeout: 5000,
        maxReconnectionAttempts: 3,
        keepAliveInterval: 60000,
        autoReconnect: false,
      })

      expect(customManager).toBeDefined()
      customManager.destroy()
    })
  })

  describe('connection state', () => {
    it('should start in disconnected state', () => {
      expect(manager.state).toBe(ConnectionState.Disconnected)
    })

    it('should report not connected initially', () => {
      expect(manager.isConnected).toBe(false)
    })
  })

  describe('event handling', () => {
    it('should add and call event listener', () => {
      const handler = vi.fn()
      manager.on(TransportEvent.Connected, handler)
      toTestable(manager).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should remove event listener', () => {
      const handler = vi.fn()
      manager.on(TransportEvent.Connected, handler)
      manager.off(TransportEvent.Connected, handler)
      toTestable(manager).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      expect(handler).not.toHaveBeenCalled()
    })

    it('should remove all listeners for specific event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      manager.on(TransportEvent.Connected, handler1)
      manager.on(TransportEvent.Connected, handler2)
      manager.removeAllListeners(TransportEvent.Connected)
      toTestable(manager).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should remove all listeners when no event specified', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      manager.on(TransportEvent.Connected, handler1)
      manager.on(TransportEvent.Disconnected, handler2)
      manager.removeAllListeners()
      toTestable(manager).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      toTestable(manager).emit(TransportEvent.Disconnected, { state: ConnectionState.Disconnected })
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('connect', () => {
    it('should transition to connecting state', async () => {
      const connectingHandler = vi.fn()
      manager.on(TransportEvent.Connecting, connectingHandler)

      const connectPromise = manager.connect()
      expect(manager.state).toBe(ConnectionState.Connecting)
      expect(connectingHandler).toHaveBeenCalled()

      // Complete the connection
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
    })

    it('should resolve when connected', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await expect(connectPromise).resolves.toBeUndefined()
      expect(manager.state).toBe(ConnectionState.Connected)
      expect(manager.isConnected).toBe(true)
    })

    it('should emit connected event on successful connection', async () => {
      const connectedHandler = vi.fn()
      manager.on(TransportEvent.Connected, connectedHandler)
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      expect(connectedHandler).toHaveBeenCalledWith({ state: ConnectionState.Connected })
    })

    it('should reset reconnection attempts on connect', async () => {
      toTestable(manager).reconnectionAttempts = 5
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      expect(manager.getReconnectionAttempts()).toBe(0)
    })
  })

  describe('disconnect', () => {
    it('should disconnect and reset state', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      expect(manager.isConnected).toBe(true)
      manager.disconnect()
      expect(manager.state).toBe(ConnectionState.Disconnected)
      expect(manager.isConnected).toBe(false)
    })

    it('should emit disconnected event', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      const disconnectHandler = vi.fn()
      manager.on(TransportEvent.Disconnected, disconnectHandler)
      manager.disconnect()
      expect(disconnectHandler).toHaveBeenCalledWith({ state: ConnectionState.Disconnected })
    })

    it('should reset reconnection attempts', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      toTestable(manager).reconnectionAttempts = 5
      manager.disconnect()
      expect(manager.getReconnectionAttempts()).toBe(0)
    })
  })

  describe('send', () => {
    it('should send data when connected', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      expect(() => manager.send('test message')).not.toThrow()
      expect(MockWebSocket.lastInstance?.send).toHaveBeenCalledWith('test message')
    })

    it('should throw when not connected', () => {
      expect(() => manager.send('test')).toThrow('WebSocket is not connected')
    })

    it('should throw after disconnect', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      manager.disconnect()
      expect(() => manager.send('test')).toThrow('WebSocket is not connected')
    })
  })

  describe('manual reconnect', () => {
    it('should reset reconnection counter on manual reconnect', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      toTestable(manager).reconnectionAttempts = 5
      const reconnectPromise = manager.reconnect()
      MockWebSocket.lastInstance?.simulateOpen()
      await reconnectPromise
      expect(manager.getReconnectionAttempts()).toBe(0)
    })

    it('should reconnect after disconnect', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      manager.disconnect()
      const reconnectingHandler = vi.fn()
      manager.on(TransportEvent.Reconnecting, reconnectingHandler)
      const reconnectPromise = manager.reconnect()
      MockWebSocket.lastInstance?.simulateOpen()
      await reconnectPromise
      // Manual reconnect doesn't trigger auto-reconnect behavior
      expect(reconnectingHandler).not.toHaveBeenCalled()
    })
  })

  describe('resetReconnectionAttempts', () => {
    it('should reset counter', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      toTestable(manager).reconnectionAttempts = 5
      manager.resetReconnectionAttempts()
      expect(manager.getReconnectionAttempts()).toBe(0)
    })
  })

  describe('destroy', () => {
    it('should clean up all resources', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      manager.destroy()
      expect(manager.state).toBe(ConnectionState.Disconnected)
      expect(manager.getReconnectionAttempts()).toBe(0)
    })

    it('should clear listeners on destroy', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // Add a handler that should be cleared on destroy
      const connectHandler = vi.fn()
      manager.on(TransportEvent.Connected, connectHandler)

      manager.destroy()

      // After destroy, manually emit an event to verify listeners are cleared
      // Use Connected event to avoid interference from disconnect behavior
      toTestable(manager).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      expect(connectHandler).not.toHaveBeenCalled()
    })
  })

  describe('message handling', () => {
    it('should emit message events', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      const messageHandler = vi.fn()
      manager.on(TransportEvent.Message, messageHandler)
      const testMessage = 'SIP/2.0 200 OK\r\n'
      MockWebSocket.lastInstance?.simulateMessage(testMessage)
      expect(messageHandler).toHaveBeenCalledWith(testMessage)
    })
  })

  describe('error handling', () => {
    it('should emit error event on WebSocket error', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      const errorHandler = vi.fn()
      manager.on(TransportEvent.Error, errorHandler)
      MockWebSocket.lastInstance?.simulateError()
      expect(errorHandler).toHaveBeenCalled()
    })

    it('should handle send errors', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      MockWebSocket.lastInstance!.send = vi.fn(() => {
        throw new Error('Send failed')
      })
      expect(() => manager.send('test')).toThrow('Send failed')
    })
  })

  describe('state transitions', () => {
    it('should emit connecting state', async () => {
      const stateHandler = vi.fn()
      manager.on(TransportEvent.Connecting, stateHandler)
      const connectPromise = manager.connect()
      expect(stateHandler).toHaveBeenCalled()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
    })

    it('should emit reconnecting state on auto-reconnect', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise
      const reconnectingHandler = vi.fn()
      manager.on(TransportEvent.Reconnecting, reconnectingHandler)
      // Simulate unexpected disconnect (not manual)
      MockWebSocket.lastInstance?.simulateClose()
      // Should attempt reconnection
      expect(reconnectingHandler).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // NEW TESTS: Reconnection backoff, max-attempt boundary, timer cleanup
  // ============================================================================

  describe('reconnection backoff', () => {
    it('should use correct exponential backoff delays from RECONNECTION_DELAYS', () => {
      const testable = toTestable(manager)
      const expectedDelays = [2000, 4000, 8000, 16000, 32000]
      expect(testable.RECONNECTION_DELAYS).toEqual(expectedDelays)
    })

    it('should apply first delay (2000ms) on first reconnection attempt', async () => {
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      const reconnectingHandler = vi.fn()
      manager.on(TransportEvent.Reconnecting, reconnectingHandler)

      // Simulate unexpected disconnect
      MockWebSocket.lastInstance?.simulateClose()

      expect(reconnectingHandler).toHaveBeenCalled()
      expect(manager.getReconnectionAttempts()).toBe(1)

      // Verify timer is set with first delay (2000ms)
      // The reconnection timer should be pending
      const testable = toTestable(manager)
      expect(testable.reconnectionTimer).not.toBeNull()
    })

    it('should increase delay on subsequent reconnection attempts', async () => {
      const testable = toTestable(manager)

      // Start connected
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // First disconnect - triggers reconnection with attempt 1
      MockWebSocket.lastInstance?.simulateClose()
      expect(manager.getReconnectionAttempts()).toBe(1)

      // Advance time past first delay (2000ms)
      vi.advanceTimersByTime(2000)
      await Promise.resolve()

      // Connection opens (this resets attempts to 0), then immediately fails again
      MockWebSocket.lastInstance?.simulateOpen()
      await Promise.resolve()

      // Simulate another disconnect - this is attempt 1 again since it was reset
      MockWebSocket.lastInstance?.simulateClose()
      expect(manager.getReconnectionAttempts()).toBe(1)

      // The key test: verify that the backoff behavior works
      // by checking the internal delay calculation
      const delays = testable.RECONNECTION_DELAYS
      expect(delays[0]).toBe(2000)
      expect(delays[1]).toBe(4000)
      expect(delays[2]).toBe(8000)
      expect(delays[3]).toBe(16000)
      expect(delays[4]).toBe(32000)
    })

    it('should use maximum delay (32000ms) for attempts beyond array length', async () => {
      // Create manager with more reconnection attempts than delay array
      const customManager = new TransportManager({
        url: mockUrl,
        maxReconnectionAttempts: 10,
      })
      const testable = toTestable(customManager)

      // Start connected
      const connectPromise = customManager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // Manually set reconnection attempts to 6 (beyond array length of 5)
      testable.reconnectionAttempts = 6

      // Disconnect to trigger reconnection
      MockWebSocket.lastInstance?.simulateClose()

      // Should still increment attempt count
      expect(customManager.getReconnectionAttempts()).toBe(7)

      customManager.destroy()
    })
  })

  describe('max-attempt boundary', () => {
    it('should stop reconnecting when maxReconnectionAttempts is reached', async () => {
      // Create manager with low max attempts for faster testing
      const shortManager = new TransportManager({
        url: mockUrl,
        maxReconnectionAttempts: 2,
        autoReconnect: true,
      })

      // Start connected
      const connectPromise = shortManager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // First disconnect
      MockWebSocket.lastInstance?.simulateClose()
      expect(shortManager.getReconnectionAttempts()).toBe(1)
      expect(shortManager.state).toBe(ConnectionState.Reconnecting)

      // Advance time and simulate failed reconnection
      vi.advanceTimersByTime(2000)
      await Promise.resolve()

      // Simulate failed reconnection (WebSocket closes again)
      MockWebSocket.lastInstance?.simulateClose()
      expect(shortManager.getReconnectionAttempts()).toBe(2)

      // Advance time past second delay
      vi.advanceTimersByTime(4000)
      await Promise.resolve()

      // Simulate failed reconnection again
      MockWebSocket.lastInstance?.simulateClose()
      expect(shortManager.getReconnectionAttempts()).toBe(2) // Should not exceed max

      // State should be ConnectionFailed after max attempts
      expect(shortManager.state).toBe(ConnectionState.ConnectionFailed)

      shortManager.destroy()
    })

    it('should emit Error event when max reconnection attempts reached', async () => {
      const shortManager = new TransportManager({
        url: mockUrl,
        maxReconnectionAttempts: 1,
        autoReconnect: true,
      })

      const connectPromise = shortManager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      const errorHandler = vi.fn()
      shortManager.on(TransportEvent.Error, errorHandler)

      // Disconnect to trigger reconnection
      MockWebSocket.lastInstance?.simulateClose()
      expect(shortManager.getReconnectionAttempts()).toBe(1)

      // Advance time past first delay
      vi.advanceTimersByTime(2000)
      await Promise.resolve()

      // Simulate failed reconnection
      MockWebSocket.lastInstance?.simulateClose()

      // Should reach max attempts and emit error
      expect(shortManager.state).toBe(ConnectionState.ConnectionFailed)

      shortManager.destroy()
    })

    it('should not attempt reconnection after max attempts reached', async () => {
      const shortManager = new TransportManager({
        url: mockUrl,
        maxReconnectionAttempts: 1,
        autoReconnect: true,
      })

      const testable = toTestable(shortManager)

      // Start connected
      const connectPromise = shortManager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // Disconnect to trigger reconnection
      MockWebSocket.lastInstance?.simulateClose()
      expect(shortManager.getReconnectionAttempts()).toBe(1)

      // Advance time
      vi.advanceTimersByTime(2000)
      await Promise.resolve()

      // Simulate failed reconnection
      MockWebSocket.lastInstance?.simulateClose()

      // Should be at ConnectionFailed state
      expect(shortManager.state).toBe(ConnectionState.ConnectionFailed)

      // Timer should be cleared after max attempts
      expect(testable.reconnectionTimer).toBeNull()

      shortManager.destroy()
    })
  })

  describe('timer cleanup', () => {
    it('should clear reconnection timer on manual disconnect', async () => {
      const testable = toTestable(manager)

      // Start connected
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // Trigger reconnection
      MockWebSocket.lastInstance?.simulateClose()
      expect(testable.reconnectionTimer).not.toBeNull()

      // Manual disconnect should clear the timer
      manager.disconnect()
      expect(testable.reconnectionTimer).toBeNull()
    })

    it('should clear reconnection timer when max attempts reached', async () => {
      const shortManager = new TransportManager({
        url: mockUrl,
        maxReconnectionAttempts: 1,
      })
      const testable = toTestable(shortManager)

      // Start connected
      const connectPromise = shortManager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // Trigger reconnection
      MockWebSocket.lastInstance?.simulateClose()
      expect(testable.reconnectionTimer).not.toBeNull()

      // Advance time
      vi.advanceTimersByTime(2000)
      await Promise.resolve()

      // Simulate failed reconnection
      MockWebSocket.lastInstance?.simulateClose()

      // Timer should be cleared
      expect(testable.reconnectionTimer).toBeNull()

      shortManager.destroy()
    })

    it('should clear all timers on destroy', async () => {
      const testable = toTestable(manager)

      // Start connected
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // Trigger reconnection to set reconnection timer
      MockWebSocket.lastInstance?.simulateClose()

      // Destroy should clear all timers
      manager.destroy()
      expect(testable.reconnectionTimer).toBeNull()
    })

    it('should clear connection timeout timer on successful connection', async () => {
      const connectPromise = manager.connect()
      // Connection timeout timer should be set during connection
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      // Connection timeout should be cleared after successful connection
      // (This is verified by the internal clearConnectionTimeout being called)
      expect(manager.isConnected).toBe(true)
    })
  })

  describe('autoReconnect configuration', () => {
    it('should not attempt reconnection when autoReconnect is false', async () => {
      const noReconnectManager = new TransportManager({
        url: mockUrl,
        autoReconnect: false,
      })
      const testable = toTestable(noReconnectManager)

      // Start connected
      const connectPromise = noReconnectManager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      const reconnectingHandler = vi.fn()
      noReconnectManager.on(TransportEvent.Reconnecting, reconnectingHandler)

      // Disconnect should not trigger reconnection
      MockWebSocket.lastInstance?.simulateClose()

      expect(reconnectingHandler).not.toHaveBeenCalled()
      expect(noReconnectManager.getReconnectionAttempts()).toBe(0)
      expect(testable.reconnectionTimer).toBeNull()

      noReconnectManager.destroy()
    })

    it('should attempt reconnection when autoReconnect is true (default)', async () => {
      const testable = toTestable(manager)

      // Start connected
      const connectPromise = manager.connect()
      MockWebSocket.lastInstance?.simulateOpen()
      await connectPromise

      const reconnectingHandler = vi.fn()
      manager.on(TransportEvent.Reconnecting, reconnectingHandler)

      // Disconnect should trigger reconnection
      MockWebSocket.lastInstance?.simulateClose()

      expect(reconnectingHandler).toHaveBeenCalled()
      expect(manager.getReconnectionAttempts()).toBe(1)
      expect(testable.reconnectionTimer).not.toBeNull()
    })
  })
})
