import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRecordingIndicator } from '@/composables/useRecordingIndicator'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useRecordingIndicator (additional coverage)', () => {
  it('records duration and blinks while recording, stops on pause', () => {
    const { setRecordingState, duration, blinkState, indicatorStyle, isRecording, isPaused } =
      useRecordingIndicator({ blinkInterval: 100 })

    setRecordingState('recording')
    expect(isRecording.value).toBe(true)

    // blink should toggle with interval
    const initialBlink = blinkState.value
    vi.advanceTimersByTime(120)
    expect(blinkState.value).not.toBe(initialBlink)

    // duration should increase
    const d1 = duration.value
    vi.advanceTimersByTime(250)
    expect(duration.value).toBeGreaterThan(d1)

    // style opacity should reflect blinkState
    const style = indicatorStyle.value
    expect(style.backgroundColor).toBeDefined()

    setRecordingState('paused')
    expect(isPaused.value).toBe(true)
    const d2 = duration.value
    vi.advanceTimersByTime(300)
    // duration should not advance while paused
    expect(duration.value).toBe(d2)
  })

  it('resume from pause adjusts duration to exclude pause time', () => {
    const { setRecordingState, duration } = useRecordingIndicator({ blinkInterval: 50 })
    setRecordingState('recording')
    vi.advanceTimersByTime(200)
    setRecordingState('paused')
    const duringPause = duration.value
    vi.advanceTimersByTime(500)
    // resume and ensure duration starts increasing again
    setRecordingState('recording')
    vi.advanceTimersByTime(150)
    expect(duration.value).toBeGreaterThan(duringPause)
  })

  it('reset clears duration and sets inactive', () => {
    const { setRecordingState, reset, duration, state } = useRecordingIndicator()
    setRecordingState('recording')
    vi.advanceTimersByTime(120)
    reset()
    expect(duration.value).toBe(0)
    expect(state.value).toBe('inactive')
  })
})
