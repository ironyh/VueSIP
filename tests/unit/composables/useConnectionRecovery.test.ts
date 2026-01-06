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
})
