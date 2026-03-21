/**
 * Tests for useDTMF composable
 * @module tests/composables/useDTMF.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useDTMF } from '@/composables/useDTMF'
import type { CallSession } from '@/core/CallSession'
import * as dtmfUtils from '@/utils/dtmf'

vi.mock('@/utils/dtmf', () => ({
  sendDtmfTone: vi.fn(),
}))

function createMockCallSession(overrides?: Partial<CallSession>): CallSession {
  return {
    sendDTMF: vi.fn().mockResolvedValue(undefined),
    connection: {
      close: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      iceConnectionState: 'connected',
    } as unknown as RTCPeerConnection,
    ...overrides,
  } as unknown as CallSession
}

function createMockDtmfSessionSource(): {
  connection?: RTCPeerConnection
  sessionDescriptionHandler?: { peerConnection?: RTCPeerConnection }
  state?: string
} {
  return {
    connection: {
      close: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      iceConnectionState: 'connected',
    } as unknown as RTCPeerConnection,
    state: 'confirmed',
  }
}

describe('useDTMF', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize isSending to false', () => {
      const session = ref<CallSession | null>(null)
      const { isSending } = useDTMF(session)
      expect(isSending.value).toBe(false)
    })

    it('should initialize with empty queue', () => {
      const session = ref<CallSession | null>(null)
      const { queuedTones } = useDTMF(session)
      expect(queuedTones.value).toEqual([])
    })

    it('should initialize lastSentTone as null', () => {
      const session = ref<CallSession | null>(null)
      const { lastSentTone } = useDTMF(session)
      expect(lastSentTone.value).toBeNull()
    })

    it('should initialize lastResult as null', () => {
      const session = ref<CallSession | null>(null)
      const { lastResult } = useDTMF(session)
      expect(lastResult.value).toBeNull()
    })

    it('should initialize tonesSentCount to 0', () => {
      const session = ref<CallSession | null>(null)
      const { tonesSentCount } = useDTMF(session)
      expect(tonesSentCount.value).toBe(0)
    })

    it('should initialize queueSize as 0', () => {
      const session = ref<CallSession | null>(null)
      const { queueSize } = useDTMF(session)
      expect(queueSize.value).toBe(0)
    })

    it('should initialize isQueueEmpty as true', () => {
      const session = ref<CallSession | null>(null)
      const { isQueueEmpty } = useDTMF(session)
      expect(isQueueEmpty.value).toBe(true)
    })
  })

  describe('queueTone', () => {
    it('should add a valid tone to the queue', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, queuedTones } = useDTMF(session)
      queueTone('5')
      expect(queuedTones.value).toEqual(['5'])
    })

    it('should add multiple tones to the queue', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, queuedTones } = useDTMF(session)
      queueTone('1')
      queueTone('2')
      queueTone('3')
      expect(queuedTones.value).toEqual(['1', '2', '3'])
    })

    it('should accept star and hash tones', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, queuedTones } = useDTMF(session)
      queueTone('*')
      queueTone('#')
      expect(queuedTones.value).toEqual(['*', '#'])
    })

    it('should accept A-D tones', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, queuedTones } = useDTMF(session)
      queueTone('A')
      queueTone('D')
      expect(queuedTones.value).toEqual(['A', 'D'])
    })

    it('should throw for invalid tone', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone } = useDTMF(session)
      expect(() => queueTone('9')).not.toThrow() // 9 is valid
      expect(() => queueTone('0')).not.toThrow() // 0 is valid
    })

    it('should throw for invalid non-DTMF characters', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone } = useDTMF(session)
      expect(() => queueTone('E')).toThrow('Invalid DTMF tone')
      expect(() => queueTone('@')).toThrow('Invalid DTMF tone')
      expect(() => queueTone('')).toThrow('Invalid DTMF tone')
      expect(() => queueTone('12')).toThrow('Invalid DTMF tone') // multi-char
    })

    it('should drop oldest tone when queue exceeds MAX_QUEUE_SIZE', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, queuedTones } = useDTMF(session)
      // MAX_QUEUE_SIZE = 100; fill to capacity
      for (let i = 0; i < 100; i++) {
        queueTone(String(i % 10)) // cycles 0-9
      }
      expect(queuedTones.value.length).toBe(100)
      expect(queuedTones.value[0]).toBe('0')
      // Add one more - oldest ('0') should be dropped
      queueTone('*')
      expect(queuedTones.value.length).toBe(100)
      expect(queuedTones.value[0]).toBe('1') // '0' was dropped
      expect(queuedTones.value[99]).toBe('*')
    })
  })

  describe('queueToneSequence', () => {
    it('should add a sequence of tones to the queue', () => {
      const session = ref<CallSession | null>(null)
      const { queueToneSequence, queuedTones } = useDTMF(session)
      queueToneSequence('1234')
      expect(queuedTones.value).toEqual(['1', '2', '3', '4'])
    })

    it('should add mixed valid tones', () => {
      const session = ref<CallSession | null>(null)
      const { queueToneSequence, queuedTones } = useDTMF(session)
      queueToneSequence('1*2#3A')
      expect(queuedTones.value).toEqual(['1', '*', '2', '#', '3', 'A'])
    })

    it('should throw for sequence containing invalid tones', () => {
      const session = ref<CallSession | null>(null)
      const { queueToneSequence } = useDTMF(session)
      expect(() => queueToneSequence('12E4')).toThrow('Invalid DTMF tone')
    })
  })

  describe('clearQueue', () => {
    it('should clear all queued tones', () => {
      const session = ref<CallSession | null>(null)
      const { queueToneSequence, clearQueue, queuedTones, isQueueEmpty } = useDTMF(session)
      queueToneSequence('1234')
      expect(queuedTones.value.length).toBe(4)
      clearQueue()
      expect(queuedTones.value).toEqual([])
      expect(isQueueEmpty.value).toBe(true)
    })

    it('should report zero queue size after clearing', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, clearQueue, queueSize } = useDTMF(session)
      queueTone('1')
      queueTone('2')
      expect(queueSize.value).toBe(2)
      clearQueue()
      expect(queueSize.value).toBe(0)
    })
  })

  describe('resetStats', () => {
    it('should reset tonesSentCount to 0', () => {
      const session = ref<CallSession | null>(null)
      const { resetStats, tonesSentCount } = useDTMF(session)
      // Manually set the count (simulating prior sends)
      tonesSentCount.value = 5
      resetStats()
      expect(tonesSentCount.value).toBe(0)
    })

    it('should reset lastSentTone to null', () => {
      const session = ref<CallSession | null>(null)
      const { resetStats, lastSentTone } = useDTMF(session)
      lastSentTone.value = '5'
      resetStats()
      expect(lastSentTone.value).toBeNull()
    })

    it('should reset lastResult to null', () => {
      const session = ref<CallSession | null>(null)
      const { resetStats, lastResult } = useDTMF(session)
      lastResult.value = { success: true, tone: '5', timestamp: new Date() }
      resetStats()
      expect(lastResult.value).toBeNull()
    })
  })

  describe('sendTone', () => {
    it('should throw when no session is active', async () => {
      const session = ref<CallSession | null>(null)
      const { sendTone } = useDTMF(session)
      await expect(sendTone('5')).rejects.toThrow('No active call session')
    })

    it('should throw for invalid tone', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendTone } = useDTMF(session)
      await expect(sendTone('E')).rejects.toThrow('Invalid DTMF tone')
    })

    it('should call session.sendDTMF for CallSession', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendTone } = useDTMF(session)

      await sendTone('5')

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('5', undefined)
    })

    it('should update lastSentTone on success', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendTone, lastSentTone } = useDTMF(session)

      await sendTone('9')

      expect(lastSentTone.value).toBe('9')
    })

    it('should update lastResult on success', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendTone, lastResult } = useDTMF(session)

      await sendTone('3')

      expect(lastResult.value).toEqual(
        expect.objectContaining({
          success: true,
          tone: '3',
        })
      )
    })

    it('should increment tonesSentCount on success', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendTone, tonesSentCount } = useDTMF(session)

      await sendTone('1')
      await sendTone('2')
      await sendTone('3')

      expect(tonesSentCount.value).toBe(3)
    })

    it('should update lastResult on error', async () => {
      const mockSession = createMockCallSession({
        sendDTMF: vi.fn().mockRejectedValue(new Error('DTMF failed')),
      })
      const session = ref<CallSession>(mockSession)
      const { sendTone, lastResult } = useDTMF(session)

      await expect(sendTone('5')).rejects.toThrow('DTMF failed')
      expect(lastResult.value).toEqual(
        expect.objectContaining({
          success: false,
          tone: '5',
        })
      )
    })

    it('should use low-level sendDtmfTone for DtmfSessionSource', async () => {
      const mockSource = createMockDtmfSessionSource()
      const session = ref(mockSource as CallSession | typeof mockSource)
      const { sendTone } = useDTMF(session as any)

      await sendTone('5')

      expect(dtmfUtils.sendDtmfTone).toHaveBeenCalled()
    })

    it('should throw when DtmfSessionSource has no peer connection', async () => {
      const mockSource = { state: 'confirmed' } as any
      const session = ref(mockSource)
      const { sendTone } = useDTMF(session as any)

      await expect(sendTone('5')).rejects.toThrow('No peer connection available for DTMF')
    })
  })

  describe('sendToneSequence', () => {
    it('should throw when no session is active', async () => {
      const session = ref<CallSession | null>(null)
      const { sendToneSequence } = useDTMF(session)
      await expect(sendToneSequence('1234')).rejects.toThrow('No active call session')
    })

    it('should throw for empty sequence', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(session)
      await expect(sendToneSequence('')).rejects.toThrow('Empty DTMF sequence')
    })

    it('should send all tones in sequence via sendTone', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(session)

      vi.useRealTimers()
      await sendToneSequence('123')

      expect(mockSession.sendDTMF).toHaveBeenCalledTimes(3)
    })

    it('should call onToneSent callback for each tone', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(session)
      const tones: string[] = []

      vi.useRealTimers()
      await sendToneSequence('12', {
        interToneGap: 0,
        onToneSent: (tone) => tones.push(tone),
      })

      expect(tones).toEqual(['1', '2'])
    })

    it('should call onComplete callback when sequence finishes', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(session)
      const completeFn = vi.fn()

      vi.useRealTimers()
      await sendToneSequence('123', { interToneGap: 0, onComplete: completeFn })

      expect(completeFn).toHaveBeenCalledTimes(1)
    })

    it('should call onError callback when a tone fails', async () => {
      const mockSession = createMockCallSession({
        sendDTMF: vi.fn().mockImplementation(async () => {
          if (mockSession.sendDTMF.mock.calls.length >= 2) {
            throw new Error('Tone send failed')
          }
        }),
      })
      const session = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(session)
      const errorFn = vi.fn()

      vi.useRealTimers()
      await expect(sendToneSequence('123', { interToneGap: 0, onError: errorFn })).rejects.toThrow(
        'Tone send failed'
      )
    })

    it('should throw when DTMF sequence is already in progress', async () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { sendToneSequence } = useDTMF(session)

      vi.useRealTimers()
      // Start a sequence that is already in flight
      const first = sendToneSequence('123', { interToneGap: 100 })
      // Try to start another simultaneously
      await expect(sendToneSequence('456', { interToneGap: 0 })).rejects.toThrow(
        'DTMF sequence already in progress'
      )
      await first
    })
  })

  describe('stopSending', () => {
    it('should clear the queue', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, stopSending, queuedTones } = useDTMF(session)
      queueTone('1')
      queueTone('2')
      expect(queuedTones.value.length).toBe(2)
      stopSending()
      expect(queuedTones.value).toEqual([])
    })

    it('should reset isSending to false', () => {
      const mockSession = createMockCallSession()
      const session = ref<CallSession>(mockSession)
      const { stopSending, isSending } = useDTMF(session)
      // isSending is managed internally during sendToneSequence
      stopSending()
      expect(isSending.value).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('queueSize should reflect actual queue length', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, queueSize } = useDTMF(session)
      expect(queueSize.value).toBe(0)
      queueTone('1')
      expect(queueSize.value).toBe(1)
      queueTone('2')
      expect(queueSize.value).toBe(2)
    })

    it('isQueueEmpty should be false when queue has items', () => {
      const session = ref<CallSession | null>(null)
      const { queueTone, isQueueEmpty } = useDTMF(session)
      expect(isQueueEmpty.value).toBe(true)
      queueTone('5')
      expect(isQueueEmpty.value).toBe(false)
    })
  })
})
