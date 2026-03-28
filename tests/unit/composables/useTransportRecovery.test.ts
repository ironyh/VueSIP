/**
 * useTransportRecovery composable unit tests
 * Tests for transport recovery coordination with SIP re-registration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useTransportRecovery } from '@/composables/useTransportRecovery'
import { TransportEvent } from '@/core/TransportManager'
import { ConnectionState } from '@/types/sip.types'
import { TRANSPORT_RECOVERY_CONSTANTS, RETRY_CONFIG } from '@/composables/constants'
import { withSetup } from '../../utils/test-helpers'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

/**
 * Create a mock TransportManager with EventEmitter pattern
 */
function createMockTransportManager(initialState: ConnectionState = ConnectionState.Disconnected) {
  const eventHandlers = new Map<TransportEvent, Set<Function>>()

  return {
    state: initialState,
    isConnected: initialState === ConnectionState.Connected,
    on: vi.fn((event: TransportEvent, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
    }),
    off: vi.fn((event: TransportEvent, handler: Function) => {
      eventHandlers.get(event)?.delete(handler)
    }),
    emit: (event: TransportEvent) => {
      eventHandlers.get(event)?.forEach((handler) => handler())
    },
    getHandlers: (event: TransportEvent) => eventHandlers.get(event) || new Set(),
    getAllHandlers: () => eventHandlers,
  }
}

/**
 * Create a mock SipClient with register() method
 */
