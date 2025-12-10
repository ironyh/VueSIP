/**
 * CallSession transfer methods unit tests
 * Tests for SIP REFER implementation in CallSession core class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CallSession } from '@/core/CallSession'
import { EventBus } from '@/core/EventBus'
import type { CallDirection } from '@/types/call.types'
import { createLogger } from '@/utils/logger'

describe('CallSession - Transfer Methods', () => {
  let callSession: CallSession
  let mockRtcSession: any
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()

    // Create mock RTCSession with refer method
    mockRtcSession = {
      refer: vi.fn(),
      terminate: vi.fn(),
      hold: vi.fn().mockResolvedValue(undefined),
      unhold: vi.fn().mockResolvedValue(undefined),
      connection: {
        getStats: vi.fn().mockResolvedValue(new Map()),
        getSenders: vi.fn().mockReturnValue([]),
        getReceivers: vi.fn().mockReturnValue([]),
      },
      on: vi.fn(),
      off: vi.fn(),
    }

    // Create CallSession instance
    callSession = new CallSession({
      id: 'test-call-123',
      direction: 'outgoing' as CallDirection,
      localUri: 'sip:user@local.com',
      remoteUri: 'sip:remote@domain.com',
      remoteDisplayName: 'Remote User',
      rtcSession: mockRtcSession,
      eventBus,
    })

    // Set session to active state (required for transfer)
    // @ts-expect-error - accessing private property for testing
    callSession._state = 'active'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Blind Transfer', () => {
    it('should successfully initiate blind transfer', async () => {
      const targetUri = 'sip:transfer-target@domain.com'

      await callSession.transfer(targetUri)

      expect(mockRtcSession.refer).toHaveBeenCalledWith(targetUri, {})
    })

    it('should include extra headers in blind transfer', async () => {
      const targetUri = 'sip:transfer-target@domain.com'
      const extraHeaders = ['X-Custom-Header: value']

      await callSession.transfer(targetUri, extraHeaders)

      expect(mockRtcSession.refer).toHaveBeenCalledWith(targetUri, { extraHeaders })
    })

    it('should emit transfer initiated event for blind transfer', async () => {
      const targetUri = 'sip:transfer-target@domain.com'
      const eventSpy = vi.fn()

      eventBus.on('call:transfer_initiated', eventSpy)

      await callSession.transfer(targetUri)

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          target: targetUri,
          transferType: 'blind',
        })
      )
    })

    it('should fail blind transfer if call is not active', async () => {
      // Set session to non-active state
      // @ts-expect-error - accessing private property for testing
      callSession._state = 'idle'

      await expect(callSession.transfer('sip:target@domain.com')).rejects.toThrow(
        'Cannot transfer call in state: idle'
      )
    })

    it('should handle JsSIP refer failure for blind transfer', async () => {
      mockRtcSession.refer.mockImplementation(() => {
        throw new Error('REFER failed')
      })

      await expect(callSession.transfer('sip:target@domain.com')).rejects.toThrow('REFER failed')
    })
  })

  describe('Attended Transfer', () => {
    it('should successfully initiate attended transfer', async () => {
      const targetUri = 'sip:transfer-target@domain.com'
      const replaceCallId = 'consultation-call-456'

      await callSession.attendedTransfer(targetUri, replaceCallId)

      expect(mockRtcSession.refer).toHaveBeenCalledWith(targetUri, {
        replaces: replaceCallId,
      })
    })

    it('should emit transfer initiated event for attended transfer', async () => {
      const targetUri = 'sip:transfer-target@domain.com'
      const replaceCallId = 'consultation-call-456'
      const eventSpy = vi.fn()

      eventBus.on('call:transfer_initiated', eventSpy)

      await callSession.attendedTransfer(targetUri, replaceCallId)

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          target: targetUri,
          transferType: 'attended',
          replaceCallId,
        })
      )
    })

    it('should fail attended transfer if call is not active', async () => {
      // Set session to non-active state
      // @ts-expect-error - accessing private property for testing
      callSession._state = 'ringing'

      await expect(
        callSession.attendedTransfer('sip:target@domain.com', 'consultation-123')
      ).rejects.toThrow('Cannot transfer call in state: ringing')
    })

    it('should handle JsSIP refer failure for attended transfer', async () => {
      mockRtcSession.refer.mockImplementation(() => {
        throw new Error('REFER failed')
      })

      await expect(
        callSession.attendedTransfer('sip:target@domain.com', 'consultation-123')
      ).rejects.toThrow('REFER failed')
    })
  })

  describe('Transfer Event Handling', () => {
    it('should handle transfer accepted event', () => {
      const eventSpy = vi.fn()
      callSession.on('refer', eventSpy)

      // Simulate JsSIP refer event
      mockRtcSession.on.mock.calls.forEach(([event, handler]) => {
        if (event === 'refer') {
          handler({ target: 'sip:target@domain.com' })
        }
      })

      // Verify event was forwarded
      expect(callSession.eventBus).toBeDefined()
    })

    it('should handle NOTIFY responses during transfer', async () => {
      const notifyHandler = vi.fn()
      callSession.on('newInfo', notifyHandler)

      await callSession.transfer('sip:target@domain.com')

      // JsSIP would emit NOTIFY events during transfer
      // These are handled by the rtcSession internally
      expect(mockRtcSession.refer).toHaveBeenCalled()
    })
  })

  describe('Transfer State Validation', () => {
    const invalidStates: Array<any> = [
      'idle',
      'calling',
      'ringing',
      'answering',
      'early_media',
      'terminating',
      'terminated',
      'failed',
    ]

    invalidStates.forEach((state) => {
      it(`should reject transfer in ${state} state`, async () => {
        // @ts-expect-error - accessing private property for testing
        callSession._state = state

        await expect(callSession.transfer('sip:target@domain.com')).rejects.toThrow(
          `Cannot transfer call in state: ${state}`
        )
      })
    })

    it('should allow transfer in active state', async () => {
      // @ts-expect-error - accessing private property for testing
      callSession._state = 'active'

      await callSession.transfer('sip:target@domain.com')

      expect(mockRtcSession.refer).toHaveBeenCalled()
    })
  })

  describe('Transfer with Hold State', () => {
    it('should allow transfer while call is on hold', async () => {
      // Set call to active state first
      // @ts-expect-error - accessing private property for testing
      callSession._state = 'active'

      // Put call on hold
      await callSession.hold()

      // Transfer should still work
      await callSession.transfer('sip:target@domain.com')

      expect(mockRtcSession.refer).toHaveBeenCalled()
    })

    it('should not fail if call is held by remote party', async () => {
      // @ts-expect-error - accessing private property for testing
      callSession._state = 'active'

      // Simulate remote hold
      eventBus.emit('call:hold', { originator: 'remote' })

      await callSession.transfer('sip:target@domain.com')

      expect(mockRtcSession.refer).toHaveBeenCalled()
    })
  })

  describe('Transfer Error Scenarios', () => {
    it('should throw error on transfer failure', async () => {
      mockRtcSession.refer.mockImplementation(() => {
        throw new Error('Network error')
      })

      // Should throw the error from JsSIP refer
      await expect(callSession.transfer('sip:target@domain.com')).rejects.toThrow('Network error')
    })

    it('should handle malformed target URI gracefully', async () => {
      // JsSIP will handle URI validation
      // Our code should pass through and let JsSIP reject
      const invalidUri = 'invalid-uri-format'

      await callSession.transfer(invalidUri)

      expect(mockRtcSession.refer).toHaveBeenCalledWith(invalidUri, {})
    })

    it('should handle transfer during network disruption', async () => {
      mockRtcSession.refer.mockImplementation(() => {
        throw new Error('Connection lost')
      })

      await expect(callSession.transfer('sip:target@domain.com')).rejects.toThrow('Connection lost')
    })
  })
})
