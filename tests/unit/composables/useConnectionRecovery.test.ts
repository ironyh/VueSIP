/**
 * useConnectionRecovery composable unit tests
 * Tests for ICE restart handling and connection recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useConnectionRecovery } from '@/composables/useConnectionRecovery'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useConnectionRecovery', () => {
  let mockPeerConnection: RTCPeerConnection

  beforeEach(() => {
    vi.useFakeTimers()

    // Create mock RTCPeerConnection
    mockPeerConnection = {
      iceConnectionState: 'connected',
      connectionState: 'connected',
      signalingState: 'stable',
      restartIce: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as RTCPeerConnection
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should initialize with stable state', () => {
      const { state, isRecovering, isHealthy } = useConnectionRecovery()

      expect(state.value).toBe('stable')
      expect(isRecovering.value).toBe(false)
      expect(isHealthy.value).toBe(true)
    })

    it('should accept custom options', () => {
      const onRecoveryStart = vi.fn()
      const { state } = useConnectionRecovery({
        maxAttempts: 5,
        attemptDelay: 1000,
        onRecoveryStart,
      })

      expect(state.value).toBe('stable')
    })

    it('should use default options when not specified', () => {
      const { state, attempts } = useConnectionRecovery()

      expect(state.value).toBe('stable')
      expect(attempts.value).toEqual([])
    })

    it('should initialize with empty attempts history', () => {
      const { attempts } = useConnectionRecovery()

      expect(attempts.value).toEqual([])
    })

    it('should initialize with null error', () => {
      const { error } = useConnectionRecovery()

      expect(error.value).toBeNull()
    })
  })

  // ==========================================================================
  // ICE State Monitoring
  // ==========================================================================
  describe('ICE State Monitoring', () => {
    it('should update iceHealth when monitoring starts', () => {
      const { monitor, iceHealth } = useConnectionRecovery()

      monitor(mockPeerConnection)

      expect(iceHealth.value.iceState).toBe('connected')
    })

    it('should detect disconnected state', () => {
      const { monitor, iceHealth, isHealthy } = useConnectionRecovery()

      mockPeerConnection.iceConnectionState = 'disconnected'
      monitor(mockPeerConnection)

      // Simulate state change event
      const handler = (
        mockPeerConnection.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === 'iceconnectionstatechange')?.[1] as
        | (() => void)
        | undefined
      if (handler) handler()

      expect(iceHealth.value.iceState).toBe('disconnected')
      expect(isHealthy.value).toBe(false)
    })

    it('should detect failed state', () => {
      const { monitor, iceHealth } = useConnectionRecovery()

      monitor(mockPeerConnection)

      // Simulate failure
      mockPeerConnection.iceConnectionState = 'failed'
      const handler = (
        mockPeerConnection.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === 'iceconnectionstatechange')?.[1] as
        | (() => void)
        | undefined
      if (handler) handler()

      expect(iceHealth.value.iceState).toBe('failed')
    })

    it('should track state age', () => {
      const { monitor, iceHealth } = useConnectionRecovery()

      monitor(mockPeerConnection)

      vi.advanceTimersByTime(5000)

      // Force update (would normally happen on interval)
      expect(iceHealth.value.stateAge).toBeGreaterThanOrEqual(0)
    })

    it('should remove listeners when stopMonitoring called', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery()

      monitor(mockPeerConnection)
      stopMonitoring()

      expect(mockPeerConnection.removeEventListener).toHaveBeenCalledWith(
        'iceconnectionstatechange',
        expect.any(Function)
      )
    })
  })

  // ==========================================================================
  // Recovery Logic
  // ==========================================================================
  describe('Recovery Logic', () => {
    it('should attempt ICE restart on recover()', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(mockPeerConnection.restartIce).toHaveBeenCalled()
    })

    it('should create new offer after ICE restart', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(mockPeerConnection.createOffer).toHaveBeenCalledWith({ iceRestart: true })
    })

    it('should set local description after creating offer', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalled()
    })

    it('should update state to recovering during recovery', async () => {
      const { monitor, recover, state } = useConnectionRecovery()

      monitor(mockPeerConnection)

      const recoveryPromise = recover()

      expect(state.value).toBe('recovering')

      await recoveryPromise
    })

    it('should return true on successful recovery', async () => {
      const { monitor, recover } = useConnectionRecovery()

      // Setup successful recovery
      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      const result = await recover()

      expect(result).toBe(true)
    })

    it('should track recovery attempt in history', async () => {
      const { monitor, recover, attempts } = useConnectionRecovery()

      monitor(mockPeerConnection)

      await recover()

      expect(attempts.value).toHaveLength(1)
      expect(attempts.value[0]).toMatchObject({
        attempt: 1,
        strategy: 'ice-restart',
        success: true,
      })
    })

    it('should call onRecoveryStart callback', async () => {
      const onRecoveryStart = vi.fn()
      const { monitor, recover } = useConnectionRecovery({ onRecoveryStart })

      monitor(mockPeerConnection)

      await recover()

      expect(onRecoveryStart).toHaveBeenCalled()
    })

    it('should call onRecoverySuccess callback on success', async () => {
      const onRecoverySuccess = vi.fn()
      const { monitor, recover } = useConnectionRecovery({ onRecoverySuccess })

      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      await recover()

      expect(onRecoverySuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      )
    })
  })

  // ==========================================================================
  // Retry Logic
  // ==========================================================================
  describe('Retry Logic', () => {
    it('should retry up to maxAttempts times', async () => {
      const onRecoveryFailed = vi.fn()
      const { monitor, recover, attempts } = useConnectionRecovery({
        maxAttempts: 3,
        attemptDelay: 100,
        iceRestartTimeout: 100, // Short timeout for testing
        onRecoveryFailed,
      })

      // Setup failing connection
      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      // Start recovery and advance through all timeouts
      const recoverPromise = recover()

      // Advance through 3 attempts: 3 * (iceRestartTimeout + attemptDelay) - last delay
      // = 3 * 100 (timeouts) + 2 * 100 (delays) = 500ms
      await vi.advanceTimersByTimeAsync(600)

      await recoverPromise

      // Should have attempted 3 times
      expect(attempts.value.length).toBe(3)
      expect(onRecoveryFailed).toHaveBeenCalled()
    })

    it('should wait attemptDelay between retries', async () => {
      const { monitor, recover, attempts } = useConnectionRecovery({
        maxAttempts: 2,
        attemptDelay: 1000,
        iceRestartTimeout: 100, // Short timeout for testing
      })

      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      const recoverPromise = recover()

      // First attempt timeout
      await vi.advanceTimersByTimeAsync(100)

      // Wait for attempt delay
      await vi.advanceTimersByTimeAsync(1000)

      // Second attempt timeout
      await vi.advanceTimersByTimeAsync(100)

      await recoverPromise

      // Should have made 2 attempts
      expect(attempts.value.length).toBe(2)
    })

    it('should call onRecoveryFailed after all attempts exhausted', async () => {
      const onRecoveryFailed = vi.fn()
      const { monitor, recover } = useConnectionRecovery({
        maxAttempts: 2,
        attemptDelay: 100,
        iceRestartTimeout: 100, // Short timeout for testing
        onRecoveryFailed,
      })

      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      const recoverPromise = recover()

      // Advance through all timeouts and delays
      await vi.advanceTimersByTimeAsync(500)

      await recoverPromise

      expect(onRecoveryFailed).toHaveBeenCalled()
    })

    it('should stop retrying after successful recovery', async () => {
      const { monitor, recover, attempts } = useConnectionRecovery({
        maxAttempts: 3,
        attemptDelay: 100,
      })

      // Succeed on first try
      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      await recover()

      expect(attempts.value.length).toBe(1)
      expect(attempts.value[0]?.success).toBe(true)
    })

    it('should not recover when autoRecover is false', async () => {
      const { monitor, state } = useConnectionRecovery({
        autoRecover: false,
      })

      mockPeerConnection.iceConnectionState = 'failed'
      monitor(mockPeerConnection)

      // Simulate state change
      const handler = (
        mockPeerConnection.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === 'iceconnectionstatechange')?.[1] as
        | (() => void)
        | undefined
      if (handler) handler()

      // Should not auto-recover
      expect(state.value).not.toBe('recovering')
    })
  })

  // ==========================================================================
  // Reset
  // ==========================================================================
  describe('Reset', () => {
    it('should reset state to stable', () => {
      const { state, reset } = useConnectionRecovery()

      // We can't directly set state.value since it's a computed, test via recover flow
      reset()

      expect(state.value).toBe('stable')
    })

    it('should clear attempts history', async () => {
      const { attempts, reset, monitor, recover } = useConnectionRecovery()

      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      await recover()

      // Should have attempts
      expect(attempts.value.length).toBeGreaterThan(0)

      reset()

      expect(attempts.value).toEqual([])
    })

    it('should clear error', async () => {
      const { error, reset, recover } = useConnectionRecovery()

      // Trigger an error by not having a peer connection
      await recover()

      expect(error.value).not.toBeNull()

      reset()

      expect(error.value).toBeNull()
    })

    it('should reset iceHealth', () => {
      const { iceHealth, reset, monitor } = useConnectionRecovery()

      monitor(mockPeerConnection)

      reset()

      expect(iceHealth.value.isHealthy).toBe(true)
      expect(iceHealth.value.recoveryAttempts).toBe(0)
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle recover when no peer connection', async () => {
      const { recover, error } = useConnectionRecovery()

      const result = await recover()

      expect(result).toBe(false)
      expect(error.value).toBe('No peer connection to recover')
    })

    it('should handle concurrent recovery calls', async () => {
      const { monitor, recover } = useConnectionRecovery()

      monitor(mockPeerConnection)

      // Start two recoveries simultaneously
      const result1 = recover()
      const result2 = recover()

      await result1
      const secondResult = await result2

      // Second call should return false (already in progress)
      expect(secondResult).toBe(false)
    })

    it('should handle peer connection errors gracefully', async () => {
      const { monitor, recover, attempts } = useConnectionRecovery({
        maxAttempts: 1,
        iceRestartTimeout: 100,
      })

      mockPeerConnection.createOffer = vi.fn().mockRejectedValue(new Error('Offer failed'))
      monitor(mockPeerConnection)

      const recoverPromise = recover()
      await vi.advanceTimersByTimeAsync(200)
      const result = await recoverPromise

      expect(result).toBe(false)
      // Error is recorded in the attempt
      expect(attempts.value[0]?.error).toContain('Offer failed')
    })

    it('should update attempts count after recovery', async () => {
      const { monitor, recover, attempts } = useConnectionRecovery({
        maxAttempts: 2,
        attemptDelay: 10,
      })

      mockPeerConnection.iceConnectionState = 'connected'
      monitor(mockPeerConnection)

      await recover()

      expect(attempts.value.length).toBe(1)
    })
  })

  // ==========================================================================
  // Network Information
  // ==========================================================================
  describe('Network Information', () => {
    let mockConnection: {
      type: string
      effectiveType: string
      downlink: number
      rtt: number
      addEventListener: ReturnType<typeof vi.fn>
      removeEventListener: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
      // Mock Network Information API
      mockConnection = {
        type: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }

      // Mock navigator.connection
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
        writable: true,
      })

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      })
    })

    afterEach(() => {
      // Clean up mocks
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        configurable: true,
      })
    })

    it('should initialize networkInfo with current network state', () => {
      const { networkInfo } = useConnectionRecovery()

      expect(networkInfo.value).toMatchObject({
        type: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        isOnline: true,
      })
    })

    it('should expose networkInfo ref', () => {
      const { networkInfo } = useConnectionRecovery()

      expect(networkInfo).toBeDefined()
      expect(networkInfo.value.isOnline).toBe(true)
    })

    it('should setup network change listeners when autoReconnectOnNetworkChange is true', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
      })

      monitor(mockPeerConnection)

      // Should have added event listener for network change
      expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

      stopMonitoring()
    })

    it('should not setup network change listeners when autoReconnectOnNetworkChange is false', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery({
        autoReconnectOnNetworkChange: false,
      })

      monitor(mockPeerConnection)

      // Should NOT have added event listener for network change
      expect(mockConnection.addEventListener).not.toHaveBeenCalled()

      stopMonitoring()
    })

    it('should call onNetworkChange callback when network changes', () => {
      const onNetworkChange = vi.fn()
      const { monitor } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
        onNetworkChange,
      })

      monitor(mockPeerConnection)

      // Get the network change handler
      const networkHandler = mockConnection.addEventListener.mock.calls.find(
        (c: unknown[]) => c[0] === 'change'
      )?.[1] as (() => void) | undefined

      // Simulate network change
      if (networkHandler) {
        mockConnection.type = 'cellular'
        networkHandler()
      }

      expect(onNetworkChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cellular',
        })
      )
    })

    it('should trigger ICE restart after networkChangeDelay when network changes', async () => {
      const { monitor } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
        networkChangeDelay: 500,
      })

      monitor(mockPeerConnection)

      // Get the network change handler
      const networkHandler = mockConnection.addEventListener.mock.calls.find(
        (c: unknown[]) => c[0] === 'change'
      )?.[1] as (() => void) | undefined

      // Simulate network change
      if (networkHandler) {
        mockConnection.type = 'cellular'
        networkHandler()
      }

      // ICE restart should not be called immediately
      expect(mockPeerConnection.restartIce).not.toHaveBeenCalled()

      // Advance timer past the networkChangeDelay
      await vi.advanceTimersByTimeAsync(600)

      // Now ICE restart should have been called
      expect(mockPeerConnection.restartIce).toHaveBeenCalled()
    })

    it('should debounce rapid network changes', async () => {
      const { monitor } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
        networkChangeDelay: 500,
      })

      monitor(mockPeerConnection)

      // Get the network change handler
      const networkHandler = mockConnection.addEventListener.mock.calls.find(
        (c: unknown[]) => c[0] === 'change'
      )?.[1] as (() => void) | undefined

      if (networkHandler) {
        // Simulate rapid network changes
        mockConnection.type = 'cellular'
        networkHandler()

        await vi.advanceTimersByTimeAsync(200)

        mockConnection.type = 'wifi'
        networkHandler()

        await vi.advanceTimersByTimeAsync(200)

        mockConnection.type = 'cellular'
        networkHandler()
      }

      // ICE restart should not be called yet (debouncing)
      expect(mockPeerConnection.restartIce).not.toHaveBeenCalled()

      // Advance past the final delay
      await vi.advanceTimersByTimeAsync(500)

      // Should only have been called once (debounced)
      expect(mockPeerConnection.restartIce).toHaveBeenCalledTimes(1)
    })

    it('should remove network listeners when stopMonitoring is called', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
      })

      monitor(mockPeerConnection)
      stopMonitoring()

      expect(mockConnection.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )
    })
  })

  // ==========================================================================
  // Online/Offline Events
  // ==========================================================================
  describe('Online/Offline Events', () => {
    let windowAddEventListener: ReturnType<typeof vi.fn>
    let windowRemoveEventListener: ReturnType<typeof vi.fn>
    let onlineHandler: (() => void) | null = null
    let offlineHandler: (() => void) | null = null

    beforeEach(() => {
      // Store original methods
      windowAddEventListener = vi.fn((event: string, handler: () => void) => {
        if (event === 'online') onlineHandler = handler
        if (event === 'offline') offlineHandler = handler
      })
      windowRemoveEventListener = vi.fn()

      // Mock window event listeners
      vi.spyOn(window, 'addEventListener').mockImplementation(windowAddEventListener)
      vi.spyOn(window, 'removeEventListener').mockImplementation(windowRemoveEventListener)

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      })
    })

    afterEach(() => {
      onlineHandler = null
      offlineHandler = null
      vi.restoreAllMocks()
    })

    it('should setup online/offline listeners when autoReconnectOnNetworkChange is true', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
      })

      monitor(mockPeerConnection)

      expect(windowAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(windowAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))

      stopMonitoring()
    })

    it('should update networkInfo.isOnline when going offline', () => {
      const onNetworkChange = vi.fn()
      const { monitor, networkInfo } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
        onNetworkChange,
      })

      monitor(mockPeerConnection)

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      })

      if (offlineHandler) {
        offlineHandler()
      }

      expect(networkInfo.value.isOnline).toBe(false)
      expect(onNetworkChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: false,
        })
      )
    })

    it('should trigger recovery when coming back online', async () => {
      const { monitor } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
        networkChangeDelay: 100,
      })

      monitor(mockPeerConnection)

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })

      if (onlineHandler) {
        onlineHandler()
      }

      await vi.advanceTimersByTimeAsync(200)

      expect(mockPeerConnection.restartIce).toHaveBeenCalled()
    })

    it('should remove online/offline listeners when stopMonitoring is called', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery({
        autoReconnectOnNetworkChange: true,
      })

      monitor(mockPeerConnection)
      stopMonitoring()

      expect(windowRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(windowRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  // ==========================================================================
  // Reconnect Strategy
  // ==========================================================================
  describe('Reconnect Strategy', () => {
    it('should use onReconnect handler when strategy is reconnect', async () => {
      const onReconnect = vi.fn().mockResolvedValue(true)
      const onRecoverySuccess = vi.fn()

      const { monitor, recover } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 1,
        onReconnect,
        onRecoverySuccess,
      })

      monitor(mockPeerConnection)

      const result = await recover()

      expect(result).toBe(true)
      expect(onReconnect).toHaveBeenCalledTimes(1)
      expect(onRecoverySuccess).toHaveBeenCalled()
    })

    it('should fail when reconnect strategy has no onReconnect handler', async () => {
      const { monitor, recover, attempts } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 1,
      })

      monitor(mockPeerConnection)

      const result = await recover()

      expect(result).toBe(false)
      expect(attempts.value[0]?.error).toContain('No onReconnect handler')
    })

    it('should retry reconnect on failure', async () => {
      const onReconnect = vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
      const onRecoverySuccess = vi.fn()

      const { monitor, recover, attempts } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 3,
        attemptDelay: 10,
        onReconnect,
        onRecoverySuccess,
      })

      monitor(mockPeerConnection)

      const recoverPromise = recover()

      // Advance through delays
      await vi.advanceTimersByTimeAsync(50)

      const result = await recoverPromise

      expect(result).toBe(true)
      expect(onReconnect).toHaveBeenCalledTimes(3)
      expect(attempts.value.length).toBe(3)
      expect(attempts.value[2].success).toBe(true)
    })

    it('should fail after max reconnect attempts', async () => {
      const onReconnect = vi.fn().mockResolvedValue(false)
      const onRecoveryFailed = vi.fn()

      const { monitor, recover, state } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 2,
        attemptDelay: 10,
        onReconnect,
        onRecoveryFailed,
      })

      monitor(mockPeerConnection)

      const recoverPromise = recover()
      await vi.advanceTimersByTimeAsync(50)
      const result = await recoverPromise

      expect(result).toBe(false)
      expect(state.value).toBe('failed')
      expect(onRecoveryFailed).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // None Strategy
  // ==========================================================================
  describe('None Strategy', () => {
    it('should skip recovery attempts when strategy is none', async () => {
      const onRecoveryFailed = vi.fn()

      const { monitor, recover, state, attempts } = useConnectionRecovery({
        strategy: 'none',
        maxAttempts: 3,
        attemptDelay: 10,
        onRecoveryFailed,
      })

      monitor(mockPeerConnection)

      const recoverPromise = recover()
      await vi.advanceTimersByTimeAsync(100)
      const result = await recoverPromise

      expect(result).toBe(false)
      expect(state.value).toBe('failed')
      // All attempts should be recorded as failed
      expect(attempts.value.length).toBe(3)
      expect(attempts.value.every((a) => !a.success)).toBe(true)
    })
  })

  // ==========================================================================
  // Exponential Backoff
  // ==========================================================================
  describe('Exponential Backoff', () => {
    it('should use fixed delay when exponentialBackoff is false', async () => {
      const onReconnect = vi.fn().mockResolvedValue(false)

      const { monitor, recover } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 3,
        attemptDelay: 1000,
        exponentialBackoff: false,
        onReconnect,
      })

      monitor(mockPeerConnection)

      const recoverPromise = recover()

      // First attempt immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(onReconnect).toHaveBeenCalledTimes(1)

      // Second attempt after fixed delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(onReconnect).toHaveBeenCalledTimes(2)

      // Third attempt after another fixed delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(onReconnect).toHaveBeenCalledTimes(3)

      await recoverPromise
    })

    it('should use exponential delays when exponentialBackoff is true', async () => {
      const onReconnect = vi.fn().mockResolvedValue(false)

      const { monitor, recover } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 4,
        attemptDelay: 1000, // Base delay
        exponentialBackoff: true,
        maxBackoffDelay: 30000,
        onReconnect,
      })

      monitor(mockPeerConnection)

      const recoverPromise = recover()

      // First attempt immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(onReconnect).toHaveBeenCalledTimes(1)

      // Second attempt after 1000ms (1000 * 2^0)
      await vi.advanceTimersByTimeAsync(1000)
      expect(onReconnect).toHaveBeenCalledTimes(2)

      // Third attempt after 2000ms (1000 * 2^1)
      await vi.advanceTimersByTimeAsync(2000)
      expect(onReconnect).toHaveBeenCalledTimes(3)

      // Fourth attempt after 4000ms (1000 * 2^2)
      await vi.advanceTimersByTimeAsync(4000)
      expect(onReconnect).toHaveBeenCalledTimes(4)

      await recoverPromise
    })

    it('should cap delay at maxBackoffDelay', async () => {
      const onReconnect = vi.fn().mockResolvedValue(false)

      const { monitor, recover } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 5,
        attemptDelay: 1000,
        exponentialBackoff: true,
        maxBackoffDelay: 3000, // Cap at 3 seconds
        onReconnect,
      })

      monitor(mockPeerConnection)

      const recoverPromise = recover()

      // First attempt immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(onReconnect).toHaveBeenCalledTimes(1)

      // Second: 1000ms
      await vi.advanceTimersByTimeAsync(1000)
      expect(onReconnect).toHaveBeenCalledTimes(2)

      // Third: 2000ms
      await vi.advanceTimersByTimeAsync(2000)
      expect(onReconnect).toHaveBeenCalledTimes(3)

      // Fourth: would be 4000ms but capped at 3000ms
      await vi.advanceTimersByTimeAsync(3000)
      expect(onReconnect).toHaveBeenCalledTimes(4)

      // Fifth: still capped at 3000ms
      await vi.advanceTimersByTimeAsync(3000)
      expect(onReconnect).toHaveBeenCalledTimes(5)

      await recoverPromise
    })

    it('should apply exponential backoff on error paths too', async () => {
      const onReconnect = vi.fn().mockRejectedValue(new Error('Connection error'))

      const { monitor, recover, attempts } = useConnectionRecovery({
        strategy: 'reconnect',
        maxAttempts: 3,
        attemptDelay: 1000,
        exponentialBackoff: true,
        maxBackoffDelay: 30000,
        onReconnect,
      })

      monitor(mockPeerConnection)

      const recoverPromise = recover()

      // First attempt
      await vi.advanceTimersByTimeAsync(0)
      expect(onReconnect).toHaveBeenCalledTimes(1)

      // Second attempt after 1000ms
      await vi.advanceTimersByTimeAsync(1000)
      expect(onReconnect).toHaveBeenCalledTimes(2)

      // Third attempt after 2000ms
      await vi.advanceTimersByTimeAsync(2000)
      expect(onReconnect).toHaveBeenCalledTimes(3)

      await recoverPromise

      // All attempts should have errors
      expect(attempts.value.every((a) => a.error)).toBe(true)
    })
  })
})