function createMockSipClient() {
  return {
    register: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useTransportRecovery', () => {
  let mockTransportManager: ReturnType<typeof createMockTransportManager>
  let mockSipClient: ReturnType<typeof createMockSipClient>

  beforeEach(() => {
    vi.useFakeTimers()
    mockTransportManager = createMockTransportManager()
    mockSipClient = createMockSipClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    it('should have correct initial state values', () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any)
      )

      expect(result.connectionState.value).toBe(ConnectionState.Disconnected)
      expect(result.isRecovering.value).toBe(false)
      expect(result.lastRecoveryTime.value).toBeNull()
      expect(result.recoveryAttempts.value).toBe(0)
      expect(result.lastError.value).toBeNull()
      expect(result.metrics.value.totalAttempts).toBe(0)
      expect(result.metrics.value.totalRecoveries).toBe(0)
      expect(result.metrics.value.lastSuccessTime).toBeNull()
      unmount()
    })

    it('should use transport manager initial state', () => {
      mockTransportManager = createMockTransportManager(ConnectionState.Connected)
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any)
      )

      expect(result.connectionState.value).toBe(ConnectionState.Connected)
      unmount()
    })

    it('should register event listeners on transport manager', () => {
      const sipClientRef = ref(mockSipClient)
      const { unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any)
      )

      expect(mockTransportManager.on).toHaveBeenCalledWith(
        TransportEvent.Connected,
        expect.any(Function)
      )
      expect(mockTransportManager.on).toHaveBeenCalledWith(
        TransportEvent.Disconnected,
        expect.any(Function)
      )
      expect(mockTransportManager.on).toHaveBeenCalledWith(
        TransportEvent.Reconnecting,
        expect.any(Function)
      )
      expect(mockTransportManager.on).toHaveBeenCalledWith(
        TransportEvent.Connecting,
        expect.any(Function)
      )
      expect(mockTransportManager.on).toHaveBeenCalledWith(
        TransportEvent.Error,
        expect.any(Function)
      )
      unmount()
    })
  })

  describe('Transport Connected Event', () => {
    it('should start recovery when transport connects', () => {
      const sipClientRef = ref(mockSipClient)
      const onRecoveryStart = vi.fn()
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          onRecoveryStart,
        })
      )

      // Simulate transport connected
      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      expect(result.connectionState.value).toBe(ConnectionState.Connected)
      expect(result.isRecovering.value).toBe(true)
      expect(onRecoveryStart).toHaveBeenCalled()
      unmount()
    })

    it('should not start recovery if already recovering', () => {
      const sipClientRef = ref(mockSipClient)
      const onRecoveryStart = vi.fn()
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          onRecoveryStart,
        })
      )

      // First connect
      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      expect(onRecoveryStart).toHaveBeenCalledTimes(1)

      // Second connect while still recovering
      mockTransportManager.emit(TransportEvent.Connected)

      expect(onRecoveryStart).toHaveBeenCalledTimes(1) // Should not be called again
      expect(result.isRecovering.value).toBe(true)
      unmount()
    })
  })

  describe('Stabilization Delay', () => {
    it('should wait for stabilization delay before re-registration', async () => {
      const sipClientRef = ref(mockSipClient)
      const stabilizationDelay = 1500
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      expect(result.isRecovering.value).toBe(true)
      expect(mockSipClient.register).not.toHaveBeenCalled()

      // Advance time but not enough
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockSipClient.register).not.toHaveBeenCalled()

      // Advance past stabilization delay
      await vi.advanceTimersByTimeAsync(600)
      expect(mockSipClient.register).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should use default stabilization delay from constants', async () => {
      const sipClientRef = ref(mockSipClient)
      const { unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any)
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // Advance time to just before default delay
      await vi.advanceTimersByTimeAsync(TRANSPORT_RECOVERY_CONSTANTS.STABILIZATION_DELAY - 100)
      expect(mockSipClient.register).not.toHaveBeenCalled()

      // Advance past default delay
      await vi.advanceTimersByTimeAsync(200)
      expect(mockSipClient.register).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should abort recovery if transport disconnects during stabilization', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 2000,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      expect(result.isRecovering.value).toBe(true)

      // Disconnect during stabilization
      await vi.advanceTimersByTimeAsync(1000)
      mockTransportManager.isConnected = false
      mockTransportManager.emit(TransportEvent.Disconnected)

      expect(result.isRecovering.value).toBe(false)

      // Advance past stabilization - should not call register
      await vi.advanceTimersByTimeAsync(2000)
      expect(mockSipClient.register).not.toHaveBeenCalled()
      unmount()
    })
  })

  describe('Successful Re-registration', () => {
    it('should update state on successful re-registration', async () => {
      const sipClientRef = ref(mockSipClient)
      const onRecovered = vi.fn()
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
          onRecovered,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      await vi.advanceTimersByTimeAsync(200)

      expect(result.isRecovering.value).toBe(false)
      expect(result.lastRecoveryTime.value).toBeInstanceOf(Date)
      expect(result.lastError.value).toBeNull()
      expect(result.recoveryAttempts.value).toBe(1)
      expect(onRecovered).toHaveBeenCalled()
      unmount()
    })

    it('should increment totalRecoveries on success', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
        })
      )

      // First recovery
      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)

      expect(result.metrics.value.totalRecoveries).toBe(1)
      expect(result.metrics.value.totalAttempts).toBe(1)

      // Second recovery
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)

      expect(result.metrics.value.totalRecoveries).toBe(2)
      expect(result.metrics.value.totalAttempts).toBe(2)
      unmount()
    })
  })

  describe('Failed Re-registration with Retry', () => {
    it('should retry with exponential backoff on failure', async () => {
      const sipClientRef = ref(mockSipClient)
      mockSipClient.register
        .mockRejectedValueOnce(new Error('Registration failed'))
        .mockResolvedValueOnce(undefined)

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
          maxRecoveryAttempts: 3,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // First attempt fails
      await vi.advanceTimersByTimeAsync(200)
      expect(mockSipClient.register).toHaveBeenCalledTimes(1)
      expect(result.recoveryAttempts.value).toBe(1)
      expect(result.lastError.value).toBe('Registration failed')
      expect(result.isRecovering.value).toBe(true)

      // Calculate expected backoff delay
      const expectedDelay = RETRY_CONFIG.calculateBackoff(
        0,
        TRANSPORT_RECOVERY_CONSTANTS.BASE_RETRY_DELAY,
        TRANSPORT_RECOVERY_CONSTANTS.MAX_RETRY_DELAY
      )

      // Advance to retry
      await vi.advanceTimersByTimeAsync(expectedDelay + 100)
      expect(mockSipClient.register).toHaveBeenCalledTimes(2)
      expect(result.recoveryAttempts.value).toBe(2)
      expect(result.isRecovering.value).toBe(false) // Success on second attempt
      unmount()
    })

    it('should not retry if transport disconnects', async () => {
      const sipClientRef = ref(mockSipClient)
      mockSipClient.register.mockRejectedValue(new Error('Registration failed'))

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
          maxRecoveryAttempts: 3,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // First attempt fails
      await vi.advanceTimersByTimeAsync(200)
      expect(mockSipClient.register).toHaveBeenCalledTimes(1)

      // Disconnect before retry
      mockTransportManager.isConnected = false
      mockTransportManager.emit(TransportEvent.Disconnected)

      expect(result.isRecovering.value).toBe(false)

      // Advance past retry delay - should not retry
      await vi.advanceTimersByTimeAsync(10000)
      expect(mockSipClient.register).toHaveBeenCalledTimes(1)
      unmount()
    })
  })

  describe('Max Attempts Reached', () => {
    it('should call onRecoveryFailed after max attempts', async () => {
      const sipClientRef = ref(mockSipClient)
      const onRecoveryFailed = vi.fn()
      mockSipClient.register.mockRejectedValue(new Error('Registration failed'))

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
          maxRecoveryAttempts: 2,
          onRecoveryFailed,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // First attempt
      await vi.advanceTimersByTimeAsync(200)
      expect(result.recoveryAttempts.value).toBe(1)
      expect(onRecoveryFailed).not.toHaveBeenCalled()

      // Second attempt (max)
      const backoffDelay = RETRY_CONFIG.calculateBackoff(
        0,
        TRANSPORT_RECOVERY_CONSTANTS.BASE_RETRY_DELAY,
        TRANSPORT_RECOVERY_CONSTANTS.MAX_RETRY_DELAY
      )
      await vi.advanceTimersByTimeAsync(backoffDelay + 100)

      expect(result.recoveryAttempts.value).toBe(2)
      expect(result.isRecovering.value).toBe(false)
      expect(onRecoveryFailed).toHaveBeenCalledWith(
        expect.stringContaining('Recovery failed after 2 attempts')
      )
      unmount()
    })

    it('should use default max attempts from constants', async () => {
      const sipClientRef = ref(mockSipClient)
      const onRecoveryFailed = vi.fn()
      mockSipClient.register.mockRejectedValue(new Error('Registration failed'))

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 50,
          onRecoveryFailed,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // Run through all attempts
      for (let i = 0; i < TRANSPORT_RECOVERY_CONSTANTS.MAX_RECOVERY_ATTEMPTS; i++) {
        await vi.advanceTimersByTimeAsync(100)
        if (i < TRANSPORT_RECOVERY_CONSTANTS.MAX_RECOVERY_ATTEMPTS - 1) {
          const backoffDelay = RETRY_CONFIG.calculateBackoff(
            i,
            TRANSPORT_RECOVERY_CONSTANTS.BASE_RETRY_DELAY,
            TRANSPORT_RECOVERY_CONSTANTS.MAX_RETRY_DELAY
          )
          await vi.advanceTimersByTimeAsync(backoffDelay)
        }
      }

      expect(result.recoveryAttempts.value).toBe(TRANSPORT_RECOVERY_CONSTANTS.MAX_RECOVERY_ATTEMPTS)
      expect(onRecoveryFailed).toHaveBeenCalled()
      unmount()
    })
  })

  describe('Transport Disconnected Cancels Recovery', () => {
    it('should cancel recovery on transport disconnect', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 1000,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      expect(result.isRecovering.value).toBe(true)

      // Disconnect
      mockTransportManager.isConnected = false
      mockTransportManager.emit(TransportEvent.Disconnected)

      expect(result.isRecovering.value).toBe(false)
      expect(result.connectionState.value).toBe(ConnectionState.Disconnected)
      unmount()
    })

    it('should clear timers on disconnect', async () => {
      const sipClientRef = ref(mockSipClient)
      const { unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 5000,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // Disconnect before stabilization completes
      await vi.advanceTimersByTimeAsync(1000)
      mockTransportManager.isConnected = false
      mockTransportManager.emit(TransportEvent.Disconnected)

      // Advance past stabilization - register should not be called
      await vi.advanceTimersByTimeAsync(10000)
      expect(mockSipClient.register).not.toHaveBeenCalled()
      unmount()
    })
  })

  describe('Transport Error Cancels Recovery', () => {
    it('should cancel recovery on transport error', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 1000,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      expect(result.isRecovering.value).toBe(true)

      // Error
      mockTransportManager.isConnected = false
      mockTransportManager.emit(TransportEvent.Error)

      expect(result.isRecovering.value).toBe(false)
      expect(result.connectionState.value).toBe(ConnectionState.Error)
      unmount()
    })
  })

  describe('Connection State Updates', () => {
    it('should update connectionState on Reconnecting event', () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any)
      )

      mockTransportManager.emit(TransportEvent.Reconnecting)

      expect(result.connectionState.value).toBe(ConnectionState.Reconnecting)
      unmount()
    })

    it('should update connectionState on Connecting event', () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any)
      )

      mockTransportManager.emit(TransportEvent.Connecting)

      expect(result.connectionState.value).toBe(ConnectionState.Connecting)
      unmount()
    })
  })

  describe('Manual triggerRecovery()', () => {
    it('should manually trigger recovery when transport is connected', async () => {
      mockTransportManager = createMockTransportManager(ConnectionState.Connected)
      mockTransportManager.isConnected = true
      const sipClientRef = ref(mockSipClient)
      const onRecoveryStart = vi.fn()
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
          onRecoveryStart,
        })
      )

      await result.triggerRecovery()

      expect(result.isRecovering.value).toBe(true)
      expect(onRecoveryStart).toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(200)
      expect(mockSipClient.register).toHaveBeenCalled()
      unmount()
    })

    it('should not trigger recovery when transport is not connected', async () => {
      const sipClientRef = ref(mockSipClient)
      const onRecoveryStart = vi.fn()
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          onRecoveryStart,
        })
      )

      await result.triggerRecovery()

      expect(result.isRecovering.value).toBe(false)
      expect(result.lastError.value).toBe('Cannot trigger recovery: transport not connected')
      expect(onRecoveryStart).not.toHaveBeenCalled()
      unmount()
    })

    it('should cancel existing recovery before starting new one', async () => {
      mockTransportManager = createMockTransportManager(ConnectionState.Connected)
      mockTransportManager.isConnected = true
      const sipClientRef = ref(mockSipClient)
      const onRecoveryStart = vi.fn()
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 1000,
          onRecoveryStart,
        })
      )

      // Start first recovery
      mockTransportManager.emit(TransportEvent.Connected)
      expect(onRecoveryStart).toHaveBeenCalledTimes(1)

      // Trigger manual recovery (should cancel and restart)
      await result.triggerRecovery()
      expect(onRecoveryStart).toHaveBeenCalledTimes(2)
      expect(result.recoveryAttempts.value).toBe(0) // Reset
      unmount()
    })
  })

  describe('reset() Method', () => {
    it('should reset all state values', async () => {
      const sipClientRef = ref(mockSipClient)
      mockSipClient.register.mockRejectedValueOnce(new Error('Failed'))

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
        })
      )

      // Start recovery and let it fail
      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)

      expect(result.recoveryAttempts.value).toBe(1)
      expect(result.lastError.value).not.toBeNull()

      // Reset
      result.reset()

      expect(result.isRecovering.value).toBe(false)
      expect(result.recoveryAttempts.value).toBe(0)
      expect(result.lastError.value).toBeNull()
      expect(result.connectionState.value).toBe(mockTransportManager.state)
      unmount()
    })

    it('should clear all timers on reset', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 5000,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // Reset during stabilization
      await vi.advanceTimersByTimeAsync(1000)
      result.reset()

      // Advance past stabilization - register should not be called
      await vi.advanceTimersByTimeAsync(10000)
      expect(mockSipClient.register).not.toHaveBeenCalled()
      unmount()
    })
  })

  describe('Cleanup on Dispose', () => {
    it('should remove event listeners on dispose', () => {
      const sipClientRef = ref(mockSipClient)
      const { unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any)
      )

      unmount()

      expect(mockTransportManager.off).toHaveBeenCalledWith(
        TransportEvent.Connected,
        expect.any(Function)
      )
      expect(mockTransportManager.off).toHaveBeenCalledWith(
        TransportEvent.Disconnected,
        expect.any(Function)
      )
      expect(mockTransportManager.off).toHaveBeenCalledWith(
        TransportEvent.Reconnecting,
        expect.any(Function)
      )
      expect(mockTransportManager.off).toHaveBeenCalledWith(
        TransportEvent.Connecting,
        expect.any(Function)
      )
      expect(mockTransportManager.off).toHaveBeenCalledWith(
        TransportEvent.Error,
        expect.any(Function)
      )
    })

    it('should clear timers on dispose', async () => {
      const sipClientRef = ref(mockSipClient)
      const { unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 5000,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      // Dispose during stabilization
      await vi.advanceTimersByTimeAsync(1000)
      unmount()

      // Advance past stabilization - register should not be called
      await vi.advanceTimersByTimeAsync(10000)
      expect(mockSipClient.register).not.toHaveBeenCalled()
    })
  })

  describe('Metrics Tracking', () => {
    it('should track totalAttempts across multiple recovery cycles', async () => {
      const sipClientRef = ref(mockSipClient)
      mockSipClient.register
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
          maxRecoveryAttempts: 5,
        })
      )

      // First recovery cycle - fails then succeeds
      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)
      expect(result.metrics.value.totalAttempts).toBe(1)

      const backoffDelay = RETRY_CONFIG.calculateBackoff(
        0,
        TRANSPORT_RECOVERY_CONSTANTS.BASE_RETRY_DELAY,
        TRANSPORT_RECOVERY_CONSTANTS.MAX_RETRY_DELAY
      )
      await vi.advanceTimersByTimeAsync(backoffDelay + 100)
      expect(result.metrics.value.totalAttempts).toBe(2)
      expect(result.metrics.value.totalRecoveries).toBe(1)

      // Second recovery cycle
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)
      expect(result.metrics.value.totalAttempts).toBe(3)
      expect(result.metrics.value.totalRecoveries).toBe(2)
      unmount()
    })

    it('should update lastSuccessTime on successful recovery', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
        })
      )

      expect(result.metrics.value.lastSuccessTime).toBeNull()

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)

      expect(result.metrics.value.lastSuccessTime).toBeInstanceOf(Date)
      unmount()
    })
  })

  describe('SIP Client Not Available', () => {
    it('should handle null SIP client gracefully', async () => {
      const sipClientRef = ref(null)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)

      expect(result.lastError.value).toBe('SIP client not available for re-registration')
      unmount()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 500,
        })
      )

      // Rapid connect/disconnect
      for (let i = 0; i < 5; i++) {
        mockTransportManager.isConnected = true
        mockTransportManager.emit(TransportEvent.Connected)
        await vi.advanceTimersByTimeAsync(100)
        mockTransportManager.isConnected = false
        mockTransportManager.emit(TransportEvent.Disconnected)
      }

      // Should not have called register due to disconnects during stabilization
      expect(mockSipClient.register).not.toHaveBeenCalled()
      expect(result.isRecovering.value).toBe(false)
      unmount()
    })

    it('should handle transport disconnect during re-registration attempt', async () => {
      const sipClientRef = ref(mockSipClient)
      let resolveRegister: () => void
      mockSipClient.register.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRegister = resolve
          })
      )

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)

      // Register is called but pending
      expect(mockSipClient.register).toHaveBeenCalled()

      // Disconnect while register is pending
      mockTransportManager.isConnected = false
      mockTransportManager.emit(TransportEvent.Disconnected)

      expect(result.isRecovering.value).toBe(false)

      // Complete the register (should not affect state since we disconnected)
      resolveRegister!()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.connectionState.value).toBe(ConnectionState.Disconnected)
      unmount()
    })

    it('should handle Error thrown from register (not Error instance)', async () => {
      const sipClientRef = ref(mockSipClient)
      mockSipClient.register.mockRejectedValueOnce('String error')

      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
          maxRecoveryAttempts: 1,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)
      await vi.advanceTimersByTimeAsync(200)

      expect(result.lastError.value).toBe('Re-registration failed')
      unmount()
    })

    it('should abort if transport disconnects before stabilization timer fires (race condition)', async () => {
      const sipClientRef = ref(mockSipClient)
      const { result, unmount } = withSetup(() =>
        useTransportRecovery(mockTransportManager as any, sipClientRef as any, {
          stabilizationDelay: 100,
        })
      )

      mockTransportManager.isConnected = true
      mockTransportManager.emit(TransportEvent.Connected)

      expect(result.isRecovering.value).toBe(true)

      mockTransportManager.isConnected = false

      await vi.advanceTimersByTimeAsync(200)

      expect(mockSipClient.register).not.toHaveBeenCalled()
      expect(result.isRecovering.value).toBe(false)
      unmount()
    })
  })
})
