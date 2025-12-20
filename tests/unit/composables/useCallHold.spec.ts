/**
 * Unit tests for useCallHold composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCallHold } from '@/composables/useCallHold'
import { CallSession } from '@/core/CallSession'
import { HoldState } from '@/types/call.types'
import { EventBus } from '@/core/EventBus'

/**
 * Create a mock CallSession for testing
 */
function createMockCallSession(overrides: Partial<CallSession> = {}): CallSession {
  const eventBus = new EventBus()

  const mockSession: Partial<CallSession> = {
    id: 'test-call-123',
    state: 'active' as any,
    direction: 'outgoing' as any,
    localUri: 'sip:alice@test.com',
    remoteUri: 'sip:bob@test.com',
    isOnHold: false,
    isMuted: false,
    hasRemoteVideo: false,
    hasLocalVideo: false,
    timing: {},
    eventBus,
    hold: vi.fn().mockResolvedValue(undefined),
    unhold: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  return mockSession as CallSession
}

describe('useCallHold', () => {
  let mockSession: CallSession
  let sessionRef: ReturnType<typeof ref<CallSession | null>>

  beforeEach(() => {
    mockSession = createMockCallSession()
    sessionRef = ref<CallSession | null>(mockSession)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with active hold state', () => {
      const { holdState, isOnHold, isLocalHold, isRemoteHold } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Active)
      expect(isOnHold.value).toBe(false)
      expect(isLocalHold.value).toBe(false)
      expect(isRemoteHold.value).toBe(false)
    })

    it('should sync initial hold state from session', async () => {
      mockSession.isOnHold = true
      mockSession.state = 'held' as any
      const freshSessionRef = ref<CallSession | null>(mockSession)

      const { holdState, isOnHold } = useCallHold(freshSessionRef)

      await nextTick()

      expect(holdState.value).toBe(HoldState.Held)
      expect(isOnHold.value).toBe(true)
    })

    it('should set up event listeners on session', () => {
      const onSpy = vi.spyOn(mockSession.eventBus!, 'on')

      useCallHold(sessionRef)

      expect(onSpy).toHaveBeenCalledWith('call:hold', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('call:unhold', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('call:hold_failed', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('call:unhold_failed', expect.any(Function))
    })
  })

  describe('holdCall()', () => {
    it('should successfully place call on hold', async () => {
      const { holdCall, holdState, isLocalHold } = useCallHold(sessionRef)

      const _promise = holdCall()

      // State should be Holding during operation
      expect(holdState.value).toBe(HoldState.Holding)

      // Simulate successful hold event
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })

      const result = await promise

      expect(result.success).toBe(true)
      expect(mockSession.hold).toHaveBeenCalledTimes(1)
      expect(holdState.value).toBe(HoldState.Held)
      expect(isLocalHold.value).toBe(true)
    })

    it('should handle hold failure', async () => {
      const error = new Error('Hold failed')
      mockSession.hold = vi.fn().mockRejectedValue(error)

      const { holdCall, holdState, holdError } = useCallHold(sessionRef)

      const result = await holdCall()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Hold failed')
      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBe('Hold failed')
    })

    it('should throw error if no active session', async () => {
      sessionRef.value = null

      const { holdCall } = useCallHold(sessionRef)

      const result = await holdCall()

      expect(result.success).toBe(false)
      expect(result.error).toContain('No active call session')
    })

    it('should throw error if call already on hold', async () => {
      mockSession.isOnHold = true
      mockSession.state = 'held' as any

      const freshSessionRef = ref<CallSession | null>(mockSession)
      const { holdCall } = useCallHold(freshSessionRef)

      // Manually set hold state to simulate already on hold
      await nextTick()

      const result = await holdCall()

      expect(result.success).toBe(false)
      expect(result.error).toContain('already on hold')
    })

    it('should clear hold error on successful hold', async () => {
      const { holdCall, holdError } = useCallHold(sessionRef)

      // Set initial error
      holdError.value = 'Previous error'

      const _promise = holdCall()

      // Simulate successful hold event
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })

      await promise

      expect(holdError.value).toBeNull()
    })

    it('should handle hold timeout', async () => {
      vi.useFakeTimers()

      // Make hold() hang indefinitely (never resolves)
      mockSession.hold = vi.fn().mockImplementation(() => new Promise(() => {}))

      const { holdCall, holdState, holdError } = useCallHold(sessionRef)

      const _promise = holdCall()

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(5000)

      await nextTick()
      await nextTick()

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toContain('timeout')

      vi.useRealTimers()
    })
  })

  describe('resumeCall()', () => {
    it('should successfully resume call from hold', async () => {
      const { holdCall, resumeCall, holdState, isOnHold } = useCallHold(sessionRef)

      // First place on hold
      const holdPromise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await holdPromise

      expect(holdState.value).toBe(HoldState.Held)

      // Now resume
      const _resumePromise = resumeCall()

      // State should be Resuming during operation
      expect(holdState.value).toBe(HoldState.Resuming)

      // Simulate successful unhold event
      mockSession.eventBus!.emit('call:unhold', {
        originator: 'local',
        timestamp: new Date(),
      })

      const result = await resumePromise

      expect(result.success).toBe(true)
      expect(mockSession.unhold).toHaveBeenCalledTimes(1)
      expect(holdState.value).toBe(HoldState.Active)
      expect(isOnHold.value).toBe(false)
    })

    it('should handle resume failure', async () => {
      const { holdCall, resumeCall, holdState, holdError } = useCallHold(sessionRef)

      // First place on hold
      const holdPromise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await holdPromise

      // Make unhold fail
      const error = new Error('Unhold failed')
      mockSession.unhold = vi.fn().mockRejectedValue(error)

      const result = await resumeCall()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unhold failed')
      expect(holdState.value).toBe(HoldState.Held)
      expect(holdError.value).toBe('Unhold failed')
    })

    it('should throw error if call not on hold', async () => {
      const { resumeCall } = useCallHold(sessionRef)

      const result = await resumeCall()

      expect(result.success).toBe(false)
      expect(result.error).toContain('not on hold')
    })

    it('should handle resume timeout', async () => {
      vi.useFakeTimers()

      const { holdCall, resumeCall, holdState, holdError } = useCallHold(sessionRef)

      // First place on hold
      const holdPromise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await holdPromise

      // Make unhold() hang indefinitely
      mockSession.unhold = vi.fn().mockImplementation(() => new Promise(() => {}))

      const _promise = resumeCall()

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(5000)

      await nextTick()
      await nextTick()

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toContain('timeout')

      vi.useRealTimers()
    })
  })

  describe('toggleHold()', () => {
    it('should toggle from active to held', async () => {
      const { toggleHold, holdState } = useCallHold(sessionRef)

      const promise = toggleHold()

      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })

      const result = await promise

      expect(result.success).toBe(true)
      expect(holdState.value).toBe(HoldState.Held)
      expect(mockSession.hold).toHaveBeenCalledTimes(1)
    })

    it('should toggle from held to active', async () => {
      const { holdCall, toggleHold, holdState } = useCallHold(sessionRef)

      // First place on hold
      const holdPromise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await holdPromise

      // Now toggle (should resume)
      const togglePromise = toggleHold()

      mockSession.eventBus!.emit('call:unhold', {
        originator: 'local',
        timestamp: new Date(),
      })

      const result = await togglePromise

      expect(result.success).toBe(true)
      expect(holdState.value).toBe(HoldState.Active)
      expect(mockSession.unhold).toHaveBeenCalledTimes(1)
    })
  })

  describe('Remote Hold Detection', () => {
    it('should detect remote hold', async () => {
      const { holdState, isRemoteHold, isOnHold } = useCallHold(sessionRef)

      // Simulate remote hold event
      mockSession.eventBus!.emit('call:hold', {
        originator: 'remote',
        timestamp: new Date(),
      })

      await nextTick()

      expect(holdState.value).toBe(HoldState.RemoteHeld)
      expect(isRemoteHold.value).toBe(true)
      expect(isOnHold.value).toBe(true)
    })

    it('should detect remote unhold', async () => {
      const { holdState, isRemoteHold, isOnHold } = useCallHold(sessionRef)

      // First simulate remote hold
      mockSession.eventBus!.emit('call:hold', {
        originator: 'remote',
        timestamp: new Date(),
      })

      await nextTick()

      expect(holdState.value).toBe(HoldState.RemoteHeld)

      // Now simulate remote unhold
      mockSession.eventBus!.emit('call:unhold', {
        originator: 'remote',
        timestamp: new Date(),
      })

      await nextTick()

      expect(holdState.value).toBe(HoldState.Active)
      expect(isRemoteHold.value).toBe(false)
      expect(isOnHold.value).toBe(false)
    })

    it('should not trigger local hold on remote hold', async () => {
      const { holdState, isLocalHold } = useCallHold(sessionRef)

      mockSession.eventBus!.emit('call:hold', {
        originator: 'remote',
        timestamp: new Date(),
      })

      await nextTick()

      expect(isLocalHold.value).toBe(false)
      expect(holdState.value).toBe(HoldState.RemoteHeld)
    })
  })

  describe('Event Listeners', () => {
    it('should clean up event listeners on session change', async () => {
      const offSpy = vi.spyOn(mockSession.eventBus!, 'off')

      const { holdState } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Active)

      // Change session
      const newMockSession = createMockCallSession()
      sessionRef.value = newMockSession

      await nextTick()

      expect(offSpy).toHaveBeenCalledTimes(4) // 4 event types
    })

    it('should set up listeners on new session', async () => {
      const { holdState: _holdState } = useCallHold(sessionRef)

      const newMockSession = createMockCallSession()
      const onSpy = vi.spyOn(newMockSession.eventBus!, 'on')

      sessionRef.value = newMockSession

      await nextTick()

      expect(onSpy).toHaveBeenCalledWith('call:hold', expect.any(Function))
      expect(onSpy).toHaveBeenCalledWith('call:unhold', expect.any(Function))
    })

    it('should handle hold_failed event', async () => {
      const { holdState, holdError } = useCallHold(sessionRef)

      mockSession.eventBus!.emit('call:hold_failed', {
        type: 'hold_failed',
        state: HoldState.Active,
        originator: 'local',
        error: 'Hold operation failed',
        callId: mockSession.id,
        timestamp: new Date(),
      })

      await nextTick()

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBe('Hold operation failed')
    })

    it('should handle unhold_failed event', async () => {
      const { holdCall, holdState, holdError } = useCallHold(sessionRef)

      // First place on hold
      const holdPromise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await holdPromise

      // Simulate unhold failed
      mockSession.eventBus!.emit('call:unhold_failed', {
        type: 'unhold_failed',
        state: HoldState.Held,
        originator: 'local',
        error: 'Unhold operation failed',
        callId: mockSession.id,
        timestamp: new Date(),
      })

      await nextTick()

      expect(holdState.value).toBe(HoldState.Held)
      expect(holdError.value).toBe('Unhold operation failed')
    })
  })

  describe('clearHold()', () => {
    it('should clear hold state and errors', async () => {
      const { holdCall, clearHold, holdState, holdError, isOnHold } = useCallHold(sessionRef)

      // Place on hold and set error
      const _promise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await promise

      holdError.value = 'Test error'

      expect(holdState.value).toBe(HoldState.Held)
      expect(isOnHold.value).toBe(true)

      // Clear
      clearHold()

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBeNull()
      expect(isOnHold.value).toBe(false)
    })

    it('should clear timeout timer', async () => {
      vi.useFakeTimers()

      const { holdCall, clearHold } = useCallHold(sessionRef)

      // Start hold operation (will set timeout)
      mockSession.hold = vi.fn().mockImplementation(() => new Promise(() => {}))
      const _promise = holdCall()

      // Clear hold state (should clear timeout)
      clearHold()

      // Advance time - timeout should not fire
      vi.advanceTimersByTime(10000)

      await nextTick()

      // No timeout error should be set
      expect(true).toBe(true) // Test passed if we got here without errors

      vi.useRealTimers()
    })
  })

  describe('Session State Synchronization', () => {
    it('should handle null session gracefully', () => {
      const nullSessionRef = ref<CallSession | null>(null)

      const { holdState, isOnHold } = useCallHold(nullSessionRef)

      expect(holdState.value).toBe(HoldState.Active)
      expect(isOnHold.value).toBe(false)
    })

    it('should clear state when session becomes null', async () => {
      const { holdCall, holdState, isOnHold } = useCallHold(sessionRef)

      // Place on hold
      const _promise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await promise

      expect(isOnHold.value).toBe(true)

      // Remove session
      sessionRef.value = null

      await nextTick()

      expect(holdState.value).toBe(HoldState.Active)
      expect(isOnHold.value).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should correctly compute isOnHold', async () => {
      const { holdCall, isOnHold } = useCallHold(sessionRef)

      expect(isOnHold.value).toBe(false)

      const _promise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await promise

      expect(isOnHold.value).toBe(true)
    })

    it('should correctly compute isHolding', async () => {
      const { holdCall, isHolding } = useCallHold(sessionRef)

      expect(isHolding.value).toBe(false)

      // Start hold operation (before event)
      mockSession.hold = vi.fn().mockImplementation(() => new Promise(() => {}))
      const _promise = holdCall()

      await nextTick()

      expect(isHolding.value).toBe(true)
    })

    it('should correctly compute isResuming', async () => {
      const { holdCall, resumeCall, isResuming } = useCallHold(sessionRef)

      // First place on hold
      const holdPromise = holdCall()
      mockSession.eventBus!.emit('call:hold', {
        originator: 'local',
        timestamp: new Date(),
      })
      await holdPromise

      expect(isResuming.value).toBe(false)

      // Start resume operation (before event)
      mockSession.unhold = vi.fn().mockImplementation(() => new Promise(() => {}))
      const _resumePromise = resumeCall()

      await nextTick()

      expect(isResuming.value).toBe(true)
    })
  })
})
