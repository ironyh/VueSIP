/**
 * useDTMF composable unit tests
 * Tests for Phase 6.11 improvements: DTMF queue size limit enforcement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useDTMF } from '@/composables/useDTMF'
import type { CallSession } from '@/core/CallSession'
import { DTMF_CONSTANTS } from '@/composables/constants'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useDTMF - Phase 6.11 Queue Limit Enforcement', () => {
  let mockSession: any

  beforeEach(() => {
    mockSession = {
      id: 'test-session',
      state: 'active',
      sendDTMF: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe('Queue Size Limit - Single Tone', () => {
    it('should enforce MAX_QUEUE_SIZE limit when queueing individual tones', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      // Queue MAX_QUEUE_SIZE tones
      for (let i = 0; i < DTMF_CONSTANTS.MAX_QUEUE_SIZE; i++) {
        queueTone('1')
      }

      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)

      // Queue one more - should still be at MAX_QUEUE_SIZE
      queueTone('2')
      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)
    })

    it('should drop oldest tone when queue is full', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      // Fill queue with numbered tones
      for (let i = 0; i < DTMF_CONSTANTS.MAX_QUEUE_SIZE; i++) {
        queueTone((i % 10).toString())
      }

      // First tone should be '0'
      expect(queuedTones.value[0]).toBe('0')

      // Queue 'X' - should drop '0' and add 'X' at end
      queueTone('#')
      expect(queuedTones.value[0]).not.toBe('0')
      expect(queuedTones.value[0]).toBe('1')
      expect(queuedTones.value[queuedTones.value.length - 1]).toBe('#')
    })

    it('should maintain LRU (Least Recently Used) eviction order', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      // Queue tones A, B, C when queue is full
      for (let i = 0; i < DTMF_CONSTANTS.MAX_QUEUE_SIZE; i++) {
        queueTone('1')
      }

      queueTone('*') // Drop first '1', add '*'
      queueTone('#') // Drop second '1', add '#'

      // Last two should be '*' and '#'
      expect(queuedTones.value[queuedTones.value.length - 2]).toBe('*')
      expect(queuedTones.value[queuedTones.value.length - 1]).toBe('#')
    })
  })

  describe('Queue Size Limit - Tone Sequence', () => {
    it('should enforce MAX_QUEUE_SIZE limit when queueing sequences', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueToneSequence, queuedTones } = useDTMF(sessionRef)

      // Create a sequence longer than MAX_QUEUE_SIZE
      const longSequence = '1'.repeat(DTMF_CONSTANTS.MAX_QUEUE_SIZE + 50)

      queueToneSequence(longSequence)

      // Should be capped at MAX_QUEUE_SIZE
      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)
    })

    it('should drop exact number of oldest tones needed for sequence', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queueToneSequence, queuedTones } = useDTMF(sessionRef)

      // Fill queue almost to limit (leave room for 5)
      for (let i = 0; i < DTMF_CONSTANTS.MAX_QUEUE_SIZE - 5; i++) {
        queueTone('1')
      }

      // Queue 10 more (should drop 5 oldest)
      queueToneSequence('2222222222') // 10 tones

      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)

      // First 5 '1's should be dropped, last ones should be '2's
      const lastTen = queuedTones.value.slice(-10)
      expect(lastTen.every((t) => t === '2')).toBe(true)
    })

    it('should handle sequence that exactly fills queue', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueToneSequence, queuedTones } = useDTMF(sessionRef)

      const sequence = '1'.repeat(DTMF_CONSTANTS.MAX_QUEUE_SIZE)
      queueToneSequence(sequence)

      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)
      expect(queuedTones.value.every((t) => t === '1')).toBe(true)
    })

    it('should handle multiple small sequences within limit', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueToneSequence, queuedTones } = useDTMF(sessionRef)

      // Queue multiple sequences that sum to less than limit
      queueToneSequence('123')
      queueToneSequence('456')
      queueToneSequence('789')

      expect(queuedTones.value.length).toBe(9)
      expect(queuedTones.value.join('')).toBe('123456789')
    })
  })

  describe('Queue Limit Edge Cases', () => {
    it('should handle empty queue correctly', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queuedTones } = useDTMF(sessionRef)

      expect(queuedTones.value.length).toBe(0)
    })

    it('should handle queueing exactly at limit boundary', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      // Queue exactly MAX_QUEUE_SIZE - 1
      for (let i = 0; i < DTMF_CONSTANTS.MAX_QUEUE_SIZE - 1; i++) {
        queueTone('1')
      }

      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE - 1)

      // One more should fit without dropping
      queueTone('2')
      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)

      // One more should trigger drop
      queueTone('3')
      expect(queuedTones.value.length).toBe(DTMF_CONSTANTS.MAX_QUEUE_SIZE)
      expect(queuedTones.value[0]).toBe('1') // First one was NOT dropped
      expect(queuedTones.value[1]).toBe('1') // Second '1' became first after drop
    })

    it('should work correctly after clearing queue', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, clearQueue, queuedTones } = useDTMF(sessionRef)

      // Fill queue
      for (let i = 0; i < 50; i++) {
        queueTone('1')
      }

      // Clear it
      clearQueue()
      expect(queuedTones.value.length).toBe(0)

      // Should be able to queue again
      queueTone('2')
      expect(queuedTones.value.length).toBe(1)
      expect(queuedTones.value[0]).toBe('2')
    })
  })

  describe('Valid DTMF Tones', () => {
    it('should accept valid DTMF tones 0-9', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      for (let i = 0; i <= 9; i++) {
        queueTone(i.toString())
      }

      expect(queuedTones.value.length).toBe(10)
    })

    it('should accept * and # tones', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      queueTone('*')
      queueTone('#')

      expect(queuedTones.value).toEqual(['*', '#'])
    })

    it('should accept A-D tones', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queuedTones } = useDTMF(sessionRef)

      queueTone('A')
      queueTone('B')
      queueTone('C')
      queueTone('D')

      expect(queuedTones.value).toEqual(['A', 'B', 'C', 'D'])
    })

    it('should reject invalid tones', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone } = useDTMF(sessionRef)

      expect(() => queueTone('X')).toThrow()
      expect(() => queueTone('invalid')).toThrow()
      expect(() => queueTone('')).toThrow()
    })
  })

  describe('Queue Processing', () => {
    it('should process queue without exceeding limit', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, processQueue, queuedTones } = useDTMF(sessionRef)

      // Queue some tones
      for (let i = 0; i < 10; i++) {
        queueTone('1')
      }

      await processQueue()

      // Queue should be empty after processing
      expect(queuedTones.value.length).toBe(0)
    })
  })

  describe('sendTone() method', () => {
    it('should send a single DTMF tone successfully', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, lastSentTone, lastResult, tonesSentCount } = useDTMF(sessionRef)

      await sendTone('5')

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5', undefined)
      expect(lastSentTone.value).toBe('5')
      expect(lastResult.value?.success).toBe(true)
      expect(lastResult.value?.tone).toBe('5')
      expect(tonesSentCount.value).toBe(1)
    })

    it('should send tone with custom options', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone } = useDTMF(sessionRef)

      const options = { duration: 200, transport: 'RFC2833' as const }
      await sendTone('9', options)

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('9', options)
    })

    it('should throw error if no active session', async () => {
      const sessionRef = ref<CallSession | null>(null)
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('1')).rejects.toThrow('No active call session')
    })

    it('should throw error for invalid tone', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('X')).rejects.toThrow('Invalid DTMF tone')
    })

    it('should set isSending flag during send', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, isSending } = useDTMF(sessionRef)

      let sendingDuringCall = false
      mockSession.sendDTMF = vi.fn(async () => {
        sendingDuringCall = isSending.value
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      await sendTone('1')

      expect(sendingDuringCall).toBe(true)
      expect(isSending.value).toBe(false)
    })

    it('should reset isSending flag on error', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, isSending } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn().mockRejectedValue(new Error('Send failed'))

      await expect(sendTone('1')).rejects.toThrow('Send failed')
      expect(isSending.value).toBe(false)
    })

    it('should update lastResult on error', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, lastResult } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn().mockRejectedValue(new Error('Send failed'))

      await expect(sendTone('1')).rejects.toThrow('Send failed')

      expect(lastResult.value?.success).toBe(false)
      expect(lastResult.value?.tone).toBe('1')
      expect(lastResult.value?.error?.message).toBe('Send failed')
    })

    it('should handle non-Error exception by wrapping in Error', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, lastResult } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn().mockRejectedValue('string error')

      await expect(sendTone('1')).rejects.toThrow('DTMF send failed')

      expect(lastResult.value?.success).toBe(false)
      expect(lastResult.value?.error?.message).toBe('DTMF send failed')
    })

    it('should increment tonesSentCount on each successful send', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, tonesSentCount } = useDTMF(sessionRef)

      await sendTone('1')
      expect(tonesSentCount.value).toBe(1)

      await sendTone('2')
      expect(tonesSentCount.value).toBe(2)

      await sendTone('3')
      expect(tonesSentCount.value).toBe(3)
    })
  })

  describe('sendToneSequence() method', () => {
    it('should send a sequence of tones', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      await sendToneSequence('123')

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(3)
      expect(mockSession.sendDTMF).toHaveBeenNthCalledWith(1, '1', expect.anything())
      expect(mockSession.sendDTMF).toHaveBeenNthCalledWith(2, '2', expect.anything())
      expect(mockSession.sendDTMF).toHaveBeenNthCalledWith(3, '3', expect.anything())
    })

    it('should throw error if no active session', async () => {
      const sessionRef = ref<CallSession | null>(null)
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('123')).rejects.toThrow('No active call session')
    })

    it('should call onToneSent callback for each tone', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const sentTones: string[] = []
      await sendToneSequence('456', {
        onToneSent: (tone) => sentTones.push(tone),
      })

      expect(sentTones).toEqual(['4', '5', '6'])
    })

    it('should call onComplete callback when sequence finishes', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      let completed = false
      await sendToneSequence('789', {
        onComplete: () => {
          completed = true
        },
      })

      expect(completed).toBe(true)
    })

    it('should call onError callback on tone failure', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn().mockImplementation(async (tone: string) => {
        if (tone === '2') {
          throw new Error('Tone 2 failed')
        }
      })

      const errors: Array<{ error: Error; tone: string }> = []
      await expect(
        sendToneSequence('123', {
          onError: (error, tone) => errors.push({ error, tone }),
        })
      ).rejects.toThrow('Tone 2 failed')

      expect(errors.length).toBe(1)
      expect(errors[0].tone).toBe('2')
    })

    it('should stop sequence on first error', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn().mockImplementation(async (tone: string) => {
        if (tone === '2') {
          throw new Error('Tone 2 failed')
        }
      })

      await expect(sendToneSequence('12345')).rejects.toThrow('Tone 2 failed')

      // Should have tried to send only tones 1 and 2
      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(2)
    })

    it('should handle non-Error exception in sequence via sendTone wrapping', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)
      const onError = vi.fn()

      mockSession.sendDTMF = vi.fn().mockImplementation(async (tone: string) => {
        if (tone === '2') {
          throw 'string error in sequence' // Non-Error exception
        }
      })

      // sendTone wraps non-Error exceptions with 'DTMF send failed'
      await expect(sendToneSequence('123', { onError })).rejects.toThrow('DTMF send failed')

      // onError callback should receive a wrapped Error from sendTone
      expect(onError).toHaveBeenCalled()
      const errorArg = onError.mock.calls[0][0]
      expect(errorArg).toBeInstanceOf(Error)
      expect(errorArg.message).toBe('DTMF send failed')
    })

    it('should respect custom duration and interToneGap', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      await sendToneSequence('12', {
        duration: 150,
        interToneGap: 50,
      })

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('1', {
        duration: 150,
        transport: undefined,
      })
      expect(mockSession.sendDTMF).toHaveBeenCalledWith('2', {
        duration: 150,
        transport: undefined,
      })
    })

    it('should set isSending flag during sequence', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence, isSending } = useDTMF(sessionRef)

      let sendingDuringSequence = false
      mockSession.sendDTMF = vi.fn(async () => {
        if (!sendingDuringSequence) {
          sendingDuringSequence = isSending.value
        }
      })

      await sendToneSequence('123')

      expect(sendingDuringSequence).toBe(true)
      expect(isSending.value).toBe(false)
    })

    it('should reject second sendToneSequence when first is in progress (CallSession path)', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      // Keep first sequence in progress: sendDTMF returns a promise that resolves after a delay
      mockSession.sendDTMF = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)))

      const firstPromise = sendToneSequence('12')
      const secondPromise = sendToneSequence('34')

      await expect(secondPromise).rejects.toThrow('DTMF sequence already in progress')
      await firstPromise
    })

    it('should not call onComplete if cancelled', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence, stopSending } = useDTMF(sessionRef)

      let completed = false
      mockSession.sendDTMF = vi.fn(async () => {
        stopSending()
      })

      await sendToneSequence('123', {
        onComplete: () => {
          completed = true
        },
      })

      expect(completed).toBe(false)
    })
  })

  describe('stopSending() method', () => {
    it('should clear queue when called', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, stopSending, queuedTones } = useDTMF(sessionRef)

      queueTone('1')
      queueTone('2')
      queueTone('3')

      expect(queuedTones.value.length).toBe(3)

      stopSending()

      expect(queuedTones.value.length).toBe(0)
    })

    it('should reset isSending flag', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { stopSending, isSending } = useDTMF(sessionRef)

      // Manually set isSending
      isSending.value = true

      stopSending()

      expect(isSending.value).toBe(false)
    })

    it('should cancel in-progress sequence', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence, stopSending } = useDTMF(sessionRef)

      let callCount = 0
      mockSession.sendDTMF = vi.fn(async () => {
        callCount++
        if (callCount === 2) {
          stopSending()
        }
      })

      await sendToneSequence('12345')

      // Should stop after 2 tones
      expect(callCount).toBeLessThan(5)
    })
  })

  describe('resetStats() method', () => {
    it('should reset tonesSentCount to zero', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, resetStats, tonesSentCount } = useDTMF(sessionRef)

      await sendTone('1')
      await sendTone('2')

      expect(tonesSentCount.value).toBe(2)

      resetStats()

      expect(tonesSentCount.value).toBe(0)
    })

    it('should clear lastSentTone', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, resetStats, lastSentTone } = useDTMF(sessionRef)

      await sendTone('5')

      expect(lastSentTone.value).toBe('5')

      resetStats()

      expect(lastSentTone.value).toBeNull()
    })

    it('should clear lastResult', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, resetStats, lastResult } = useDTMF(sessionRef)

      await sendTone('9')

      expect(lastResult.value).not.toBeNull()

      resetStats()

      expect(lastResult.value).toBeNull()
    })
  })

  describe('Computed Properties', () => {
    it('should compute queueSize correctly', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, queueSize } = useDTMF(sessionRef)

      expect(queueSize.value).toBe(0)

      queueTone('1')
      expect(queueSize.value).toBe(1)

      queueTone('2')
      expect(queueSize.value).toBe(2)

      queueTone('3')
      expect(queueSize.value).toBe(3)
    })

    it('should compute isQueueEmpty correctly', () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, clearQueue, isQueueEmpty } = useDTMF(sessionRef)

      expect(isQueueEmpty.value).toBe(true)

      queueTone('1')
      expect(isQueueEmpty.value).toBe(false)

      clearQueue()
      expect(isQueueEmpty.value).toBe(true)
    })
  })

  describe('processQueue() method', () => {
    it('should do nothing if queue is empty', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { processQueue } = useDTMF(sessionRef)

      await processQueue()

      expect(mockSession.sendDTMF).not.toHaveBeenCalled()
    })

    it('should send all queued tones', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, processQueue } = useDTMF(sessionRef)

      queueTone('1')
      queueTone('2')
      queueTone('3')

      await processQueue()

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(3)
    })

    it('should clear queue after processing', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, processQueue, queuedTones } = useDTMF(sessionRef)

      queueTone('1')
      queueTone('2')

      await processQueue()

      expect(queuedTones.value.length).toBe(0)
    })

    it('should pass options to sendToneSequence', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, processQueue } = useDTMF(sessionRef)

      queueTone('1')
      queueTone('2')

      const onComplete = vi.fn()
      await processQueue({ onComplete })

      expect(onComplete).toHaveBeenCalled()
    })

    it('should throw error if sending fails', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, processQueue } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn().mockRejectedValue(new Error('Send failed'))

      queueTone('1')

      await expect(processQueue()).rejects.toThrow('Send failed')
    })

    it('should clear queue even if sending fails', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { queueTone, processQueue, queuedTones } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn().mockRejectedValue(new Error('Send failed'))

      queueTone('1')
      queueTone('2')

      expect(queuedTones.value.length).toBe(2)

      await expect(processQueue()).rejects.toThrow('Send failed')

      // Queue should be cleared before attempting to send
      expect(queuedTones.value.length).toBe(0)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle session becoming null during operation', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      mockSession.sendDTMF = vi.fn(async () => {
        sessionRef.value = null
      })

      // Should fail when trying to send second tone
      await expect(sendToneSequence('12')).rejects.toThrow()
    })

    it('should validate all tones in sequence before sending', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('12X')).rejects.toThrow('Invalid DTMF tone')

      // Should not have sent any tones
      expect(mockSession.sendDTMF).not.toHaveBeenCalled()
    })

    it('should handle empty sequence', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('')).rejects.toThrow('Empty DTMF sequence')
      expect(mockSession.sendDTMF).not.toHaveBeenCalled()
    })

    it('should handle rapid successive calls', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, tonesSentCount } = useDTMF(sessionRef)

      // Send multiple tones rapidly
      await Promise.all([sendTone('1'), sendTone('2'), sendTone('3')])

      expect(tonesSentCount.value).toBe(3)
    })

    it('should maintain state consistency across operations', async () => {
      const sessionRef = ref<CallSession>(mockSession)
      const { sendTone, queueTone, processQueue, tonesSentCount, queuedTones } = useDTMF(sessionRef)

      // Send immediate
      await sendTone('1')
      expect(tonesSentCount.value).toBe(1)

      // Queue and process
      queueTone('2')
      queueTone('3')
      await processQueue()

      expect(tonesSentCount.value).toBe(3)
      expect(queuedTones.value.length).toBe(0)
    })
  })
})
