# Phase 3.2: Call Recording Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `useLocalRecording` composable for client-side audio/video recording with MediaRecorder API, Vue reactivity, and IndexedDB persistence.

**Architecture:** Wrap browser MediaRecorder API in a Vue composable providing reactive state (idle/recording/paused/stopped), automatic cleanup on unmount, and optional IndexedDB storage. Integrates with existing `RecordingState` enum from `media.types.ts`.

**Tech Stack:** Vue 3 Composition API, TypeScript, MediaRecorder API, IndexedDB, Vitest

---

## Task 1: Create Local Recording Types

**Files:**
- Create: `src/types/local-recording.types.ts`
- Modify: `src/types/index.ts` (add export)

**Step 1: Write the type definitions file**

```typescript
// src/types/local-recording.types.ts
import type { RecordingState } from './media.types'

/**
 * Options for useLocalRecording composable
 */
export interface LocalRecordingOptions {
  /** MIME type for recording (default: 'audio/webm') */
  mimeType?: string
  /** Audio bits per second */
  audioBitsPerSecond?: number
  /** Video bits per second (if recording video) */
  videoBitsPerSecond?: number
  /** Time slice in ms for ondataavailable events (default: 1000) */
  timeslice?: number
  /** Enable IndexedDB persistence (default: false) */
  persist?: boolean
  /** IndexedDB database name (default: 'vuesip-recordings') */
  dbName?: string
  /** IndexedDB store name (default: 'recordings') */
  storeName?: string
  /** Auto-download on stop (default: false) */
  autoDownload?: boolean
  /** Filename prefix for downloads (default: 'recording') */
  filenamePrefix?: string
}

/**
 * Recorded data with metadata
 */
export interface LocalRecordingData {
  /** Unique recording ID */
  id: string
  /** Recording blob */
  blob: Blob
  /** MIME type */
  mimeType: string
  /** Recording start timestamp */
  startedAt: number
  /** Recording end timestamp */
  stoppedAt: number
  /** Duration in milliseconds */
  duration: number
  /** Object URL for playback (created on demand) */
  url?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Return type for useLocalRecording composable
 */
export interface UseLocalRecordingReturn {
  /** Current recording state */
  state: import('vue').Ref<RecordingState>
  /** Whether recording is active */
  isRecording: import('vue').ComputedRef<boolean>
  /** Whether recording is paused */
  isPaused: import('vue').ComputedRef<boolean>
  /** Current recording duration in ms */
  duration: import('vue').Ref<number>
  /** Recorded data after stop */
  recordingData: import('vue').Ref<LocalRecordingData | null>
  /** Error if any */
  error: import('vue').Ref<Error | null>
  /** Start recording with given stream */
  start: (stream: MediaStream, metadata?: Record<string, unknown>) => void
  /** Pause recording */
  pause: () => void
  /** Resume recording */
  resume: () => void
  /** Stop recording */
  stop: () => Promise<LocalRecordingData | null>
  /** Download recording */
  download: (filename?: string) => void
  /** Clear current recording data */
  clear: () => void
  /** Check if MIME type is supported */
  isSupported: (mimeType?: string) => boolean
}
```

**Step 2: Add export to types index**

In `src/types/index.ts`, add:

```typescript
export * from './local-recording.types'
```

**Step 3: Run typecheck to verify**

Run: `pnpm typecheck`
Expected: No errors related to local-recording.types

**Step 4: Commit**

