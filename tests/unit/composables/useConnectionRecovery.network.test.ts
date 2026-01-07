/**
 * useConnectionRecovery - Network Change Detection Tests
 * Tests for automatic network reconnection functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useConnectionRecovery } from '@/composables/useConnectionRecovery'
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

// Store original navigator properties
const originalNavigator = { ...navigator }
const originalConnection = (navigator as any).connection

// Mock navigator.connection (Network Information API)
const mockConnection = {
  type: 'wifi',
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

// Mock RTCPeerConnection
const createMockPeerConnection = () => ({
  iceConnectionState: 'connected' as RTCIceConnectionState,
  connectionState: 'connected',
  restartIce: vi.fn(),
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})

describe('useConnectionRecovery - Network Change Detection', () => {
  let mockPeerConnection: ReturnType<typeof createMockPeerConnection>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset mock connection
    mockConnection.type = 'wifi'
    mockConnection.effectiveType = '4g'
    mockConnection.downlink = 10
    mockConnection.rtt = 50
    mockConnection.addEventListener = vi.fn()
    mockConnection.removeEventListener = vi.fn()

    // Setup navigator.connection mock
    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      writable: true,
      configurable: true,
    })

    // Setup navigator.onLine mock
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })

    mockPeerConnection = createMockPeerConnection()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()

    // Restore original navigator.connection
    if (originalConnection !== undefined) {
      Object.defineProperty(navigator, 'connection', {
        value: originalConnection,
        writable: true,
        configurable: true,
      })
    }
  })

  // ==========================================================================
  // Network Monitoring Initialization
  // ==========================================================================
  describe('network monitoring initialization', () => {
    it('should expose networkInfo reactive property', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      expect(result.networkInfo).toBeDefined()
      expect(result.networkInfo.value).toMatchObject({
        type: expect.any(String),
        effectiveType: expect.any(String),
        isOnline: expect.any(Boolean),
      })

      unmount()
    })

    it('should initialize networkInfo with current network state', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      expect(result.networkInfo.value.type).toBe('wifi')
      expect(result.networkInfo.value.effectiveType).toBe('4g')
      expect(result.networkInfo.value.downlink).toBe(10)
      expect(result.networkInfo.value.rtt).toBe(50)
      expect(result.networkInfo.value.isOnline).toBe(true)

      unmount()
    })

    it('should handle missing Network Information API gracefully', () => {
      // Remove navigator.connection
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      expect(result.networkInfo.value.type).toBe('unknown')
      expect(result.networkInfo.value.effectiveType).toBe('unknown')
      expect(result.networkInfo.value.isOnline).toBe(true)

      unmount()
    })

    it('should setup network change listeners when autoReconnectOnNetworkChange is true', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Should have registered for network change events
      expect(mockConnection.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )

      unmount()
    })

    it('should not setup network listeners when autoReconnectOnNetworkChange is false', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: false })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Should NOT have registered for network change events
      expect(mockConnection.addEventListener).not.toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )

      unmount()
    })
  })

  // ==========================================================================
  // Network Type Change Detection
  // ==========================================================================
  describe('network type change detection', () => {
    it('should detect network type changes', () => {
      const onNetworkChange = vi.fn()
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({
          autoReconnectOnNetworkChange: true,
          onNetworkChange,
        })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Get the registered change handler
      const changeHandler = mockConnection.addEventListener.mock.calls.find(
        (call) => call[0] === 'change'
      )?.[1] as (() => void) | undefined

      expect(changeHandler).toBeDefined()

      if (changeHandler) {
        // Simulate network change from wifi to cellular
        mockConnection.type = 'cellular'
        mockConnection.effectiveType = '3g'
        mockConnection.downlink = 1.5
        mockConnection.rtt = 300
        changeHandler()
      }

      expect(onNetworkChange).toHaveBeenCalled()
      expect(result.networkInfo.value.type).toBe('cellular')
      expect(result.networkInfo.value.effectiveType).toBe('3g')

      unmount()
    })

    it('should trigger ICE restart on network type change when connection is active', async () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({
          autoReconnectOnNetworkChange: true,
          networkChangeDelay: 0,
        })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Get the registered change handler
      const changeHandler = mockConnection.addEventListener.mock.calls.find(
        (call) => call[0] === 'change'
      )?.[1] as (() => void) | undefined

      if (changeHandler) {
        mockConnection.type = 'cellular'
        changeHandler()
      }

      // Advance timers to allow ICE restart to trigger
      await vi.advanceTimersByTimeAsync(100)

      expect(mockPeerConnection.restartIce).toHaveBeenCalled()

      unmount()
    })

    it('should respect networkChangeDelay before triggering recovery', async () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({
          autoReconnectOnNetworkChange: true,
          networkChangeDelay: 1000,
        })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Get the registered change handler
      const changeHandler = mockConnection.addEventListener.mock.calls.find(
        (call) => call[0] === 'change'
      )?.[1] as (() => void) | undefined

      if (changeHandler) {
        mockConnection.type = 'cellular'
        changeHandler()
      }

      // Should not trigger immediately
      await vi.advanceTimersByTimeAsync(500)
      expect(mockPeerConnection.restartIce).not.toHaveBeenCalled()

      // Should trigger after delay
      await vi.advanceTimersByTimeAsync(600)
      expect(mockPeerConnection.restartIce).toHaveBeenCalled()

      unmount()
    })
  })

  // ==========================================================================
  // Online/Offline Handling
  // ==========================================================================
  describe('online/offline handling', () => {
    it('should detect offline state', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      })

      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      expect(result.networkInfo.value.isOnline).toBe(false)

      unmount()
    })

    it('should update isOnline when going offline', () => {
      const onNetworkChange = vi.fn()
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({
          autoReconnectOnNetworkChange: true,
          onNetworkChange,
        })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Initial state should be online
      expect(result.networkInfo.value.isOnline).toBe(true)

      // Simulate offline event
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      })

      // Trigger the offline event handler (registered on window)
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)

      // Advance timers to allow event processing
      vi.advanceTimersByTime(100)

      expect(result.networkInfo.value.isOnline).toBe(false)

      unmount()
    })

    it('should trigger recovery when coming back online', async () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({
          autoReconnectOnNetworkChange: true,
          networkChangeDelay: 0,
        })
      )

      // Set initial state to offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      })

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      })

      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)

      await vi.advanceTimersByTimeAsync(100)

      expect(mockPeerConnection.restartIce).toHaveBeenCalled()

      unmount()
    })
  })

  // ==========================================================================
  // Cleanup
  // ==========================================================================
  describe('cleanup', () => {
    it('should remove network listeners on stopMonitoring', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)
      result.stopMonitoring()

      expect(mockConnection.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )

      unmount()
    })

    it('should remove window event listeners on stopMonitoring', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)
      result.stopMonitoring()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

      removeEventListenerSpy.mockRestore()
      unmount()
    })
  })

  // ==========================================================================
  // Integration with existing recovery
  // ==========================================================================
  describe('integration with existing recovery', () => {
    it('should not interfere with manual recovery', async () => {
      const onRecoverySuccess = vi.fn()
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({
          autoReconnectOnNetworkChange: true,
          onRecoverySuccess,
        })
      )

      mockPeerConnection.iceConnectionState = 'connected'
      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Manual recovery should still work
      await result.recover()

      expect(onRecoverySuccess).toHaveBeenCalled()

      unmount()
    })

    it('should include network info in recovery context', () => {
      const { result, unmount } = withSetup(() =>
        useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      )

      result.monitor(mockPeerConnection as unknown as RTCPeerConnection)

      // Network info should always be available
      expect(result.networkInfo.value).toBeDefined()
      expect(result.networkInfo.value.type).toBe('wifi')

      unmount()
    })
  })
})
