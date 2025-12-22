/**
 * useAmiRecording composable unit tests
 *
 * Tests for AMI call recording functionality including:
 * - Recording lifecycle (start, stop, pause, resume)
 * - Multiple concurrent recordings
 * - Duration tracking and statistics
 * - Event handling and callbacks
 * - Auto-stop on hangup
 * - Error handling and validation
 *
 * @see src/composables/useAmiRecording.ts
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

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  channels: {
    primary: 'PJSIP/1001-00000001',
    secondary: 'PJSIP/1002-00000002',
    tertiary: 'PJSIP/1003-00000003',
    invalid: 'PJSIP/invalid',
  },
  formats: {
    default: 'wav' as const,
    gsm: 'gsm' as const,
    mp3: 'mp3' as const,
  },
  mixModes: {
    both: 'both' as const,
    read: 'read' as const,
    write: 'write' as const,
  },
  directories: {
    default: '/var/spool/asterisk/monitor',
    custom: '/custom/recordings',
  },
  filenames: {
    default: 'my-recording',
    custom: 'call-recording',
  },
  errors: {
    clientUnavailable: 'AMI client not available',
    alreadyRecording: (channel: string) => `Channel ${channel} is already being recorded`,
    noRecording: (channel: string) => `No recording found for channel ${channel}`,
    notActive: (channel: string) => `Recording is not active for channel ${channel}`,
    notPaused: (channel: string) => `Recording is not paused for channel ${channel}`,
    toggleStopped: 'Cannot toggle pause - recording is stopped',
    channelNotFound: 'Channel not found',
    mixMonitorNotActive: 'MixMonitor not active',
  },
  events: {
    hangup: 'Hangup',
  },
  timeouts: {
    short: 1000,
    medium: 3000,
    long: 5000,
  },
} as const


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

  /**
   * Initial State Tests
   * Verify composable starts with correct initial state for all reactive properties
   */
  describe('initial state', () => {
    describe.each([
      { property: 'recordings', expected: 0, accessor: (v: any) => v.size, description: 'empty recordings map' },
      { property: 'error', expected: null, accessor: (v: any) => v, description: 'no error' },
      { property: 'isLoading', expected: false, accessor: (v: any) => v, description: 'not loading' },
      { property: 'isRecording', expected: false, accessor: (v: any) => v, description: 'not recording' },
      { property: 'activeCount', expected: 0, accessor: (v: any) => v, description: 'zero active count' },
      { property: 'currentRecording', expected: null, accessor: (v: any) => v, description: 'null current recording' },
    ])('$property property', ({ property, expected, accessor, description }) => {
      it(`should have ${description} initially`, () => {
        const composable = useAmiRecording(clientRef)
        const value = composable[property as keyof typeof composable]
        expect(accessor((value as any).value)).toEqual(expected)
      })
    })
  })

  /**
   * Start Recording Tests
   * Tests for initiating call recording with various options and scenarios
   */
  describe('startRecording', () => {
    it('should throw if client not available', async () => {
      clientRef.value = null
      const { startRecording } = useAmiRecording(clientRef)

      await expect(startRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.clientUnavailable
      )
    })

    it('should start recording with default options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { startRecording, recordings, isRecording, activeCount } = useAmiRecording(clientRef)
      const session = await startRecording(TEST_FIXTURES.channels.primary)

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'MixMonitor',
          Channel: TEST_FIXTURES.channels.primary,
        })
      )

      expect(session.channel).toBe(TEST_FIXTURES.channels.primary)
      expect(session.state).toBe('recording')
      expect(session.format).toBe(TEST_FIXTURES.formats.default)
      expect(session.mixMode).toBe(TEST_FIXTURES.mixModes.both)
      expect(recordings.value.size).toBe(1)
      expect(isRecording.value).toBe(true)
      expect(activeCount.value).toBe(1)
    })

    it('should start recording with custom options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef)
      const session = await startRecording(TEST_FIXTURES.channels.primary, {
        format: TEST_FIXTURES.formats.gsm,
        mixMode: TEST_FIXTURES.mixModes.read,
        filename: TEST_FIXTURES.filenames.default,
        directory: '/var/recordings',
        readVolume: 2,
        writeVolume: -1,
        pauseDtmf: '*',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'MixMonitor',
          Channel: TEST_FIXTURES.channels.primary,
          File: `/var/recordings/${TEST_FIXTURES.filenames.default}.${TEST_FIXTURES.formats.gsm}`,
          options: expect.stringContaining('r'),
        })
      )

      expect(session.format).toBe(TEST_FIXTURES.formats.gsm)
      expect(session.mixMode).toBe(TEST_FIXTURES.mixModes.read)
      expect(session.filename).toBe(TEST_FIXTURES.filenames.default)
    })

    it('should throw if channel already being recorded', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef)
      await startRecording(TEST_FIXTURES.channels.primary)

      await expect(startRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.alreadyRecording(TEST_FIXTURES.channels.primary)
      )
    })

    it('should handle failed response', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiErrorResponse(TEST_FIXTURES.errors.channelNotFound))

      const { startRecording, error } = useAmiRecording(clientRef)

      await expect(startRecording(TEST_FIXTURES.channels.invalid)).rejects.toThrow(TEST_FIXTURES.errors.channelNotFound)
      expect(error.value).toBe(TEST_FIXTURES.errors.channelNotFound)
    })

    it('should call onRecordingStart callback', async () => {
      const onRecordingStart = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, { onRecordingStart })
      const session = await startRecording(TEST_FIXTURES.channels.primary)

      expect(onRecordingStart).toHaveBeenCalledWith(session)
    })

    it('should apply transformRecording if provided', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const transformRecording = vi.fn((recording) => ({
        ...recording,
        callUniqueId: 'custom-id',
      }))

      const { startRecording } = useAmiRecording(clientRef, { transformRecording })
      const session = await startRecording(TEST_FIXTURES.channels.primary)

      expect(transformRecording).toHaveBeenCalled()
      expect(session.callUniqueId).toBe('custom-id')
    })
  })

  /**
   * Stop Recording Tests
   * Tests for stopping active recordings with various scenarios
   */
  describe('stopRecording', () => {
    it('should throw if client not available', async () => {
      clientRef.value = null
      const { stopRecording } = useAmiRecording(clientRef)

      await expect(stopRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.clientUnavailable
      )
    })

    it('should throw if no recording found', async () => {
      const { stopRecording } = useAmiRecording(clientRef)

      await expect(stopRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.noRecording(TEST_FIXTURES.channels.primary)
      )
    })

    it('should stop an active recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, recordings, isRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      expect(isRecording.value).toBe(true)

      await stopRecording(TEST_FIXTURES.channels.primary)

      expect(mockClient.sendAction).toHaveBeenLastCalledWith({
        Action: 'StopMixMonitor',
        Channel: TEST_FIXTURES.channels.primary,
      })

      const recording = recordings.value.get(TEST_FIXTURES.channels.primary)
      expect(recording?.state).toBe('stopped')
      expect(isRecording.value).toBe(false)
    })

    it('should call onRecordingStop callback', async () => {
      const onRecordingStop = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording } = useAmiRecording(clientRef, { onRecordingStop })

      await startRecording(TEST_FIXTURES.channels.primary)
      await stopRecording(TEST_FIXTURES.channels.primary)

      expect(onRecordingStop).toHaveBeenCalled()
      expect(onRecordingStop.mock.calls[0][0].state).toBe('stopped')
    })

    it('should handle stop failure', async () => {
      const onRecordingError = vi.fn()
      mockClient.sendAction = vi
        .fn()
        .mockResolvedValueOnce(createAmiSuccessResponse()) // start
        .mockResolvedValueOnce(createAmiErrorResponse(TEST_FIXTURES.errors.mixMonitorNotActive)) // stop

      const { startRecording, stopRecording, recordings, error } = useAmiRecording(clientRef, {
        onRecordingError,
      })

      await startRecording(TEST_FIXTURES.channels.primary)
      await expect(stopRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(TEST_FIXTURES.errors.mixMonitorNotActive)

      expect(error.value).toBe(TEST_FIXTURES.errors.mixMonitorNotActive)
      expect(recordings.value.get(TEST_FIXTURES.channels.primary)?.state).toBe('failed')
      expect(onRecordingError).toHaveBeenCalled()
    })

    it('should not throw if recording already stopped', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await stopRecording(TEST_FIXTURES.channels.primary)

      // Second stop should not throw
      await expect(stopRecording(TEST_FIXTURES.channels.primary)).resolves.toBeUndefined()
    })
  })

  /**
   * Pause Recording Tests
   * Tests for pausing active recordings
   */
  describe('pauseRecording', () => {
    describe.each([
      {
        scenario: 'client not available',
        setupClient: true,
        expectedError: TEST_FIXTURES.errors.clientUnavailable
      },
      {
        scenario: 'no recording found',
        setupClient: false,
        expectedError: TEST_FIXTURES.errors.noRecording(TEST_FIXTURES.channels.primary)
      },
    ])('validation errors', ({ scenario, setupClient, expectedError }) => {
      it(`should throw if ${scenario}`, async () => {
        if (setupClient) {
          clientRef.value = null
        }
        const { pauseRecording } = useAmiRecording(clientRef)

        await expect(pauseRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(expectedError)
      })
    })

    it('should throw if recording not active', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, pauseRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await stopRecording(TEST_FIXTURES.channels.primary)

      await expect(pauseRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.notActive(TEST_FIXTURES.channels.primary)
      )
    })

    it('should pause an active recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, recordings } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await pauseRecording(TEST_FIXTURES.channels.primary)

      expect(mockClient.sendAction).toHaveBeenLastCalledWith({
        Action: 'PauseMixMonitor',
        Channel: TEST_FIXTURES.channels.primary,
        State: '1',
      })

      const recording = recordings.value.get(TEST_FIXTURES.channels.primary)
      expect(recording?.state).toBe('paused')
      expect(recording?.pausedAt).toBeInstanceOf(Date)
    })

    it('should call onRecordingPause callback', async () => {
      const onRecordingPause = vi.fn()
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording } = useAmiRecording(clientRef, { onRecordingPause })

      await startRecording(TEST_FIXTURES.channels.primary)
      await pauseRecording(TEST_FIXTURES.channels.primary)

      expect(onRecordingPause).toHaveBeenCalled()
      expect(onRecordingPause.mock.calls[0][0].state).toBe('paused')
    })
  })

  /**
   * Resume Recording Tests
   * Tests for resuming paused recordings
   */
  describe('resumeRecording', () => {
    it('should throw if recording not paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, resumeRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)

      await expect(resumeRecording(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.notPaused(TEST_FIXTURES.channels.primary)
      )
    })

    it('should resume a paused recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, resumeRecording, recordings } =
        useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await pauseRecording(TEST_FIXTURES.channels.primary)

      // Advance time to simulate pause duration
      vi.advanceTimersByTime(TEST_FIXTURES.timeouts.long)

      await resumeRecording(TEST_FIXTURES.channels.primary)

      expect(mockClient.sendAction).toHaveBeenLastCalledWith({
        Action: 'PauseMixMonitor',
        Channel: TEST_FIXTURES.channels.primary,
        State: '0',
      })

      const recording = recordings.value.get(TEST_FIXTURES.channels.primary)
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

      await startRecording(TEST_FIXTURES.channels.primary)
      await pauseRecording(TEST_FIXTURES.channels.primary)
      await resumeRecording(TEST_FIXTURES.channels.primary)

      expect(onRecordingResume).toHaveBeenCalled()
      expect(onRecordingResume.mock.calls[0][0].state).toBe('recording')
    })
  })

  /**
   * Toggle Recording Tests
   * Tests for toggling recording on/off
   */
  describe('toggleRecording', () => {
    it('should start recording if not recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { toggleRecording, isRecording } = useAmiRecording(clientRef)

      await toggleRecording(TEST_FIXTURES.channels.primary)

      expect(isRecording.value).toBe(true)
    })

    it('should stop recording if recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, toggleRecording, isRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      expect(isRecording.value).toBe(true)

      await toggleRecording(TEST_FIXTURES.channels.primary)
      expect(isRecording.value).toBe(false)
    })

    it('should stop recording if paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, toggleRecording, recordings } =
        useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await pauseRecording(TEST_FIXTURES.channels.primary)
      await toggleRecording(TEST_FIXTURES.channels.primary)

      expect(recordings.value.get(TEST_FIXTURES.channels.primary)?.state).toBe('stopped')
    })
  })

  /**
   * Toggle Pause Tests
   * Tests for toggling recording pause/resume
   */
  describe('togglePause', () => {
    it('should throw if no recording found', async () => {
      const { togglePause } = useAmiRecording(clientRef)

      await expect(togglePause(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.noRecording(TEST_FIXTURES.channels.primary)
      )
    })

    it('should pause if recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, togglePause, recordings } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await togglePause(TEST_FIXTURES.channels.primary)

      expect(recordings.value.get(TEST_FIXTURES.channels.primary)?.state).toBe('paused')
    })

    it('should resume if paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, togglePause, recordings } =
        useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await pauseRecording(TEST_FIXTURES.channels.primary)
      await togglePause(TEST_FIXTURES.channels.primary)

      expect(recordings.value.get(TEST_FIXTURES.channels.primary)?.state).toBe('recording')
    })

    it('should throw if recording stopped', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, togglePause } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await stopRecording(TEST_FIXTURES.channels.primary)

      await expect(togglePause(TEST_FIXTURES.channels.primary)).rejects.toThrow(
        TEST_FIXTURES.errors.toggleStopped
      )
    })
  })

  /**
   * Get Recording Tests
   * Tests for retrieving recording information
   */
  describe('getRecording', () => {
    it('should return undefined if no recording', () => {
      const { getRecording } = useAmiRecording(clientRef)

      expect(getRecording(TEST_FIXTURES.channels.primary)).toBeUndefined()
    })

    it('should return recording if exists', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, getRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      const recording = getRecording(TEST_FIXTURES.channels.primary)

      expect(recording).toBeDefined()
      expect(recording?.channel).toBe(TEST_FIXTURES.channels.primary)
    })
  })

  /**
   * Channel Recording Status Tests
   * Tests for checking if a channel is currently being recorded
   */
  describe('isChannelRecording', () => {
    it('should return false if no recording', () => {
      const { isChannelRecording } = useAmiRecording(clientRef)

      expect(isChannelRecording(TEST_FIXTURES.channels.primary)).toBe(false)
    })

    it('should return true if recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, isChannelRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)

      expect(isChannelRecording(TEST_FIXTURES.channels.primary)).toBe(true)
    })

    it('should return true if paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, isChannelRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await pauseRecording(TEST_FIXTURES.channels.primary)

      expect(isChannelRecording(TEST_FIXTURES.channels.primary)).toBe(true)
    })

    it('should return false if stopped', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, isChannelRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await stopRecording(TEST_FIXTURES.channels.primary)

      expect(isChannelRecording(TEST_FIXTURES.channels.primary)).toBe(false)
    })
  })

  /**
   * Recording Event Listener Tests
   * Tests for event subscription and notification system
   */
  describe('onRecordingEvent', () => {
    it('should register and call listener on events', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const listener = vi.fn()
      const { startRecording, onRecordingEvent } = useAmiRecording(clientRef)

      const unsubscribe = onRecordingEvent(listener)
      await startRecording(TEST_FIXTURES.channels.primary)

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'started',
          recording: expect.objectContaining({
            channel: TEST_FIXTURES.channels.primary,
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
      await startRecording(TEST_FIXTURES.channels.primary)
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      await stopRecording(TEST_FIXTURES.channels.primary)
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Recording Statistics Tests
   * Tests for gathering and calculating recording statistics
   */
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

      await startRecording(TEST_FIXTURES.channels.primary, { format: 'wav' })
      await startRecording(TEST_FIXTURES.channels.secondary, { format: 'gsm' })

      const stats = getStats()

      expect(stats.totalRecordings).toBe(2)
      expect(stats.byFormat.wav).toBe(1)
      expect(stats.byFormat.gsm).toBe(1)
      expect(stats.recordingsToday).toBe(2)
    })
  })

  /**
   * Clear Recordings Tests
   * Tests for clearing all recording state
   */
  describe('clearRecordings', () => {
    it('should clear all recordings', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, clearRecordings, recordings, activeCount } =
        useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await startRecording(TEST_FIXTURES.channels.secondary)

      expect(recordings.value.size).toBe(2)

      clearRecordings()

      expect(recordings.value.size).toBe(0)
      expect(activeCount.value).toBe(0)
    })
  })

  /**
   * Filename Generation Tests
   * Tests for automatic filename generation with various options
   */
  describe('generateFilename', () => {
    it('should generate filename with channel and timestamp', () => {
      const { generateFilename } = useAmiRecording(clientRef)

      const filename = generateFilename(TEST_FIXTURES.channels.primary)

      expect(filename).toMatch(/^recording-PJSIP_1001-00000001-\d+$/)
    })

    it('should generate filename with custom prefix', () => {
      const { generateFilename } = useAmiRecording(clientRef)

      const filename = generateFilename(TEST_FIXTURES.channels.primary, { prefix: 'call' })

      expect(filename).toMatch(/^call-PJSIP_1001-00000001-\d+$/)
    })

    it('should generate filename without timestamp', () => {
      const { generateFilename } = useAmiRecording(clientRef)

      const filename = generateFilename(TEST_FIXTURES.channels.primary, { timestamp: false })

      expect(filename).toBe('recording-PJSIP_1001-00000001')
    })
  })

  /**
   * Duration Tracking Tests
   * Tests for automatic duration tracking with configurable intervals
   */
  describe('duration tracking', () => {
    it('should track duration when enabled', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, recordings } = useAmiRecording(clientRef, {
        trackDuration: true,
        durationInterval: 1000,
      })

      await startRecording(TEST_FIXTURES.channels.primary)

      // Advance time
      vi.advanceTimersByTime(3000)

      const recording = recordings.value.get(TEST_FIXTURES.channels.primary)
      expect(recording?.duration).toBeGreaterThanOrEqual(2)
    })

    it('should not track duration when paused', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, pauseRecording, recordings } = useAmiRecording(clientRef, {
        trackDuration: true,
        durationInterval: 1000,
      })

      await startRecording(TEST_FIXTURES.channels.primary)
      vi.advanceTimersByTime(2000)

      await pauseRecording(TEST_FIXTURES.channels.primary)
      const durationAtPause = recordings.value.get(TEST_FIXTURES.channels.primary)?.duration

      vi.advanceTimersByTime(5000)

      // Duration should not increase while paused
      const currentDuration = recordings.value.get(TEST_FIXTURES.channels.primary)?.duration
      expect(currentDuration).toBe(durationAtPause)
    })
  })

  /**
   * Auto-Stop on Hangup Tests
   * Tests for automatic recording stop when channel hangs up
   */
  describe('auto-stop on hangup', () => {
    it('should stop recording on Hangup event when autoStop enabled', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())
      const onRecordingStop = vi.fn()

      const { startRecording, recordings } = useAmiRecording(clientRef, {
        autoStop: true,
        onRecordingStop,
      })

      await startRecording(TEST_FIXTURES.channels.primary)

      // Simulate Hangup event
      const hangupEvent = createAmiEvent('Hangup', {
        Channel: TEST_FIXTURES.channels.primary,
        Cause: '16',
        CauseTxt: 'Normal Clearing',
      })

      // Trigger event on mock client (via the handler registered in watch)
      mockClient._triggerEvent('event', hangupEvent)
      await nextTick()

      const recording = recordings.value.get(TEST_FIXTURES.channels.primary)
      expect(recording?.state).toBe('stopped')
      expect(onRecordingStop).toHaveBeenCalled()
    })
  })

  /**
   * Configuration Options Tests
   * Tests for composable configuration and default options
   */
  describe('options', () => {
    it('should use default format from options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, {
        defaultFormat: 'gsm',
      })

      const session = await startRecording(TEST_FIXTURES.channels.primary)

      expect(session.format).toBe('gsm')
    })

    it('should use default mixMode from options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, {
        defaultMixMode: 'read',
      })

      const session = await startRecording(TEST_FIXTURES.channels.primary)

      expect(session.mixMode).toBe('read')
    })

    it('should use default directory from options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording } = useAmiRecording(clientRef, {
        defaultDirectory: '/custom/recordings',
      })

      await startRecording(TEST_FIXTURES.channels.primary)

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          File: expect.stringContaining('/custom/recordings/'),
        })
      )
    })
  })

  /**
   * Multiple Recordings Tests
   * Tests for managing multiple concurrent recordings
   */
  describe('multiple recordings', () => {
    it('should handle multiple concurrent recordings', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, recordings, activeCount } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await startRecording(TEST_FIXTURES.channels.secondary)
      await startRecording(TEST_FIXTURES.channels.tertiary)

      expect(recordings.value.size).toBe(3)
      expect(activeCount.value).toBe(3)
    })

    it('should update currentRecording to first active recording', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(createAmiSuccessResponse())

      const { startRecording, stopRecording, currentRecording } = useAmiRecording(clientRef)

      await startRecording(TEST_FIXTURES.channels.primary)
      await startRecording(TEST_FIXTURES.channels.secondary)

      expect(currentRecording.value?.channel).toBe(TEST_FIXTURES.channels.primary)

      await stopRecording(TEST_FIXTURES.channels.primary)

      expect(currentRecording.value?.channel).toBe(TEST_FIXTURES.channels.secondary)
    })
  })
})