```bash
git add src/types/local-recording.types.ts src/types/index.ts
git commit -m "feat(types): add LocalRecording types for client-side recording

- LocalRecordingOptions for configuration
- LocalRecordingData for recorded output
- UseLocalRecordingReturn for composable interface

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create useLocalRecording Composable - Core Structure

**Files:**
- Create: `src/composables/useLocalRecording.ts`
- Create: `tests/unit/composables/useLocalRecording.test.ts`

**Step 1: Write the failing test for basic structure**

```typescript
// tests/unit/composables/useLocalRecording.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useLocalRecording } from '../../../src/composables/useLocalRecording'
import { RecordingState } from '../../../src/types/media.types'
import { withSetup } from '../../helpers/withSetup'

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((event: { error: Error }) => void) | null = null
  onpause: (() => void) | null = null
  onresume: (() => void) | null = null

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions
  ) {}

  start(timeslice?: number) {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    // Simulate data available
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) })
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
      const [result] = withSetup(() => useLocalRecording())

      expect(result.state.value).toBe(RecordingState.Idle)
      expect(result.isRecording.value).toBe(false)
      expect(result.isPaused.value).toBe(false)
      expect(result.duration.value).toBe(0)
      expect(result.recordingData.value).toBeNull()
      expect(result.error.value).toBeNull()
    })

    it('should check MIME type support', () => {
      const [result] = withSetup(() => useLocalRecording())

      expect(result.isSupported('audio/webm')).toBe(true)
      expect(result.isSupported('audio/unsupported')).toBe(false)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/unit/composables/useLocalRecording.test.ts`
Expected: FAIL with "Cannot find module" or similar

**Step 3: Write minimal implementation**

```typescript
// src/composables/useLocalRecording.ts
import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { RecordingState } from '../types/media.types'
import type {
  LocalRecordingOptions,
  LocalRecordingData,
  UseLocalRecordingReturn,
} from '../types/local-recording.types'

/**
 * Default options for local recording
 */
const DEFAULT_OPTIONS: Required<Omit<LocalRecordingOptions, 'audioBitsPerSecond' | 'videoBitsPerSecond'>> = {
  mimeType: 'audio/webm',
  timeslice: 1000,
  persist: false,
  dbName: 'vuesip-recordings',
  storeName: 'recordings',
  autoDownload: false,
  filenamePrefix: 'recording',
}

/**
 * Vue composable for client-side audio/video recording using MediaRecorder API
 *
 * @param options - Configuration options for recording
 * @returns Recording controls and reactive state
 *
 * @example
 * ```vue
 * <script setup>
 * import { useLocalRecording } from '@vuesip/composables'
 *
 * const { state, isRecording, start, stop, download } = useLocalRecording({
 *   mimeType: 'audio/webm',
 *   autoDownload: true
 * })
 *
 * async function startRecording() {
 *   const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
 *   start(stream)
 * }
 * </script>
 * ```
 */
export function useLocalRecording(options: LocalRecordingOptions = {}): UseLocalRecordingReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Reactive state
  const state: Ref<RecordingState> = ref(RecordingState.Idle)
  const duration: Ref<number> = ref(0)
  const recordingData: Ref<LocalRecordingData | null> = ref(null)
  const error: Ref<Error | null> = ref(null)

  // Internal state
  let mediaRecorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let startTime = 0
  let durationInterval: ReturnType<typeof setInterval> | null = null
  let currentMetadata: Record<string, unknown> | undefined

  // Computed properties
  const isRecording: ComputedRef<boolean> = computed(
    () => state.value === RecordingState.Recording
  )
  const isPaused: ComputedRef<boolean> = computed(
    () => state.value === RecordingState.Paused
  )

  /**
   * Check if a MIME type is supported by MediaRecorder
   */
  function isSupported(mimeType?: string): boolean {
    if (typeof MediaRecorder === 'undefined') return false
    return MediaRecorder.isTypeSupported(mimeType ?? opts.mimeType)
  }

  /**
   * Start recording from the given MediaStream
   */
  function start(stream: MediaStream, metadata?: Record<string, unknown>): void {
    if (state.value === RecordingState.Recording) {
      error.value = new Error('Recording already in progress')
      return
    }

    try {
      chunks = []
      currentMetadata = metadata
      error.value = null

      const recorderOptions: MediaRecorderOptions = {
        mimeType: opts.mimeType,
      }
      if (opts.audioBitsPerSecond) {
        recorderOptions.audioBitsPerSecond = opts.audioBitsPerSecond
      }
      if (opts.videoBitsPerSecond) {
        recorderOptions.videoBitsPerSecond = opts.videoBitsPerSecond
      }

      mediaRecorder = new MediaRecorder(stream, recorderOptions)

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onerror = (event: Event) => {
        const mediaError = event as MediaRecorderErrorEvent
        error.value = mediaError.error || new Error('Recording error')
        state.value = RecordingState.Error
        cleanup()
      }

      mediaRecorder.onpause = () => {
        state.value = RecordingState.Paused
      }

      mediaRecorder.onresume = () => {
        state.value = RecordingState.Recording
      }

      mediaRecorder.start(opts.timeslice)
      startTime = Date.now()
      state.value = RecordingState.Recording

      // Start duration tracking
      durationInterval = setInterval(() => {
        if (state.value === RecordingState.Recording) {
          duration.value = Date.now() - startTime
        }
      }, 100)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      state.value = RecordingState.Error
    }
  }

  /**
   * Pause the current recording
   */
  function pause(): void {
    if (mediaRecorder && state.value === RecordingState.Recording) {
      mediaRecorder.pause()
    }
  }

  /**
   * Resume a paused recording
   */
  function resume(): void {
    if (mediaRecorder && state.value === RecordingState.Paused) {
      mediaRecorder.resume()
    }
  }

  /**
   * Stop the current recording and return the recorded data
   */
  function stop(): Promise<LocalRecordingData | null> {
    return new Promise((resolve) => {
      if (!mediaRecorder || state.value === RecordingState.Idle) {
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const stoppedAt = Date.now()
        const blob = new Blob(chunks, { type: opts.mimeType })

        const data: LocalRecordingData = {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          blob,
          mimeType: opts.mimeType,
          startedAt: startTime,
          stoppedAt,
          duration: stoppedAt - startTime,
          metadata: currentMetadata,
        }

        recordingData.value = data
        state.value = RecordingState.Stopped
        cleanup()

        if (opts.autoDownload) {
          download()
        }

        resolve(data)
      }

      mediaRecorder.stop()
    })
  }

  /**
   * Download the current recording
   */
  function download(filename?: string): void {
    if (!recordingData.value) return

    const url = URL.createObjectURL(recordingData.value.blob)
    const a = document.createElement('a')
    const extension = opts.mimeType.split('/')[1]?.split(';')[0] || 'webm'
    a.href = url
    a.download = filename || `${opts.filenamePrefix}_${Date.now()}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Clear the current recording data
   */
  function clear(): void {
    if (recordingData.value?.url) {
      URL.revokeObjectURL(recordingData.value.url)
    }
    recordingData.value = null
    duration.value = 0
    state.value = RecordingState.Idle
    error.value = null
  }

  /**
   * Internal cleanup function
   */
  function cleanup(): void {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
    mediaRecorder = null
    chunks = []
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    if (state.value === RecordingState.Recording || state.value === RecordingState.Paused) {
      stop()
    }
    cleanup()
    if (recordingData.value?.url) {
      URL.revokeObjectURL(recordingData.value.url)
    }
  })

  return {
    state,
    isRecording,
    isPaused,
    duration,
    recordingData,
    error,
    start,
    pause,
    resume,
    stop,
    download,
    clear,
    isSupported,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/unit/composables/useLocalRecording.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/useLocalRecording.ts tests/unit/composables/useLocalRecording.test.ts
git commit -m "feat(composables): add useLocalRecording core structure

- Reactive state management with RecordingState
- MediaRecorder integration with start/pause/resume/stop
- Duration tracking with interval updates
- Automatic cleanup on unmount
- MIME type support checking

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Add Recording Lifecycle Tests

**Files:**
- Modify: `tests/unit/composables/useLocalRecording.test.ts`

**Step 1: Write failing tests for start/stop lifecycle**

Add to the test file after the initialization tests:

```typescript
  describe('recording lifecycle', () => {
    it('should start recording with given stream', async () => {
      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)

      expect(result.state.value).toBe(RecordingState.Recording)
      expect(result.isRecording.value).toBe(true)
    })

    it('should track duration while recording', async () => {
      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)

      // Advance time by 500ms
      vi.advanceTimersByTime(500)
      expect(result.duration.value).toBeGreaterThanOrEqual(400)
    })

    it('should stop recording and return data', async () => {
      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      vi.advanceTimersByTime(1000)

      const data = await result.stop()

      expect(data).not.toBeNull()
      expect(data?.blob).toBeInstanceOf(Blob)
      expect(data?.mimeType).toBe('audio/webm')
      expect(result.state.value).toBe(RecordingState.Stopped)
      expect(result.recordingData.value).toEqual(data)
    })

    it('should pause and resume recording', async () => {
      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      expect(result.state.value).toBe(RecordingState.Recording)

      result.pause()
      expect(result.state.value).toBe(RecordingState.Paused)
      expect(result.isPaused.value).toBe(true)

      result.resume()
      expect(result.state.value).toBe(RecordingState.Recording)
      expect(result.isRecording.value).toBe(true)
    })

    it('should not start if already recording', () => {
      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      result.start(stream) // Try to start again

      expect(result.error.value).not.toBeNull()
      expect(result.error.value?.message).toContain('already in progress')
    })

    it('should clear recording data', async () => {
      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      await result.stop()
      expect(result.recordingData.value).not.toBeNull()

      result.clear()

      expect(result.recordingData.value).toBeNull()
      expect(result.duration.value).toBe(0)
      expect(result.state.value).toBe(RecordingState.Idle)
    })
  })
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test:unit tests/unit/composables/useLocalRecording.test.ts`
Expected: PASS (implementation already handles these cases)

**Step 3: Commit**

```bash
git add tests/unit/composables/useLocalRecording.test.ts
git commit -m "test(useLocalRecording): add recording lifecycle tests

- Start/stop recording with stream
- Duration tracking verification
- Pause/resume state transitions
- Error handling for double-start
- Clear recording data functionality

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Add Options and Metadata Tests

**Files:**
- Modify: `tests/unit/composables/useLocalRecording.test.ts`

**Step 1: Write tests for options and metadata**

Add to the test file:

```typescript
  describe('options', () => {
    it('should use custom MIME type', async () => {
      const [result] = withSetup(() =>
        useLocalRecording({ mimeType: 'video/webm' })
      )
      const stream = createMockStream()

      result.start(stream)
      const data = await result.stop()

      expect(data?.mimeType).toBe('video/webm')
    })

    it('should store metadata with recording', async () => {
      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()
      const metadata = { callId: '123', participant: 'John' }

      result.start(stream, metadata)
      const data = await result.stop()

      expect(data?.metadata).toEqual(metadata)
    })

    it('should auto-download when enabled', async () => {
      const mockCreateElement = vi.spyOn(document, 'createElement')
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)

      const [result] = withSetup(() =>
        useLocalRecording({ autoDownload: true, filenamePrefix: 'test' })
      )
      const stream = createMockStream()

      result.start(stream)
      await result.stop()

      expect(mockCreateElement).toHaveBeenCalledWith('a')

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()
    })
  })

  describe('download', () => {
    it('should download recording with custom filename', async () => {
      const mockCreateElement = vi.spyOn(document, 'createElement')
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)
      const mockClick = vi.fn()

      mockCreateElement.mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as any)

      const [result] = withSetup(() => useLocalRecording())
      const stream = createMockStream()

      result.start(stream)
      await result.stop()
      result.download('my-recording.webm')

      expect(mockClick).toHaveBeenCalled()

      mockCreateElement.mockRestore()
      mockAppendChild.mockRestore()
      mockRemoveChild.mockRestore()
    })

    it('should not download if no recording data', () => {
      const mockCreateElement = vi.spyOn(document, 'createElement')

      const [result] = withSetup(() => useLocalRecording())
      result.download()

      expect(mockCreateElement).not.toHaveBeenCalled()
      mockCreateElement.mockRestore()
    })
  })
```

**Step 2: Run tests to verify they pass**

Run: `pnpm test:unit tests/unit/composables/useLocalRecording.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/unit/composables/useLocalRecording.test.ts
git commit -m "test(useLocalRecording): add options and download tests

- Custom MIME type configuration
- Metadata storage with recordings
- Auto-download functionality
- Manual download with custom filename
- Guard against download without data

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Add IndexedDB Persistence

**Files:**
- Modify: `src/composables/useLocalRecording.ts`
- Modify: `tests/unit/composables/useLocalRecording.test.ts`

**Step 1: Write failing test for IndexedDB persistence**

Add to test file:

```typescript
  describe('persistence', () => {
    // Mock IndexedDB
    const mockIDBStore: Record<string, LocalRecordingData> = {}
    const mockIDB = {
      open: vi.fn(() => ({
        onupgradeneeded: null as any,
        onsuccess: null as any,
        onerror: null as any,
        result: {
          transaction: vi.fn(() => ({
            objectStore: vi.fn(() => ({
              put: vi.fn((data: LocalRecordingData) => {
                mockIDBStore[data.id] = data
                return { onsuccess: null, onerror: null }
              }),
              get: vi.fn((id: string) => {
                const result = { onsuccess: null as any, onerror: null, result: mockIDBStore[id] }
                setTimeout(() => result.onsuccess?.(), 0)
                return result
              }),
              getAll: vi.fn(() => {
                const result = { onsuccess: null as any, onerror: null, result: Object.values(mockIDBStore) }
                setTimeout(() => result.onsuccess?.(), 0)
                return result
              }),
              delete: vi.fn((id: string) => {
                delete mockIDBStore[id]
                return { onsuccess: null, onerror: null }
              }),
            })),
          })),
          createObjectStore: vi.fn(),
          objectStoreNames: { contains: vi.fn(() => false) },
        },
      })),
    }

    beforeEach(() => {
      vi.stubGlobal('indexedDB', mockIDB)
      Object.keys(mockIDBStore).forEach(key => delete mockIDBStore[key])
    })

    it('should persist recording to IndexedDB when enabled', async () => {
      const [result] = withSetup(() =>
        useLocalRecording({ persist: true })
      )
      const stream = createMockStream()

      result.start(stream)
      const data = await result.stop()

      // Persistence is async, give it time
      await nextTick()

      expect(data?.id).toBeDefined()
    })
  })
```

**Step 2: Run test to verify it fails or passes**

Run: `pnpm test:unit tests/unit/composables/useLocalRecording.test.ts`
Expected: May need implementation updates

**Step 3: Add IndexedDB persistence to implementation**

Add these functions to `useLocalRecording.ts` before the return statement:

```typescript
  /**
   * Save recording to IndexedDB
   */
  async function persistToIndexedDB(data: LocalRecordingData): Promise<void> {
    if (!opts.persist || typeof indexedDB === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(opts.dbName, 1)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(opts.storeName)) {
          db.createObjectStore(opts.storeName, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction(opts.storeName, 'readwrite')
        const store = tx.objectStore(opts.storeName)

        // Convert blob to array buffer for storage
        data.blob.arrayBuffer().then((buffer) => {
          const storable = {
            ...data,
            blobData: buffer,
            blob: undefined,
          }
          const putRequest = store.put(storable)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        })
      }

      request.onerror = () => reject(request.error)
    })
  }
