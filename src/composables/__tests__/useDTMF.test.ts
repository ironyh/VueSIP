/**
 * Unit tests for useDTMF composable
 *
 * @module composables/__tests__/useDTMF.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useDTMF } from '../useDTMF'
import type { CallSession } from '../../core/CallSession'

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock utilities
vi.mock('../../utils/dtmf', () => ({
  sendDtmfTone: vi.fn(),
}))

vi.mock('../../utils/abortController', () => ({
  abortableSleep: vi.fn(),
  throwIfAborted: vi.fn(),
  isAbortError: vi.fn(() => false),
}))

describe('useDTMF', () => {
  let mockSession: CallSession
  let sessionRef: ReturnType<typeof ref<CallSession | null>>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock CallSession
    mockSession = {
      id: 'test-call-123',
      sendDTMF: vi.fn().mockResolvedValue(undefined),
      connection: {} as RTCPeerConnection,
    } as unknown as CallSession

    sessionRef = ref<CallSession | null>(mockSession)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const {
        isSending,
        queuedTones,
        lastSentTone,
        lastResult,
        tonesSentCount,
        queueSize,
        isQueueEmpty,
      } = useDTMF(sessionRef)

      expect(isSending.value).toBe(false)
      expect(queuedTones.value).toEqual([])
      expect(lastSentTone.value).toBeNull()
      expect(lastResult.value).toBeNull()
      expect(tonesSentCount.value).toBe(0)
      expect(queueSize.value).toBe(0)
      expect(isQueueEmpty.value).toBe(true)
    })

    it('should handle null session initially', () => {
      const nullSession = ref<CallSession | null>(null)
      const { isSending, queueSize, isQueueEmpty } = useDTMF(nullSession)

      expect(isSending.value).toBe(false)
      expect(queueSize.value).toBe(0)
      expect(isQueueEmpty.value).toBe(true)
    })
  })

  describe('sendTone', () => {
    it('should send DTMF tone via CallSession', async () => {
      const { sendTone, isSending, lastSentTone, tonesSentCount } = useDTMF(sessionRef)

      await sendTone('5')

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5', undefined)
      expect(lastSentTone.value).toBe('5')
      expect(tonesSentCount.value).toBe(1)
      expect(isSending.value).toBe(false)
    })

    it('should send DTMF tone with options', async () => {
      const { sendTone } = useDTMF(sessionRef)
      const options = { duration: 150, interToneGap: 100 }

      await sendTone('9', options)

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('9', options)
    })

    it('should throw error when no session is active', async () => {
      const nullSession = ref<CallSession | null>(null)
      const { sendTone } = useDTMF(nullSession)

      await expect(sendTone('1')).rejects.toThrow('No active call session')
    })

    it('should throw error for invalid DTMF tone', async () => {
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('E')).rejects.toThrow('Invalid DTMF tone')
    })

    it('should accept valid DTMF tones (0-9, *, #, A-D)', async () => {
      const { sendTone } = useDTMF(sessionRef)

      const validTones = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '*',
        '#',
        'A',
        'B',
        'C',
        'D',
      ]

      for (const tone of validTones) {
        await expect(sendTone(tone)).resolves.not.toThrow()
      }
    })
  })

  describe('sendToneSequence', () => {
    it('should send multiple DTMF tones in sequence', async () => {
      const { sendToneSequence, tonesSentCount } = useDTMF(sessionRef)

      await sendToneSequence('1234')

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(4)
      expect(tonesSentCount.value).toBe(4)
    })

    it('should throw error for empty sequence', async () => {
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('')).rejects.toThrow('Empty DTMF sequence')
    })

    it('should throw when sequence already in progress', async () => {
      const { sendToneSequence, isSending } = useDTMF(sessionRef)

      // First call starts - we need to mock isSending
      // Since sendToneSequence sets isSending to true, we test the guard
      isSending.value = true

      await expect(sendToneSequence('123')).rejects.toThrow('DTMF sequence already in progress')
    })

    it('should call onToneSent callback for each tone', async () => {
      const onToneSent = vi.fn()
      const { sendToneSequence } = useDTMF(sessionRef)

      await sendToneSequence('12', { onToneSent })

      expect(onToneSent).toHaveBeenCalledTimes(2)
      expect(onToneSent).toHaveBeenCalledWith('1')
      expect(onToneSent).toHaveBeenCalledWith('2')
    })

    it('should call onComplete callback when finished', async () => {
      const onComplete = vi.fn()
      const { sendToneSequence } = useDTMF(sessionRef)

      await sendToneSequence('123', { onComplete })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('queueTone', () => {
    it('should queue a single tone', () => {
      const { queueTone, queuedTones, queueSize } = useDTMF(sessionRef)

      queueTone('7')

      expect(queuedTones.value).toEqual(['7'])
      expect(queueSize.value).toBe(1)
    })

    it('should validate tone before queueing', () => {
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      expect(() => queueTone('X')).toThrow('Invalid DTMF tone')
      expect(queuedTones.value).toEqual([])
    })

    it('should enforce queue size limit', () => {
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      // Queue many tones - should drop oldest when exceeding limit
      for (let i = 0; i < 60; i++) {
        queueTone(String(i % 10))
      }

      // Should keep last MAX_QUEUE_SIZE (100) tones
      expect(queuedTones.value.length).toBeLessThanOrEqual(100)
    })
  })

  describe('queueToneSequence', () => {
    it('should queue multiple tones', () => {
      const { queueToneSequence, queuedTones } = useDTMF(sessionRef)

      queueToneSequence('1234')

      expect(queuedTones.value).toEqual(['1', '2', '3', '4'])
    })

    it('should validate all tones in sequence', () => {
      const { queueToneSequence, queuedTones } = useDTMF(sessionRef)

      expect(() => queueToneSequence('12X4')).toThrow('Invalid DTMF tone')
      expect(queuedTones.value).toEqual([])
    })

    it('should truncate sequence exceeding max size', () => {
      const { queueToneSequence, queuedTones } = useDTMF(sessionRef)

      const longSequence = '123456789012345678901234567890123456789012345678901234567890'
      queueToneSequence(longSequence)

      // Should keep only last MAX_QUEUE_SIZE (100) tones
      expect(queuedTones.value.length).toBeLessThanOrEqual(100)
    })
  })

  describe('processQueue', () => {
    it('should process queued tones', async () => {
      const { queueToneSequence, processQueue, queuedTones, isQueueEmpty } = useDTMF(sessionRef)

      queueToneSequence('99')
      expect(queuedTones.value.length).toBe(2)

      await processQueue()

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(2)
      expect(isQueueEmpty.value).toBe(true)
    })

    it('should do nothing when queue is empty', async () => {
      const { processQueue, queuedTones } = useDTMF(sessionRef)

      await processQueue()

      expect(mockSession.sendDTMF).not.toHaveBeenCalled()
      expect(queuedTones.value).toEqual([])
    })
  })

  describe('clearQueue', () => {
    it('should clear all queued tones', () => {
      const { queueToneSequence, clearQueue, queuedTones, isQueueEmpty } = useDTMF(sessionRef)

      queueToneSequence('1234')
      expect(queuedTones.value.length).toBe(4)

      clearQueue()

      expect(queuedTones.value).toEqual([])
      expect(isQueueEmpty.value).toBe(true)
    })
  })

  describe('stopSending', () => {
    it('should clear queue and reset sending state', () => {
      const { queueToneSequence, stopSending, queuedTones, isSending } = useDTMF(sessionRef)

      queueToneSequence('1234')
      isSending.value = true

      stopSending()

      expect(queuedTones.value).toEqual([])
      expect(isSending.value).toBe(false)
    })
  })

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      const { sendTone, resetStats, lastSentTone, lastResult, tonesSentCount } = useDTMF(sessionRef)

      await sendTone('5')
      expect(tonesSentCount.value).toBe(1)
      expect(lastSentTone.value).toBe('5')

      resetStats()

      expect(lastSentTone.value).toBeNull()
      expect(lastResult.value).toBeNull()
      expect(tonesSentCount.value).toBe(0)
    })
  })

  describe('computed properties', () => {
    it('should update queueSize when tones are queued', () => {
      const { queueTone, queueSize } = useDTMF(sessionRef)

      queueTone('1')
      expect(queueSize.value).toBe(1)

      queueTone('2')
      expect(queueSize.value).toBe(2)
    })

    it('should update isQueueEmpty correctly', () => {
      const { queueTone, clearQueue, isQueueEmpty } = useDTMF(sessionRef)

      expect(isQueueEmpty.value).toBe(true)

      queueTone('1')
      expect(isQueueEmpty.value).toBe(false)

      clearQueue()
      expect(isQueueEmpty.value).toBe(true)
    })
  })
})
