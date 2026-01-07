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
const DEFAULT_OPTIONS: Required<
  Omit<LocalRecordingOptions, 'audioBitsPerSecond' | 'videoBitsPerSecond'>
> = {
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
  const state: Ref<RecordingState> = ref(RecordingState.Inactive)
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
  const isPaused: ComputedRef<boolean> = computed(() => state.value === RecordingState.Paused)

  /**
   * Check if a MIME type is supported by MediaRecorder
   */
  function isSupported(mimeType?: string): boolean {
    if (typeof MediaRecorder === 'undefined') return false
    return MediaRecorder.isTypeSupported(mimeType ?? opts.mimeType)
  }

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
        // MediaRecorder error event contains an error property
        const errorEvent = event as Event & { error?: DOMException }
        error.value = errorEvent.error || new Error('Recording error')
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
      if (!mediaRecorder || state.value === RecordingState.Inactive) {
        resolve(null)
        return
      }

      mediaRecorder.onstop = async () => {
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

        if (opts.persist) {
          try {
            await persistToIndexedDB(data)
          } catch (err) {
            console.warn('Failed to persist recording:', err)
          }
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
    state.value = RecordingState.Inactive
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