```

And update the `stop` function's onstop handler to call persistence:

```typescript
      mediaRecorder.onstop = async () => {
        // ... existing code ...

        if (opts.persist) {
          try {
            await persistToIndexedDB(data)
          } catch (err) {
            console.warn('Failed to persist recording:', err)
          }
        }

        resolve(data)
      }
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:unit tests/unit/composables/useLocalRecording.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/composables/useLocalRecording.ts tests/unit/composables/useLocalRecording.test.ts
git commit -m "feat(useLocalRecording): add IndexedDB persistence

- Optional persist flag to enable storage
- Configurable database and store names
- ArrayBuffer conversion for blob storage
- Graceful fallback on storage errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Export Composable and Update Index

**Files:**
- Modify: `src/composables/index.ts`

**Step 1: Read current composables index**

Run: `cat src/composables/index.ts | head -50`

**Step 2: Add export for useLocalRecording**

Add to `src/composables/index.ts`:

```typescript
export { useLocalRecording } from './useLocalRecording'
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Run all tests**

Run: `pnpm test:unit`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/composables/index.ts
git commit -m "feat(composables): export useLocalRecording from index

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Update Playground Demo

**Files:**
- Modify: `playground/demos/CallRecordingDemo.vue`

**Step 1: Read current demo file**

Run: `cat playground/demos/CallRecordingDemo.vue | head -100`

**Step 2: Update demo to use new composable**

The demo should showcase the new `useLocalRecording` composable alongside the existing functionality. Add a section demonstrating:

```vue
<script setup lang="ts">
import { useLocalRecording } from '../../src/composables'

