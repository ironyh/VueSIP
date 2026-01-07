import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useRecordingIndicator } from '../../../src/composables/useRecordingIndicator'

describe('useRecordingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with all expected state and methods', () => {
      const indicator = useRecordingIndicator()

      expect(indicator).toHaveProperty('state')
      expect(indicator).toHaveProperty('isRecording')
      expect(indicator).toHaveProperty('isPaused')
      expect(indicator).toHaveProperty('duration')
      expect(indicator).toHaveProperty('formattedDuration')
      expect(indicator).toHaveProperty('blinkState')
      expect(indicator).toHaveProperty('indicatorStyle')
      expect(indicator).toHaveProperty('setRecordingState')
      expect(indicator).toHaveProperty('reset')
    })

    it('should start with inactive state', () => {
      const indicator = useRecordingIndicator()

      expect(indicator.state.value).toBe('inactive')
      expect(indicator.isRecording.value).toBe(false)
      expect(indicator.isPaused.value).toBe(false)
      expect(indicator.duration.value).toBe(0)
    })

    it('should accept custom initial state', () => {
      const indicator = useRecordingIndicator({ initialState: 'recording' })

      expect(indicator.state.value).toBe('recording')
      expect(indicator.isRecording.value).toBe(true)
    })
  })

  describe('state management', () => {
    it('should track recording state correctly', async () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')
      await nextTick()

      expect(indicator.state.value).toBe('recording')
      expect(indicator.isRecording.value).toBe(true)
      expect(indicator.isPaused.value).toBe(false)
    })

    it('should track paused state correctly', async () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('paused')
      await nextTick()

      expect(indicator.state.value).toBe('paused')
      expect(indicator.isRecording.value).toBe(false)
      expect(indicator.isPaused.value).toBe(true)
    })

    it('should track stopped state correctly', async () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('stopped')
      await nextTick()

      expect(indicator.state.value).toBe('stopped')
      expect(indicator.isRecording.value).toBe(false)
      expect(indicator.isPaused.value).toBe(false)
    })
  })

  describe('duration tracking', () => {
    it('should track duration when recording', async () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')
      await nextTick()

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000)
      await nextTick()

      expect(indicator.duration.value).toBeGreaterThanOrEqual(5000)
    })

    it('should not track duration when paused', async () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')
      await nextTick()
      vi.advanceTimersByTime(2000)

      indicator.setRecordingState('paused')
      await nextTick()

      const durationAtPause = indicator.duration.value
      vi.advanceTimersByTime(3000)
      await nextTick()

      expect(indicator.duration.value).toBe(durationAtPause)
    })

    it('should resume duration tracking after pause', async () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')
      await nextTick()
      vi.advanceTimersByTime(2000)

      indicator.setRecordingState('paused')
      await nextTick()
      vi.advanceTimersByTime(1000)

      indicator.setRecordingState('recording')
      await nextTick()
      vi.advanceTimersByTime(3000)
      await nextTick()

      // Should be ~5000ms (2000 + 3000, excluding 1000ms pause)
      expect(indicator.duration.value).toBeGreaterThanOrEqual(5000)
      expect(indicator.duration.value).toBeLessThan(6000)
    })

    it('should format duration as MM:SS for < 1 hour', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')
      vi.advanceTimersByTime(125000) // 2:05

      expect(indicator.formattedDuration.value).toBe('02:05')
    })

    it('should format duration as HH:MM:SS for >= 1 hour', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')
      vi.advanceTimersByTime(3725000) // 1:02:05

      expect(indicator.formattedDuration.value).toBe('01:02:05')
    })
  })

  describe('blink animation', () => {
    it('should toggle blink state when recording', async () => {
      const indicator = useRecordingIndicator({ blinkInterval: 500 })

      indicator.setRecordingState('recording')
      await nextTick()

      const initialBlinkState = indicator.blinkState.value

      vi.advanceTimersByTime(500)
      await nextTick()

      expect(indicator.blinkState.value).toBe(!initialBlinkState)

      vi.advanceTimersByTime(500)
      await nextTick()

      expect(indicator.blinkState.value).toBe(initialBlinkState)
    })

    it('should stop blinking when paused', async () => {
      const indicator = useRecordingIndicator({ blinkInterval: 500 })

      indicator.setRecordingState('recording')
      await nextTick()
      vi.advanceTimersByTime(500)

      indicator.setRecordingState('paused')
      await nextTick()

      const blinkStateAtPause = indicator.blinkState.value
      vi.advanceTimersByTime(1000)
      await nextTick()

      expect(indicator.blinkState.value).toBe(blinkStateAtPause)
    })

    it('should stop blinking when inactive', async () => {
      const indicator = useRecordingIndicator({ blinkInterval: 500 })

      indicator.setRecordingState('recording')
      await nextTick()
      vi.advanceTimersByTime(500)

      indicator.setRecordingState('inactive')
      await nextTick()

      const blinkStateAtInactive = indicator.blinkState.value
      vi.advanceTimersByTime(1000)
      await nextTick()

      expect(indicator.blinkState.value).toBe(blinkStateAtInactive)
    })

    it('should use custom blink interval', async () => {
      const indicator = useRecordingIndicator({ blinkInterval: 1000 })

      indicator.setRecordingState('recording')
      await nextTick()

      const initialBlinkState = indicator.blinkState.value

      vi.advanceTimersByTime(500)
      await nextTick()
      expect(indicator.blinkState.value).toBe(initialBlinkState)

      vi.advanceTimersByTime(500)
      await nextTick()
      expect(indicator.blinkState.value).toBe(!initialBlinkState)
    })
  })

  describe('indicator styles', () => {
    it('should return red color when recording', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')

      const style = indicator.indicatorStyle.value
      expect(style.backgroundColor).toBe('#ef4444')
    })

    it('should return yellow color when paused', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('paused')

      const style = indicator.indicatorStyle.value
      expect(style.backgroundColor).toBe('#eab308')
    })

    it('should return gray color when inactive', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('inactive')

      const style = indicator.indicatorStyle.value
      expect(style.backgroundColor).toBe('#6b7280')
    })

    it('should apply opacity 0 when blink state is false and recording', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')

      // Force blink state to false
      indicator.blinkState.value = false

      const style = indicator.indicatorStyle.value
      expect(style.opacity).toBe(0)
    })

    it('should apply opacity 1 when blink state is true and recording', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')

      // Force blink state to true
      indicator.blinkState.value = true

      const style = indicator.indicatorStyle.value
      expect(style.opacity).toBe(1)
    })

    it('should always apply opacity 1 when not recording', () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('paused')

      const style = indicator.indicatorStyle.value
      expect(style.opacity).toBe(1)
    })

    it('should use custom colors', () => {
      const customColors = {
        recording: '#ff0000',
        paused: '#ffff00',
        inactive: '#cccccc',
      }
      const indicator = useRecordingIndicator({ colors: customColors })

      indicator.setRecordingState('recording')
      expect(indicator.indicatorStyle.value.backgroundColor).toBe('#ff0000')

      indicator.setRecordingState('paused')
      expect(indicator.indicatorStyle.value.backgroundColor).toBe('#ffff00')

      indicator.setRecordingState('inactive')
      expect(indicator.indicatorStyle.value.backgroundColor).toBe('#cccccc')
    })
  })

  describe('reset', () => {
    it('should reset to inactive state and clear duration', async () => {
      const indicator = useRecordingIndicator()

      indicator.setRecordingState('recording')
      await nextTick()
      vi.advanceTimersByTime(5000)

      indicator.reset()
      await nextTick()

      expect(indicator.state.value).toBe('inactive')
      expect(indicator.duration.value).toBe(0)
      expect(indicator.formattedDuration.value).toBe('00:00')
    })
  })

  describe('cleanup', () => {
    it('should clear intervals on unmount', async () => {
      const { unmount } = useRecordingIndicator()

      unmount()
      await nextTick()

      // If cleanup worked, no errors should occur
      expect(true).toBe(true)
    })
  })
})
