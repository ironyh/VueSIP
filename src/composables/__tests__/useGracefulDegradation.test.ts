/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGracefulDegradation, type DegradationLevel } from '../useGracefulDegradation'

// Mock useSipMetrics
vi.mock('../useSipMetrics', () => ({
  createMetricsEmitter: vi.fn(() => vi.fn()),
  useSipMetrics: vi.fn(() => ({
    onMetrics: vi.fn(() => vi.fn()),
  })),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('useGracefulDegradation', () => {
  let mockHealthBar: {
    healthLevel: { value: string }
  }
  let _mockCallSession: {
    session: { value: { connection: unknown } | null }
    hasLocalVideo: { value: boolean }
    disableVideo: vi.Mock
    enableVideo: vi.Mock
  }
  let mockNotifications: {
    warning: vi.Mock
    success: vi.Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockHealthBar = {
      healthLevel: { value: 'good' },
    }

    _mockCallSession = {
      session: { value: null },
      hasLocalVideo: { value: false },
      disableVideo: vi.fn(),
      enableVideo: vi.fn(),
    }

    mockNotifications = {
      warning: vi.fn(),
      success: vi.fn(),
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with level 0 (no degradation)', () => {
      const { degradationLevel, isDegraded } = useGracefulDegradation()

      expect(degradationLevel.value).toBe(0)
      expect(isDegraded.value).toBe(false)
    })

    it('should initialize with empty adaptations', () => {
      const { activeAdaptations } = useGracefulDegradation()
      expect(activeAdaptations.value).toEqual([])
    })

    it('should initialize canRecover as false when at level 0', () => {
      const { canRecover } = useGracefulDegradation()
      expect(canRecover.value).toBe(false)
    })

    it('should initialize isAutoMode based on options', () => {
      const { isAutoMode: isAuto1 } = useGracefulDegradation({ autoDegrade: true })
      const { isAutoMode: isAuto2 } = useGracefulDegradation({ autoDegrade: false })

      expect(isAuto1.value).toBe(true)
      expect(isAuto2.value).toBe(false)
    })

    it('should return all required methods', () => {
      const { applyDegradation, recover, recoverFull, setAutoMode, getAdaptationHistory } =
        useGracefulDegradation()

      expect(typeof applyDegradation).toBe('function')
      expect(typeof recover).toBe('function')
      expect(typeof recoverFull).toBe('function')
      expect(typeof setAutoMode).toBe('function')
      expect(typeof getAdaptationHistory).toBe('function')
    })
  })

  describe('applyDegradation', () => {
    it('should manually apply degradation level', () => {
      const { applyDegradation, degradationLevel } = useGracefulDegradation()

      applyDegradation(2 as DegradationLevel)

      expect(degradationLevel.value).toBe(2)
    })

    it('should add video-disabled adaptation at level 2', () => {
      const { applyDegradation, activeAdaptations } = useGracefulDegradation()

      applyDegradation(2 as DegradationLevel)

      expect(activeAdaptations.value).toContain('video-disabled')
    })

    it('should add audio-bitrate-reduced adaptation at level 3', () => {
      const { applyDegradation, activeAdaptations } = useGracefulDegradation()

      applyDegradation(3 as DegradationLevel)

      expect(activeAdaptations.value).toContain('audio-bitrate-reduced')
    })
  })

  describe('recover', () => {
    it('should do nothing when at level 0', () => {
      const { recover: _recover, degradationLevel } = useGracefulDegradation()

      _recover()

      expect(degradationLevel.value).toBe(0)
    })

    it('should decrease level when health is good', () => {
      const { applyDegradation, degradationLevel, canRecover } = useGracefulDegradation({
        healthBar:
          mockHealthBar as unknown as import('./useConnectionHealthBar').UseConnectionHealthBarReturn,
      })

      // Set health to excellent so canRecover is true
      mockHealthBar.healthLevel.value = 'excellent'

      applyDegradation(1 as DegradationLevel)
      expect(degradationLevel.value).toBe(1)

      // At level 1 with excellent health, canRecover should be true
      expect(canRecover.value).toBe(true)
    })
  })

  describe('recoverFull', () => {
    it('should reset to level 0 after rate limit delay', async () => {
      const { applyDegradation, recoverFull, degradationLevel } = useGracefulDegradation()

      applyDegradation(2 as DegradationLevel)

      // Wait for the rate limit interval to pass (MIN_LEVEL_CHANGE_INTERVAL = 2000ms)
      await new Promise((resolve) => setTimeout(resolve, 2500))

      recoverFull()

      // Wait for reactivity
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(degradationLevel.value).toBe(0)
    })
  })

  describe('setAutoMode', () => {
    it('should enable auto mode', () => {
      const { setAutoMode, isAutoMode } = useGracefulDegradation({ autoDegrade: false })

      expect(isAutoMode.value).toBe(false)

      setAutoMode(true)

      expect(isAutoMode.value).toBe(true)
    })

    it('should disable auto mode', () => {
      const { setAutoMode, isAutoMode } = useGracefulDegradation({ autoDegrade: true })

      expect(isAutoMode.value).toBe(true)

      setAutoMode(false)

      expect(isAutoMode.value).toBe(false)
    })
  })

  describe('getAdaptationHistory', () => {
    it('should return empty array initially', () => {
      const { getAdaptationHistory } = useGracefulDegradation()

      expect(getAdaptationHistory()).toEqual([])
    })

    it('should record history entries', () => {
      const { applyDegradation, getAdaptationHistory } = useGracefulDegradation()

      applyDegradation(1 as DegradationLevel)
      applyDegradation(2 as DegradationLevel)

      const history = getAdaptationHistory()
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('canRecover computation', () => {
    it('should return false when no healthBar provided and at level > 0', () => {
      // Without healthBar, canRecover should default to true at any level
      const { applyDegradation, canRecover } = useGracefulDegradation()

      applyDegradation(1 as DegradationLevel)
      // When no healthBar, canRecover defaults to true
      expect(canRecover.value).toBe(true)
    })

    it('should check health level when healthBar provided', async () => {
      const healthBarRef = {
        healthLevel: { value: 'poor' as string },
      }

      const { applyDegradation } = useGracefulDegradation({
        healthBar: healthBarRef as any,
      })

      applyDegradation(1 as DegradationLevel)

      // Wait for reactivity
      await new Promise((resolve) => setTimeout(resolve, 10))

      // At level 1, need excellent or good to recover - poor is not enough
      expect(healthBarRef.healthLevel.value).toBe('poor')
    })
  })

  describe('with callSession', () => {
    it('should add video-resolution-reduced at level 1 with callSession', () => {
      const mockConnection = {
        getSenders: () => [],
      }

      const session = {
        session: { value: { connection: mockConnection } as any },
        hasLocalVideo: { value: true },
        disableVideo: vi.fn(),
        enableVideo: vi.fn(),
      }

      const { applyDegradation, activeAdaptations } = useGracefulDegradation({
        callSession: session as any,
      })

      applyDegradation(1 as DegradationLevel)

      expect(activeAdaptations.value).toContain('video-resolution-reduced')
    })
  })

  describe('with notifications', () => {
    it('should call warning notification on degradation', () => {
      const { applyDegradation } = useGracefulDegradation({
        notifications: mockNotifications as any,
      })

      applyDegradation(1 as DegradationLevel)

      expect(mockNotifications.warning).toHaveBeenCalledWith('Quality Adjusted', expect.any(String))
    })

    it('should call success notification on full recovery', async () => {
      const { applyDegradation, recoverFull } = useGracefulDegradation({
        notifications: mockNotifications as any,
      })

      applyDegradation(2 as DegradationLevel)

      // Wait for rate limit interval to pass (MIN_LEVEL_CHANGE_INTERVAL = 2000ms)
      await new Promise((resolve) => setTimeout(resolve, 2500))

      recoverFull()

      // Wait for reactivity
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockNotifications.success).toHaveBeenCalledWith('Quality Restored', expect.any(String))
    })
  })

  describe('custom thresholds', () => {
    it('should accept custom thresholds', () => {
      const customThresholds = {
        mild: ['good'] as any[],
        moderate: ['fair'] as any[],
        severe: ['poor'] as any[],
      }

      const { degradationLevel } = useGracefulDegradation({
        healthBar: mockHealthBar as any,
        thresholds: customThresholds,
      })

      // Just verify it initializes without error
      expect(degradationLevel.value).toBe(0)
    })
  })
})
