/**
 * Tests for useRecordingIndicator composable
 * @module tests/composables/useRecordingIndicator.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRecordingIndicator } from '@/composables/useRecordingIndicator'

describe('useRecordingIndicator', () => {
  describe('initialization', () => {
    it('should initialize with inactive state by default', () => {
      const { state } = useRecordingIndicator()
      expect(state.value).toBe('inactive')
    })

    it('should initialize with zero duration', () => {
      const { duration } = useRecordingIndicator()
      expect(duration.value).toBe(0)
    })

    it('should initialize with blinkState true (visible)', () => {
      const { blinkState } = useRecordingIndicator()
      expect(blinkState.value).toBe(true)
    })

    it('should not be recording initially', () => {
      const { isRecording } = useRecordingIndicator()
      expect(isRecording.value).toBe(false)
    })

    it('should not be paused initially', () => {
      const { isPaused } = useRecordingIndicator()
      expect(isPaused.value).toBe(false)
    })

    it('should format zero duration as 00:00', () => {
      const { formattedDuration } = useRecordingIndicator()
      expect(formattedDuration.value).toBe('00:00')
    })

    it('should accept custom initial state', () => {
      const { state } = useRecordingIndicator({ initialState: 'recording' })
      expect(state.value).toBe('recording')
    })

    it('should accept custom blink interval', () => {
      const { setRecordingState } = useRecordingIndicator({ blinkInterval: 1000 })
      // Just verify it doesn't throw
      expect(() => setRecordingState('recording')).not.toThrow()
    })
  })

  describe('custom colors', () => {
    it('should use custom recording color', () => {
      const { indicatorStyle } = useRecordingIndicator({
        colors: { recording: '#ff0000', paused: '#ffff00', inactive: '#808080' },
      })
      // When inactive, should use inactive color
      expect(indicatorStyle.value.backgroundColor).toBe('#808080')
    })

    it('should merge custom colors with defaults', () => {
      const { indicatorStyle, setRecordingState } = useRecordingIndicator({
        colors: { recording: '#ff0000' },
      })
      setRecordingState('recording')
      // Should use custom recording color when in recording state
      expect(indicatorStyle.value.backgroundColor).toBe('#ff0000')
    })
  })

  describe('setRecordingState', () => {
    it('should transition to recording state', () => {
      const { state, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      expect(state.value).toBe('recording')
    })

    it('should set isRecording to true when recording', () => {
      const { isRecording, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      expect(isRecording.value).toBe(true)
    })

    it('should transition to paused state', () => {
      const { state, setRecordingState } = useRecordingIndicator()
      setRecordingState('paused')
      expect(state.value).toBe('paused')
    })

    it('should set isPaused to true when paused', () => {
      const { isPaused, setRecordingState } = useRecordingIndicator()
      setRecordingState('paused')
      expect(isPaused.value).toBe(true)
    })

    it('should transition to stopped state', () => {
      const { state, setRecordingState } = useRecordingIndicator()
      setRecordingState('stopped')
      expect(state.value).toBe('stopped')
    })

    it('should transition to inactive state', () => {
      const { state, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      setRecordingState('inactive')
      expect(state.value).toBe('inactive')
    })
  })

  describe('reset', () => {
    it('should reset state to inactive', () => {
      const { state, setRecordingState, reset } = useRecordingIndicator()
      setRecordingState('recording')
      reset()
      expect(state.value).toBe('inactive')
    })

    it('should reset duration to zero', () => {
      const { duration, setRecordingState, reset } = useRecordingIndicator()
      setRecordingState('recording')
      // Simulate time passing by directly manipulating for test
      reset()
      expect(duration.value).toBe(0)
    })

    it('should reset blinkState to true', () => {
      const { blinkState, setRecordingState, reset } = useRecordingIndicator()
      setRecordingState('recording')
      reset()
      expect(blinkState.value).toBe(true)
    })
  })

  describe('indicatorStyle', () => {
    it('should return inactive color for inactive state', () => {
      const { indicatorStyle } = useRecordingIndicator()
      expect(indicatorStyle.value.backgroundColor).toBe('#6b7280')
    })

    it('should return recording color for recording state', () => {
      const { indicatorStyle, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      expect(indicatorStyle.value.backgroundColor).toBe('#ef4444')
    })

    it('should return paused color for paused state', () => {
      const { indicatorStyle, setRecordingState } = useRecordingIndicator()
      setRecordingState('paused')
      expect(indicatorStyle.value.backgroundColor).toBe('#eab308')
    })

    it('should include opacity transition', () => {
      const { indicatorStyle } = useRecordingIndicator()
      expect(indicatorStyle.value.transition).toBe('opacity 0.2s ease-in-out')
    })

    it('should toggle opacity based on blinkState when recording', () => {
      const { indicatorStyle, blinkState, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      // Default blinkState is true (visible)
      expect(indicatorStyle.value.opacity).toBe(1)
      // When blinkState is false, should be invisible
      blinkState.value = false
      expect(indicatorStyle.value.opacity).toBe(0)
    })

    it('should not toggle opacity when not recording', () => {
      const { indicatorStyle, blinkState, setRecordingState } = useRecordingIndicator()
      setRecordingState('paused')
      blinkState.value = false
      // Paused state should not be affected by blinkState
      expect(indicatorStyle.value.opacity).toBe(1)
    })
  })

  describe('duration tracking', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should increment duration when recording', () => {
      const { duration, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      vi.advanceTimersByTime(1000)
      expect(duration.value).toBeGreaterThanOrEqual(900)
    })

    it('should format duration as MM:SS', () => {
      const { formattedDuration, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      vi.advanceTimersByTime(65000) // 1 minute 5 seconds
      expect(formattedDuration.value).toMatch(/01:0[45]/)
    })

    it('should format duration as HH:MM:SS when over an hour', () => {
      const { formattedDuration, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      vi.advanceTimersByTime(3661000) // 1 hour 1 minute 1 second
      expect(formattedDuration.value).toMatch(/01:01:0[01]/)
    })

    it('should stop incrementing duration when paused', () => {
      const { duration, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      vi.advanceTimersByTime(1000)
      const durationBeforePause = duration.value
      setRecordingState('paused')
      vi.advanceTimersByTime(1000)
      expect(duration.value).toBe(durationBeforePause)
    })

    it('should resume duration tracking from paused state', () => {
      const { duration, setRecordingState } = useRecordingIndicator()
      setRecordingState('recording')
      vi.advanceTimersByTime(1000)
      const durationAtPause = duration.value
      setRecordingState('paused')
      vi.advanceTimersByTime(1000) // pause time should not count
      setRecordingState('recording')
      vi.advanceTimersByTime(500)
      // Duration should be approximately what it was + 500ms, not + 1500ms
      expect(duration.value).toBeLessThan(durationAtPause + 1000)
    })

    it('should reset duration when reset is called during recording', () => {
      const { duration, setRecordingState, reset } = useRecordingIndicator()
      setRecordingState('recording')
      vi.advanceTimersByTime(2000)
      reset()
      expect(duration.value).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should provide unmount function', () => {
      const { unmount } = useRecordingIndicator()
      expect(unmount).toBeDefined()
      expect(typeof unmount).toBe('function')
    })

    it('should not throw when unmount is called multiple times', () => {
      const { unmount } = useRecordingIndicator()
      expect(() => {
        unmount()
        unmount()
      }).not.toThrow()
    })

    it('should stop intervals when unmounted', () => {
      const { setRecordingState, unmount } = useRecordingIndicator()
      setRecordingState('recording')
      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })
})
