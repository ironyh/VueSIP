import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLocalRecording } from '../../../src/composables/useLocalRecording'
import { RecordingState } from '../../../src/types/media.types'
import { withSetup } from '../../utils/test-helpers'

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((event: { error: Error }) => void) | null = null
  onpause: (() => void) | null = null
  onresume: (() => void) | null = null
  mimeType: string

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions
  ) {
    this.mimeType = options?.mimeType || 'audio/webm'
  }

  start(_timeslice?: number) {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    // Simulate data available
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test'], { type: this.mimeType }) })
    }
    if (this.onstop) {
      this.onstop()
    }
  }

  pause() {
    this.state = 'paused'
    if (this.onpause) this.onpause()
  }

  resume() {
    this.state = 'recording'
    if (this.onresume) this.onresume()
  }

  static isTypeSupported(mimeType: string): boolean {
    return ['audio/webm', 'video/webm', 'audio/mp4'].includes(mimeType)
  }
}

// Setup global mock
vi.stubGlobal('MediaRecorder', MockMediaRecorder)

// Mock MediaStream
function createMockStream(): MediaStream {
  return {
    getTracks: () => [{ stop: vi.fn(), kind: 'audio' }],
    getAudioTracks: () => [{ stop: vi.fn() }],
    getVideoTracks: () => [],
    active: true,
  } as unknown as MediaStream
}

describe('useLocalRecording', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should return correct initial state', () => {
      const { result, unmount } = withSetup(() => useLocalRecording())

      expect(result.state.value).toBe(RecordingState.Inactive)
      expect(result.isRecording.value).toBe(false)
      expect(result.isPaused.value).toBe(false)
      expect(result.duration.value).toBe(0)
      expect(result.recordingData.value).toBeNull()
      expect(result.error.value).toBeNull()

      unmount()
    })

    it('should check MIME type support', () => {
      const { result, unmount } = withSetup(() => useLocalRecording())

      expect(result.isSupported('audio/webm')).toBe(true)
      expect(result.isSupported('audio/unsupported')).toBe(false)

      unmount()
    })
  })

  describe('recording lifecycle', () => {
    it('should start recording with given stream', async () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)

      expect(result.state.value).toBe(RecordingState.Recording)
      expect(result.isRecording.value).toBe(true)

      unmount()
    })

    it('should track duration while recording', async () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)

      // Advance time by 500ms
      vi.advanceTimersByTime(500)
      expect(result.duration.value).toBeGreaterThanOrEqual(400)

      unmount()
    })

    it('should stop recording and return data', async () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      vi.advanceTimersByTime(1000)

      const data = await result.stop()

      expect(data).not.toBeNull()
      expect(data?.blob).toBeInstanceOf(Blob)
      expect(data?.mimeType).toBe('audio/webm')
      expect(result.state.value).toBe(RecordingState.Stopped)
      expect(result.recordingData.value).toEqual(data)

      unmount()
    })

    it('should pause and resume recording', async () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      expect(result.state.value).toBe(RecordingState.Recording)

      result.pause()
      expect(result.state.value).toBe(RecordingState.Paused)
      expect(result.isPaused.value).toBe(true)

      result.resume()
      expect(result.state.value).toBe(RecordingState.Recording)
      expect(result.isRecording.value).toBe(true)

      unmount()
    })

    it('should not start if already recording', () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      result.start(stream) // Try to start again

      expect(result.error.value).not.toBeNull()
      expect(result.error.value?.message).toContain('already in progress')

      unmount()
    })

    it('should clear recording data', async () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      await result.stop()
      expect(result.recordingData.value).not.toBeNull()

      result.clear()

      expect(result.recordingData.value).toBeNull()
      expect(result.duration.value).toBe(0)
      expect(result.state.value).toBe(RecordingState.Inactive)

      unmount()
    })
  })

  describe('options', () => {
    it('should use custom MIME type', async () => {
      const { result, unmount } = withSetup(() =>
        useLocalRecording({ mimeType: 'video/webm' })
      )
      const stream = createMockStream()

      result.start(stream)
      const data = await result.stop()

      expect(data?.mimeType).toBe('video/webm')

      unmount()
    })

    it('should store metadata with recording', async () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()
      const metadata = { callId: '123', participant: 'John' }

      result.start(stream, metadata)
      const data = await result.stop()

      expect(data?.metadata).toEqual(metadata)

      unmount()
    })

    it('should auto-download when enabled', async () => {
      const mockCreateElement = vi.spyOn(document, 'createElement')
      const mockAppendChild = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => null as unknown as Node)
      const mockRemoveChild = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => null as unknown as Node)

      const { result, unmount } = withSetup(() =>
        useLocalRecording({ autoDownload: true, filenamePrefix: 'test' })
      )
      const stream = createMockStream()

      result.start(stream)
      await result.stop()

      expect(mockCreateElement).toHaveBeenCalledWith('a')

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()

      unmount()
    })
  })

  describe('download', () => {
    it('should download recording with custom filename', async () => {
      // Setup composable first before mocking createElement
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      await result.stop()

      // Now set up mocks for download operation
      const mockClick = vi.fn()
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as unknown as HTMLElement)
      const mockAppendChild = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => null as unknown as Node)
      const mockRemoveChild = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => null as unknown as Node)

      result.download('my-recording.webm')

      expect(mockClick).toHaveBeenCalled()

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()

      unmount()
    })

    it('should not download if no recording data', () => {
      const { result, unmount } = withSetup(() => useLocalRecording())

      // Spy after setup to avoid counting the div created by withSetup
      const mockCreateElement = vi.spyOn(document, 'createElement')

      result.download()

      // Should not have created an anchor element for download
      expect(mockCreateElement).not.toHaveBeenCalledWith('a')
      mockCreateElement.mockRestore()

      unmount()
    })
  })

  describe('persistence', () => {
    it('should have persist option available', () => {
      const { result, unmount } = withSetup(() => useLocalRecording({ persist: true }))

      // Verify the composable accepts persist option
      expect(result.state.value).toBe(RecordingState.Inactive)

      unmount()
    })

    it('should generate unique recording IDs', async () => {
      const { result, unmount } = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      const data1 = await result.stop()

      result.clear()
      result.start(stream)
      const data2 = await result.stop()

      expect(data1?.id).toBeDefined()
      expect(data2?.id).toBeDefined()
      expect(data1?.id).not.toBe(data2?.id)

      unmount()
    })
  })
})
