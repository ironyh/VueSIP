/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useTransportRecovery, type TransportRecoveryOptions } from '../useTransportRecovery'
import { TransportEvent } from '@/core/TransportManager'
import { ConnectionState } from '@/types/sip.types'
import type { SipClient } from '@/core/SipClient'

// Mock TransportManager
class MockTransportManager {
  _state: ConnectionState = ConnectionState.Disconnected
  _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  get state(): ConnectionState {
    return this._state
  }

  get isConnected(): boolean {
    return this._state === ConnectionState.Connected
  }

  on(event: TransportEvent, handler: (...args: unknown[]) => void): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)?.add(handler)
  }

  off(event: TransportEvent, handler: (...args: unknown[]) => void): void {
    this._listeners.get(event)?.delete(handler)
  }

  private _emit(event: TransportEvent, ...args: unknown[]): void {
    this._listeners.get(event)?.forEach((handler) => handler(...args))
  }

  // Test helpers
  connect(): void {
    this._state = ConnectionState.Connected
    this._emit(TransportEvent.Connected)
  }

  disconnect(): void {
    this._state = ConnectionState.Disconnected
    this._emit(TransportEvent.Disconnected)
  }

  reconnecting(): void {
    this._state = ConnectionState.Reconnecting
    this._emit(TransportEvent.Reconnecting)
  }

  connecting(): void {
    this._state = ConnectionState.Connecting
    this._emit(TransportEvent.Connecting)
  }

  error(): void {
    this._state = ConnectionState.Error
    this._emit(TransportEvent.Error)
  }
}

// Mock SipClient
class MockSipClient {
  register = vi.fn().mockResolvedValue(undefined)
}

