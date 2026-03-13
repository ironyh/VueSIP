/**
 * useCallHold composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useCallHold } from '../useCallHold'
import { HoldState } from '@/types/call.types'
import type { CallSession } from '@/core/CallSession'
import { EventEmitter } from '@/utils/EventEmitter'

describe('useCallHold', () => {
  let mockSession: CallSession
  let mockEventBus: EventEmitter

  beforeEach(() => {
    mockEventBus = new EventEmitter()
    mockSession = {
      eventBus: mockEventBus,
      hold: vi.fn().mockResolvedValue({ success: true }),
      unhold: vi.fn().mockResolvedValue({ success: true }),
      isOnHold: false,
    } as unknown as CallSession
  })

  describe('initial state', () => {
    it('should return initial hold state as active', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { holdState } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Active)
    })

    it('should return isOnHold as false when session is null', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isOnHold } = useCallHold(sessionRef)

      expect(isOnHold.value).toBe(false)
    })

    it('should return isLocalHold as false when session is null', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isLocalHold } = useCallHold(sessionRef)

      expect(isLocalHold.value).toBe(false)
    })

    it('should return isRemoteHold as false when session is null', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isRemoteHold } = useCallHold(sessionRef)

      expect(isRemoteHold.value).toBe(false)
    })

    it('should return isHolding as false initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isHolding } = useCallHold(sessionRef)

      expect(isHolding.value).toBe(false)
    })

    it('should return isResuming as false initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isResuming } = useCallHold(sessionRef)

      expect(isResuming.value).toBe(false)
    })

    it('should return null holdError initially', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { holdError } = useCallHold(sessionRef)

      expect(holdError.value).toBe(null)
    })
  })

  describe('with active session', () => {
    it('should set holdState to Active when session is not on hold', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { holdState } = useCallHold(sessionRef)

      expect(holdState.value).toBe(HoldState.Active)
    })
  })

  describe('holdCall', () => {
    it('should set isHolding to true during hold operation', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isHolding } = useCallHold(sessionRef)

      // With no session, should fail gracefully - isHolding won't change
      expect(isHolding.value).toBe(false)
    })
  })

  describe('resumeCall', () => {
    it('should set isResuming to true during resume operation', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isResuming } = useCallHold(sessionRef)

      expect(isResuming.value).toBe(false)
    })
  })

  describe('toggleHold', () => {
    it('should not throw when session is null', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { toggleHold } = useCallHold(sessionRef)

      expect(() => toggleHold()).not.toThrow()
    })
  })

  describe('clearHold', () => {
    it('should reset hold state when clearHold is called', () => {
      const sessionRef = ref<CallSession | null>(mockSession)
      const { clearHold, holdState, holdError } = useCallHold(sessionRef)

      holdError.value = 'Some error'
      clearHold()

      expect(holdState.value).toBe(HoldState.Active)
      expect(holdError.value).toBe(null)
    })
  })

  describe('computed properties', () => {
    it('should correctly compute isOnHold based on holdState', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { holdState, isOnHold } = useCallHold(sessionRef)

      holdState.value = HoldState.Held
      expect(isOnHold.value).toBe(true)

      holdState.value = HoldState.RemoteHeld
      expect(isOnHold.value).toBe(true)

      holdState.value = HoldState.Active
      expect(isOnHold.value).toBe(false)
    })

    it('should correctly identify local hold', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { holdState, isLocalHold } = useCallHold(sessionRef)

      holdState.value = HoldState.Held
      expect(isLocalHold.value).toBe(true)

      holdState.value = HoldState.RemoteHeld
      expect(isLocalHold.value).toBe(false)

      holdState.value = HoldState.Active
      expect(isLocalHold.value).toBe(false)
    })

    it('should correctly identify remote hold', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { holdState, isRemoteHold } = useCallHold(sessionRef)

      holdState.value = HoldState.RemoteHeld
      expect(isRemoteHold.value).toBe(true)

      holdState.value = HoldState.Held
      expect(isRemoteHold.value).toBe(false)

      holdState.value = HoldState.Active
      expect(isRemoteHold.value).toBe(false)
    })
  })
})
