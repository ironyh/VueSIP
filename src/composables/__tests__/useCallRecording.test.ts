import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCallRecording } from '../useCallRecording'

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
  ) {}
  start = vi.fn((_timeslice?: number) => {
    // Simulate initial data
    const blob = new Blob(['hello'], { type: this.options.mimeType })
    this.ondataavailable?.({ data: blob } as unknown as BlobEvent)
  })
  pause = vi.fn(() => this.onpause?.())
  resume = vi.fn(() => this.onresume?.())
  stop = vi.fn(() => this.onstop?.())
}

const realMR = (global as any).MediaRecorder

beforeEach(() => {
  vi.useFakeTimers()
  ;(global as any).MediaRecorder = FakeMediaRecorder
})

afterEach(() => {
  vi.useRealTimers()
  ;(global as any).MediaRecorder = realMR
})

function mockStream(): MediaStream {
  return { getTracks: () => [] } as unknown as MediaStream
}

describe('useCallRecording', () => {
  describe('initial state', () => {
    it('should have inactive recording state initially', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { recordingState } = useCallRecording(streamRef)
      expect(recordingState.value).toBe('inactive')
    })

    it('should have empty metadata initially', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { metadata } = useCallRecording(streamRef)
      expect(metadata.value.startTime).toBeNull()
      expect(metadata.value.durationSeconds).toBe(0)
      expect(metadata.value.fileSize).toBeNull()
    })

    it('should not be recording initially', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { isRecording, isPaused, hasRecording } = useCallRecording(streamRef)
      expect(isRecording.value).toBe(false)
      expect(isPaused.value).toBe(false)
      expect(hasRecording.value).toBe(false)
    })
  })

  describe('startRecording', () => {
    it('should fail when no stream is available', () => {
      const streamRef = ref<MediaStream | null>(null)
      const { startRecording, error } = useCallRecording(streamRef)

      const result = startRecording()

      expect(result).toBe(false)
      expect(error.value).toBe('No media stream available')
    })

    it('should start recording when stream is available', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { startRecording, isRecording, metadata } = useCallRecording(streamRef)

      const result = startRecording()

      expect(result).toBe(true)
      expect(isRecording.value).toBe(true)
      expect(metadata.value.startTime).not.toBeNull()
    })
  })

  describe('pauseRecording', () => {
    it('should fail when not recording', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { pauseRecording, isRecording } = useCallRecording(streamRef)

      const result = pauseRecording()

      expect(result).toBe(false)
      expect(isRecording.value).toBe(false)
    })

    it('should pause when recording is active', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { startRecording, pauseRecording, isPaused } = useCallRecording(streamRef)

      startRecording()
      const result = pauseRecording()

      expect(result).toBe(true)
      expect(isPaused.value).toBe(true)
    })
  })

  describe('resumeRecording', () => {
    it('should fail when not paused', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { resumeRecording, isPaused } = useCallRecording(streamRef)

      const result = resumeRecording()

      expect(result).toBe(false)
      expect(isPaused.value).toBe(false)
    })

    it('should resume when recording is paused', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { startRecording, pauseRecording, resumeRecording, isRecording } =
        useCallRecording(streamRef)

      startRecording()
      pauseRecording()
      const result = resumeRecording()

      expect(result).toBe(true)
      expect(isRecording.value).toBe(true)
    })
  })

  describe('stopRecording', () => {
    it('should fail when not recording or paused', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { stopRecording, recordingState } = useCallRecording(streamRef)

      const result = stopRecording()

      expect(result).toBe(false)
      expect(recordingState.value).toBe('inactive')
    })

    it('should stop when recording is active', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { startRecording, stopRecording, recordingState } = useCallRecording(streamRef)

      startRecording()
      const result = stopRecording()

      expect(result).toBe(true)
      expect(recordingState.value).toBe('stopped')
    })
  })

  describe('formattedDuration', () => {
    it('should format duration as mm:ss', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { startRecording, formattedDuration } = useCallRecording(streamRef)

      startRecording()
      // Fast-forward timer by 65 seconds
      vi.advanceTimersByTime(65000)

      expect(formattedDuration.value).toBe('01:05')
    })

    it('should pad single digits', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { startRecording, formattedDuration } = useCallRecording(streamRef)

      startRecording()
      vi.advanceTimersByTime(5000)

      expect(formattedDuration.value).toBe('00:05')
    })
  })

  describe('clearRecording', () => {
    it('should reset all recording state', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const {
        startRecording,
        stopRecording,
        clearRecording,
        recordingState,
        metadata,
        recordedBlob,
      } = useCallRecording(streamRef)

      startRecording()
      stopRecording()
      clearRecording()

      expect(recordingState.value).toBe('inactive')
      expect(metadata.value.startTime).toBeNull()
      expect(metadata.value.durationSeconds).toBe(0)
      expect(recordedBlob.value).toBeNull()
    })
  })

  describe('isSupported', () => {
    it('should return true when MediaRecorder is supported', () => {
      const streamRef = ref<MediaStream | null>(mockStream())
      const { isSupported } = useCallRecording(streamRef)

      expect(isSupported.value).toBe(true)
    })
  })
})
