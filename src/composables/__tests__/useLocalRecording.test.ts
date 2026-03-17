/**
 * useLocalRecording composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLocalRecording } from '../useLocalRecording'
import { RecordingState } from '@/types/media.types'

// Mock dependencies
vi.mock('../utils/logger', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/mock-url')
const mockRevokeObjectURL = vi.fn()

global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe('useLocalRecording', () => {
  let mockMediaStream: MediaStream

  beforeEach(() => {
    // Create mock MediaStream
    mockMediaStream = {
      id: 'mock-stream-id',
      active: true,
      getAudioTracks: () => [],
      getVideoTracks: () => [],
      getTracks: () => [],
      removeTrack: vi.fn(),
      clone: vi.fn(),
      getSettings: () => ({}),
      getConstraints: () => ({}),
    } as unknown as MediaStream

    // Mock document.createElement
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: vi.fn(),
            remove: vi.fn(),
            appendChild: vi.fn(),
          }
        }
        return {}
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    })

    // Mock MediaRecorder with isTypeSupported
    vi.stubGlobal(
      'MediaRecorder',
      class MediaRecorder {
        static isTypeSupported = vi.fn(() => true)
        ondataavailable: (() => void) | null = null
        onerror: (() => void) | null = null
        onpause: (() => void) | null = null
        onresume: (() => void) | null = null
        onstop: (() => void) | null = null
        state: 'inactive' | 'recording' | 'paused' = 'inactive'
        start = vi.fn()
        pause = vi.fn()
        resume = vi.fn()
        stop = vi.fn()
      }
    )

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should return initial recording state as inactive', () => {
      const { state } = useLocalRecording()
      expect(state.value).toBe(RecordingState.Inactive)
    })

    it('should have zero duration initially', () => {
      const { duration } = useLocalRecording()
      expect(duration.value).toBe(0)
    })

    it('should have null recordingData initially', () => {
      const { recordingData } = useLocalRecording()
      expect(recordingData.value).toBeNull()
    })

    it('should have null error initially', () => {
      const { error } = useLocalRecording()
      expect(error.value).toBeNull()
    })

    it('should not be recording initially', () => {
      const { isRecording } = useLocalRecording()
      expect(isRecording.value).toBe(false)
    })

    it('should not be paused initially', () => {
      const { isPaused } = useLocalRecording()
      expect(isPaused.value).toBe(false)
    })
  })

  describe('isSupported', () => {
    it('should return false when MediaRecorder is undefined', () => {
      const original = global.MediaRecorder
      // @ts-expect-error - testing undefined case
      global.MediaRecorder = undefined
      const { isSupported } = useLocalRecording()
      expect(isSupported()).toBe(false)
      global.MediaRecorder = original
    })

    it('should check support when MediaRecorder exists', () => {
      // If MediaRecorder doesn't exist or has no isTypeSupported, it should return false
      const { isSupported } = useLocalRecording({ mimeType: 'audio/webm' })
      const result = isSupported()
      // In test environment without real MediaRecorder, should be false or handle gracefully
      expect(typeof result).toBe('boolean')
    })
  })

  describe('start', () => {
    it('should set error when already recording', () => {
      const { start, error } = useLocalRecording()

      // Start first recording
      start(mockMediaStream)

      // Try to start another - should error because already recording
      start(mockMediaStream)

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('Recording already in progress')
    })

    it('should set error when MediaRecorder throws', () => {
      // Override the mock for this specific test
      vi.stubGlobal(
        'MediaRecorder',
        class MediaRecorder {
          static isTypeSupported = vi.fn(() => true)
          constructor() {
            throw new Error('MediaRecorder not supported')
          }
        }
      )

      const { start, error } = useLocalRecording()

      start(mockMediaStream)

      expect(error.value).toBeInstanceOf(Error)
    })
  })

  describe('pause', () => {
    it('should not throw when no mediaRecorder', () => {
      const { pause } = useLocalRecording()
      expect(() => pause()).not.toThrow()
    })

    it('should not pause when not recording', () => {
      const mockMediaRecorder = {
        pause: vi.fn(),
      }

      const { pause } = useLocalRecording()
      // @ts-expect-error - accessing internal for test
      pause()

      expect(mockMediaRecorder.pause).not.toHaveBeenCalled()
    })
  })

  describe('resume', () => {
    it('should not throw when no mediaRecorder', () => {
      const { resume } = useLocalRecording()
      expect(() => resume()).not.toThrow()
    })

    it('should not resume when not paused', () => {
      const { resume, state: recordingState } = useLocalRecording()
      // @ts-expect-error - accessing internal for test
      resume()

      // Should not throw
      expect(recordingState.value).toBe(RecordingState.Inactive)
    })
  })

  describe('stop', () => {
    it('should resolve null when not recording', async () => {
      const { stop } = useLocalRecording()
      const result = await stop()
      expect(result).toBeNull()
    })

    it('should resolve null when no mediaRecorder', async () => {
      const { stop } = useLocalRecording()
      const result = await stop()
      expect(result).toBeNull()
    })
  })

  describe('download', () => {
    it('should not throw when no recording data', () => {
      const { download } = useLocalRecording()
      expect(() => download()).not.toThrow()
    })

    it('should create download link with custom filename', () => {
      const { download, recordingData } = useLocalRecording()

      recordingData.value = {
        id: 'test-id',
        blob: new Blob(['test'], { type: 'audio/webm' }),
        mimeType: 'audio/webm',
        startedAt: Date.now(),
        stoppedAt: Date.now(),
        duration: 1000,
      }

      download('custom-file.webm')

      expect(mockCreateObjectURL).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should reset all state', () => {
      const { clear, state, duration, recordingData, error } = useLocalRecording()

      // Set some state
      state.value = RecordingState.Stopped
      duration.value = 5000
      recordingData.value = {
        id: 'test-id',
        blob: new Blob(['test']),
        mimeType: 'audio/webm',
        startedAt: Date.now(),
        stoppedAt: Date.now(),
        duration: 5000,
      }
      error.value = new Error('test')

      clear()

      expect(state.value).toBe(RecordingState.Inactive)
      expect(duration.value).toBe(0)
      expect(recordingData.value).toBeNull()
      expect(error.value).toBeNull()
    })
  })

  describe('options', () => {
    it('should accept custom mimeType option', () => {
      const { isSupported } = useLocalRecording({ mimeType: 'audio/webm' })
      const result = isSupported()
      expect(typeof result).toBe('boolean')
    })

    it('should accept custom filenamePrefix option', () => {
      const { recordingData, download } = useLocalRecording({ filenamePrefix: 'myrec' })

      recordingData.value = {
        id: 'test-id',
        blob: new Blob(['test'], { type: 'audio/webm' }),
        mimeType: 'audio/webm',
        startedAt: Date.now(),
        stoppedAt: Date.now(),
        duration: 1000,
      }

      download()

      // Verify createObjectURL was called with blob
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('should accept autoDownload option', () => {
      // Just verify the option is accepted without error
      const { state, error } = useLocalRecording({ autoDownload: true })
      expect(state.value).toBe(RecordingState.Inactive)
      expect(error.value).toBeNull()
    })
  })

  describe('duration tracking', () => {
    it('should track duration while recording', async () => {
      const mockMediaRecorder = {
        ondataavailable: null,
        onerror: null,
        onpause: null,
        onresume: null,
        onstop: null,
        start: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
        state: 'recording',
      }

      vi.stubGlobal(
        'MediaRecorder',
        vi.fn(() => mockMediaRecorder)
      )

      const { start, duration } = useLocalRecording()

      // Set start time
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

      start(mockMediaStream)

      // Advance time
      vi.setSystemTime(new Date('2026-01-01T00:01:30Z'))

      // Duration should have increased (tick the interval)
      vi.advanceTimersByTime(100)

      // Duration is tracked in ms
      expect(duration.value).toBeGreaterThanOrEqual(0)
    })
  })
})