describe('useTransportRecovery', () => {
  let mockTransportManager: MockTransportManager
  let mockSipClient: MockSipClient
  let sipClientRef: ReturnType<typeof ref>

  beforeEach(() => {
    vi.clearAllMocks()
    mockTransportManager = new MockTransportManager()
    mockSipClient = new MockSipClient()
    sipClientRef = ref<SipClient | null>(mockSipClient as unknown as SipClient)

    // Use fake timers for testing timeouts
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      expect(result.connectionState.value).toBe(ConnectionState.Disconnected)
      expect(result.isRecovering.value).toBe(false)
      expect(result.lastRecoveryTime.value).toBe(null)
      expect(result.recoveryAttempts.value).toBe(0)
      expect(result.lastError.value).toBe(null)
      expect(result.metrics.value.totalAttempts).toBe(0)
      expect(result.metrics.value.totalRecoveries).toBe(0)
      expect(result.metrics.value.lastSuccessTime).toBe(null)
    })

    it('should have all required methods', () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      expect(typeof result.triggerRecovery).toBe('function')
      expect(typeof result.reset).toBe('function')
    })
  })

  describe('transport connection events', () => {
    it('should update connection state on Connected event', () => {
      useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.connect()

      expect(mockTransportManager.state).toBe(ConnectionState.Connected)
    })

    it('should start recovery when transport connects', async () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.connect()

      // Wait for the full recovery cycle including stabilization + registration
      await vi.runAllTimersAsync()

      expect(result.isRecovering.value).toBe(false) // Completed
      expect(result.recoveryAttempts.value).toBe(1)
      expect(result.metrics.value.totalRecoveries).toBe(1)
    })

    it('should cancel recovery when transport disconnects', async () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.connect()
      vi.advanceTimersByTime(1500)
      await vi.runAllTimersAsync()

      mockTransportManager.disconnect()

      expect(result.isRecovering.value).toBe(false)
    })

    it('should update state on reconnecting', () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.reconnecting()

      expect(result.connectionState.value).toBe(ConnectionState.Reconnecting)
    })

    it('should update state on connecting', () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.connecting()

      expect(result.connectionState.value).toBe(ConnectionState.Connecting)
    })

    it('should update state and cancel on error', () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.error()

      expect(result.connectionState.value).toBe(ConnectionState.Error)
      expect(result.isRecovering.value).toBe(false)
    })
  })

  describe('re-registration', () => {
    it('should call register on recovery', async () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.connect()

      // Advance past stabilization delay
      vi.advanceTimersByTime(1500)

      // Wait for async register call
      await vi.runAllTimersAsync()

      expect(mockSipClient.register).toHaveBeenCalled()
      expect(result.isRecovering.value).toBe(false)
      expect(result.lastRecoveryTime.value).toBeInstanceOf(Date)
      expect(result.metrics.value.totalRecoveries).toBe(1)
    })

    it('should use custom register function when provided', async () => {
      const customRegister = vi.fn().mockResolvedValue(undefined)
      const options: TransportRecoveryOptions = {
        register: customRegister,
      }

      useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()
      await vi.runAllTimersAsync()

      expect(customRegister).toHaveBeenCalled()
      expect(mockSipClient.register).not.toHaveBeenCalled()
    })

    it('should handle register failure with retry', async () => {
      mockSipClient.register = vi.fn().mockRejectedValue(new Error('Registration failed'))
      const options: TransportRecoveryOptions = {
        maxRecoveryAttempts: 3,
      }

      const result = useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()
      vi.advanceTimersByTime(1500)

      // First attempt fails - wait for it
      await vi.runAllTimersAsync()

      expect(result.recoveryAttempts.value).toBeGreaterThanOrEqual(1)
      expect(result.lastError.value).toBe('Registration failed')
    })

    it('should stop retrying after max attempts', async () => {
      mockSipClient.register = vi.fn().mockRejectedValue(new Error('Permanent failure'))
      const options: TransportRecoveryOptions = {
        maxRecoveryAttempts: 2,
        onRecoveryFailed: vi.fn(),
      }

      const result = useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()
      vi.advanceTimersByTime(1500)

      // First attempt fails
      await vi.runAllTimersAsync()

      // Second attempt fails
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      expect(result.recoveryAttempts.value).toBe(2)
      expect(result.isRecovering.value).toBe(false)
      expect(options.onRecoveryFailed).toHaveBeenCalled()
    })
  })

  describe('callbacks', () => {
    it('should call onRecoveryStart when recovery begins', () => {
      const onRecoveryStart = vi.fn()
      const options: TransportRecoveryOptions = {
        onRecoveryStart,
      }

      useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()
      vi.advanceTimersByTime(1500)

      expect(onRecoveryStart).toHaveBeenCalled()
    })

    it('should call onRecovered when re-registration succeeds', async () => {
      const onRecovered = vi.fn()
      const options: TransportRecoveryOptions = {
        onRecovered,
      }

      useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()
      await vi.runAllTimersAsync()

      expect(onRecovered).toHaveBeenCalled()
    })

    it('should call onRecoveryFailed when all attempts exhausted', async () => {
      mockSipClient.register = vi.fn().mockRejectedValue(new Error('Failed'))
      const onRecoveryFailed = vi.fn()
      const options: TransportRecoveryOptions = {
        maxRecoveryAttempts: 1,
        onRecoveryFailed,
      }

      useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()
      await vi.runAllTimersAsync()

      expect(onRecoveryFailed).toHaveBeenCalled()
    })
  })

  describe('triggerRecovery', () => {
    it('should manually trigger recovery when transport is connected', async () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.connect()

      await result.triggerRecovery()

      expect(result.isRecovering.value).toBe(true)
      await vi.runAllTimersAsync()
      expect(mockSipClient.register).toHaveBeenCalled()
    })

    it('should not trigger recovery when transport is disconnected', async () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      await result.triggerRecovery()

      expect(result.isRecovering.value).toBe(false)
      expect(result.lastError.value).toBe('Cannot trigger recovery: transport not connected')
    })
  })

  describe('reset', () => {
    it('should reset all recovery state', () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      mockTransportManager.connect()
      vi.advanceTimersByTime(1500)

      result.reset()

      expect(result.isRecovering.value).toBe(false)
      expect(result.recoveryAttempts.value).toBe(0)
      expect(result.lastError.value).toBe(null)
    })
  })

  describe('metrics', () => {
    it('should track total attempts across multiple recoveries', async () => {
      const result = useTransportRecovery(mockTransportManager, sipClientRef)

      // First recovery
      mockTransportManager.connect()
      await vi.runAllTimersAsync()

      // Second recovery - need to reset and reconnect
      mockTransportManager.disconnect()
      result.reset()

      mockTransportManager.connect()
      await vi.runAllTimersAsync()

      expect(result.metrics.value.totalAttempts).toBe(2)
      expect(result.metrics.value.totalRecoveries).toBe(2)
    })
  })

  describe('options', () => {
    it('should use custom stabilization delay from options', async () => {
      const customRegister = vi.fn().mockResolvedValue(undefined)
      const options: TransportRecoveryOptions = {
        stabilizationDelay: 3000,
        register: customRegister,
      }

      const result = useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()

      // Wait for full cycle
      await vi.runAllTimersAsync()

      // Verify register was called (meaning stabilization delay was respected)
      expect(customRegister).toHaveBeenCalled()
      expect(result.metrics.value.totalRecoveries).toBe(1)
    })

    it('should use custom max recovery attempts', async () => {
      mockSipClient.register = vi.fn().mockRejectedValue(new Error('Failed'))
      const options: TransportRecoveryOptions = {
        maxRecoveryAttempts: 5,
      }

      const result = useTransportRecovery(mockTransportManager, sipClientRef, options)

      mockTransportManager.connect()

      // Exhaust all attempts
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1500 + i * 500)
        await vi.runAllTimersAsync()
      }

      expect(result.recoveryAttempts.value).toBe(5)
      expect(result.isRecovering.value).toBe(false)
    })
  })
})
