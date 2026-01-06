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
  let _mockPeerConnection: RTCPeerConnection

  beforeEach(() => {
    vi.useFakeTimers()

    // Create mock RTCPeerConnection - will be used in later tasks
    _mockPeerConnection = {
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
})
