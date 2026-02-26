/**
 * useDTMF composable unit tests (DtmfSessionSource path)
 * Tests for AbortController integration and low-level DTMF sending
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useDTMF } from '@/composables/useDTMF'

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useDTMF (DtmfSessionSource) - AbortController Integration', () => {
  let mockSession: any
  let mockDtmfSender: any
  let mockPeerConnection: any

  beforeEach(() => {
    vi.useFakeTimers()

    mockDtmfSender = {
      insertDTMF: vi.fn(),
      toneBuffer: '',
      ontonechange: null,
    }

    const mockAudioSender = {
      track: { kind: 'audio' },
      dtmf: mockDtmfSender,
    }

    mockPeerConnection = {
      getSenders: vi.fn().mockReturnValue([mockAudioSender]),
    }

    mockSession = {
      id: 'test-session',
      state: 'active',
      sessionDescriptionHandler: {
        peerConnection: mockPeerConnection,
      },
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('sendToneSequence with AbortController', () => {
    it('should abort sequence when signal is triggered before starting', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const controller = new AbortController()
      controller.abort()

      await expect(
        sendToneSequence('123', { interToneGap: 160, signal: controller.signal })
      ).rejects.toThrow('Operation aborted')
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should abort sequence when signal is triggered during sequence', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const controller = new AbortController()

      const promise = sendToneSequence('123', {
        interToneGap: 160,
        signal: controller.signal,
      })

      await vi.advanceTimersByTimeAsync(0)
      controller.abort()

      await expect(promise).rejects.toThrow('Operation aborted')
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(1)
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledWith('1', 100, 70)
    })

    it('should complete sequence without AbortSignal (backward compatibility)', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const promise = sendToneSequence('123', { interToneGap: 160 })

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(160)
      await vi.advanceTimersByTimeAsync(160)

      await promise

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(3)
      expect(mockDtmfSender.insertDTMF).toHaveBeenNthCalledWith(1, '1', 100, 70)
      expect(mockDtmfSender.insertDTMF).toHaveBeenNthCalledWith(2, '2', 100, 70)
      expect(mockDtmfSender.insertDTMF).toHaveBeenNthCalledWith(3, '3', 100, 70)
    })

    it('should abort between tones using abortableSleep', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const controller = new AbortController()

      const promise = sendToneSequence('1234', {
        interToneGap: 200,
        signal: controller.signal,
      })

      await vi.advanceTimersByTimeAsync(0)
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(100)
      controller.abort()

      await expect(promise).rejects.toThrow('Operation aborted')
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(1)
    })

    it('should use custom interval with AbortSignal', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const controller = new AbortController()

      const promise = sendToneSequence('12', {
        interToneGap: 300,
        signal: controller.signal,
      })

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(300)

      await promise

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(2)
    })

    it('should reject invalid DTMF digit even with AbortSignal', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const controller = new AbortController()

      await expect(
        sendToneSequence('X', { interToneGap: 160, signal: controller.signal })
      ).rejects.toThrow(/Invalid DTMF tone/)
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should prevent concurrent sendToneSequence calls', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const _promise1 = sendToneSequence('123', { interToneGap: 160 })
      const promise2 = sendToneSequence('456', { interToneGap: 160 })

      await expect(promise2).rejects.toThrow('DTMF sequence already in progress')
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(1)
    })

    it('should allow new sequence after previous completes', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const promise1 = sendToneSequence('12', { interToneGap: 160 })
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(160)
      await promise1

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(2)
      mockDtmfSender.insertDTMF.mockClear()

      const promise2 = sendToneSequence('34', { interToneGap: 160 })
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(160)
      await promise2

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(2)
    })

    it('should reset guard even if sequence fails', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      mockDtmfSender.insertDTMF.mockImplementation(() => {
        throw new Error('DTMF send failed')
      })

      await expect(sendToneSequence('1', { interToneGap: 160 })).rejects.toThrow('DTMF send failed')

      mockDtmfSender.insertDTMF.mockReset()
      mockDtmfSender.insertDTMF.mockImplementation(() => {})

      const promise2 = sendToneSequence('2', { interToneGap: 160 })
      await vi.advanceTimersByTimeAsync(0)
      await promise2

      expect(mockDtmfSender.insertDTMF).toHaveBeenCalled()
    })
  })

  describe('Upfront Validation', () => {
    it('should validate entire sequence before sending any digits', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('12X', { interToneGap: 160 })).rejects.toThrow(
        /Invalid DTMF tone/
      )
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should validate each digit in sequence upfront', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('1Z3', { interToneGap: 160 })).rejects.toThrow(
        /Invalid DTMF tone/
      )
      await expect(sendToneSequence('$123', { interToneGap: 160 })).rejects.toThrow(
        /Invalid DTMF tone/
      )
      await expect(sendToneSequence('12!', { interToneGap: 160 })).rejects.toThrow(
        /Invalid DTMF tone/
      )
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should accept all valid DTMF digits in sequence', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      const validSequence = '0123456789*#ABCD'
      const promise = sendToneSequence(validSequence, { interToneGap: 160 })

      for (let i = 0; i < validSequence.length; i++) {
        await vi.advanceTimersByTimeAsync(i === 0 ? 0 : 160)
      }

      await promise
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(validSequence.length)
    })

    it('should throw immediately for empty sequence', async () => {
      const sessionRef = ref(mockSession)
      const { sendToneSequence } = useDTMF(sessionRef)

      await expect(sendToneSequence('', { interToneGap: 160 })).rejects.toThrow()
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })
  })

  describe('sendTone (single tone)', () => {
    it('should send single tone without AbortSignal', async () => {
      const sessionRef = ref(mockSession)
      const { sendTone } = useDTMF(sessionRef)

      await sendTone('5')
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledWith('5', 100, 70)
    })

    it('should validate single tone', async () => {
      const sessionRef = ref(mockSession)
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('Z')).rejects.toThrow(/Invalid DTMF tone/)
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should accept all valid DTMF digits', async () => {
      const sessionRef = ref(mockSession)
      const { sendTone } = useDTMF(sessionRef)

      const validDigits = '0123456789*#ABCD'
      for (const digit of validDigits) {
        await sendTone(digit)
      }
      expect(mockDtmfSender.insertDTMF).toHaveBeenCalledTimes(validDigits.length)
    })

    it('should throw error when session is null', async () => {
      const sessionRef = ref(null)
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('1')).rejects.toThrow('No active call session')
    })
  })

  describe('Error Handling', () => {
    it('should throw when peer connection is missing', async () => {
      const sessionWithoutPC = {
        ...mockSession,
        sessionDescriptionHandler: {},
      }
      const sessionRef = ref(sessionWithoutPC)
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('1')).rejects.toThrow('No peer connection available for DTMF')
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should throw when DTMF sender is not available', async () => {
      const mockSenderWithoutDtmf = {
        track: { kind: 'audio' },
      }
      mockPeerConnection.getSenders.mockReturnValue([mockSenderWithoutDtmf])

      const sessionRef = ref(mockSession)
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('1')).rejects.toThrow(/DTMF/)
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })

    it('should throw when dtmf property exists but is null', async () => {
      const mockSenderWithNullDtmf = {
        track: { kind: 'audio' },
        dtmf: null,
      }
      mockPeerConnection.getSenders.mockReturnValue([mockSenderWithNullDtmf])

      const sessionRef = ref(mockSession)
      const { sendTone } = useDTMF(sessionRef)

      await expect(sendTone('1')).rejects.toThrow(/DTMF/)
      expect(mockDtmfSender.insertDTMF).not.toHaveBeenCalled()
    })
  })
})
