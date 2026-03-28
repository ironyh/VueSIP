/**
 * useGracefulDegradation composable unit tests
 * Tests for automatic call quality adjustment based on network conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'
import { useGracefulDegradation } from '@/composables/useGracefulDegradation'
import type {
  UseConnectionHealthBarReturn,
  HealthLevel,
} from '@/composables/useConnectionHealthBar'
import type { UseCallSessionReturn } from '@/composables/useCallSession'
import type { UseNotificationsReturn } from '@/composables/useNotifications'
import { withSetup } from '../../utils/test-helpers'
import { DEGRADATION_CONSTANTS } from '@/composables/constants'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// =============================================================================
// Mock Factories
// =============================================================================

function createMockRTCRtpSender(kind: 'audio' | 'video') {
  const params: RTCRtpSendParameters = {
    encodings: [{}],
    transactionId: 'test-transaction',
    codecs: [],
    headerExtensions: [],
    rtcp: { cname: '', reducedSize: false },
  }

  return {
    track: { kind },
    getParameters: vi.fn().mockReturnValue(params),
    setParameters: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockPeerConnection(options?: { hasVideo?: boolean; hasAudio?: boolean }) {
  const senders: any[] = []

  if (options?.hasAudio !== false) {
    senders.push(createMockRTCRtpSender('audio'))
  }
  if (options?.hasVideo !== false) {
    senders.push(createMockRTCRtpSender('video'))
  }

  return {
    getSenders: vi.fn().mockReturnValue(senders),
  }
}

function createMockCallSession(options?: {
  hasLocalVideo?: boolean
  hasConnection?: boolean
}): UseCallSessionReturn {
  const mockPc = options?.hasConnection !== false ? createMockPeerConnection() : null

  return {
    session: ref({
      connection: mockPc,
    }),
    hasLocalVideo: ref(options?.hasLocalVideo ?? true),
    disableVideo: vi.fn(),
    enableVideo: vi.fn(),
    // Stub other required properties
    state: ref('active'),
    callId: ref('test-call-id'),
    direction: ref('outgoing'),
    localUri: ref('sip:alice@example.com'),
    remoteUri: ref('sip:bob@example.com'),
    remoteDisplayName: ref('Bob'),
    isActive: ref(true),
    isOnHold: ref(false),
    isMuted: ref(false),
    hasRemoteVideo: ref(false),
    localStream: ref(null),
    remoteStream: ref(null),
    timing: ref({}),
    duration: ref(0),
    terminationCause: ref(undefined),
    makeCall: vi.fn(),
    answer: vi.fn(),
    hangup: vi.fn(),
    reject: vi.fn(),
    hold: vi.fn(),
    unhold: vi.fn(),
    toggleHold: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    toggleMute: vi.fn(),
    sendDTMF: vi.fn(),
    getStats: vi.fn(),
    clearSession: vi.fn(),
  } as unknown as UseCallSessionReturn
}

function createMockHealthBar(initialHealth: HealthLevel = 'good'): UseConnectionHealthBarReturn & {
  setHealth: (health: HealthLevel) => void
} {
  const healthLevel = ref<HealthLevel>(initialHealth)

  return {
    healthLevel: computed(() => healthLevel.value),
    healthColor: computed(() => '#84cc16'),
    healthIcon: computed(() => 'health-good'),
    statusText: computed(() => 'Connected - Good quality'),
    isHealthy: computed(() => healthLevel.value === 'excellent' || healthLevel.value === 'good'),
    setHealth: (health: HealthLevel) => {
      healthLevel.value = health
    },
  } as UseConnectionHealthBarReturn & { setHealth: (health: HealthLevel) => void }
}

function createMockNotifications(): UseNotificationsReturn {
  return {
    notifications: ref([]),
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    recovery: vi.fn(),
  } as unknown as UseNotificationsReturn
}

// =============================================================================
// Tests
// =============================================================================

describe('useGracefulDegradation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should start at degradation level 0 with no adaptations', () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      expect(result.degradationLevel.value).toBe(0)
      expect(result.isDegraded.value).toBe(false)
      expect(result.activeAdaptations.value).toEqual([])
      expect(result.isAutoMode.value).toBe(true)

      unmount()
    })

    it('should respect autoDegrade option', () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation({ autoDegrade: false }))

      expect(result.isAutoMode.value).toBe(false)

      unmount()
    })

    it('should have empty adaptation history initially', () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      expect(result.getAdaptationHistory()).toEqual([])

      unmount()
    })

    it('should not be able to recover at level 0', () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      expect(result.canRecover.value).toBe(false)

      unmount()
    })
  })

  // ===========================================================================
  // Level 1: Reduce Video Resolution/Framerate
  // ===========================================================================

  describe('Level 1: Reduce Video Resolution/Framerate', () => {
    it('should apply level 1 degradation and reduce video parameters', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(1)
      expect(result.isDegraded.value).toBe(true)
      expect(result.activeAdaptations.value).toContain('video-resolution-reduced')

      // Verify setParameters was called on video sender
      const pc = mockCallSession.session.value?.connection
      const videoSender = pc?.getSenders().find((s: any) => s.track?.kind === 'video')
      expect(videoSender?.setParameters).toHaveBeenCalled()

      unmount()
    })

    it('should set correct bitrate and framerate for level 1', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      const pc = mockCallSession.session.value?.connection
      const videoSender = pc?.getSenders().find((s: any) => s.track?.kind === 'video')
      const setParamsCall = videoSender?.setParameters.mock.calls[0][0]

      expect(setParamsCall.encodings[0].maxBitrate).toBe(250000)
      expect(setParamsCall.encodings[0].maxFramerate).toBe(
        DEGRADATION_CONSTANTS.VIDEO.MILD_MAX_FRAMERATE
      )

      unmount()
    })

    it('should add adaptation without callSession', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(1)
      expect(result.activeAdaptations.value).toContain('video-resolution-reduced')

      unmount()
    })

    it('should record history entry for level 1', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      const history = result.getAdaptationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].level).toBe(1)
      expect(history[0].reason).toBe('manual')

      unmount()
    })
  })

  // ===========================================================================
  // Level 2: Disable Video
  // ===========================================================================

  describe('Level 2: Disable Video', () => {
    it('should apply level 2 degradation and disable video', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(2)
      expect(result.activeAdaptations.value).toContain('video-disabled')
      expect(mockCallSession.disableVideo).toHaveBeenCalled()

      unmount()
    })

    it('should transition from level 1 to level 2 correctly', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      // Apply level 1 first
      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      expect(result.activeAdaptations.value).toContain('video-resolution-reduced')

      // Apply level 2
      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(2)
      expect(result.activeAdaptations.value).not.toContain('video-resolution-reduced')
      expect(result.activeAdaptations.value).toContain('video-disabled')

      unmount()
    })

    it('should add video-disabled adaptation without callSession', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.activeAdaptations.value).toContain('video-disabled')

      unmount()
    })
  })

  // ===========================================================================
  // Level 3: Reduce Audio Bitrate
  // ===========================================================================

  describe('Level 3: Reduce Audio Bitrate', () => {
    it('should apply level 3 degradation and reduce audio bitrate', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(3)
      expect(result.activeAdaptations.value).toContain('audio-bitrate-reduced')

      // Verify setParameters was called on audio sender
      const pc = mockCallSession.session.value?.connection
      const audioSender = pc?.getSenders().find((s: any) => s.track?.kind === 'audio')
      expect(audioSender?.setParameters).toHaveBeenCalled()

      unmount()
    })

    it('should set correct audio bitrate for level 3', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(0)

      const pc = mockCallSession.session.value?.connection
      const audioSender = pc?.getSenders().find((s: any) => s.track?.kind === 'audio')
      const setParamsCall = audioSender?.setParameters.mock.calls[0][0]

      expect(setParamsCall.encodings[0].maxBitrate).toBe(
        DEGRADATION_CONSTANTS.AUDIO_BITRATE.REDUCED
      )

      unmount()
    })

    it('should apply all levels when jumping from 0 to 3', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(3)
      // Level 2 replaces level 1's video-resolution-reduced with video-disabled
      expect(result.activeAdaptations.value).toContain('video-disabled')
      expect(result.activeAdaptations.value).toContain('audio-bitrate-reduced')

      unmount()
    })
  })

  // ===========================================================================
  // Degradation Triggered by Poor Network
  // ===========================================================================

  describe('Degradation Triggered by Poor Network', () => {
    it('should degrade to level 1 on fair health after stabilization', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: true,
          stabilizationDelay: 1000,
        })
      )

      // Trigger health change to fair
      mockHealthBar.setHealth('fair')
      await vi.advanceTimersByTimeAsync(0)

      // Should not degrade immediately
      expect(result.degradationLevel.value).toBe(0)

      // Wait for stabilization
      await vi.advanceTimersByTimeAsync(1100)

      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })

    it('should degrade to level 2 on poor health after stabilization', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: true,
          stabilizationDelay: 1000,
        })
      )

      mockHealthBar.setHealth('poor')
      await vi.advanceTimersByTimeAsync(1100)

      expect(result.degradationLevel.value).toBe(2)

      unmount()
    })

    it('should degrade immediately to level 3 on critical health', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: true,
        })
      )

      mockHealthBar.setHealth('critical')
      await vi.advanceTimersByTimeAsync(0)

      // Critical should trigger immediate degradation
      expect(result.degradationLevel.value).toBe(3)

      unmount()
    })

    it('should degrade immediately on offline health', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: true,
        })
      )

      mockHealthBar.setHealth('offline')
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(3)

      unmount()
    })

    it('should not auto-degrade when autoDegrade is false', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: false,
        })
      )

      mockHealthBar.setHealth('critical')
      await vi.advanceTimersByTimeAsync(5000)

      expect(result.degradationLevel.value).toBe(0)

      unmount()
    })

    it('should send notification on degradation', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const mockNotifications = createMockNotifications()
      const { unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          notifications: mockNotifications,
          autoDegrade: true,
        })
      )

      mockHealthBar.setHealth('critical')
      await vi.advanceTimersByTimeAsync(0)

      expect(mockNotifications.warning).toHaveBeenCalled()

      unmount()
    })
  })

  // ===========================================================================
  // Automatic Recovery When Conditions Improve
  // ===========================================================================

  describe('Automatic Recovery When Conditions Improve', () => {
    it('should recover when health improves after recovery delay', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: true,
          autoRecover: true,
        })
      )

      mockHealthBar.setHealth('critical')
      await vi.advanceTimersByTimeAsync(0)
      expect(result.degradationLevel.value).toBe(3)

      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      mockHealthBar.setHealth('good')
      await vi.advanceTimersByTimeAsync(0)

      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.RECOVERY_STABILIZATION_DELAY + 100)

      expect(result.degradationLevel.value).toBeLessThan(3)

      unmount()
    })

    it('should not auto-recover when autoRecover is false', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: true,
          autoRecover: false,
        })
      )

      mockHealthBar.setHealth('critical')
      await vi.advanceTimersByTimeAsync(0)
      expect(result.degradationLevel.value).toBe(3)

      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      mockHealthBar.setHealth('excellent')
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.RECOVERY_STABILIZATION_DELAY + 100)

      expect(result.degradationLevel.value).toBe(3)

      unmount()
    })

    it('should send notification on recovery', async () => {
      const mockNotifications = createMockNotifications()
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          notifications: mockNotifications,
        })
      )

      // Manually degrade then recover
      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      expect(mockNotifications.success).toHaveBeenCalled()

      unmount()
    })
  })

  // ===========================================================================
  // Revert Level 1 (Restore Video Params)
  // ===========================================================================

  describe('Revert Level 1 (Restore Video Params)', () => {
    it('should restore video parameters when reverting from level 1', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      // Apply level 1
      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      // Recover to level 0
      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(0)
      expect(result.activeAdaptations.value).not.toContain('video-resolution-reduced')

      // Verify setParameters was called to restore
      const pc = mockCallSession.session.value?.connection
      const videoSender = pc?.getSenders().find((s: any) => s.track?.kind === 'video')
      expect(videoSender?.setParameters).toHaveBeenCalledTimes(2) // Once for apply, once for revert

      unmount()
    })

    it('should delete maxBitrate and maxFramerate on revert', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      const pc = mockCallSession.session.value?.connection
      const videoSender = pc?.getSenders().find((s: any) => s.track?.kind === 'video')
      const lastCall = videoSender?.setParameters.mock.calls.slice(-1)[0][0]

      // The encoding should have maxBitrate and maxFramerate deleted
      expect(lastCall.encodings[0].maxBitrate).toBeUndefined()
      expect(lastCall.encodings[0].maxFramerate).toBeUndefined()

      unmount()
    })
  })

  // ===========================================================================
  // Revert Level 2 (Re-enable Video)
  // ===========================================================================

  describe('Revert Level 2 (Re-enable Video)', () => {
    it('should re-enable video when reverting from level 2', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      // Apply level 2
      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      // Update mock to reflect video is now disabled
      ;(mockCallSession.hasLocalVideo as any).value = false

      // Recover to level 1
      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(1)
      expect(result.activeAdaptations.value).not.toContain('video-disabled')
      expect(mockCallSession.enableVideo).toHaveBeenCalled()

      unmount()
    })
  })

  // ===========================================================================
  // Revert Level 3 (Restore Audio Params)
  // ===========================================================================

  describe('Revert Level 3 (Restore Audio Params)', () => {
    it('should restore audio parameters when reverting from level 3', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      // Apply level 3
      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      // Recover to level 2
      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(2)
      expect(result.activeAdaptations.value).not.toContain('audio-bitrate-reduced')

      // Verify setParameters was called on audio sender
      const pc = mockCallSession.session.value?.connection
      const audioSender = pc?.getSenders().find((s: any) => s.track?.kind === 'audio')
      expect(audioSender?.setParameters).toHaveBeenCalledTimes(2)

      unmount()
    })

    it('should delete maxBitrate on audio revert', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      const pc = mockCallSession.session.value?.connection
      const audioSender = pc?.getSenders().find((s: any) => s.track?.kind === 'audio')
      const lastCall = audioSender?.setParameters.mock.calls.slice(-1)[0][0]

      expect(lastCall.encodings[0].maxBitrate).toBeUndefined()

      unmount()
    })
  })

  // ===========================================================================
  // Adaptations Array Tracks Applied Changes
  // ===========================================================================

  describe('Adaptations Array Tracks Applied Changes', () => {
    it('should track video-resolution-reduced adaptation', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.activeAdaptations.value).toEqual(['video-resolution-reduced'])

      unmount()
    })

    it('should track video-disabled adaptation', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.activeAdaptations.value).toContain('video-disabled')

      unmount()
    })

    it('should track audio-bitrate-reduced adaptation', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.activeAdaptations.value).toContain('audio-bitrate-reduced')

      unmount()
    })

    it('should remove adaptations on recovery', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recoverFull()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.activeAdaptations.value).toEqual([])

      unmount()
    })

    it('should return immutable adaptations via computed', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.activeAdaptations.value).toContain('video-resolution-reduced')
      expect(result.activeAdaptations.value).toHaveLength(1)

      unmount()
    })
  })

  // ===========================================================================
  // currentLevel Computed Correctly
  // ===========================================================================

  describe('currentLevel Computed Correctly', () => {
    it('should reflect level 0 initially', () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      expect(result.degradationLevel.value).toBe(0)

      unmount()
    })

    it('should reflect level 1 after applying', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })

    it('should reflect level 2 after applying', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(2)

      unmount()
    })

    it('should reflect level 3 after applying', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(3)

      unmount()
    })

    it('should update isDegraded computed correctly', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      expect(result.isDegraded.value).toBe(false)

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.isDegraded.value).toBe(true)

      unmount()
    })
  })

  // ===========================================================================
  // Handles Missing Peer Connection Gracefully
  // ===========================================================================

  describe('Handles Missing Peer Connection Gracefully', () => {
    it('should not throw when session has no connection', async () => {
      const mockCallSession = createMockCallSession({ hasConnection: false })
      ;(mockCallSession.session as any).value = { connection: null }

      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      expect(() => result.applyDegradation(1)).not.toThrow()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })

    it('should not throw when no video sender exists', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const pc = mockCallSession.session.value?.connection
      ;(pc?.getSenders as any).mockReturnValue([createMockRTCRtpSender('audio')])

      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      expect(() => result.applyDegradation(1)).not.toThrow()
      await vi.advanceTimersByTimeAsync(0)

      unmount()
    })

    it('should not throw when no audio sender exists', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const pc = mockCallSession.session.value?.connection
      ;(pc?.getSenders as any).mockReturnValue([createMockRTCRtpSender('video')])

      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      expect(() => result.applyDegradation(3)).not.toThrow()
      await vi.advanceTimersByTimeAsync(0)

      unmount()
    })

    it('should handle setParameters rejection gracefully', async () => {
      const mockCallSession = createMockCallSession({ hasLocalVideo: true })
      const pc = mockCallSession.session.value?.connection
      const videoSender = pc?.getSenders().find((s: any) => s.track?.kind === 'video')
      ;(videoSender?.setParameters as any).mockRejectedValue(new Error('Failed'))

      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      expect(() => result.applyDegradation(1)).not.toThrow()
      await vi.advanceTimersByTimeAsync(0)

      // Should still update level even if setParameters fails
      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })

    it('should handle missing session gracefully', async () => {
      const mockCallSession = createMockCallSession()
      ;(mockCallSession.session as any).value = null

      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ callSession: mockCallSession })
      )

      expect(() => result.applyDegradation(1)).not.toThrow()
      await vi.advanceTimersByTimeAsync(0)

      unmount()
    })
  })

  // ===========================================================================
  // Cleanup on Dispose
  // ===========================================================================

  describe('Cleanup on Dispose', () => {
    it('should clear stabilization timer on dispose', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          stabilizationDelay: 5000,
        })
      )

      // Trigger a health change that starts stabilization timer
      mockHealthBar.setHealth('fair')
      await vi.advanceTimersByTimeAsync(0)

      // Unmount before timer fires
      unmount()

      // Advance past stabilization delay
      await vi.advanceTimersByTimeAsync(6000)

      // Should not throw or cause issues
      expect(result.degradationLevel.value).toBe(0)
    })

    it('should clear recovery timer on dispose', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoRecover: true,
        })
      )

      mockHealthBar.setHealth('critical')
      await vi.advanceTimersByTimeAsync(0)
      expect(result.degradationLevel.value).toBe(3)

      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      mockHealthBar.setHealth('good')
      await vi.advanceTimersByTimeAsync(0)

      unmount()

      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.RECOVERY_STABILIZATION_DELAY + 1000)
    })

    it('should stop watching health level on dispose', async () => {
      const mockHealthBar = createMockHealthBar('good')
      const { unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
        })
      )

      unmount()

      // Changing health after unmount should not cause issues
      mockHealthBar.setHealth('critical')
      await vi.advanceTimersByTimeAsync(5000)

      // No assertions needed - just verifying no errors
    })
  })

  // ===========================================================================
  // Manual Control Methods
  // ===========================================================================

  describe('Manual Control Methods', () => {
    it('should allow manual degradation via applyDegradation', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(2)

      unmount()
    })

    it('should allow manual recovery via recover()', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })

    it('should allow full recovery via recoverFull()', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recoverFull()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(0)

      unmount()
    })

    it('should not recover below level 0', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(0)

      unmount()
    })

    it('should toggle auto mode via setAutoMode', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      expect(result.isAutoMode.value).toBe(true)

      result.setAutoMode(false)
      expect(result.isAutoMode.value).toBe(false)

      result.setAutoMode(true)
      expect(result.isAutoMode.value).toBe(true)

      unmount()
    })

    it('should trigger health check when enabling auto mode', async () => {
      const mockHealthBar = createMockHealthBar('critical')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          autoDegrade: false,
        })
      )

      expect(result.degradationLevel.value).toBe(0)

      result.setAutoMode(true)
      await vi.advanceTimersByTimeAsync(0)

      // Should immediately degrade due to critical health
      expect(result.degradationLevel.value).toBe(3)

      unmount()
    })
  })

  // ===========================================================================
  // canRecover Computed
  // ===========================================================================

  describe('canRecover Computed', () => {
    it('should return false at level 0', () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      expect(result.canRecover.value).toBe(false)

      unmount()
    })

    it('should return true at level > 0 without healthBar', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.canRecover.value).toBe(true)

      unmount()
    })

    it('should check health level for recovery eligibility', async () => {
      const mockHealthBar = createMockHealthBar('critical')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ healthBar: mockHealthBar })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      // At level 1, need excellent or good to recover to 0
      expect(result.canRecover.value).toBe(false)

      mockHealthBar.setHealth('good')
      expect(result.canRecover.value).toBe(true)

      unmount()
    })

    it('should not allow recovery when health is insufficient', async () => {
      const mockHealthBar = createMockHealthBar('poor')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ healthBar: mockHealthBar })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.canRecover.value).toBe(false)

      unmount()
    })

    it('should block recovery when canRecover is false', async () => {
      const mockHealthBar = createMockHealthBar('critical')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ healthBar: mockHealthBar })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      // Should not recover due to poor health
      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })
  })

  // ===========================================================================
  // Adaptation History
  // ===========================================================================

  describe('Adaptation History', () => {
    it('should record history entries for each level change', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(0)

      const history = result.getAdaptationHistory()
      expect(history).toHaveLength(3)
      expect(history[0].level).toBe(1)
      expect(history[1].level).toBe(2)
      expect(history[2].level).toBe(3)

      unmount()
    })

    it('should include timestamp in history entries', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      const beforeTime = Date.now()
      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)
      const afterTime = Date.now()

      const history = result.getAdaptationHistory()
      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(history[0].timestamp).toBeLessThanOrEqual(afterTime)

      unmount()
    })

    it('should include reason in history entries', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      const history = result.getAdaptationHistory()
      expect(history[0].reason).toBe('manual')

      unmount()
    })

    it('should limit history to MAX_HISTORY_ENTRIES', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      // Create more entries than the limit
      for (let i = 0; i < DEGRADATION_CONSTANTS.MAX_HISTORY_ENTRIES + 5; i++) {
        const level = ((i % 3) + 1) as 1 | 2 | 3
        result.applyDegradation(level)
        await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)
      }

      const history = result.getAdaptationHistory()
      expect(history.length).toBeLessThanOrEqual(DEGRADATION_CONSTANTS.MAX_HISTORY_ENTRIES)

      unmount()
    })

    it('should return a copy of history array', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      const history = result.getAdaptationHistory()
      history.push({ timestamp: 0, level: 0, reason: 'fake' })

      // Original should not be modified
      expect(result.getAdaptationHistory()).toHaveLength(1)

      unmount()
    })
  })

  // ===========================================================================
  // Rate Limiting
  // ===========================================================================

  describe('Rate Limiting', () => {
    it('should prevent rapid level changes', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      // Try to change immediately
      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      // Should still be at level 1 due to rate limiting
      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })

    it('should allow level change after MIN_LEVEL_CHANGE_INTERVAL', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(result.degradationLevel.value).toBe(2)

      unmount()
    })

    it('should not change level if target equals current', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      const historyBefore = result.getAdaptationHistory().length

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      // Should not add new history entry
      expect(result.getAdaptationHistory().length).toBe(historyBefore)

      unmount()
    })
  })

  // ===========================================================================
  // Custom Thresholds
  // ===========================================================================

  describe('Custom Thresholds', () => {
    it('should respect custom thresholds', async () => {
      const mockHealthBar = createMockHealthBar('excellent')
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({
          healthBar: mockHealthBar,
          thresholds: {
            mild: ['good'],
          },
          stabilizationDelay: 100,
        })
      )

      mockHealthBar.setHealth('good')
      await vi.advanceTimersByTimeAsync(200)

      expect(result.degradationLevel.value).toBe(1)

      unmount()
    })
  })

  // ===========================================================================
  // Notifications
  // ===========================================================================

  describe('Notifications', () => {
    it('should send warning notification for level 1', async () => {
      const mockNotifications = createMockNotifications()
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ notifications: mockNotifications })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(0)

      expect(mockNotifications.warning).toHaveBeenCalledWith(
        'Quality Adjusted',
        DEGRADATION_CONSTANTS.MESSAGES.MILD_DEGRADE
      )

      unmount()
    })

    it('should send warning notification for level 2', async () => {
      const mockNotifications = createMockNotifications()
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ notifications: mockNotifications })
      )

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(0)

      expect(mockNotifications.warning).toHaveBeenCalledWith(
        'Audio-Only Mode',
        DEGRADATION_CONSTANTS.MESSAGES.MODERATE_DEGRADE
      )

      unmount()
    })

    it('should send warning notification for level 3', async () => {
      const mockNotifications = createMockNotifications()
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ notifications: mockNotifications })
      )

      result.applyDegradation(3)
      await vi.advanceTimersByTimeAsync(0)

      expect(mockNotifications.warning).toHaveBeenCalledWith(
        'Severe Degradation',
        DEGRADATION_CONSTANTS.MESSAGES.SEVERE_DEGRADE
      )

      unmount()
    })

    it('should send success notification on partial recovery', async () => {
      const mockNotifications = createMockNotifications()
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ notifications: mockNotifications })
      )

      result.applyDegradation(2)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recover()
      await vi.advanceTimersByTimeAsync(0)

      expect(mockNotifications.success).toHaveBeenCalledWith(
        'Quality Improving',
        DEGRADATION_CONSTANTS.MESSAGES.RECOVERY
      )

      unmount()
    })

    it('should send success notification on full recovery', async () => {
      const mockNotifications = createMockNotifications()
      const { result, unmount } = withSetup(() =>
        useGracefulDegradation({ notifications: mockNotifications })
      )

      result.applyDegradation(1)
      await vi.advanceTimersByTimeAsync(DEGRADATION_CONSTANTS.MIN_LEVEL_CHANGE_INTERVAL + 100)

      result.recoverFull()
      await vi.advanceTimersByTimeAsync(0)

      expect(mockNotifications.success).toHaveBeenCalledWith(
        'Quality Restored',
        DEGRADATION_CONSTANTS.MESSAGES.FULL_RECOVERY
      )

      unmount()
    })

    it('should not send notifications when notifications is not provided', async () => {
      const { result, unmount } = withSetup(() => useGracefulDegradation())

      // Should not throw
      expect(() => result.applyDegradation(1)).not.toThrow()
      await vi.advanceTimersByTimeAsync(0)

      unmount()
    })
  })
})