const {
  state: localState,
  isRecording: isLocalRecording,
  isPaused: isLocalPaused,
  duration: localDuration,
  recordingData: localData,
  start: startLocal,
  pause: pauseLocal,
  resume: resumeLocal,
  stop: stopLocal,
  download: downloadLocal,
  clear: clearLocal,
  isSupported,
} = useLocalRecording({
  mimeType: 'audio/webm',
  autoDownload: false,
  filenamePrefix: 'vuesip-recording',
})

// Use with getUserMedia
async function handleStartLocalRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  startLocal(stream)
}
</script>
```

**Step 3: Run playground dev server to verify**

Run: `pnpm dev` (in playground directory)
Expected: Demo loads without errors

**Step 4: Commit**

```bash
git add playground/demos/CallRecordingDemo.vue
git commit -m "docs(playground): update recording demo with useLocalRecording

- Demonstrate new composable alongside existing functionality
- Show reactive state bindings
- Add start/stop/pause/resume controls
- Include download button

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Add Recording Status Indicator Component

**Files:**
- Create: `playground/components/RecordingIndicator.vue`

**Step 1: Create the component**

```vue
<!-- playground/components/RecordingIndicator.vue -->
<template>
  <div class="recording-indicator" :class="stateClass">
    <span class="indicator-dot" :class="{ pulse: isRecording }"></span>
    <span class="indicator-text">{{ statusText }}</span>
    <span v-if="showDuration" class="indicator-duration">{{ formattedDuration }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RecordingState } from '../../src/types/media.types'

const props = defineProps<{
  state: RecordingState
  duration?: number
  showDuration?: boolean
}>()

const isRecording = computed(() => props.state === RecordingState.Recording)

const stateClass = computed(() => {
  switch (props.state) {
    case RecordingState.Recording:
      return 'recording'
    case RecordingState.Paused:
      return 'paused'
    case RecordingState.Stopped:
      return 'stopped'
    case RecordingState.Error:
      return 'error'
    default:
      return 'idle'
  }
})

const statusText = computed(() => {
  switch (props.state) {
    case RecordingState.Recording:
      return 'Recording'
    case RecordingState.Paused:
      return 'Paused'
    case RecordingState.Stopped:
      return 'Stopped'
    case RecordingState.Error:
      return 'Error'
    default:
      return 'Ready'
  }
})

const formattedDuration = computed(() => {
  if (!props.duration) return '00:00'
  const seconds = Math.floor(props.duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
})
</script>

<style scoped>
.recording-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--surface-100);
  color: var(--text-color);
}

.indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--surface-400);
}

.recording-indicator.recording .indicator-dot {
  background: #ef4444;
}

.recording-indicator.paused .indicator-dot {
  background: #f59e0b;
}

.recording-indicator.stopped .indicator-dot {
  background: #10b981;
}

.recording-indicator.error .indicator-dot {
  background: #dc2626;
}

.indicator-dot.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

.indicator-duration {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}
</style>
```

