/**
 * useCallHold composable unit tests
 * Tests for call hold/resume functionality with SDP manipulation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCallHold } from '@/composables/useCallHold'
import { HoldState } from '@/types/call.types'
import type { CallSession } from '@/core/CallSession'
import type { BaseEvent } from '@/types/events.types'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock errorContext
vi.mock('@/utils/errorContext', () => ({
  logErrorWithContext: vi.fn(),
  ErrorSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  },
  createOperationTimer: vi.fn(() => ({
    elapsed: vi.fn(() => 100),
  })),
}))

describe('useCallHold', () => {
  let mockSession: any
  let mockEventBus: any

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      on: vi.fn(() => 'listener-id'),
      off: vi.fn(),
      emit: vi.fn(),
    }

    // Create mock call session
    mockSession = {
      id: 'call-123',
      state: 'active',
      isOnHold: false,
      eventBus: mockEventBus,
      hold: vi.fn().mockResolvedValue(undefined),
      unhold: vi.fn().mockResolvedValue(undefined),
    }

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('initial state', () => {
    it('should initialize with Active hold state', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Active)
    })

    it('should initialize with null hold error', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdError } = useCallHold(sessionRef)

      expect(holdError.value).toBeNull()
    })

    it('should handle null session', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { holdState, holdError, isOnHold } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBeNull()
      expect(isOnHold.value).toBe(false)
    })
  })

  // ==========================================================================
  // Computed Properties Tests
  // ==========================================================================

  describe('computed properties', () => {
    it('should report isOnHold as false when not held', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { isOnHold, isLocalHold, isRemoteHold, isHolding, isResuming } = useCallHold(sessionRef)

      expect(isOnHold.value).toBe(false)
      expect(isLocalHold.value).toBe(false)
      expect(isRemoteHold.value).toBe(false)
      expect(isHolding.value).toBe(false)
      expect(isResuming.value).toBe(false)
    })

    it('should report isOnHold as true when locally held', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, isOnHold, isLocalHold } = useCallHold(sessionRef)

      // Simulate hold state change
      holdState.value = HoldState.Held

      expect(isOnHold.value).toBe(true)
      expect(isLocalHold.value).toBe(true)
    })

    it('should report isOnHold as true when remotely held', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, isOnHold, isRemoteHold } = useCallHold(sessionRef)

      // Simulate remote hold state change
      holdState.value = HoldState.RemoteHeld

      expect(isOnHold.value).toBe(true)
      expect(isRemoteHold.value).toBe(true)
    })

    it('should report isHolding when hold operation in progress', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, isHolding } = useCallHold(sessionRef)

      holdState.value = HoldState.Holding

      expect(isHolding.value).toBe(true)
    })

    it('should report isResuming when resume operation in progress', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, isResuming } = useCallHold(sessionRef)

      holdState.value = HoldState.Resuming

      expect(isResuming.value).toBe(true)
    })
  })

  // ==========================================================================
  // holdCall Method Tests
  // ==========================================================================

  describe('holdCall() method', () => {
    it('should place call on hold successfully', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdCall, holdState } = useCallHold(sessionRef)

      const result = await holdCall()

      expect(mockSession.hold).toHaveBeenCalled()
      expect(holdState.value).toBe(HoldState.Holding)
      expect(result.success).toBe(true)
    })

    it('should return error result when no active session', async () => {
      const sessionRef = ref<CallSession | null>(null)
      const { holdCall } = useCallHold(sessionRef)

      const result = await holdCall()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active call session')
    })

    it('should return error result when call is already on hold', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdCall, holdState } = useCallHold(sessionRef)

      holdState.value = HoldState.Held

      const result = await holdCall()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Call is already on hold')
    })

    it('should return error result when call state is not suitable', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdCall } = useCallHold(sessionRef)

      mockSession.state = 'terminated'

      const result = await holdCall()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Call must be in active or held state to hold')
    })

    it('should handle hold failure', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdCall, holdState, holdError } = useCallHold(sessionRef)

      mockSession.hold = vi.fn().mockRejectedValue(new Error('Hold failed'))

      await holdCall()

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBe('Hold failed')
    })
  })

  // ==========================================================================
  // resumeCall Method Tests
  // ==========================================================================

  describe('resumeCall() method', () => {
    it('should resume call from hold successfully', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, resumeCall } = useCallHold(sessionRef)

      // First put on hold
      holdState.value = HoldState.Held

      const result = await resumeCall()

      expect(mockSession.unhold).toHaveBeenCalled()
      expect(holdState.value).toBe(HoldState.Resuming)
      expect(result.success).toBe(true)
    })

    it('should return error result when no active session', async () => {
      const sessionRef = ref<CallSession | null>(null)
      const { resumeCall } = useCallHold(sessionRef)

      const result = await resumeCall()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active call session')
    })

    it('should return error result when call is not on hold', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, resumeCall } = useCallHold(sessionRef)

      holdState.value = HoldState.Active

      const result = await resumeCall()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Call is not on hold')
    })

    it('should handle resume failure', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, resumeCall, holdError } = useCallHold(sessionRef)

      holdState.value = HoldState.Held
      mockSession.unhold = vi.fn().mockRejectedValue(new Error('Resume failed'))

      await resumeCall()

      expect(holdState.value).toBe(HoldState.Held)
      expect(holdError.value).toBe('Resume failed')
    })
  })

  // ==========================================================================
  // toggleHold Method Tests
  // ==========================================================================

  describe('toggleHold() method', () => {
    it('should hold call when not on hold', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { toggleHold, holdState } = useCallHold(sessionRef)

      holdState.value = HoldState.Active

      await toggleHold()

      expect(mockSession.hold).toHaveBeenCalled()
    })

    it('should resume call when on hold', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { toggleHold, holdState } = useCallHold(sessionRef)

      holdState.value = HoldState.Held

      await toggleHold()

      expect(mockSession.unhold).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // clearHold Method Tests
  // ==========================================================================

  describe('clearHold() method', () => {
    it('should reset hold state to Active', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, holdError, clearHold } = useCallHold(sessionRef)

      holdState.value = HoldState.Held
      holdError.value = 'Some error'

      clearHold()

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBeNull()
    })
  })

  // ==========================================================================
  // Event Handling Tests
  // ==========================================================================

  describe('event handling', () => {
    it('should set up event listeners on session change', async () => {
      const sessionRef = ref<CallSession | null>(null)
      useCallHold(sessionRef)

      // Now set a session - need to wait for watcher
      sessionRef.value = mockSession
      await nextTick()

      expect(mockEventBus.on).toHaveBeenCalledWith('call:hold', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith('call:unhold', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith('call:hold_failed', expect.any(Function))
      expect(mockEventBus.on).toHaveBeenCalledWith('call:unhold_failed', expect.any(Function))
    })

    it('should handle local hold event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState } = useCallHold(sessionRef)

      // Find and call the hold listener
      const holdListener = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === 'call:hold'
      )?.[1]

      if (holdListener) {
        holdListener({ originator: 'local' } as BaseEvent)
      }

      expect(holdState.value).toBe(HoldState.Held)
    })

    it('should handle remote hold event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState } = useCallHold(sessionRef)

      // Find and call the hold listener
      const holdListener = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === 'call:hold'
      )?.[1]

      if (holdListener) {
        holdListener({ originator: 'remote' } as BaseEvent)
      }

      expect(holdState.value).toBe(HoldState.RemoteHeld)
    })

    it('should handle unhold event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState } = useCallHold(sessionRef)

      holdState.value = HoldState.Held

      // Find and call the unhold listener
      const unholdListener = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === 'call:unhold'
      )?.[1]

      if (unholdListener) {
        unholdListener({ originator: 'local' } as BaseEvent)
      }

      expect(holdState.value).toBe(HoldState.Active)
    })

    it('should handle hold failed event', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, holdError } = useCallHold(sessionRef)

      // Find and call the hold failed listener
      const holdFailedListener = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === 'call:hold_failed'
      )?.[1]

      if (holdFailedListener) {
        holdFailedListener({ error: 'Hold operation failed' } as BaseEvent & { error: string })
      }

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBe('Hold operation failed')
    })
  })

  // ==========================================================================
  // Timeout Tests
  // ==========================================================================

  describe('timeout handling', () => {
    it('should handle hold operation timeout', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdCall, holdState, holdError } = useCallHold(sessionRef)

      // Start hold operation
      holdCall()

      // Advance timers past timeout
      vi.advanceTimersByTime(6000)

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toContain('timeout')
    })

    it('should handle resume operation timeout', async () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState, resumeCall, holdError } = useCallHold(sessionRef)

      holdState.value = HoldState.Held

      // Start resume operation
      resumeCall()

      // Advance timers past timeout
      vi.advanceTimersByTime(6000)

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toContain('timeout')
    })
  })

  // ==========================================================================
  // Session Sync Tests
  // ==========================================================================

  describe('session synchronization', () => {
    it('should sync initial hold state from session with isOnHold true', () => {
      mockSession.isOnHold = true

      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Held)
    })

    it('should sync initial hold state from session with isOnHold false', () => {
      mockSession.isOnHold = false

      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Active)
    })
  })
})
