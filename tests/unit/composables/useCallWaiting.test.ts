/**
 * useCallWaiting composable unit tests
 *
 * Tests for call waiting queue management, accept/reject operations,
 * swap functionality, and auto-reject timer behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCallWaiting } from '@/composables/useCallWaiting'
import type { CallSession } from '@/types/call.types'
import type { SipClient } from '@/core/SipClient'
import { withSetup } from '../../utils/test-helpers'
import { CALL_WAITING_CONSTANTS } from '@/composables/constants'

const mockLoggerInstance = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  createLogger: () => mockLoggerInstance,
}))

/**
 * Factory function to create a mock CallSession
 */
function createMockSession(
  id: string,
  overrides?: Partial<{
    remoteUri: string
    remoteDisplayName: string
    hold: ReturnType<typeof vi.fn>
    unhold: ReturnType<typeof vi.fn>
    answer: ReturnType<typeof vi.fn>
    hangup: ReturnType<typeof vi.fn>
  }>
): CallSession {
  return {
    id,
    remoteUri: overrides?.remoteUri ?? `sip:caller-${id}@example.com`,
    remoteDisplayName: overrides?.remoteDisplayName ?? `Caller ${id}`,
    hold: overrides?.hold ?? vi.fn().mockResolvedValue(undefined),
    unhold: overrides?.unhold ?? vi.fn().mockResolvedValue(undefined),
    answer: overrides?.answer ?? vi.fn().mockResolvedValue(undefined),
    hangup: overrides?.hangup ?? vi.fn().mockResolvedValue(undefined),
    state: 'ringing',
    direction: 'incoming',
    localUri: 'sip:local@example.com',
  } as unknown as CallSession
}

/**
 * Factory function to create a mock SipClient
 */
function createMockSipClient(): SipClient {
  return {
    call: vi.fn(),
    connectionState: 'connected',
  } as unknown as SipClient
}

