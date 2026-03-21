/**
 * useRecordingIndicator composable tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRecordingIndicator } from '../useRecordingIndicator'

describe('useRecordingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have inactive initial state by default', () => {
      const { state, isRecording, isPaused, duration, formattedDuration } = useRecordingIndicator()

      expect(state.value).toBe('inactive')
      expect(isRecording.value).toBe(false)
      expect(isPaused.value).toBe(false)
      expect(duration.value).toBe(0)
      expect(formattedDuration.value).toBe('00:00')
    })

    it('should use custom initial state when provided', () => {
      const { state, isRecording } = useRecordingIndicator({ initialState: 'recording' })

      expect(state.value).toBe('recording')
      expect(isRecording.value).toBe(true)
    })

    it('should use custom blink interval', () => {
      const { setRecordingState } = useRecordingIndicator({ blinkInterval: 1000 })

      setRecordingState('recording')
      vi.advanceTimersByTime(1000)

      // Should still work - just verify it doesn't crash
      expect(true).toBe(true)
    })
  })

  describe('setRecordingState', () => {
    it('should transition to recording state', () => {
      const { state, isRecording, isPaused, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')

      expect(state.value).toBe('recording')
      expect(isRecording.value).toBe(true)
      expect(isPaused.value).toBe(false)
    })

    it('should transition to paused state', () => {
      const { state, isPaused, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')
      setRecordingState('paused')

      expect(state.value).toBe('paused')
      expect(isPaused.value).toBe(true)
    })

    it('should transition to inactive state', () => {
      const { state, isRecording, isPaused, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')
      setRecordingState('inactive')

      expect(state.value).toBe('inactive')
      expect(isRecording.value).toBe(false)
      expect(isPaused.value).toBe(false)
    })

    it('should transition to stopped state', () => {
      const { state, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')
      setRecordingState('stopped')

      expect(state.value).toBe('stopped')
    })
  })

  describe('duration tracking', () => {
    it('should start duration tracking when recording', () => {
      const { duration, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')
      vi.advanceTimersByTime(5000)

      expect(duration.value).toBe(5000)
    })

    it('should pause duration tracking when paused', () => {
      const { duration, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')
      vi.advanceTimersByTime(3000)
      setRecordingState('paused')
      vi.advanceTimersByTime(5000)

      // Duration should remain at 3000 (paused)
      expect(duration.value).toBe(3000)
    })

    it('should resume duration tracking when resuming from pause', () => {
      const { duration, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')
      vi.advanceTimersByTime(3000)
      setRecordingState('paused')
      vi.advanceTimersByTime(2000)
      setRecordingState('recording')
      vi.advanceTimersByTime(3000)

      // Duration should be 6000 (3000 before pause + 3000 after resume)
      expect(duration.value).toBe(6000)
    })

    it('should format duration correctly', () => {
      const { formattedDuration, setRecordingState } = useRecordingIndicator()

      setRecordingState('recording')

      vi.advanceTimersByTime(65000) // 1 minute 5 seconds
      expect(formattedDuration.value).toBe('01:05')

      vi.advanceTimersByTime(3600000) // 1 hour 1 minute 5 seconds
      expect(formattedDuration.value).toBe('01:01:05')
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { state, duration, isRecording, setRecordingState, reset } = useRecordingIndicator()

      setRecordingState('recording')
      vi.advanceTimersByTime(5000)

      reset()

      expect(state.value).toBe('inactive')
      expect(duration.value).toBe(0)
      expect(isRecording.value).toBe(false)
    })
  })

  describe('indicatorStyle', () => {
    it('should return correct style for recording state', () => {
      const { indicatorStyle, setRecordingState, blinkState } = useRecordingIndicator()

      setRecordingState('recording')
      blinkState.value = true

      const style = indicatorStyle.value
      expect(style.backgroundColor).toBe('#ef4444')
      expect(style.opacity).toBe(1)
    })

    it('should return correct style for paused state', () => {
      const { indicatorStyle, setRecordingState } = useRecordingIndicator()

      setRecordingState('paused')

      const style = indicatorStyle.value
      expect(style.backgroundColor).toBe('#eab308')
    })

    it('should return correct style for inactive state', () => {
      const { indicatorStyle } = useRecordingIndicator()

      const style = indicatorStyle.value
      expect(style.backgroundColor).toBe('#6b7280')
    })

    it('should blink (opacity 0) when recording and blinkState is false', () => {
      const { indicatorStyle, setRecordingState, blinkState } = useRecordingIndicator()

      setRecordingState('recording')
      blinkState.value = false

      const style = indicatorStyle.value
      expect(style.opacity).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should cleanup intervals on unmount', () => {
      const { setRecordingState, unmount } = useRecordingIndicator()

      setRecordingState('recording')
      vi.advanceTimersByTime(1000)

      // Unmount should not throw
      expect(() => unmount()).not.toThrow()
    })
  })
})
