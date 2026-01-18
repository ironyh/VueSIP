import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLocalRecording } from '@/composables/useLocalRecording'
import { RecordingState } from '@/types/media.types'

class FakeMediaRecorder {
  static isTypeSupported = vi.fn((type?: string) => !!type && type.includes('/'))
  ondataavailable: ((e: BlobEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  onpause: (() => void) | null = null
  onresume: (() => void) | null = null
  onstop: (() => void) | null = null
  constructor(
    public stream: MediaStream,
    public options: MediaRecorderOptions
  ) {
    ;(global as any).__lastRecorder = this
  }
  start = vi.fn((_timeslice?: number) => {
    // emit an initial chunk to simulate data availability
    const blob = new Blob(['hello'], { type: this.options.mimeType })
    this.ondataavailable?.({ data: blob } as unknown as BlobEvent)
  })
  pause = vi.fn(() => this.onpause?.())
  resume = vi.fn(() => this.onresume?.())
  stop = vi.fn(() => this.onstop?.())
}

const realMR = (global as any).MediaRecorder
const realCreateObjectURL = global.URL.createObjectURL

beforeEach(() => {
  vi.useFakeTimers()
  ;(global as any).MediaRecorder = FakeMediaRecorder
  global.URL.createObjectURL = vi.fn(() => 'blob://url') as any
})

afterEach(() => {
  vi.useRealTimers()
  ;(global as any).MediaRecorder = realMR
  global.URL.createObjectURL = realCreateObjectURL
})

function mockStream(): MediaStream {
  // minimal mock
  return { getTracks: () => [] } as unknown as MediaStream
}

describe('useLocalRecording (additional coverage)', () => {
  it('isSupported returns false when MediaRecorder missing, true when supported', () => {
    ;(global as any).MediaRecorder = undefined
    const { isSupported } = useLocalRecording()
    expect(isSupported('audio/webm')).toBe(false)
    ;(global as any).MediaRecorder = FakeMediaRecorder
    const { isSupported: supported } = useLocalRecording()
    expect(supported('audio/webm')).toBe(true)
  })

  it('start → pause → resume → stop produces recording data and updates state', async () => {
    const { start, pause, resume, stop, state, isRecording, isPaused, duration, recordingData } =
      useLocalRecording({ mimeType: 'audio/webm' })
    start(mockStream())
    expect(state.value).toBe(RecordingState.Recording)
    expect(isRecording.value).toBe(true)

    // advance a bit to accumulate duration
    vi.advanceTimersByTime(250)
    expect(duration.value).toBeGreaterThan(0)

    pause()
    expect(isPaused.value).toBe(true)

    resume()
    expect(isRecording.value).toBe(true)

    const data = await stop()
    expect(state.value).toBe(RecordingState.Stopped)
    expect(data?.blob).toBeInstanceOf(Blob)
    expect(recordingData.value?.mimeType).toBe('audio/webm')
  })

  it('prevents double start and stores error', () => {
    const { start, state, error } = useLocalRecording()
    start(mockStream())
    start(mockStream())
    expect(state.value).toBe(RecordingState.Recording)
    expect(String(error.value)).toMatch(/already in progress/i)
  })

  it('handles recorder error events and transitions to Error state', () => {
    const { start, state, error } = useLocalRecording()
    start(mockStream())
    const inst = (global as any).__lastRecorder as FakeMediaRecorder
    inst.onerror?.({ error: new DOMException('boom') } as any)
    expect(state.value).toBe(RecordingState.Error)
    expect(String(error.value)).toMatch(/boom|Recording error/)
  })

  it('download triggers anchor click when called explicitly', async () => {
    const clickSpy = vi.fn()
    const realCreate = document.createElement
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = realCreate.call(document, tag)
      if (tag === 'a') {
        ;(el as any).click = clickSpy
      }
      return el
    }) as any)

    const { start, stop, download } = useLocalRecording({
      mimeType: 'audio/webm',
      autoDownload: false,
    })
    start(mockStream())
    await stop()
    download()
    expect(clickSpy).toHaveBeenCalled()
    ;(document.createElement as any).mockRestore?.()
  })
})
