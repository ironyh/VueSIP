import { describe, it, expect } from 'vitest'
import {
  getCallDiagnostics,
  getCauseExplanation,
  getCauseSuggestions,
  getAvailableCauses,
} from '../callDiagnostics'
import type { CallSession } from '@/types/call.types'
import { CallState, CallDirection } from '@/types/call.types'

describe('callDiagnostics', () => {
  const createMockCall = (overrides: Partial<CallSession> = {}): CallSession => ({
    id: 'test-call-123',
    state: CallState.Terminated,
    direction: CallDirection.Outgoing,
    localUri: 'sip:100@domain.com',
    remoteUri: 'sip:200@domain.com',
    isOnHold: false,
    isMuted: false,
    hasRemoteVideo: false,
    hasLocalVideo: false,
    timing: {
      startedAt: new Date(),
      answeredAt: undefined,
      terminatedAt: new Date(),
    },
    ...overrides,
  })

  describe('getCallDiagnostics', () => {
    it('should return diagnostics for known cause', () => {
      const call = createMockCall({
        terminationCause: 'Busy' as any,
        lastResponseCode: 486,
        lastReasonPhrase: 'Busy Everywhere',
      })

      const result = getCallDiagnostics(call)

      expect(result.callId).toBe('test-call-123')
      expect(result.cause).toBe('Busy')
      expect(result.responseCode).toBe(486)
      expect(result.reasonPhrase).toBe('Busy Everywhere')
      expect(result.suggestions).toContain('Call later')
    })

    it('should return diagnostics for unknown cause', () => {
      const call = createMockCall({
        terminationCause: 'UnknownCause' as any,
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('UnknownCause')
      expect(result.suggestions).toContain('Check server logs for more details')
    })

    it('should include lastErrorMessage when present', () => {
      const call = createMockCall({
        terminationCause: 'Transport Error' as any,
        lastErrorMessage: 'Connection reset by peer',
      })

      const result = getCallDiagnostics(call)

      expect(result.message).toBe('Connection reset by peer')
    })

    it('should handle media failure cause', () => {
      const call = createMockCall({
        terminationCause: 'getusermediafailed' as any,
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('getusermediafailed')
      expect(result.suggestions).toContain('Check browser permissions for microphone/camera')
    })
  })

  describe('getCauseExplanation', () => {
    it('should return explanation for known cause', () => {
      const explanation = getCauseExplanation('Busy')
      expect(explanation).toBe('Callee is busy on another call')
    })

    it('should return unknown explanation for unknown cause', () => {
      const explanation = getCauseExplanation('SomeUnknownCause')
      expect(explanation).toBe('Unknown failure reason')
    })

    it('should return explanation for Transport Error', () => {
      const explanation = getCauseExplanation('Transport Error')
      expect(explanation).toContain('Network transport failed')
    })
  })

  describe('getCauseSuggestions', () => {
    it('should return suggestions for known cause', () => {
      const suggestions = getCauseSuggestions('No response')
      expect(suggestions).toContain('Verify the callee is reachable')
    })

    it('should return default suggestions for unknown cause', () => {
      const suggestions = getCauseSuggestions('UnknownCause')
      expect(suggestions).toContain('Check server logs for more details')
    })

    it('should return multiple suggestions for Busy', () => {
      const suggestions = getCauseSuggestions('Busy')
      expect(suggestions.length).toBeGreaterThan(1)
      expect(suggestions).toContain('Call later')
    })
  })

  describe('getAvailableCauses', () => {
    it('should return all available cause keys', () => {
      const causes = getAvailableCauses()

      expect(causes).toContain('Busy')
      expect(causes).toContain('No response')
      expect(causes).toContain('Transport Error')
      expect(causes).toContain('getusermediafailed')
      expect(causes).toContain('unknown')
    })

    it('should return a non-empty array', () => {
      const causes = getAvailableCauses()
      expect(causes.length).toBeGreaterThan(10)
    })
  })
})