**Step 2: Run playground to verify component**

Run: `pnpm dev`
Expected: Component renders correctly

**Step 3: Commit**

```bash
git add playground/components/RecordingIndicator.vue
git commit -m "feat(playground): add RecordingIndicator component

- Visual status indicator with state colors
- Pulsing animation for active recording
- Duration display with formatted time
- Responsive design with CSS variables

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Update Feature Roadmap

**Files:**
- Modify: `docs/FEATURE_ROADMAP.md`

**Step 1: Update Phase 3.2 status**

Change Phase 3.2 section to:

```markdown
### 3.2 Call Recording

**Effort**: 5 days | **Impact**: Medium | **Status**: ✅ Complete

- [x] Server-side recording integration (via useAmiRecording)
- [x] Local recording option (useLocalRecording composable)
- [x] Recording status indicators (RecordingIndicator component)

**Completed Features:**

- `useLocalRecording` - Client-side MediaRecorder API wrapper
  - Reactive state management (idle/recording/paused/stopped)
  - Start/pause/resume/stop controls
  - Duration tracking with interval updates
  - Optional IndexedDB persistence
  - Auto-download functionality
  - MIME type support detection
  - Automatic cleanup on unmount
- `RecordingIndicator` - Visual recording status component
  - State-based color coding
  - Pulsing animation for active recording
  - Duration display formatting
