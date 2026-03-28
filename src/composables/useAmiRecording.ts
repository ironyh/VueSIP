/**
 * useAmiRecording - Call Recording Management via AMI
 *
 * Provides call recording functionality using Asterisk's MixMonitor application
 * through the AMI interface. Supports start/stop/pause/resume recording operations.
 *
 * @module composables/useAmiRecording
 *
 * @example
 * ```typescript
 * import { computed } from 'vue'
 * import { useAmi, useAmiRecording } from 'vuesip'
 *
 * const ami = useAmi()
 * const {
 *   recordings,
 *   isRecording,
 *   startRecording,
 *   stopRecording,
 *   pauseRecording,
 *   resumeRecording
 * } = useAmiRecording(computed(() => ami.getClient()))
 *
 * // Start recording a channel
 * const recording = await startRecording('PJSIP/1001-00000001', {
 *   format: 'wav',
 *   filename: 'call-recording-001'
 * })
 *
 * // Pause recording
 * await pauseRecording('PJSIP/1001-00000001')
 *
 * // Resume recording
 * await resumeRecording('PJSIP/1001-00000001')
 *
 * // Stop recording
 * await stopRecording('PJSIP/1001-00000001')
 * ```
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '../core/AmiClient'
import type { AmiMessage, AmiEventData } from '../types/ami.types'
import type {
  AmiRecordingSession,
  AmiRecordingState,
  AmiRecordingOptions,
  AmiRecordingEvent,
  AmiRecordingEventType,
  AmiRecordingStats,
  AmiRecordingFormat,
  UseAmiRecordingOptions,
  UseAmiRecordingReturn,
} from '../types/recording.types'

/**
 * Default recording options
 */
const DEFAULT_OPTIONS: Required<Pick<UseAmiRecordingOptions, 'defaultFormat' | 'defaultMixMode' | 'trackDuration' | 'durationInterval'>> = {
  defaultFormat: 'wav',
  defaultMixMode: 'both',
  trackDuration: true,
  durationInterval: 1000,
}

/**
 * Generate a unique recording ID
 */
function generateRecordingId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Build MixMonitor options string from AmiRecordingOptions
 */
function buildMixMonitorOptions(options: AmiRecordingOptions): string {
  const parts: string[] = []

  // Append mode
  if (options.append) {
    parts.push('a')
  }

  // Mix mode (r = read only, t = transmit/write only, b or nothing = both)
  if (options.mixMode === 'read') {
    parts.push('r')
  } else if (options.mixMode === 'write') {
    parts.push('t')
  }

  // Volume adjustments
  if (options.readVolume !== undefined) {
    parts.push(`v(${options.readVolume})`)
  }
  if (options.writeVolume !== undefined) {
    parts.push(`V(${options.writeVolume})`)
  }

  // DTMF toggles
  if (options.toggleDtmf) {
    parts.push(`W(${options.toggleDtmf})`)
  }
  if (options.pauseDtmf) {
    parts.push(`p(${options.pauseDtmf})`)
  }

  // Custom options
  if (options.customOptions) {
    parts.push(options.customOptions)
  }

  return parts.join('')
}

/**
 * Sanitize directory path to prevent path traversal attacks
 */
function sanitizeDirectory(directory: string): string {
  // Remove path traversal attempts and normalize
  return directory
    .replace(/\.\./g, '') // Remove .. sequences
    .replace(/\/+/g, '/') // Normalize multiple slashes
    .replace(/^\/+/, '/') // Ensure single leading slash for absolute paths
}

/**
 * Build the full file path for recording
 */
function buildFilePath(
  filename: string,
  format: AmiRecordingFormat,
  directory?: string
): string {
  const ext = format === 'wav49' ? 'WAV' : format
  const sanitizedDir = directory ? sanitizeDirectory(directory) : undefined
  const path = sanitizedDir ? `${sanitizedDir}/${filename}` : filename
  return `${path}.${ext}`
}

/**
 * useAmiRecording composable for call recording management
 *
 * @param clientRef - Reactive reference to AmiClient instance
 * @param options - Recording options
 * @returns Recording management interface
 */
