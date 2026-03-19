/**
 * Tests for useConnectionRecovery composable
 * @module tests/composables/useConnectionRecovery.test
 */
import { describe, it, expect, vi } from 'vitest'
import { useConnectionRecovery } from '@/composables/useConnectionRecovery'

// Mock RTCPeerConnection
function createMockPeerConnection(state: RTCIceConnectionState = 'new'): RTCPeerConnection {
  return {
    iceConnectionState: state,
    restartIce: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as RTCPeerConnection
}

describe('useConnectionRecovery', () => {
  describe('initialization', () => {
    it('should initialize with stable state', () => {
      const { state } = useConnectionRecovery()
      expect(state.value).toBe('stable')
    })

    it('should initialize with empty attempts', () => {
      const { attempts } = useConnectionRecovery()
      expect(attempts.value).toEqual([])
    })

    it('should initialize with no error', () => {
      const { error } = useConnectionRecovery()
      expect(error.value).toBeNull()
    })

    it('should not be recovering initially', () => {
      const { isRecovering } = useConnectionRecovery()
      expect(isRecovering.value).toBe(false)
    })

    it('should initialize with healthy status', () => {
      const { isHealthy } = useConnectionRecovery()
      expect(isHealthy.value).toBe(true)
    })

    it('should initialize with default network info', () => {
      const { networkInfo } = useConnectionRecovery()
      expect(networkInfo.value).toEqual({
        type: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        isOnline: true,
      })
    })

    it('should initialize with healthy ICE status', () => {
      const { iceHealth } = useConnectionRecovery()
      expect(iceHealth.value).toEqual({
        iceState: 'new',
        stateAge: 0,
        recoveryAttempts: 0,
        isHealthy: true,
      })
    })
  })

  describe('options', () => {
    it('should accept custom maxAttempts', () => {
      const { recover } = useConnectionRecovery({ maxAttempts: 5 })
      expect(recover).toBeDefined()
    })

    it('should accept custom attemptDelay', () => {
      const { recover } = useConnectionRecovery({ attemptDelay: 5000 })
      expect(recover).toBeDefined()
    })

    it('should accept custom strategy', () => {
      const { recover } = useConnectionRecovery({ strategy: 'none' })
      expect(recover).toBeDefined()
    })

    it('should accept autoRecover: false', () => {
      const { recover } = useConnectionRecovery({ autoRecover: false })
      expect(recover).toBeDefined()
    })

    it('should accept exponentialBackoff', () => {
      const { recover } = useConnectionRecovery({ exponentialBackoff: true })
      expect(recover).toBeDefined()
    })

    it('should accept autoReconnectOnNetworkChange', () => {
      const { monitor } = useConnectionRecovery({ autoReconnectOnNetworkChange: true })
      expect(monitor).toBeDefined()
    })

    it('should accept all callback options', () => {
      const onRecoveryStart = vi.fn()
      const onRecoverySuccess = vi.fn()
      const onRecoveryFailed = vi.fn()
      const onNetworkChange = vi.fn()

      const { recover, monitor } = useConnectionRecovery({
        onRecoveryStart,
        onRecoverySuccess,
        onRecoveryFailed,
        onNetworkChange,
      })

      expect(recover).toBeDefined()
      expect(monitor).toBeDefined()
    })
  })

  describe('monitor', () => {
    it('should start monitoring a connected peer', () => {
      const { monitor, state } = useConnectionRecovery()
      const pc = createMockPeerConnection('connected')

      monitor(pc)

      expect(state.value).toBe('stable')
    })

    it('should start monitoring a completed peer', () => {
      const { monitor, state } = useConnectionRecovery()
      const pc = createMockPeerConnection('completed')

      monitor(pc)

      expect(state.value).toBe('stable')
    })

    it('should update iceHealth for connected state', () => {
      const { monitor, iceHealth } = useConnectionRecovery()
      const pc = createMockPeerConnection('connected')

      monitor(pc)

      expect(iceHealth.value.iceState).toBe('connected')
      expect(iceHealth.value.isHealthy).toBe(true)
    })

    it('should transition to monitoring on disconnected', () => {
      const { monitor, state } = useConnectionRecovery()
      const pc = createMockPeerConnection('disconnected')

      monitor(pc)

      expect(state.value).toBe('monitoring')
    })

    it('should transition to monitoring on failed', () => {
      const { monitor, state } = useConnectionRecovery()
      const pc = createMockPeerConnection('failed')

      monitor(pc)

      expect(state.value).toBe('monitoring')
    })

    it('should set iceHealth isHealthy to false for disconnected', () => {
      const { monitor, iceHealth } = useConnectionRecovery()
      const pc = createMockPeerConnection('disconnected')

      monitor(pc)

      expect(iceHealth.value.isHealthy).toBe(false)
    })

    it('should set iceHealth isHealthy to false for failed', () => {
      const { monitor, iceHealth } = useConnectionRecovery()
      const pc = createMockPeerConnection('failed')

      monitor(pc)

      expect(iceHealth.value.isHealthy).toBe(false)
    })

    it('should add ice connection state listener', () => {
      const { monitor } = useConnectionRecovery()
      const pc = createMockPeerConnection('new')

      monitor(pc)

      expect(pc.addEventListener).toHaveBeenCalledWith(
        'iceconnectionstatechange',
        expect.any(Function)
      )
    })
  })

  describe('stopMonitoring', () => {
    it('should stop monitoring without error', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery()
      const pc = createMockPeerConnection('connected')

      monitor(pc)

      expect(() => stopMonitoring()).not.toThrow()
    })

    it('should remove ice connection state listener', () => {
      const { monitor, stopMonitoring } = useConnectionRecovery()
      const pc = createMockPeerConnection('connected')

      monitor(pc)
      stopMonitoring()

      expect(pc.removeEventListener).toHaveBeenCalledWith(
        'iceconnectionstatechange',
        expect.any(Function)
      )
    })

    it('should handle stopMonitoring when not monitoring', () => {
      const { stopMonitoring } = useConnectionRecovery()

      expect(() => stopMonitoring()).not.toThrow()
    })
  })

  describe('reset', () => {
    it('should reset state to stable', () => {
      const { state, reset, monitor } = useConnectionRecovery()
      const pc = createMockPeerConnection('failed')

      monitor(pc)
      reset()

      expect(state.value).toBe('stable')
    })

    it('should clear attempts', () => {
      const { attempts, reset, monitor } = useConnectionRecovery()
      const pc = createMockPeerConnection('failed')

      monitor(pc)
      reset()

      expect(attempts.value).toEqual([])
    })

    it('should clear error', () => {
      const { error, reset } = useConnectionRecovery()

      reset()

      expect(error.value).toBeNull()
    })

    it('should reset iceHealth', () => {
      const { iceHealth, reset, monitor } = useConnectionRecovery()
      const pc = createMockPeerConnection('failed')

      monitor(pc)
      reset()

      expect(iceHealth.value).toEqual({
        iceState: 'new',
        stateAge: 0,
        recoveryAttempts: 0,
        isHealthy: true,
      })
    })
  })

  describe('recover without peer connection', () => {
    it('should return false when no peer connection', async () => {
      const { recover, error } = useConnectionRecovery()

      const result = await recover()

      expect(result).toBe(false)
      expect(error.value).toBe('No peer connection to recover')
    })
  })

  describe('network info', () => {
    it('should expose networkInfo as computed', () => {
      const { networkInfo } = useConnectionRecovery()

      expect(networkInfo.value).toBeDefined()
      expect(networkInfo.value.type).toBeDefined()
    })

    it('should track isOnline in networkInfo', () => {
      const { networkInfo } = useConnectionRecovery()

      expect(typeof networkInfo.value.isOnline).toBe('boolean')
    })
  })
})
