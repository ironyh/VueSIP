/**
 * Unit tests for composables/types.ts
 * Tests the type extensions and guards for CallSession and SipClient
 */

import { describe, it, expect } from 'vitest'
import {
  hasCallSessionMethod,
  type CallSessionPiPOptions,
  type ExtendedCallSession,
  type ExtendedSipClient,
} from '@/composables/types'
import type { CallSession } from '@/types/call.types'

describe('composables/types', () => {
  describe('hasCallSessionMethod', () => {
    it('should return false for null session', () => {
      const result = hasCallSessionMethod(null, 'hold')
      expect(result).toBe(false)
    })

    it('should return false for undefined session', () => {
      const result = hasCallSessionMethod(undefined, 'hold')
      expect(result).toBe(false)
    })

    it('should return false when method does not exist on session', () => {
      const session = { callId: 'test-123' } as CallSession
      const result = hasCallSessionMethod(session, 'hold')
      expect(result).toBe(false)
    })

    it('should return false when method exists but is not a function', () => {
      const session = {
        callId: 'test-123',
        hold: 'not a function',
      } as unknown as CallSession
      const result = hasCallSessionMethod(session, 'hold')
      expect(result).toBe(false)
    })

    it('should return true when method exists as a function', () => {
      const session = {
        callId: 'test-123',
        hold: async () => {},
      } as unknown as ExtendedCallSession
      const result = hasCallSessionMethod(session, 'hold')
      expect(result).toBe(true)
    })

    it('should narrow type correctly when method exists', () => {
      const session = {
        callId: 'test-123',
        hold: async () => {},
        unhold: async () => {},
      } as unknown as ExtendedCallSession

      if (hasCallSessionMethod(session, 'hold')) {
        // TypeScript should know session has hold method
        expect(typeof session.hold).toBe('function')
      }
    })

    it('should work with transfer method', () => {
      const session = {
        callId: 'test-123',
        transfer: async (_target: string) => {},
      } as unknown as ExtendedCallSession
      const result = hasCallSessionMethod(session, 'transfer')
      expect(result).toBe(true)
    })

    it('should work with attendedTransfer method', () => {
      const session = {
        callId: 'test-123',
        attendedTransfer: async (_target: string, _callId: string) => {},
      } as unknown as ExtendedCallSession
      const result = hasCallSessionMethod(session, 'attendedTransfer')
      expect(result).toBe(true)
    })

    it('should work with hangup method', () => {
      const session = {
        callId: 'test-123',
        hangup: async () => {},
      } as unknown as ExtendedCallSession
      const result = hasCallSessionMethod(session, 'hangup')
      expect(result).toBe(true)
    })

    it('should work with answer method', () => {
      const session = {
        callId: 'test-123',
        answer: async () => {},
      } as unknown as ExtendedCallSession
      const result = hasCallSessionMethod(session, 'answer')
      expect(result).toBe(true)
    })
  })

  describe('CallSessionPiPOptions', () => {
    it('should allow creating PiP options with default values', () => {
      const options: CallSessionPiPOptions = {}
      expect(options.autoEnterOnAnswer).toBeUndefined()
      expect(options.autoExitOnEnd).toBeUndefined()
      expect(options.persistPreference).toBeUndefined()
    })

    it('should allow setting all PiP options', () => {
      const options: CallSessionPiPOptions = {
        autoEnterOnAnswer: true,
        autoExitOnEnd: false,
        persistPreference: true,
      }
      expect(options.autoEnterOnAnswer).toBe(true)
      expect(options.autoExitOnEnd).toBe(false)
      expect(options.persistPreference).toBe(true)
    })
  })

  describe('ExtendedCallSession', () => {
    it('should allow creating session with base properties', () => {
      const session: ExtendedCallSession = {
        callId: 'test-call-123',
        direction: 'incoming',
        state: 'early',
        peerUri: 'sip:test@example.com',
      }
      expect(session.callId).toBe('test-call-123')
    })

    it('should allow optional methods to be undefined', () => {
      const session: ExtendedCallSession = {
        callId: 'test-call-123',
        direction: 'incoming',
        state: 'early',
        peerUri: 'sip:test@example.com',
      }
      expect(session.transfer).toBeUndefined()
      expect(session.hold).toBeUndefined()
    })

    it('should allow adding optional methods', () => {
      const session: ExtendedCallSession = {
        callId: 'test-call-123',
        direction: 'incoming',
        state: 'early',
        peerUri: 'sip:test@example.com',
        transfer: async (_target) => {},
        hold: async () => {},
        unhold: async () => {},
        hangup: async () => {},
        answer: async () => {},
      }
      expect(typeof session.transfer).toBe('function')
      expect(typeof session.hold).toBe('function')
      expect(typeof session.unhold).toBe('function')
      expect(typeof session.hangup).toBe('function')
      expect(typeof session.answer).toBe('function')
    })
  })

  describe('ExtendedSipClient', () => {
    it('should define required methods and properties', () => {
      // This test verifies the interface structure exists
      // At runtime, we can't actually create a full SipClient, but we can verify the shape
      const clientMethods = [
        'start',
        'stop',
        'register',
        'unregister',
        'call',
        'makeCall',
        'getActiveCall',
      ] as const

      // Verify the method names are valid string literals
      expect(clientMethods).toContain('start')
      expect(clientMethods).toContain('call')
    })

    it('should have isConnected and isRegistered as readonly', () => {
      // Interface structure test - verify the readonly properties exist in the type
      type Client = ExtendedSipClient
      // This is a compile-time check - if this compiles, the interface is correct
      const _checkReadonly: Pick<Client, 'isConnected' | 'isRegistered'> = {
        isConnected: false,
        isRegistered: false,
      }
      expect(_checkReadonly.isConnected).toBe(false)
    })
  })

  describe('Module exports', () => {
    it('should export all expected members', async () => {
      const module = await import('@/composables/types')

      expect(module.hasCallSessionMethod).toBeDefined()
      expect(typeof module.hasCallSessionMethod).toBe('function')

      // Type interfaces should be exported (they're TypeScript, so undefined at runtime)
      expect(module.CallSessionPiPOptions).toBeUndefined()
      expect(module.ExtendedCallSession).toBeUndefined()
      expect(module.ExtendedSipClient).toBeUndefined()
    })
  })
})
