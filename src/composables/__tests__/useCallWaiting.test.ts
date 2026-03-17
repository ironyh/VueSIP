/**
 * useCallWaiting composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useCallWaiting } from '../useCallWaiting'
import type { CallSession } from '@/types/call.types'
import { EventEmitter } from '@/utils/EventEmitter'

describe('useCallWaiting', () => {
  let mockSipClient: any

  const createMockSession = (id: string): CallSession => {
    const eventBus = new EventEmitter()
    return {
      id,
      remoteUri: `sip:caller${id}@example.com`,
      remoteDisplayName: `Caller ${id}`,
      eventBus,
      hold: vi.fn().mockResolvedValue({ success: true }),
      unhold: vi.fn().mockResolvedValue({ success: true }),
      answer: vi.fn().mockResolvedValue({ success: true }),
      hangup: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as CallSession
  }

  beforeEach(() => {
    mockSipClient = ref(null)
  })

  describe('initial state', () => {
    it('should return empty waiting calls array', () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCalls } = useCallWaiting(currentSession, mockSipClient)

      expect(waitingCalls.value).toEqual([])
    })

    it('should return hasWaitingCall as false initially', () => {
      const currentSession = ref<CallSession | null>(null)
      const { hasWaitingCall } = useCallWaiting(currentSession, mockSipClient)

      expect(hasWaitingCall.value).toBe(false)
    })

    it('should return waitingCallCount as 0 initially', () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCallCount } = useCallWaiting(currentSession, mockSipClient)

      expect(waitingCallCount.value).toBe(0)
    })
  })

  describe('addIncomingCall', () => {
    it('should add incoming call to waiting queue', () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCalls, addIncomingCall } = useCallWaiting(currentSession, mockSipClient)

      const session = createMockSession('call-1')
      addIncomingCall(session)

      expect(waitingCalls.value).toHaveLength(1)
      expect(waitingCalls.value[0].callId).toBe('call-1')
      expect(waitingCalls.value[0].callerUri).toBe('sip:callercall-1@example.com')
    })

    it('should reject duplicate calls', () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCalls, addIncomingCall } = useCallWaiting(currentSession, mockSipClient)

      const session = createMockSession('call-1')
      addIncomingCall(session)
      addIncomingCall(session)

      expect(waitingCalls.value).toHaveLength(1)
    })

    it('should reject call when queue is full', () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCalls, addIncomingCall } = useCallWaiting(currentSession, mockSipClient, {
        maxWaitingCalls: 2,
      })

      const session1 = createMockSession('call-1')
      const session2 = createMockSession('call-2')
      const session3 = createMockSession('call-3')

      addIncomingCall(session1)
      addIncomingCall(session2)
      addIncomingCall(session3)

      expect(waitingCalls.value).toHaveLength(2)
    })
  })

  describe('rejectWaiting', () => {
    it('should remove call from queue and hangup', async () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCalls, addIncomingCall, rejectWaiting } = useCallWaiting(
        currentSession,
        mockSipClient
      )

      const session = createMockSession('call-1')
      addIncomingCall(session)

      await rejectWaiting('call-1')

      expect(waitingCalls.value).toHaveLength(0)
      expect(session.hangup).toHaveBeenCalled()
    })

    it('should throw error for non-existent call', async () => {
      const currentSession = ref<CallSession | null>(null)
      const { rejectWaiting } = useCallWaiting(currentSession, mockSipClient)

      await expect(rejectWaiting('non-existent')).rejects.toThrow('not found in waiting queue')
    })
  })

  describe('rejectAllWaiting', () => {
    it('should reject all waiting calls', async () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCalls, addIncomingCall, rejectAllWaiting } = useCallWaiting(
        currentSession,
        mockSipClient
      )

      addIncomingCall(createMockSession('call-1'))
      addIncomingCall(createMockSession('call-2'))

      await rejectAllWaiting()

      expect(waitingCalls.value).toHaveLength(0)
    })
  })

  describe('acceptWaiting', () => {
    it('should hold current call and answer waiting call', async () => {
      const currentSession = createMockSession('active-call')
      const currentSessionRef = ref<CallSession | null>(currentSession)

      const { waitingCalls, addIncomingCall, acceptWaiting } = useCallWaiting(
        currentSessionRef,
        mockSipClient
      )

      const waitingSession = createMockSession('waiting-call')
      addIncomingCall(waitingSession)

      await acceptWaiting('waiting-call')

      expect(currentSession.hold).toHaveBeenCalled()
      expect(waitingSession.answer).toHaveBeenCalled()
      expect(waitingCalls.value).toHaveLength(0)
    })

    it('should throw error for non-existent waiting call', async () => {
      const currentSession = ref<CallSession | null>(null)
      const { acceptWaiting } = useCallWaiting(currentSession, mockSipClient)

      await expect(acceptWaiting('non-existent')).rejects.toThrow('not found in waiting queue')
    })
  })

  describe('swapCalls', () => {
    it('should throw error when no held session', async () => {
      const currentSession = ref<CallSession | null>(createMockSession('active-call'))
      const { swapCalls } = useCallWaiting(currentSession, mockSipClient)

      await expect(swapCalls()).rejects.toThrow('No held call to swap with')
    })

    it('should throw error when no current session (checks held first)', async () => {
      const currentSession = ref<CallSession | null>(null)
      const { swapCalls } = useCallWaiting(currentSession, mockSipClient)

      // Note: held session check comes before current session check
      await expect(swapCalls()).rejects.toThrow('No held call to swap with')
    })
  })

  describe('maxWaitingCalls option', () => {
    it('should respect custom maxWaitingCalls', () => {
      const currentSession = ref<CallSession | null>(null)
      const { waitingCalls, addIncomingCall } = useCallWaiting(currentSession, mockSipClient, {
        maxWaitingCalls: 1,
      })

      addIncomingCall(createMockSession('call-1'))
      addIncomingCall(createMockSession('call-2'))

      expect(waitingCalls.value).toHaveLength(1)
    })
  })

  describe('auto-reject timer', () => {
    it('should not set timer when autoRejectAfter is 0', () => {
      vi.useFakeTimers()
      const currentSession = ref<CallSession | null>(null)
      const { addIncomingCall } = useCallWaiting(currentSession, mockSipClient, {
        autoRejectAfter: 0,
      })

      const session = createMockSession('call-1')
      addIncomingCall(session)

      vi.runAllTimers()
      vi.useRealTimers()
    })
  })
})
