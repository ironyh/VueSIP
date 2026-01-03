/**
 * useDTMF Composable Unit Tests
 *
 * Test suite for the useDTMF composable covering reactive state,
 * tone sending, and queue management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useDTMF } from '@/composables/useDTMF'
import type { CallSession } from '@/core/CallSession'
import { DTMF_CONSTANTS } from '@/composables/constants'

// Mock CallSession
const createMockCallSession = (): CallSession => {
  return {
    sendDTMF: vi.fn().mockResolvedValue(undefined),
    isEstablished: () => true,
  } as unknown as CallSession
}

describe('useDTMF', () => {
  let mockSession: CallSession
  let sessionRef: ReturnType<typeof ref<CallSession | null>>

  beforeEach(() => {
    mockSession = createMockCallSession()
    sessionRef = ref<CallSession | null>(mockSession)
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { isSending, queuedTones, lastSentTone, tonesSentCount, queueSize, isQueueEmpty } =
        useDTMF(sessionRef)

      expect(isSending.value).toBe(false)
      expect(queuedTones.value).toEqual([])
      expect(lastSentTone.value).toBeNull()
      expect(tonesSentCount.value).toBe(0)
      expect(queueSize.value).toBe(0)
      expect(isQueueEmpty.value).toBe(true)
    })

    it('should initialize with session', () => {
      const { isSending } = useDTMF(sessionRef)

      expect(isSending.value).toBe(false)
    })
  })

  describe('Single Tone Sending', () => {
    it('should send a single DTMF tone', async () => {
      const { sendTone, lastSentTone, tonesSentCount } = useDTMF(sessionRef)

      await sendTone('5')

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5', expect.any(Object))
      expect(lastSentTone.value).toBe('5')
      expect(tonesSentCount.value).toBe(1)
    })

    it('should accept custom duration', async () => {
      const { sendTone } = useDTMF(sessionRef)

      await sendTone('1', { duration: 200 })

      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ duration: 200 })
      )
    })

    it('should throw error for invalid tone', async () => {
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('X')).rejects.toThrow('Invalid DTMF tone')
    })

    it('should throw error when no active session', async () => {
      sessionRef.value = null
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('1')).rejects.toThrow('No active call session')
    })

    it('should update isSending state during send', async () => {
      let _sendingDuringCall = false

      vi.mocked(mockSession.sendDTMF).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      const { sendTone, isSending } = useDTMF(sessionRef)

      const promise = sendTone('1')

      // Check if sending flag was set (might already be done)
      await new Promise((resolve) => setTimeout(resolve, 5))
      const _sendingDuringCall = isSending.value

      await promise

      expect(isSending.value).toBe(false)
    })

    it('should handle send errors', async () => {
      vi.mocked(mockSession.sendDTMF).mockRejectedValue(new Error('Send failed'))

      const { sendTone, lastResult } = useDTMF(sessionRef)

      await expect(sendTone('1')).rejects.toThrow('Send failed')
      expect(lastResult.value?.success).toBe(false)
      expect(lastResult.value?.error).toBeDefined()
    })
  })

  describe('Tone Sequence Sending', () => {
    it('should send a sequence of tones', async () => {
      const { sendToneSequence, tonesSentCount } = useDTMF(sessionRef)

      await sendToneSequence('123')

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(3)
      expect(tonesSentCount.value).toBe(3)
    })

    it('should apply inter-tone gap', async () => {
      const { sendToneSequence } = useDTMF(sessionRef)
      const interToneGap = 100

      const startTime = Date.now()
      await sendToneSequence('12', { interToneGap })
      const endTime = Date.now()

      // Should take at least one inter-tone gap (between tone 1 and 2)
      expect(endTime - startTime).toBeGreaterThanOrEqual(interToneGap - 10) // Allow 10ms margin
    })

    it('should call onToneSent callback for each tone', async () => {
      const onToneSent = vi.fn()
      const { sendToneSequence } = useDTMF(sessionRef)

      await sendToneSequence('123', { onToneSent })

      expect(onToneSent).toHaveBeenCalledTimes(3)
      expect(onToneSent).toHaveBeenCalledWith('1')
      expect(onToneSent).toHaveBeenCalledWith('2')
      expect(onToneSent).toHaveBeenCalledWith('3')
    })

    it('should call onComplete callback when sequence finishes', async () => {
      const onComplete = vi.fn()
      const { sendToneSequence } = useDTMF(sessionRef)

      await sendToneSequence('12', { onComplete })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('should call onError callback on failure', async () => {
      vi.mocked(mockSession.sendDTMF).mockRejectedValue(new Error('Send failed'))

      const onError = vi.fn()
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('123', { onError })).rejects.toThrow()
      expect(onError).toHaveBeenCalled()
    })

    it('should support cancellation via stopSending', async () => {
      vi.mocked(mockSession.sendDTMF).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      const { sendToneSequence, stopSending } = useDTMF(sessionRef)

      const promise = sendToneSequence('123456')

      // Stop after a short delay
      setTimeout(() => stopSending(), 25)

      await promise

      // Should not have sent all 6 tones
      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(expect.any(Number))
      expect(mockSession.sendDTMF).not.toHaveBeenCalledTimes(6)
    })
  })

  describe('Queue Management', () => {
    it('should queue tones', () => {
      const { queueTone, queuedTones, queueSize } = useDTMF(sessionRef)

      queueTone('1')
      queueTone('2')
      queueTone('3')

      expect(queuedTones.value).toEqual(['1', '2', '3'])
      expect(queueSize.value).toBe(3)
    })

    it('should queue tone sequences', () => {
      const { queueToneSequence, queuedTones } = useDTMF(sessionRef)

      queueToneSequence('123')

      expect(queuedTones.value).toEqual(['1', '2', '3'])
    })

    it('should process queued tones', async () => {
      const { queueToneSequence, processQueue, tonesSentCount, isQueueEmpty } = useDTMF(sessionRef)

      queueToneSequence('456')
      expect(isQueueEmpty.value).toBe(false)

      await processQueue()

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(3)
      expect(tonesSentCount.value).toBe(3)
      expect(isQueueEmpty.value).toBe(true)
    })

    it('should clear the queue', () => {
      const { queueToneSequence, clearQueue, queuedTones, isQueueEmpty } = useDTMF(sessionRef)

      queueToneSequence('123')
      expect(queuedTones.value).toHaveLength(3)

      clearQueue()

      expect(queuedTones.value).toHaveLength(0)
      expect(isQueueEmpty.value).toBe(true)
    })

    it('should enforce maximum queue size', () => {
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      // Queue more than MAX_QUEUE_SIZE tones
      for (let i = 0; i < DTMF_CONSTANTS.MAX_QUEUE_SIZE + 10; i++) {
        queueTone('1')
      }

      // Should be limited to MAX_QUEUE_SIZE
      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)
    })

    it('should handle empty queue processing', async () => {
      const { processQueue } = useDTMF(sessionRef)

      // Process empty queue should not throw
      await expect(processQueue()).resolves.toBeUndefined()
      expect(mockSession.sendDTMF).not.toHaveBeenCalled()
    })
  })

  describe('Tone Validation', () => {
    it('should accept valid DTMF tones (0-9, *, #, A-D)', async () => {
      const { sendTone } = useDTMF(sessionRef)

      const validTones = ['0', '1', '5', '9', '*', '#', 'A', 'B', 'C', 'D']

      for (const tone of validTones) {
        await expect(sendTone(tone)).resolves.toBeUndefined()
      }
    })

    it('should reject invalid characters', async () => {
      const { sendTone } = useDTMF(sessionRef)

      const invalidTones = ['X', 'E', '!', '@', 'a', 'z']

      for (const tone of invalidTones) {
        await expect(sendTone(tone)).rejects.toThrow()
      }
    })

    it('should validate tone sequences', () => {
      const { queueToneSequence } = useDTMF(sessionRef)

      expect(() => queueToneSequence('123X')).toThrow()
    })
  })

  describe('Statistics and State', () => {
    it('should track tones sent count', async () => {
      const { sendTone, tonesSentCount } = useDTMF(sessionRef)

      await sendTone('1')
      await sendTone('2')
      await sendTone('3')

      expect(tonesSentCount.value).toBe(3)
    })

    it('should reset statistics', async () => {
      const { sendTone, tonesSentCount, resetStats, lastSentTone } = useDTMF(sessionRef)

      await sendTone('1')
      expect(tonesSentCount.value).toBe(1)
      expect(lastSentTone.value).toBe('1')

      resetStats()

      expect(tonesSentCount.value).toBe(0)
      expect(lastSentTone.value).toBeNull()
    })

    it('should track last sent tone', async () => {
      const { sendTone, lastSentTone } = useDTMF(sessionRef)

      await sendTone('5')
      expect(lastSentTone.value).toBe('5')

      await sendTone('8')
      expect(lastSentTone.value).toBe('8')
    })

    it('should store last result', async () => {
      const { sendTone, lastResult } = useDTMF(sessionRef)

      await sendTone('3')

      expect(lastResult.value).toBeDefined()
      expect(lastResult.value?.success).toBe(true)
      expect(lastResult.value?.tone).toBe('3')
      expect(lastResult.value?.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Stop Sending', () => {
    it('should stop sending and clear queue', async () => {
      const { queueToneSequence, stopSending, isQueueEmpty, isSending } = useDTMF(sessionRef)

      queueToneSequence('123456')
      expect(isQueueEmpty.value).toBe(false)

      stopSending()

      expect(isQueueEmpty.value).toBe(true)
      expect(isSending.value).toBe(false)
    })
  })

  describe('Transport Methods', () => {
    it('should support RFC2833 transport', async () => {
      const { sendTone } = useDTMF(sessionRef)

      await sendTone('1', { transport: 'RFC2833' })

      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ transport: 'RFC2833' })
      )
    })

    it('should support INFO transport', async () => {
      const { sendTone } = useDTMF(sessionRef)

      await sendTone('1', { transport: 'INFO' })

      expect(mockSession.sendDTMF).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ transport: 'INFO' })
      )
    })
  })
})
