/**
 * useCallRecording - WebRTC Call Recording Composable
 *
 * Provides call recording functionality using WebRTC MediaRecorder API.
 * Records audio from the call and provides download capabilities.
 *
 * @module composables/useCallRecording
 */
import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { RecordingState } from '@/types/media.types'

/**
 * Recording metadata
 */
export interface CallRecordingMetadata {
  /** Recording start time */
  startTime: Date | null
  /** Recording duration in seconds */
  durationSeconds: number
  /** Media blob type */
  mimeType: string
  /** File size in bytes */
  fileSize: number | null
}

/**
 * Options for useCallRecording
 */
export interface UseCallRecordingOptions {
  /** Media MIME type for recording (default: 'audio/webm') */
  mimeType?: string
  /** Maximum recording duration in seconds (default: 3600 = 1 hour) */
  maxDurationSeconds?: number
}

type MediaStreamRef = Ref<MediaStream | null> | ComputedRef<MediaStream | null>

/**
 * Call Recording composable
 *
 * @param mediaStream - Optional MediaStream to record
 * @param options - Configuration options
 * @returns Recording controls and state
 */
export function useCallRecording(
  mediaStream: MediaStreamRef,
  options: UseCallRecordingOptions = {}
) {
  const { mimeType = 'audio/webm', maxDurationSeconds = 3600 } = options

  // State
  const recordingState = ref<RecordingState>(RecordingState.Inactive)
  const metadata = ref<CallRecordingMetadata>({
    startTime: null,
    durationSeconds: 0,
    mimeType,
    fileSize: null,
  })
  const recordedBlob = ref<Blob | null>(null)
  const error = ref<string | null>(null)

  // Internal
  let mediaRecorder: MediaRecorder | null = null
  let recordedChunks: Blob[] = []
  let durationInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Check if MediaRecorder is supported
   */
  const isSupported = computed(() => {
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)
  })

  /**
   * Check if currently recording
   */
  const isRecording = computed(() => recordingState.value === RecordingState.Recording)

  /**
   * Check if recording is paused
   */
  const isPaused = computed(() => recordingState.value === RecordingState.Paused)

  /**
   * Check if recording is stopped (has recording available)
   */
  const hasRecording = computed(
    () => recordingState.value === RecordingState.Stopped && recordedBlob.value !== null
  )

  /**
   * Start recording
   */
  const startRecording = (stream?: MediaStream): boolean => {
    error.value = null
    const streamToRecord = stream || mediaStream.value

    if (!streamToRecord) {
      error.value = 'No media stream available'
      return false
    }

    if (!isSupported.value) {
      error.value = `MediaRecorder not supported or mime type ${mimeType} not supported`
      return false
    }

    try {
      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(streamToRecord, { mimeType })
      recordedChunks = []

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      // Handle stop
      mediaRecorder.onstop = () => {
        if (recordedChunks.length > 0) {
          recordedBlob.value = new Blob(recordedChunks, { type: mimeType })
          metadata.value.fileSize = recordedBlob.value.size
        }
        recordingState.value = RecordingState.Stopped

        // Clear duration interval
        if (durationInterval) {
          clearInterval(durationInterval)
          durationInterval = null
        }
      }

      // Handle errors
      mediaRecorder.onerror = (event) => {
        error.value = `Recording error: ${event}`
        recordingState.value = RecordingState.Inactive
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      recordingState.value = RecordingState.Recording
      metadata.value.startTime = new Date()
      metadata.value.durationSeconds = 0

      // Start duration counter
      durationInterval = setInterval(() => {
        if (metadata.value.durationSeconds >= maxDurationSeconds) {
          stopRecording()
        } else {
          metadata.value.durationSeconds++
        }
      }, 1000)

      return true
    } catch (err) {
      error.value = `Failed to start recording: ${err}`
      return false
    }
  }

  /**
   * Pause recording
   */
  const pauseRecording = (): boolean => {
    if (mediaRecorder && recordingState.value === RecordingState.Recording) {
      try {
        mediaRecorder.pause()
        recordingState.value = RecordingState.Paused

        if (durationInterval) {
          clearInterval(durationInterval)
          durationInterval = null
        }
        return true
      } catch (err) {
        error.value = `Failed to pause recording: ${err}`
        return false
      }
    }
    return false
  }

  /**
   * Resume recording
   */
  const resumeRecording = (): boolean => {
    if (mediaRecorder && recordingState.value === RecordingState.Paused) {
      try {
        mediaRecorder.resume()
        recordingState.value = RecordingState.Recording

        // Resume duration counter
        durationInterval = setInterval(() => {
          if (metadata.value.durationSeconds >= maxDurationSeconds) {
            stopRecording()
          } else {
            metadata.value.durationSeconds++
          }
        }, 1000)
        return true
      } catch (err) {
        error.value = `Failed to resume recording: ${err}`
        return false
      }
    }
    return false
  }

  /**
   * Stop recording
   */
  const stopRecording = (): boolean => {
    if (
      mediaRecorder &&
      (recordingState.value === RecordingState.Recording ||
        recordingState.value === RecordingState.Paused)
    ) {
      try {
        mediaRecorder.stop()
        return true
      } catch (err) {
        error.value = `Failed to stop recording: ${err}`
        return false
      }
    }
    return false
  }

  /**
   * Download recording
   */
  const downloadRecording = (filename?: string): boolean => {
    if (!recordedBlob.value) {
      error.value = 'No recording available'
      return false
    }

    try {
      const url = URL.createObjectURL(recordedBlob.value)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `recording-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    } catch (err) {
      error.value = `Failed to download recording: ${err}`
      return false
    }
  }

  /**
   * Clear recording
   */
  const clearRecording = (): void => {
    recordedBlob.value = null
    recordedChunks = []
    metadata.value = {
      startTime: null,
      durationSeconds: 0,
      mimeType,
      fileSize: null,
    }
    recordingState.value = RecordingState.Inactive
    error.value = null
  }

  /**
   * Format duration as mm:ss
   */
  const formattedDuration = computed(() => {
    const seconds = metadata.value.durationSeconds
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  /**
   * Format file size as human readable
   */
  const formattedFileSize = computed(() => {
    if (!metadata.value.fileSize) return ''
    const bytes = metadata.value.fileSize
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  })

  // Cleanup on unmount
  onUnmounted(() => {
    if (durationInterval) {
      clearInterval(durationInterval)
    }
    if (mediaRecorder && recordingState.value !== RecordingState.Inactive) {
      try {
        mediaRecorder.stop()
      } catch {
        // Ignore errors during cleanup
      }
    }
  })

  return {
    // State
    recordingState,
    metadata,
    recordedBlob,
    error,

    // Computed
    isSupported,
    isRecording,
    isPaused,
    hasRecording,
    formattedDuration,
    formattedFileSize,

    // Actions
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
  }
}
