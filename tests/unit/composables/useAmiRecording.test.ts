/**
 * useAmiRecording composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiRecording } from '@/composables/useAmiRecording'
import type { AmiClient } from '@/core/AmiClient'
import type {  } from '@/types/recording.types'
import {
  createMockAmiClient,
  createAmiEvent,
  createAmiSuccessResponse,
  createAmiErrorResponse,
  type MockAmiClient,
} from '../utils/mockFactories'

describe('useAmiRecording', () => {
  let mockClient: MockAmiClient
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
    clientRef = ref(mockClient as unknown as AmiClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have empty recordings initially', () => {
      const { recordings } = useAmiRecording(clientRef)
      expect(recordings.value.size).toBe(0)
    })

    it('should have no error initially', () => {
      const { error } = useAmiRecording(clientRef)
      expect(error.value).toBeNull()
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiRecording(clientRef)
      expect(isLoading.value).toBe(false)
    })

    it('should not be recording initially', () => {
      const { isRecording } = useAmiRecording(clientRef)
      expect(isRecording.value).toBe(false)
    })

    it('should have zero active count initially', () => {
      const { activeCount } = useAmiRecording(clientRef)
      expect(activeCount.value).toBe(0)
    })

    it('should have null currentRecording initially', () => {
      const { currentRecording } = useAmiRecording(clientRef)
      expect(currentRecording.value).toBeNull()
    })
  })

  describe('startRecording', () => {
    it('should throw if client not available', async () => {
      clientRef.value = null
      const { startRecording } = useAmiRecording(clientRef)

      await expect(startRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'AMI client not available'
      )
    })

    it('should start recording with default options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { startRecording, recordings, isRecording, activeCount } = useAmiRecording(clientRef)
      const session = await startRecording('PJSIP/1001-00000001')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'MixMonitor',
          Channel: 'PJSIP/1001-00000001',
        })
      )

      expect(session.channel).toBe('PJSIP/1001-00000001')
      expect(session.state).toBe('recording')
      expect(session.format).toBe('wav')
      expect(session.mixMode).toBe('both')
      expect(recordings.value.size).toBe(1)
      expect(isRecording.value).toBe(true)
      expect(activeCount.value).toBe(1)
    })

    it('should start recording with custom options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef)
      const session = await startRecording('PJSIP/1001-00000001', {
        format: 'gsm',
        mixMode: 'read',
        filename: 'my-recording',
        directory: '/var/recordings',
        readVolume: 2,
        writeVolume: -1,
        pauseDtmf: '*',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'MixMonitor',
          Channel: 'PJSIP/1001-00000001',
          File: '/var/recordings/my-recording.gsm',
          options: expect.stringContaining('r'),
        })
      )

      expect(session.format).toBe('gsm')
      expect(session.mixMode).toBe('read')
      expect(session.filename).toBe('my-recording')
    })

    it('should throw if channel already being recorded', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef)
      await startRecording('PJSIP/1001-00000001')

      await expect(startRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'Channel PJSIP/1001-00000001 is already being recorded'
      )
    })

    it('should handle failed response', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiErrorResponse('Channel not found'))

      const { startRecording, error } = useAmiRecording(clientRef)

      await expect(startRecording('PJSIP/invalid')).rejects.toThrow('Channel not found')
      expect(error.value).toBe('Channel not found')
    })

    it('should call onRecordingStart callback', async () => {
      const onRecordingStart = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, { onRecordingStart })
      const session = await startRecording('PJSIP/1001-00000001')

      expect(onRecordingStart).toHaveBeenCalledWith(session)
    })

    it('should apply transformRecording if provided', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const transformRecording = vi.fn((recording) => ({
        ...recording,
        callUniqueId: 'custom-id',
      }))

      const { startRecording } = useAmiRecording(clientRef, { transformRecording })
      const session = await startRecording('PJSIP/1001-00000001')

      expect(transformRecording).toHaveBeenCalled()
      expect(session.callUniqueId).toBe('custom-id')
    })
  })

  describe('stopRecording', () => {
    it('should throw if client not available', async () => {
      clientRef.value = null
      const { stopRecording } = useAmiRecording(clientRef)

      await expect(stopRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'AMI client not available'
      )
    })

    it('should throw if no recording found', async () => {
      const { stopRecording } = useAmiRecording(clientRef)

      await expect(stopRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'No recording found for channel PJSIP/1001-00000001'
      )
    })

    it('should stop an active recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, recordings, isRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      expect(isRecording.value).toBe(true)

      await stopRecording('PJSIP/1001-00000001')

      expect(mockClient.sendAction).toHaveBeenLastCalledWith({
        Action: 'StopMixMonitor',
        Channel: 'PJSIP/1001-00000001',
      })

      const recording = recordings.value.get('PJSIP/1001-00000001')
      expect(recording?.state).toBe('stopped')
      expect(isRecording.value).toBe(false)
    })

    it('should call onRecordingStop callback', async () => {
      const onRecordingStop = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording } = useAmiRecording(clientRef, { onRecordingStop })

      await startRecording('PJSIP/1001-00000001')
      await stopRecording('PJSIP/1001-00000001')

      expect(onRecordingStop).toHaveBeenCalled()
      expect(onRecordingStop.mock.calls[0][0].state).toBe('stopped')
    })

    it('should handle stop failure', async () => {
      const onRecordingError = vi.fn()
      mockClient.sendAction = vi
        .fn()
        .mockResolvedValueOnce(createAmiSuccessResponse()) // start
        .mockResolvedValueOnce(createAmiErrorResponse('MixMonitor not active')) // stop

      const { startRecording, stopRecording, recordings, error } = useAmiRecording(clientRef, {
        onRecordingError,
      })

      await startRecording('PJSIP/1001-00000001')
      await expect(stopRecording('PJSIP/1001-00000001')).rejects.toThrow('MixMonitor not active')

      expect(error.value).toBe('MixMonitor not active')
      expect(recordings.value.get('PJSIP/1001-00000001')?.state).toBe('failed')
      expect(onRecordingError).toHaveBeenCalled()
    })

    it('should not throw if recording already stopped', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await stopRecording('PJSIP/1001-00000001')

      // Second stop should not throw
      await expect(stopRecording('PJSIP/1001-00000001')).resolves.toBeUndefined()
    })
  })

  describe('pauseRecording', () => {
    it('should throw if client not available', async () => {
      clientRef.value = null
      const { pauseRecording } = useAmiRecording(clientRef)

      await expect(pauseRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'AMI client not available'
      )
    })

    it('should throw if no recording found', async () => {
      const { pauseRecording } = useAmiRecording(clientRef)

      await expect(pauseRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'No recording found for channel PJSIP/1001-00000001'
      )
    })

    it('should throw if recording not active', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, pauseRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await stopRecording('PJSIP/1001-00000001')

      await expect(pauseRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'Recording is not active for channel PJSIP/1001-00000001'
      )
    })

    it('should pause an active recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, recordings } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await pauseRecording('PJSIP/1001-00000001')

      expect(mockClient.sendAction).toHaveBeenLastCalledWith({
        Action: 'PauseMixMonitor',
        Channel: 'PJSIP/1001-00000001',
        State: '1',
      })

      const recording = recordings.value.get('PJSIP/1001-00000001')
      expect(recording?.state).toBe('paused')
      expect(recording?.pausedAt).toBeInstanceOf(Date)
    })

    it('should call onRecordingPause callback', async () => {
      const onRecordingPause = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording } = useAmiRecording(clientRef, { onRecordingPause })

      await startRecording('PJSIP/1001-00000001')
      await pauseRecording('PJSIP/1001-00000001')

      expect(onRecordingPause).toHaveBeenCalled()
      expect(onRecordingPause.mock.calls[0][0].state).toBe('paused')
    })
  })

  describe('resumeRecording', () => {
    it('should throw if recording not paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, resumeRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')

      await expect(resumeRecording('PJSIP/1001-00000001')).rejects.toThrow(
        'Recording is not paused for channel PJSIP/1001-00000001'
      )
    })

    it('should resume a paused recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, resumeRecording, recordings } =
        useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await pauseRecording('PJSIP/1001-00000001')

      // Advance time to simulate pause duration
      vi.advanceTimersByTime(5000)

      await resumeRecording('PJSIP/1001-00000001')

      expect(mockClient.sendAction).toHaveBeenLastCalledWith({
        Action: 'PauseMixMonitor',
        Channel: 'PJSIP/1001-00000001',
        State: '0',
      })

      const recording = recordings.value.get('PJSIP/1001-00000001')
      expect(recording?.state).toBe('recording')
      expect(recording?.pausedAt).toBeUndefined()
      expect(recording?.totalPauseDuration).toBeGreaterThan(0)
    })

    it('should call onRecordingResume callback', async () => {
      const onRecordingResume = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, resumeRecording } = useAmiRecording(clientRef, {
        onRecordingResume,
      })

      await startRecording('PJSIP/1001-00000001')
      await pauseRecording('PJSIP/1001-00000001')
      await resumeRecording('PJSIP/1001-00000001')

      expect(onRecordingResume).toHaveBeenCalled()
      expect(onRecordingResume.mock.calls[0][0].state).toBe('recording')
    })
  })

  describe('toggleRecording', () => {
    it('should start recording if not recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { toggleRecording, isRecording } = useAmiRecording(clientRef)

      await toggleRecording('PJSIP/1001-00000001')

      expect(isRecording.value).toBe(true)
    })

    it('should stop recording if recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, toggleRecording, isRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      expect(isRecording.value).toBe(true)

      await toggleRecording('PJSIP/1001-00000001')
      expect(isRecording.value).toBe(false)
    })

    it('should stop recording if paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, toggleRecording, recordings } =
        useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await pauseRecording('PJSIP/1001-00000001')
      await toggleRecording('PJSIP/1001-00000001')

      expect(recordings.value.get('PJSIP/1001-00000001')?.state).toBe('stopped')
    })
  })

  describe('togglePause', () => {
    it('should throw if no recording found', async () => {
      const { togglePause } = useAmiRecording(clientRef)

      await expect(togglePause('PJSIP/1001-00000001')).rejects.toThrow(
        'No recording found for channel PJSIP/1001-00000001'
      )
    })

    it('should pause if recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, togglePause, recordings } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await togglePause('PJSIP/1001-00000001')

      expect(recordings.value.get('PJSIP/1001-00000001')?.state).toBe('paused')
    })

    it('should resume if paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, togglePause, recordings } =
        useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await pauseRecording('PJSIP/1001-00000001')
      await togglePause('PJSIP/1001-00000001')

      expect(recordings.value.get('PJSIP/1001-00000001')?.state).toBe('recording')
    })

    it('should throw if recording stopped', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, togglePause } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await stopRecording('PJSIP/1001-00000001')

      await expect(togglePause('PJSIP/1001-00000001')).rejects.toThrow(
        'Cannot toggle pause - recording is stopped'
      )
    })
  })

  describe('getRecording', () => {
    it('should return undefined if no recording', () => {
      const { getRecording } = useAmiRecording(clientRef)

      expect(getRecording('PJSIP/1001-00000001')).toBeUndefined()
    })

    it('should return recording if exists', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, getRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      const recording = getRecording('PJSIP/1001-00000001')

      expect(recording).toBeDefined()
      expect(recording?.channel).toBe('PJSIP/1001-00000001')
    })
  })

  describe('isChannelRecording', () => {
    it('should return false if no recording', () => {
      const { isChannelRecording } = useAmiRecording(clientRef)

      expect(isChannelRecording('PJSIP/1001-00000001')).toBe(false)
    })

    it('should return true if recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, isChannelRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')

      expect(isChannelRecording('PJSIP/1001-00000001')).toBe(true)
    })

    it('should return true if paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, isChannelRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await pauseRecording('PJSIP/1001-00000001')

      expect(isChannelRecording('PJSIP/1001-00000001')).toBe(true)
    })

    it('should return false if stopped', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, isChannelRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await stopRecording('PJSIP/1001-00000001')

      expect(isChannelRecording('PJSIP/1001-00000001')).toBe(false)
    })
  })

  describe('onRecordingEvent', () => {
    it('should register and call listener on events', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const listener = vi.fn()
      const { startRecording, onRecordingEvent } = useAmiRecording(clientRef)

      const unsubscribe = onRecordingEvent(listener)
      await startRecording('PJSIP/1001-00000001')

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'started',
          recording: expect.objectContaining({
            channel: 'PJSIP/1001-00000001',
          }),
        })
      )

      unsubscribe()
    })

    it('should not call listener after unsubscribe', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const listener = vi.fn()
      const { startRecording, stopRecording, onRecordingEvent } = useAmiRecording(clientRef)

      const unsubscribe = onRecordingEvent(listener)
      await startRecording('PJSIP/1001-00000001')
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      await stopRecording('PJSIP/1001-00000001')
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('getStats', () => {
    it('should return zero stats initially', () => {
      const { getStats } = useAmiRecording(clientRef)
      const stats = getStats()

      expect(stats.totalRecordings).toBe(0)
      expect(stats.totalDuration).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.averageDuration).toBe(0)
      expect(stats.recordingsToday).toBe(0)
    })

    it('should calculate stats from recordings', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, getStats } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001', { format: 'wav' })
      await startRecording('PJSIP/1002-00000002', { format: 'gsm' })

      const stats = getStats()

      expect(stats.totalRecordings).toBe(2)
      expect(stats.byFormat.wav).toBe(1)
      expect(stats.byFormat.gsm).toBe(1)
      expect(stats.recordingsToday).toBe(2)
    })
  })

  describe('clearRecordings', () => {
    it('should clear all recordings', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, clearRecordings, recordings, activeCount } =
        useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await startRecording('PJSIP/1002-00000002')

      expect(recordings.value.size).toBe(2)

      clearRecordings()

      expect(recordings.value.size).toBe(0)
      expect(activeCount.value).toBe(0)
    })
  })

  describe('generateFilename', () => {
    it('should generate filename with channel and timestamp', () => {
      const { generateFilename } = useAmiRecording(clientRef)

      const filename = generateFilename('PJSIP/1001-00000001')

      expect(filename).toMatch(/^recording-PJSIP_1001-00000001-\d+$/)
    })

    it('should generate filename with custom prefix', () => {
      const { generateFilename } = useAmiRecording(clientRef)

      const filename = generateFilename('PJSIP/1001-00000001', { prefix: 'call' })

      expect(filename).toMatch(/^call-PJSIP_1001-00000001-\d+$/)
    })

    it('should generate filename without timestamp', () => {
      const { generateFilename } = useAmiRecording(clientRef)

      const filename = generateFilename('PJSIP/1001-00000001', { timestamp: false })

      expect(filename).toBe('recording-PJSIP_1001-00000001')
    })
  })

  describe('duration tracking', () => {
    it('should track duration when enabled', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, recordings } = useAmiRecording(clientRef, {
        trackDuration: true,
        durationInterval: 1000,
      })

      await startRecording('PJSIP/1001-00000001')

      // Advance time
      vi.advanceTimersByTime(3000)

      const recording = recordings.value.get('PJSIP/1001-00000001')
      expect(recording?.duration).toBeGreaterThanOrEqual(2)
    })

    it('should not track duration when paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, recordings } = useAmiRecording(clientRef, {
        trackDuration: true,
        durationInterval: 1000,
      })

      await startRecording('PJSIP/1001-00000001')
      vi.advanceTimersByTime(2000)

      await pauseRecording('PJSIP/1001-00000001')
      const durationAtPause = recordings.value.get('PJSIP/1001-00000001')?.duration

      vi.advanceTimersByTime(5000)

      // Duration should not increase while paused
      const currentDuration = recordings.value.get('PJSIP/1001-00000001')?.duration
      expect(currentDuration).toBe(durationAtPause)
    })
  })

  describe('auto-stop on hangup', () => {
    it('should stop recording on Hangup event when autoStop enabled', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())
      const onRecordingStop = vi.fn()

      const { startRecording, recordings } = useAmiRecording(clientRef, {
        autoStop: true,
        onRecordingStop,
      })

      await startRecording('PJSIP/1001-00000001')

      // Simulate Hangup event
      const hangupEvent = createAmiEvent('Hangup', {
        Channel: 'PJSIP/1001-00000001',
        Cause: '16',
        CauseTxt: 'Normal Clearing',
      })

      // Trigger event on mock client (via the handler registered in watch)
      mockClient._triggerEvent('event', hangupEvent)
      await nextTick()

      const recording = recordings.value.get('PJSIP/1001-00000001')
      expect(recording?.state).toBe('stopped')
      expect(onRecordingStop).toHaveBeenCalled()
    })
  })

  describe('options', () => {
    it('should use default format from options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, {
        defaultFormat: 'gsm',
      })

      const session = await startRecording('PJSIP/1001-00000001')

      expect(session.format).toBe('gsm')
    })

    it('should use default mixMode from options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, {
        defaultMixMode: 'read',
      })

      const session = await startRecording('PJSIP/1001-00000001')

      expect(session.mixMode).toBe('read')
    })

    it('should use default directory from options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, {
        defaultDirectory: '/custom/recordings',
      })

      await startRecording('PJSIP/1001-00000001')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          File: expect.stringContaining('/custom/recordings/'),
        })
      )
    })
  })

  describe('multiple recordings', () => {
    it('should handle multiple concurrent recordings', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, recordings, activeCount } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await startRecording('PJSIP/1002-00000002')
      await startRecording('PJSIP/1003-00000003')

      expect(recordings.value.size).toBe(3)
      expect(activeCount.value).toBe(3)
    })

    it('should update currentRecording to first active recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, currentRecording } = useAmiRecording(clientRef)

      await startRecording('PJSIP/1001-00000001')
      await startRecording('PJSIP/1002-00000002')

      expect(currentRecording.value?.channel).toBe('PJSIP/1001-00000001')

      await stopRecording('PJSIP/1001-00000001')

      expect(currentRecording.value?.channel).toBe('PJSIP/1002-00000002')
    })
  })
})