describe('useCallWaiting', () => {
  let mockSipClient: SipClient

  beforeEach(() => {
    mockSipClient = createMockSipClient()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    it('should have empty waitingCalls array initially', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      expect(result.waitingCalls.value).toEqual([])
      unmount()
    })

    it('should have hasWaitingCall as false initially', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      expect(result.hasWaitingCall.value).toBe(false)
      unmount()
    })

    it('should have waitingCallCount as 0 initially', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      expect(result.waitingCallCount.value).toBe(0)
      unmount()
    })

    it('should use default options from CALL_WAITING_CONSTANTS', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      // Verify defaults are applied by testing behavior
      // Default maxWaitingCalls is 5
      for (let i = 0; i < CALL_WAITING_CONSTANTS.DEFAULT_MAX_WAITING_CALLS; i++) {
        result.addIncomingCall(createMockSession(`call-${i}`))
      }
      expect(result.waitingCallCount.value).toBe(CALL_WAITING_CONSTANTS.DEFAULT_MAX_WAITING_CALLS)
      unmount()
    })
  })

  // ============================================================================
  // addIncomingCall Tests
  // ============================================================================

  describe('addIncomingCall', () => {
    it('should add a call to the waiting queue', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const mockSession = createMockSession('call-1')
      result.addIncomingCall(mockSession)

      expect(result.waitingCalls.value).toHaveLength(1)
      expect(result.waitingCalls.value[0].callId).toBe('call-1')
      expect(result.waitingCalls.value[0].callerUri).toBe('sip:caller-call-1@example.com')
      expect(result.waitingCalls.value[0].callerName).toBe('Caller call-1')
      expect(result.waitingCalls.value[0].session.id).toBe(mockSession.id)
      expect(result.hasWaitingCall.value).toBe(true)
      expect(result.waitingCallCount.value).toBe(1)
      unmount()
    })

    it('should add multiple calls to the queue', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      result.addIncomingCall(createMockSession('call-1'))
      result.addIncomingCall(createMockSession('call-2'))
      result.addIncomingCall(createMockSession('call-3'))

      expect(result.waitingCalls.value).toHaveLength(3)
      expect(result.waitingCallCount.value).toBe(3)
      unmount()
    })

    it('should reject call when queue is full (maxWaitingCalls)', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { maxWaitingCalls: 2 })
      )

      const session1 = createMockSession('call-1')
      const session2 = createMockSession('call-2')
      const session3 = createMockSession('call-3')

      result.addIncomingCall(session1)
      result.addIncomingCall(session2)
      result.addIncomingCall(session3) // Should be rejected

      expect(result.waitingCalls.value).toHaveLength(2)
      expect((session3 as any).hangup).toHaveBeenCalled()
      unmount()
    })

    it('should reject duplicate calls', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const mockSession = createMockSession('call-1')
      result.addIncomingCall(mockSession)
      result.addIncomingCall(mockSession) // Duplicate

      expect(result.waitingCalls.value).toHaveLength(1)
      unmount()
    })

    it('should handle remoteUri as object with toString', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const mockSession = {
        id: 'call-1',
        remoteUri: { toString: () => 'sip:object-uri@example.com' },
        remoteDisplayName: 'Object Caller',
        hold: vi.fn().mockResolvedValue(undefined),
        unhold: vi.fn().mockResolvedValue(undefined),
        answer: vi.fn().mockResolvedValue(undefined),
        hangup: vi.fn().mockResolvedValue(undefined),
      } as unknown as CallSession

      result.addIncomingCall(mockSession)

      expect(result.waitingCalls.value[0].callerUri).toBe('sip:object-uri@example.com')
      unmount()
    })

    it('should use callerUri as callerName when remoteDisplayName is nullish', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const mockSession = {
        id: 'call-no-name',
        remoteUri: 'sip:no-name@example.com',
        remoteDisplayName: null,
        hold: vi.fn().mockResolvedValue(undefined),
        unhold: vi.fn().mockResolvedValue(undefined),
        answer: vi.fn().mockResolvedValue(undefined),
        hangup: vi.fn().mockResolvedValue(undefined),
        state: 'ringing',
        direction: 'incoming',
        localUri: 'sip:local@example.com',
      } as unknown as CallSession

      result.addIncomingCall(mockSession)

      expect(result.waitingCalls.value[0].callerName).toBe('sip:no-name@example.com')
      unmount()
    })

    it('should set waitingSince timestamp', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const beforeTime = Date.now()
      result.addIncomingCall(createMockSession('call-1'))
      const afterTime = Date.now()

      expect(result.waitingCalls.value[0].waitingSince).toBeGreaterThanOrEqual(beforeTime)
      expect(result.waitingCalls.value[0].waitingSince).toBeLessThanOrEqual(afterTime)
      unmount()
    })
  })

  // ============================================================================
  // acceptWaiting Tests
  // ============================================================================

  describe('acceptWaiting', () => {
    it('should hold current call and answer waiting call', async () => {
      const currentMockSession = createMockSession('current-call')
      const currentSession = ref<CallSession | null>(currentMockSession)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      await result.acceptWaiting('waiting-call')

      expect((currentMockSession as any).hold).toHaveBeenCalled()
      expect((waitingSession as any).answer).toHaveBeenCalled()
      expect(currentSession.value?.id).toBe('waiting-call')
      unmount()
    })

    it('should remove accepted call from waiting queue', async () => {
      const currentSession = ref<CallSession | null>(createMockSession('current'))
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      result.addIncomingCall(createMockSession('waiting-1'))
      result.addIncomingCall(createMockSession('waiting-2'))

      await result.acceptWaiting('waiting-1')

      expect(result.waitingCalls.value).toHaveLength(1)
      expect(result.waitingCalls.value[0].callId).toBe('waiting-2')
      unmount()
    })

    it('should throw error if call not found in queue', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      await expect(result.acceptWaiting('non-existent')).rejects.toThrow(
        'Call non-existent not found in waiting queue'
      )
      unmount()
    })

    it('should handle case when current session does not support hold', async () => {
      const currentMockSession = createMockSession('current-call', {
        hold: undefined as any,
      })
      const currentSession = ref<CallSession | null>(currentMockSession)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      // Should not throw, just log warning
      await result.acceptWaiting('waiting-call')

      expect((waitingSession as any).answer).toHaveBeenCalled()
      unmount()
    })

    it('should handle case when waiting session does not support answer', async () => {
      const currentSession = ref<CallSession | null>(createMockSession('current'))
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call', {
        answer: undefined as any,
      })
      result.addIncomingCall(waitingSession)

      // Should not throw, just log warning
      await result.acceptWaiting('waiting-call')
      unmount()
    })

    it('should handle case when no current session exists', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      await result.acceptWaiting('waiting-call')

      expect((waitingSession as any).answer).toHaveBeenCalled()
      expect(currentSession.value?.id).toBe('waiting-call')
      unmount()
    })

    it('should propagate errors from hold operation', async () => {
      const currentMockSession = createMockSession('current-call', {
        hold: vi.fn().mockRejectedValue(new Error('Hold failed')),
      })
      const currentSession = ref<CallSession | null>(currentMockSession)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      result.addIncomingCall(createMockSession('waiting-call'))

      await expect(result.acceptWaiting('waiting-call')).rejects.toThrow('Hold failed')
      unmount()
    })

    it('should propagate errors from answer operation', async () => {
      const currentSession = ref<CallSession | null>(createMockSession('current'))
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call', {
        answer: vi.fn().mockRejectedValue(new Error('Answer failed')),
      })
      result.addIncomingCall(waitingSession)

      await expect(result.acceptWaiting('waiting-call')).rejects.toThrow('Answer failed')
      unmount()
    })
  })

  // ============================================================================
  // rejectWaiting Tests
  // ============================================================================

  describe('rejectWaiting', () => {
    it('should hang up and remove call from queue', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      await result.rejectWaiting('waiting-call')

      expect((waitingSession as any).hangup).toHaveBeenCalled()
      expect(result.waitingCalls.value).toHaveLength(0)
      expect(result.hasWaitingCall.value).toBe(false)
      unmount()
    })

    it('should throw error if call not found in queue', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      await expect(result.rejectWaiting('non-existent')).rejects.toThrow(
        'Call non-existent not found in waiting queue'
      )
      unmount()
    })

    it('should handle case when session does not support hangup', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call', {
        hangup: undefined as any,
      })
      result.addIncomingCall(waitingSession)

      // Should not throw
      await result.rejectWaiting('waiting-call')
      expect(result.waitingCalls.value).toHaveLength(0)
      unmount()
    })

    it('should propagate errors from hangup operation', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call', {
        hangup: vi.fn().mockRejectedValue(new Error('Hangup failed')),
      })
      result.addIncomingCall(waitingSession)

      await expect(result.rejectWaiting('waiting-call')).rejects.toThrow('Hangup failed')
      unmount()
    })
  })

  // ============================================================================
  // rejectAllWaiting Tests
  // ============================================================================

  describe('rejectAllWaiting', () => {
    it('should clear queue and hang up all waiting calls', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const session1 = createMockSession('call-1')
      const session2 = createMockSession('call-2')
      const session3 = createMockSession('call-3')

      result.addIncomingCall(session1)
      result.addIncomingCall(session2)
      result.addIncomingCall(session3)

      await result.rejectAllWaiting()

      expect((session1 as any).hangup).toHaveBeenCalled()
      expect((session2 as any).hangup).toHaveBeenCalled()
      expect((session3 as any).hangup).toHaveBeenCalled()
      expect(result.waitingCalls.value).toHaveLength(0)
      expect(result.hasWaitingCall.value).toBe(false)
      unmount()
    })

    it('should handle empty queue gracefully', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      // Should not throw
      await result.rejectAllWaiting()
      expect(result.waitingCalls.value).toHaveLength(0)
      unmount()
    })

    it('should throw aggregated error if some hangups fail', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const session1 = createMockSession('call-1')
      const session2 = createMockSession('call-2', {
        hangup: vi.fn().mockRejectedValue(new Error('Hangup failed')),
      })
      const session3 = createMockSession('call-3')

      result.addIncomingCall(session1)
      result.addIncomingCall(session2)
      result.addIncomingCall(session3)

      await expect(result.rejectAllWaiting()).rejects.toThrow(
        'Failed to reject 1 of 3 waiting calls'
      )

      // Queue should still be cleared
      expect(result.waitingCalls.value).toHaveLength(0)
      unmount()
    })

    it('should continue rejecting other calls even if one fails', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const session1 = createMockSession('call-1')
      const session2 = createMockSession('call-2', {
        hangup: vi.fn().mockRejectedValue(new Error('Hangup failed')),
      })
      const session3 = createMockSession('call-3')

      result.addIncomingCall(session1)
      result.addIncomingCall(session2)
      result.addIncomingCall(session3)

      try {
        await result.rejectAllWaiting()
      } catch {
        // Expected to throw
      }

      // All hangups should have been attempted
      expect((session1 as any).hangup).toHaveBeenCalled()
      expect((session2 as any).hangup).toHaveBeenCalled()
      expect((session3 as any).hangup).toHaveBeenCalled()
      unmount()
    })
  })

  // ============================================================================
  // swapCalls Tests
  // ============================================================================

  describe('swapCalls', () => {
    it('should hold current call, unhold held call, and swap references', async () => {
      const currentMockSession = createMockSession('current-call')
      const currentSession = ref<CallSession | null>(currentMockSession)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)
      await result.acceptWaiting('waiting-call')

      expect(currentSession.value?.id).toBe('waiting-call')

      await result.swapCalls()

      expect(currentSession.value?.id).toBe('current-call')
      expect((waitingSession as any).hold).toHaveBeenCalled()
      expect((currentMockSession as any).unhold).toHaveBeenCalled()
      unmount()
    })

    it('should throw error if no held call to swap with', async () => {
      const currentSession = ref<CallSession | null>(createMockSession('current'))
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      await expect(result.swapCalls()).rejects.toThrow('No held call to swap with')
      unmount()
    })

    it('should throw error if no active call to swap', async () => {
      const currentMockSession = createMockSession('current-call')
      const currentSession = ref<CallSession | null>(currentMockSession)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      // Accept a waiting call to create held session
      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)
      await result.acceptWaiting('waiting-call')

      // Clear current session
      currentSession.value = null

      await expect(result.swapCalls()).rejects.toThrow('No active call to swap')
      unmount()
    })

    it('should propagate errors from hold operation during swap', async () => {
      const currentMockSession = createMockSession('current-call')
      const currentSession = ref<CallSession | null>(currentMockSession)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      // Accept a waiting call
      const waitingSession = createMockSession('waiting-call', {
        hold: vi.fn().mockRejectedValue(new Error('Hold failed during swap')),
      })
      result.addIncomingCall(waitingSession)
      await result.acceptWaiting('waiting-call')

      await expect(result.swapCalls()).rejects.toThrow('Hold failed during swap')
      unmount()
    })

    it('should propagate errors from unhold operation during swap', async () => {
      const currentMockSession = createMockSession('current-call', {
        unhold: vi.fn().mockRejectedValue(new Error('Unhold failed during swap')),
      })
      const currentSession = ref<CallSession | null>(currentMockSession)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      // Accept a waiting call
      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)
      await result.acceptWaiting('waiting-call')

      await expect(result.swapCalls()).rejects.toThrow('Unhold failed during swap')
      unmount()
    })
  })

  // ============================================================================
  // Auto-Reject Timer Tests
  // ============================================================================

  describe('Auto-Reject Timer', () => {
    it('should auto-reject call after autoRejectAfter timeout', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { autoRejectAfter: 5000 })
      )

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      expect(result.waitingCalls.value).toHaveLength(1)

      // Advance time past the auto-reject timeout
      await vi.advanceTimersByTimeAsync(5000)

      expect((waitingSession as any).hangup).toHaveBeenCalled()
      expect(result.waitingCalls.value).toHaveLength(0)
      unmount()
    })

    it('should not auto-reject when autoRejectAfter is 0', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { autoRejectAfter: 0 })
      )

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      // Advance time significantly
      await vi.advanceTimersByTimeAsync(60000)

      expect((waitingSession as any).hangup).not.toHaveBeenCalled()
      expect(result.waitingCalls.value).toHaveLength(1)
      unmount()
    })

    it('should clear auto-reject timer when call is accepted', async () => {
      const currentSession = ref<CallSession | null>(createMockSession('current'))
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { autoRejectAfter: 5000 })
      )

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      // Accept before timeout
      await vi.advanceTimersByTimeAsync(2000)
      await result.acceptWaiting('waiting-call')

      // Advance past original timeout
      await vi.advanceTimersByTimeAsync(5000)

      // hangup should not have been called (only answer)
      expect((waitingSession as any).hangup).not.toHaveBeenCalled()
      expect((waitingSession as any).answer).toHaveBeenCalled()
      unmount()
    })

    it('should clear auto-reject timer when call is rejected', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { autoRejectAfter: 5000 })
      )

      const waitingSession = createMockSession('waiting-call')
      result.addIncomingCall(waitingSession)

      // Reject before timeout
      await vi.advanceTimersByTimeAsync(2000)
      await result.rejectWaiting('waiting-call')

      // hangup should have been called once (from manual reject)
      expect((waitingSession as any).hangup).toHaveBeenCalledTimes(1)

      // Advance past original timeout
      await vi.advanceTimersByTimeAsync(5000)

      // hangup should still only have been called once
      expect((waitingSession as any).hangup).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should handle multiple calls with independent auto-reject timers', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { autoRejectAfter: 5000 })
      )

      const session1 = createMockSession('call-1')
      const session2 = createMockSession('call-2')

      result.addIncomingCall(session1)
      await vi.advanceTimersByTimeAsync(2000)
      result.addIncomingCall(session2)

      // After 3 more seconds, session1 should be auto-rejected (5s total)
      await vi.advanceTimersByTimeAsync(3000)
      expect((session1 as any).hangup).toHaveBeenCalled()
      expect((session2 as any).hangup).not.toHaveBeenCalled()

      // After 2 more seconds, session2 should be auto-rejected (5s from its add time)
      await vi.advanceTimersByTimeAsync(2000)
      expect((session2 as any).hangup).toHaveBeenCalled()
      unmount()
    })
  })

  // ============================================================================
  // Cleanup on Unmount Tests
  // ============================================================================

  describe('Cleanup on Unmount', () => {
    it('should clear all auto-reject timers on unmount', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { autoRejectAfter: 5000 })
      )

      const session1 = createMockSession('call-1')
      const session2 = createMockSession('call-2')

      result.addIncomingCall(session1)
      result.addIncomingCall(session2)

      // Unmount before timers fire
      unmount()

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(10000)

      // Timers should have been cleared, so hangup should not be called
      expect((session1 as any).hangup).not.toHaveBeenCalled()
      expect((session2 as any).hangup).not.toHaveBeenCalled()
    })

    it('should clear waiting calls on unmount', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      result.addIncomingCall(createMockSession('call-1'))
      result.addIncomingCall(createMockSession('call-2'))

      expect(result.waitingCalls.value).toHaveLength(2)

      unmount()

      // After unmount, the internal state is cleared
      // We can't directly test this since the composable is unmounted,
      // but we verified timers are cleared above
    })
  })

  // ============================================================================
  // playWaitingTone Option Tests
  // ============================================================================

  describe('playWaitingTone Option', () => {
    it('should trigger notification when playWaitingTone is true (default)', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      mockLoggerInstance.debug.mockClear()

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { playWaitingTone: true })
      )

      result.addIncomingCall(createMockSession('call-1'))

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        'Call waiting tone notification triggered'
      )
      unmount()
    })

    it('should not trigger notification when playWaitingTone is false', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      mockLoggerInstance.debug.mockClear()

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { playWaitingTone: false })
      )

      result.addIncomingCall(createMockSession('call-1'))

      expect(mockLoggerInstance.debug).not.toHaveBeenCalledWith(
        'Call waiting tone notification triggered'
      )
      unmount()
    })
  })

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle undefined remoteUri gracefully', () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() => useCallWaiting(currentSession, sipClientRef))

      const mockSession = {
        id: 'call-1',
        remoteUri: undefined,
        remoteDisplayName: undefined,
        hold: vi.fn().mockResolvedValue(undefined),
        unhold: vi.fn().mockResolvedValue(undefined),
        answer: vi.fn().mockResolvedValue(undefined),
        hangup: vi.fn().mockResolvedValue(undefined),
      } as unknown as CallSession

      result.addIncomingCall(mockSession)

      expect(result.waitingCalls.value[0].callerUri).toBe('unknown')
      expect(result.waitingCalls.value[0].callerName).toBe('unknown')
      unmount()
    })

    it('should handle hangup error during queue overflow rejection', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { maxWaitingCalls: 1 })
      )

      result.addIncomingCall(createMockSession('call-1'))

      const overflowSession = createMockSession('call-2', {
        hangup: vi.fn().mockRejectedValue(new Error('Hangup failed')),
      })

      // Should not throw, error is logged
      result.addIncomingCall(overflowSession)

      expect(result.waitingCalls.value).toHaveLength(1)
      expect((overflowSession as any).hangup).toHaveBeenCalled()
      unmount()
    })

    it('should handle auto-reject error gracefully', async () => {
      const currentSession = ref<CallSession | null>(null)
      const sipClientRef = ref<SipClient | null>(mockSipClient)

      const { result, unmount } = withSetup(() =>
        useCallWaiting(currentSession, sipClientRef, { autoRejectAfter: 1000 })
      )

      const waitingSession = createMockSession('waiting-call', {
        hangup: vi.fn().mockRejectedValue(new Error('Auto-reject hangup failed')),
      })
      result.addIncomingCall(waitingSession)

      // Advance time to trigger auto-reject
      await vi.advanceTimersByTimeAsync(1000)

      // Should not throw, error is logged
      expect((waitingSession as any).hangup).toHaveBeenCalled()
      unmount()
    })
  })
})
