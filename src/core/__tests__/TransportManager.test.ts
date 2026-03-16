/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TransportManager, TransportEvent } from '../TransportManager'
import { ConnectionState } from '../../types/sip.types'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  protocol: string = ''

  onopen: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null

  constructor(url: string, _protocols?: string | string[]) {
    this.url = url
  }

  send = vi.fn()
  close = vi.fn()
}

global.WebSocket = MockWebSocket as any

describe('TransportManager', () => {
  let manager: TransportManager
  const mockUrl = 'wss://example.com/ws'

  beforeEach(() => {
    manager = new TransportManager({ url: mockUrl })
  })

  afterEach(() => {
    manager.destroy()
    vi.clearAllMocks()
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
      ;(manager as any).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should remove event listener', () => {
      const handler = vi.fn()
      manager.on(TransportEvent.Connected, handler)
      manager.off(TransportEvent.Connected, handler)
      ;(manager as any).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      expect(handler).not.toHaveBeenCalled()
    })

    it('should remove all listeners for specific event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      manager.on(TransportEvent.Connected, handler1)
      manager.on(TransportEvent.Connected, handler2)
      manager.removeAllListeners(TransportEvent.Connected)
      ;(manager as any).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should remove all listeners when no event specified', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      manager.on(TransportEvent.Connected, handler1)
      manager.on(TransportEvent.Disconnected, handler2)
      manager.removeAllListeners()
      ;(manager as any).emit(TransportEvent.Connected, { state: ConnectionState.Connected })
      ;(manager as any).emit(TransportEvent.Disconnected, { state: ConnectionState.Disconnected })
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
      ;(MockWebSocket.prototype.onopen as any)({})
      await connectPromise
    })

    it('should resolve when connected', async () => {
      const connectPromise = manager.connect()
      ;(MockWebSocket.prototype.onopen as any)({})
      await expect(connectPromise).resolves.toBeUndefined()
      expect(manager.state).toBe(ConnectionState.Connected)
      expect(manager.isConnected).toBe(true)
    })

    it('should emit connected event on successful connection', async () => {
      const connectedHandler = vi.fn()
      manager.on(TransportEvent.Connected, connectedHandler)
      await manager.connect()
      expect(connectedHandler).toHaveBeenCalledWith({ state: ConnectionState.Connected })
    })

    it('should reset reconnection attempts on connect', async () => {
      ;(manager as any).reconnectionAttempts = 5
      await manager.connect()
      expect(manager.getReconnectionAttempts()).toBe(0)
    })
  })

  describe('disconnect', () => {
    it('should disconnect and reset state', async () => {
      await manager.connect()
      expect(manager.isConnected).toBe(true)
      manager.disconnect()
      expect(manager.state).toBe(ConnectionState.Disconnected)
      expect(manager.isConnected).toBe(false)
    })

    it('should emit disconnected event', async () => {
      await manager.connect()
      const disconnectHandler = vi.fn()
      manager.on(TransportEvent.Disconnected, disconnectHandler)
      manager.disconnect()
      expect(disconnectHandler).toHaveBeenCalledWith({ state: ConnectionState.Disconnected })
    })

    it('should reset reconnection attempts', async () => {
      await manager.connect()
      ;(manager as any).reconnectionAttempts = 5
      manager.disconnect()
      expect(manager.getReconnectionAttempts()).toBe(0)
    })
  })

  describe('send', () => {
    it('should send data when connected', async () => {
      await manager.connect()
      expect(() => manager.send('test message')).not.toThrow()
      expect(MockWebSocket.prototype.send).toHaveBeenCalledWith('test message')
    })

    it('should throw when not connected', () => {
      expect(() => manager.send('test')).toThrow('WebSocket is not connected')
    })

    it('should throw after disconnect', async () => {
      await manager.connect()
      manager.disconnect()
      expect(() => manager.send('test')).toThrow('WebSocket is not connected')
    })
  })

  describe('manual reconnect', () => {
    it('should reset reconnection counter on manual reconnect', async () => {
      await manager.connect()
      ;(manager as any).reconnectionAttempts = 5
      await manager.reconnect()
      expect(manager.getReconnectionAttempts()).toBe(0)
    })

    it('should reconnect after disconnect', async () => {
      await manager.connect()
      manager.disconnect()
      const reconnectingHandler = vi.fn()
      manager.on(TransportEvent.Reconnecting, reconnectingHandler)
      manager.reconnect()
      expect(reconnectingHandler).toHaveBeenCalled()
    })
  })

  describe('resetReconnectionAttempts', () => {
    it('should reset counter', async () => {
      await manager.connect()
      ;(manager as any).reconnectionAttempts = 5
      manager.resetReconnectionAttempts()
      expect(manager.getReconnectionAttempts()).toBe(0)
    })
  })

  describe('destroy', () => {
    it('should clean up all resources', async () => {
      await manager.connect()
      manager.destroy()
      expect(manager.state).toBe(ConnectionState.Disconnected)
      expect(manager.getReconnectionAttempts()).toBe(0)
    })

    it('should clear listeners on destroy', async () => {
      await manager.connect()
      const disconnectHandler = vi.fn()
      manager.on(TransportEvent.Disconnected, disconnectHandler)
      manager.destroy()
      // Manually emit to verify listeners are gone
      ;(manager as any).emit(TransportEvent.Disconnected, { state: ConnectionState.Disconnected })
      expect(disconnectHandler).not.toHaveBeenCalled()
    })
  })

  describe('message handling', () => {
    it('should emit message events', async () => {
      await manager.connect()
      const messageHandler = vi.fn()
      manager.on(TransportEvent.Message, messageHandler)
      const testMessage = 'SIP/2.0 200 OK\r\n'
      ;(MockWebSocket.prototype.onmessage as any)({ data: testMessage })
      expect(messageHandler).toHaveBeenCalledWith(testMessage)
    })
  })

  describe('error handling', () => {
    it('should emit error event on WebSocket error', async () => {
      await manager.connect()
      const errorHandler = vi.fn()
      manager.on(TransportEvent.Error, errorHandler)
      ;(MockWebSocket.prototype.onerror as any)(new Error('WebSocket error'))
      expect(errorHandler).toHaveBeenCalled()
    })

    it('should handle send errors', async () => {
      await manager.connect()
      MockWebSocket.prototype.send.mockImplementation(() => {
        throw new Error('Send failed')
      })
      expect(() => manager.send('test')).toThrow('Send failed')
    })
  })

  describe('state transitions', () => {
    it('should emit connecting state', async () => {
      const stateHandler = vi.fn()
      manager.on(TransportEvent.Connecting, stateHandler)
      manager.connect()
      expect(stateHandler).toHaveBeenCalled()
    })

    it('should emit reconnecting state on auto-reconnect', async () => {
      await manager.connect()
      const reconnectingHandler = vi.fn()
      manager.on(TransportEvent.Reconnecting, reconnectingHandler)
      // Simulate unexpected disconnect (not manual)
      ;(MockWebSocket.prototype.onclose as any)({})
      // Should attempt reconnection
      expect(reconnectingHandler).toHaveBeenCalled()
    })
  })
})
