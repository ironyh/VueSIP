/**
 * Call Diagnostics Tests
 * Coverage for src/utils/callDiagnostics.ts
 */

import { describe, it, expect } from 'vitest'
import {
  getCallDiagnostics,
  getCauseExplanation,
  getCauseSuggestions,
  getAvailableCauses,
} from '@/utils/callDiagnostics'
import type { CallSession } from '@/types/call.types'

describe('utils/callDiagnostics', () => {
  const createMockCall = (overrides: Partial<CallSession> = {}): CallSession => ({
    id: 'test-call-123',
    direction: 'outgoing',
    state: 'HANGUP',
    startTime: new Date(),
    ...overrides,
  })

  describe('getCallDiagnostics', () => {
    it('should return diagnostics for known cause - Busy', () => {
      const call = createMockCall({
        terminationCause: 'Busy',
        lastResponseCode: 486,
        lastReasonPhrase: 'Busy Here',
      })

      const result = getCallDiagnostics(call)

      expect(result.callId).toBe('test-call-123')
      expect(result.cause).toBe('Busy')
      expect(result.responseCode).toBe(486)
      expect(result.reasonPhrase).toBe('Busy Here')
      expect(result.suggestions).toContain('Call later')
    })

    it('should return diagnostics for known cause - Forbidden', () => {
      const call = createMockCall({
        terminationCause: 'Forbidden',
        lastResponseCode: 403,
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('Forbidden')
      expect(result.suggestions).toContain('Check SIP username and password')
    })

    it('should return diagnostics for known cause - Transport Error', () => {
      const call = createMockCall({
        terminationCause: 'Transport Error',
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('Transport Error')
      expect(result.suggestions).toContain('Check network connectivity')
    })

    it('should return diagnostics for known cause - No response', () => {
      const call = createMockCall({
        terminationCause: 'No response',
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('No response')
      expect(result.suggestions).toContain('Verify the callee is reachable')
    })

    it('should return unknown cause diagnostics for unrecognized cause', () => {
      const call = createMockCall({
        terminationCause: 'UnknownCause123',
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('UnknownCause123')
      expect(result.suggestions).toContain('Check server logs for more details')
    })

    it('should handle missing termination cause (defaults to unknown)', () => {
      const call = createMockCall({
        terminationCause: undefined,
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('unknown')
      // Unknown cause returns default suggestions from UNKNOWN_CAUSE
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should include call lastErrorMessage when present', () => {
      const call = createMockCall({
        terminationCause: 'Server Error',
        lastErrorMessage: 'Connection timeout after 30s',
      })

      const result = getCallDiagnostics(call)

      expect(result.message).toBe('Connection timeout after 30s')
    })

    it('should include timestamp in result', () => {
      const call = createMockCall()
      const before = new Date()

      const result = getCallDiagnostics(call)

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('should handle media getusermediafailed cause', () => {
      const call = createMockCall({
        terminationCause: 'getusermediafailed',
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('getusermediafailed')
      expect(result.suggestions).toContain('Check browser permissions for microphone/camera')
    })

    it('should handle Request Terminated cause', () => {
      const call = createMockCall({
        terminationCause: 'Request Terminated',
      })

      const result = getCallDiagnostics(call)

      expect(result.cause).toBe('Request Terminated')
      expect(result.suggestions).toContain('Normal hangup - no action needed')
    })
  })

  describe('getCauseExplanation', () => {
    it('should return explanation for known cause', () => {
      const explanation = getCauseExplanation('Busy')
      expect(explanation).toBe('Callee is busy on another call')
    })

    it('should return explanation for Forbidden', () => {
      const explanation = getCauseExplanation('Forbidden')
      expect(explanation).toBe('Authentication failed or forbidden')
    })

    it('should return default explanation for unknown cause', () => {
      const explanation = getCauseExplanation('SomeUnknownCause')
      expect(explanation).toBe('Unknown failure reason')
    })

    it('should return default explanation for empty string', () => {
      const explanation = getCauseExplanation('')
      expect(explanation).toBe('Unknown failure reason')
    })

    it('should return explanation for No ACK', () => {
      const explanation = getCauseExplanation('No ACK')
      expect(explanation).toBe('Call was not acknowledged within timeout period')
    })

    it('should return explanation for No PRACK', () => {
      const explanation = getCauseExplanation('No PRACK')
      expect(explanation).toBe('Provisional Acknowledgment was not received')
    })

    it('should return explanation for Not Found', () => {
      const explanation = getCauseExplanation('Not Found')
      expect(explanation).toBe('The requested callee does not exist')
    })
  })

  describe('getCauseSuggestions', () => {
    it('should return suggestions array for known cause', () => {
      const suggestions = getCauseSuggestions('Busy')
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions).toContain('Call later')
    })

    it('should return default suggestions for unknown cause', () => {
      const suggestions = getCauseSuggestions('UnknownCause')
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions).toContain('Check server logs for more details')
    })

    it('should return suggestions for Service Unavailable', () => {
      const suggestions = getCauseSuggestions('Service Unavailable')
      expect(suggestions).toContain('Check server load and resources')
    })

    it('should return suggestions for User Not Registered', () => {
      const suggestions = getCauseSuggestions('User Not Registered')
      expect(suggestions).toContain('Callee needs to register first')
    })
  })

  describe('getAvailableCauses', () => {
    it('should return array of cause keys', () => {
      const causes = getAvailableCauses()
      expect(Array.isArray(causes)).toBe(true)
      expect(causes.length).toBeGreaterThan(0)
    })

    it('should include common SIP causes', () => {
      const causes = getAvailableCauses()
      expect(causes).toContain('Busy')
      expect(causes).toContain('Forbidden')
      expect(causes).toContain('Not Found')
      expect(causes).toContain('No response')
    })

    it('should include media causes', () => {
      const causes = getAvailableCauses()
      expect(causes).toContain('getusermediafailed')
    })

    it('should include unknown as a cause', () => {
      const causes = getAvailableCauses()
      expect(causes).toContain('unknown')
    })
  })
})