export function useAmiRecording(
  clientRef: Ref<AmiClient | null> | ComputedRef<AmiClient | null>,
  options: UseAmiRecordingOptions = {}
): UseAmiRecordingReturn {
  const {
    defaultFormat = DEFAULT_OPTIONS.defaultFormat,
    defaultMixMode = DEFAULT_OPTIONS.defaultMixMode,
    defaultDirectory,
    autoStop = true,
    trackDuration = DEFAULT_OPTIONS.trackDuration,
    durationInterval = DEFAULT_OPTIONS.durationInterval,
    onRecordingStart,
    onRecordingStop,
    onRecordingPause,
    onRecordingResume,
    onRecordingError,
    transformRecording,
  } = options

  // State
  const recordings = ref<Map<string, AmiRecordingSession>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const eventListeners = ref<Set<(event: AmiRecordingEvent) => void>>(new Set())

  // Duration tracking interval
  let durationIntervalId: ReturnType<typeof setInterval> | null = null

  // Computed
  const currentRecording = computed<AmiRecordingSession | null>(() => {
    const activeRecordings = Array.from(recordings.value.values())
      .filter(r => r.state === 'recording' || r.state === 'paused')
    return activeRecordings[0] || null
  })

  const isRecording = computed(() => {
    return Array.from(recordings.value.values()).some(
      r => r.state === 'recording' || r.state === 'paused'
    )
  })

  const activeCount = computed(() => {
    return Array.from(recordings.value.values()).filter(
      r => r.state === 'recording' || r.state === 'paused'
    ).length
  })

  /**
   * Emit recording event to listeners
   */
  function emitEvent(type: AmiRecordingEventType, recording: AmiRecordingSession, eventError?: string): void {
    const event: AmiRecordingEvent = {
      type,
      recording,
      error: eventError,
      timestamp: new Date(),
    }

    eventListeners.value.forEach(listener => {
      try {
        listener(event)
      } catch (e) {
        console.error('Recording event listener error:', e)
      }
    })
  }

  /**
   * Update recording duration for active recordings
   */
  function updateDurations(): void {
    const now = Date.now()
    recordings.value.forEach((recording, channel) => {
      if (recording.state === 'recording') {
        const elapsed = now - recording.startedAt.getTime() - recording.totalPauseDuration
        recording.duration = Math.floor(elapsed / 1000)
        recordings.value.set(channel, { ...recording })
      }
    })
  }

  /**
   * Start duration tracking
   */
  function startDurationTracking(): void {
    if (trackDuration && !durationIntervalId) {
      durationIntervalId = setInterval(updateDurations, durationInterval)
    }
  }

  /**
   * Stop duration tracking
   */
  function stopDurationTracking(): void {
    if (durationIntervalId) {
      clearInterval(durationIntervalId)
      durationIntervalId = null
    }
  }

  /**
   * Generate a recording filename
   */
  function generateFilename(
    channel: string,
    opts: { prefix?: string; timestamp?: boolean } = {}
  ): string {
    const { prefix = 'recording', timestamp = true } = opts
    const sanitizedChannel = channel.replace(/[^a-zA-Z0-9-]/g, '_')
    const ts = timestamp ? `-${Date.now()}` : ''
    return `${prefix}-${sanitizedChannel}${ts}`
  }

  /**
   * Start recording a channel
   */
  async function startRecording(
    channel: string,
    recordingOptions: AmiRecordingOptions = {}
  ): Promise<AmiRecordingSession> {
    const client = clientRef.value
    if (!client) {
      throw new Error('AMI client not available')
    }

    // Check if already recording
    const existing = recordings.value.get(channel)
    if (existing && (existing.state === 'recording' || existing.state === 'paused')) {
      throw new Error(`Channel ${channel} is already being recorded`)
    }

    isLoading.value = true
    error.value = null

    try {
      const format = recordingOptions.format || defaultFormat
      const mixMode = recordingOptions.mixMode || defaultMixMode
      const filename = recordingOptions.filename || generateFilename(channel)
      const directory = recordingOptions.directory || defaultDirectory
      const filePath = buildFilePath(filename, format, directory)
      const mixMonitorOpts = buildMixMonitorOptions({ ...recordingOptions, mixMode })

      // Build AMI action
      const action: {
        Action: string
        Channel: string
        File: string
        options?: string
        Command?: string
      } = {
        Action: 'MixMonitor',
        Channel: channel,
        File: filePath,
      }

      if (mixMonitorOpts) {
        action.options = mixMonitorOpts
      }

      if (recordingOptions.postCommand) {
        action.Command = recordingOptions.postCommand
      }

      // Send MixMonitor action
      const response = await client.sendAction(action)

      if (response.data.Response !== 'Success') {
        throw new Error(response.data.Message || 'Failed to start recording')
      }

      // Create recording session
      let session: AmiRecordingSession = {
        id: generateRecordingId(),
        channel,
        filePath,
        filename,
        state: 'recording' as AmiRecordingState,
        startedAt: new Date(),
        totalPauseDuration: 0,
        duration: 0,
        format,
        mixMode,
        options: recordingOptions,
      }

      // Apply transform if provided
      if (transformRecording) {
        session = transformRecording(session)
      }

      recordings.value.set(channel, session)

      // Start duration tracking if needed
      if (trackDuration && activeCount.value === 1) {
        startDurationTracking()
      }

      // Emit event and callback
      emitEvent('started', session)
      onRecordingStart?.(session)

      return session
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error starting recording'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Stop recording a channel
   */
  async function stopRecording(channel: string): Promise<void> {
    const client = clientRef.value
    if (!client) {
      throw new Error('AMI client not available')
    }

    const recording = recordings.value.get(channel)
    if (!recording) {
      throw new Error(`No recording found for channel ${channel}`)
    }

    if (recording.state === 'stopped' || recording.state === 'idle') {
      return // Already stopped
    }

    isLoading.value = true
    error.value = null

    try {
      // Send StopMixMonitor action
      const response = await client.sendAction({
        Action: 'StopMixMonitor',
        Channel: channel,
      })

      if (response.data.Response !== 'Success') {
        throw new Error(response.data.Message || 'Failed to stop recording')
      }

      // Update recording state
      const updatedRecording: AmiRecordingSession = {
        ...recording,
        state: 'stopped' as AmiRecordingState,
      }

      recordings.value.set(channel, updatedRecording)

      // Stop duration tracking if no more active recordings
      if (activeCount.value === 0) {
        stopDurationTracking()
      }

      // Emit event and callback
      emitEvent('stopped', updatedRecording)
      emitEvent('completed', updatedRecording)
      onRecordingStop?.(updatedRecording)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error stopping recording'
      error.value = errorMessage

      // Update state to failed
      const failedRecording: AmiRecordingSession = {
        ...recording,
        state: 'failed' as AmiRecordingState,
      }
      recordings.value.set(channel, failedRecording)
      emitEvent('failed', failedRecording, errorMessage)
      onRecordingError?.(failedRecording, errorMessage)

      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Pause recording on a channel
   */
  async function pauseRecording(channel: string): Promise<void> {
    const client = clientRef.value
    if (!client) {
      throw new Error('AMI client not available')
    }

    const recording = recordings.value.get(channel)
    if (!recording) {
      throw new Error(`No recording found for channel ${channel}`)
    }

    if (recording.state !== 'recording') {
      throw new Error(`Recording is not active for channel ${channel}`)
    }

    isLoading.value = true
    error.value = null

    try {
      // Send PauseMixMonitor action (State=1 or State=on to pause)
      const response = await client.sendAction({
        Action: 'PauseMixMonitor',
        Channel: channel,
        State: '1', // 1 = pause
      })

      if (response.data.Response !== 'Success') {
        throw new Error(response.data.Message || 'Failed to pause recording')
      }

      // Update recording state
      const updatedRecording: AmiRecordingSession = {
        ...recording,
        state: 'paused' as AmiRecordingState,
        pausedAt: new Date(),
      }

      recordings.value.set(channel, updatedRecording)

      // Emit event and callback
      emitEvent('paused', updatedRecording)
      onRecordingPause?.(updatedRecording)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error pausing recording'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Resume recording on a channel
   */
  async function resumeRecording(channel: string): Promise<void> {
    const client = clientRef.value
    if (!client) {
      throw new Error('AMI client not available')
    }

    const recording = recordings.value.get(channel)
    if (!recording) {
      throw new Error(`No recording found for channel ${channel}`)
    }

    if (recording.state !== 'paused') {
      throw new Error(`Recording is not paused for channel ${channel}`)
    }

    isLoading.value = true
    error.value = null

    try {
      // Send PauseMixMonitor action (State=0 or State=off to resume)
      const response = await client.sendAction({
        Action: 'PauseMixMonitor',
        Channel: channel,
        State: '0', // 0 = resume
      })

      if (response.data.Response !== 'Success') {
        throw new Error(response.data.Message || 'Failed to resume recording')
      }

      // Calculate pause duration
      const pauseDuration = recording.pausedAt
        ? Date.now() - recording.pausedAt.getTime()
        : 0

      // Update recording state
      const updatedRecording: AmiRecordingSession = {
        ...recording,
        state: 'recording' as AmiRecordingState,
        pausedAt: undefined,
        totalPauseDuration: recording.totalPauseDuration + pauseDuration,
      }

      recordings.value.set(channel, updatedRecording)

      // Emit event and callback
      emitEvent('resumed', updatedRecording)
      onRecordingResume?.(updatedRecording)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error resuming recording'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Toggle recording state (start/stop)
   */
  async function toggleRecording(
    channel: string,
    recordingOptions?: AmiRecordingOptions
  ): Promise<void> {
    const recording = recordings.value.get(channel)

    if (recording && (recording.state === 'recording' || recording.state === 'paused')) {
      await stopRecording(channel)
    } else {
      await startRecording(channel, recordingOptions)
    }
  }

  /**
   * Toggle pause state
   */
  async function togglePause(channel: string): Promise<void> {
    const recording = recordings.value.get(channel)

    if (!recording) {
      throw new Error(`No recording found for channel ${channel}`)
    }

    if (recording.state === 'recording') {
      await pauseRecording(channel)
    } else if (recording.state === 'paused') {
      await resumeRecording(channel)
    } else {
      throw new Error(`Cannot toggle pause - recording is ${recording.state}`)
    }
  }

  /**
   * Get recording session for a channel
   */
  function getRecording(channel: string): AmiRecordingSession | undefined {
    return recordings.value.get(channel)
  }

  /**
   * Check if channel is being recorded
   */
  function isChannelRecording(channel: string): boolean {
    const recording = recordings.value.get(channel)
    return recording !== undefined &&
      (recording.state === 'recording' || recording.state === 'paused')
  }

  /**
   * Listen for recording events
   */
  function onRecordingEvent(
    callback: (event: AmiRecordingEvent) => void
  ): () => void {
    eventListeners.value.add(callback)
    return () => {
      eventListeners.value.delete(callback)
    }
  }

  /**
   * Get recording statistics
   */
  function getStats(): AmiRecordingStats {
    const allRecordings = Array.from(recordings.value.values())
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayRecordings = allRecordings.filter(
      r => r.startedAt >= today
    )

    const byFormat: Record<AmiRecordingFormat, number> = {
      wav: 0,
      wav49: 0,
      gsm: 0,
      ulaw: 0,
      alaw: 0,
      sln: 0,
      g722: 0,
      siren7: 0,
      siren14: 0,
    }

    allRecordings.forEach(r => {
      byFormat[r.format]++
    })

    const totalDuration = allRecordings.reduce((sum, r) => sum + r.duration, 0)
    const totalSize = allRecordings.reduce((sum, r) => sum + (r.fileSize || 0), 0)
    const durationToday = todayRecordings.reduce((sum, r) => sum + r.duration, 0)

    return {
      totalRecordings: allRecordings.length,
      totalDuration,
      totalSize,
      averageDuration: allRecordings.length > 0 ? totalDuration / allRecordings.length : 0,
      byFormat,
      recordingsToday: todayRecordings.length,
      durationToday,
    }
  }

  /**
   * Clear all recordings state
   */
  function clearRecordings(): void {
    recordings.value.clear()
    stopDurationTracking()
  }

  // Track hangup event handler for cleanup
  let hangupHandler: ((event: AmiMessage<AmiEventData>) => void) | null = null

  // Handle channel hangup events to auto-stop recordings
  watch(
    () => clientRef.value,
    (client, oldClient) => {
      // Clean up old client listeners
      if (oldClient && hangupHandler) {
        oldClient.off('event', hangupHandler)
        hangupHandler = null
      }

      if (client && autoStop) {
        // Listen for Hangup events to auto-stop recordings
        hangupHandler = (event: AmiMessage<AmiEventData>) => {
          if (event.data.Event === 'Hangup') {
            const channel = event.data.Channel as string
            const recording = recordings.value.get(channel)
            if (recording && (recording.state === 'recording' || recording.state === 'paused')) {
              // Auto-stop recording on hangup
              const stoppedRecording: AmiRecordingSession = {
                ...recording,
                state: 'stopped' as AmiRecordingState,
              }
              recordings.value.set(channel, stoppedRecording)
              emitEvent('stopped', stoppedRecording)
              emitEvent('completed', stoppedRecording)
              onRecordingStop?.(stoppedRecording)
            }
          }
        }
        client.on('event', hangupHandler)
      }
    },
    { immediate: true }
  )

  // Cleanup on unmount
  onUnmounted(() => {
    stopDurationTracking()
    eventListeners.value.clear()
    // Clean up hangup handler
    if (clientRef.value && hangupHandler) {
      clientRef.value.off('event', hangupHandler)
      hangupHandler = null
    }
  })

  return {
    // State
    recordings,
    currentRecording,
    isRecording,
    activeCount,
    isLoading,
    error,

    // Methods
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleRecording,
    togglePause,
    getRecording,
    isChannelRecording,
    onRecordingEvent,
    getStats,
    clearRecordings,
    generateFilename,
  }
}

// Re-export types for convenience
export type { UseAmiRecordingReturn }