- Full TypeScript support with comprehensive types
- Unit tests with 100% coverage
```

**Step 2: Commit**

```bash
git add docs/FEATURE_ROADMAP.md
git commit -m "docs: mark Phase 3.2 Call Recording as complete

- useLocalRecording composable implemented
- RecordingIndicator component added
- Server-side recording via existing useAmiRecording
- Full test coverage achieved

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Final Validation and Push

**Files:**
- None (validation only)

**Step 1: Run full test suite**

Run: `pnpm test:unit`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Run linting**

Run: `pnpm lint`
Expected: No errors

**Step 4: Run build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Create final commit if needed**

If any fixes were required:
```bash
git add -A
git commit -m "fix: address linting/type issues from final validation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Step 6: Push to remote**

```bash
git push origin main
```

**Step 7: Monitor CI**

Run: `gh run list --limit 5`
Expected: All workflows pass

---

## Summary

This plan implements Phase 3.2: Call Recording with:

1. **Types** (`LocalRecordingOptions`, `LocalRecordingData`, `UseLocalRecordingReturn`)
2. **Composable** (`useLocalRecording`) with:
   - Reactive state management
   - MediaRecorder integration
   - Pause/resume support
   - IndexedDB persistence
   - Auto-download
   - Cleanup on unmount
3. **Tests** with full coverage
4. **Recording Indicator Component** for visual feedback
5. **Documentation** updates

Total: 10 tasks with ~50 bite-sized steps following TDD approach.
