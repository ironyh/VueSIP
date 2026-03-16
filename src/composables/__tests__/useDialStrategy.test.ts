/**
 * useDialStrategy Unit Tests
 *
 * Tests for the dial strategy composable that handles provider-aware
 * outbound calling with automatic strategy selection.
 *
 * @module composables/__tests__/useDialStrategy.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useDialStrategy } from '../useDialStrategy'

// Mock the 46elks API service
vi.mock('../../providers/services/elks46ApiService', () => ({
  originateCall: vi.fn(),
}))

import { originateCall as originate46ElksCall } from '../../providers/services/elks46ApiService'

describe('useDialStrategy', () => {
  let mockSipClient: {
    makeCall: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSipClient = {
      makeCall: vi.fn().mockResolvedValue('mock-call-id-123'),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have default strategy as sip-invite', () => {
      const { strategy } = useDialStrategy(ref(null))
      expect(strategy.value).toBe('sip-invite')
    })

    it('should not be dialing initially', () => {
      const { isDialing } = useDialStrategy(ref(null))
      expect(isDialing.value).toBe(false)
    })

    it('should have null initial result', () => {
      const { lastResult } = useDialStrategy(ref(null))
      expect(lastResult.value).toBe(null)
    })

    it('should have null initial error', () => {
      const { error } = useDialStrategy(ref(null))
      expect(error.value).toBe(null)
    })
  })

  describe('configure', () => {
    it('should configure sip-invite strategy explicitly', () => {
      const { strategy, configure } = useDialStrategy(ref(null))
      configure({ providerId: 'my-provider', strategy: 'sip-invite', autoDetect: false })
      expect(strategy.value).toBe('sip-invite')
    })

    it('should configure rest-originate strategy explicitly', () => {
      const { strategy, configure } = useDialStrategy(ref(null))
      configure({ providerId: 'my-provider', strategy: 'rest-originate', autoDetect: false })
      expect(strategy.value).toBe('rest-originate')
    })

    it('should auto-detect strategy for 46elks provider', () => {
      const { strategy, configure } = useDialStrategy(ref(null))
      configure({ providerId: '46elks', strategy: 'sip-invite', autoDetect: true })
      expect(strategy.value).toBe('rest-originate')
    })

    it('should auto-detect sip-invite for unknown providers', () => {
      const { strategy, configure } = useDialStrategy(ref(null))
      configure({ providerId: 'unknown-provider', strategy: 'rest-originate', autoDetect: true })
      expect(strategy.value).toBe('sip-invite')
    })

    it('should throw when configuring with unknown strategy', () => {
      const { configure } = useDialStrategy(ref(null))
      expect(() => {
        configure({ providerId: 'test', strategy: 'invalid-strategy' as any, autoDetect: false })
      }).toThrow('Unknown dial strategy')
    })

    it('should throw when changing strategy while dialing', async () => {
      const { configure, dial, isDialing } = useDialStrategy(ref(mockSipClient))

      // Configure first
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      // Start dialing (mock will keep it pending)
      const dialPromise = dial('+1234567890')

      // Wait for isDialing to become true
      await vi.waitFor(() => {
        expect(isDialing.value).toBe(true)
      })

      // Try to change strategy - should throw
      expect(() => {
        configure({ providerId: '46elks', strategy: 'rest-originate', autoDetect: true })
      }).toThrow('Cannot change dial strategy while dialing is in progress')

      // Clean up - resolve the dial
      mockSipClient.makeCall.mockRejectedValue(new Error('Test complete'))
      await dialPromise.catch(() => {})
    })
  })

  describe('dial with SIP INVITE strategy', () => {
    it('should return error when not configured', async () => {
      const { dial, lastResult } = useDialStrategy(ref(mockSipClient))
      const result = await dial('+1234567890')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not configured')
      // lastResult remains null when returning early due to unconfigured state
      expect(lastResult.value).toBe(null)
    })

    it('should return error when SIP client is null', async () => {
      const { configure, dial, error } = useDialStrategy(ref(null))
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      const result = await dial('+1234567890')

      expect(result.success).toBe(false)
      expect(result.error).toBe('SIP client not initialized')
      expect(error.value).toBe('SIP client not initialized')
    })

    it('should return error when SIP client has no makeCall', async () => {
      const clientWithoutMakeCall = ref({} as any)
      const { configure, dial, error } = useDialStrategy(clientWithoutMakeCall)
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      const result = await dial('+1234567890')

      expect(result.success).toBe(false)
      expect(result.error).toBe('SipClient.makeCall() is not implemented')
      expect(error.value).toBe('SipClient.makeCall() is not implemented')
    })

    it('should successfully dial using SIP INVITE', async () => {
      const { configure, dial, lastResult, error, isDialing } = useDialStrategy(ref(mockSipClient))
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      const result = await dial('+1234567890')

      expect(result.success).toBe(true)
      expect(result.callId).toBe('mock-call-id-123')
      expect(mockSipClient.makeCall).toHaveBeenCalledWith('+1234567890', {
        video: false,
        extraHeaders: undefined,
      })
      expect(lastResult.value?.success).toBe(true)
      expect(error.value).toBe(null)
      expect(isDialing.value).toBe(false)
    })

    it('should pass extra headers in SIP INVITE', async () => {
      const { configure, dial } = useDialStrategy(ref(mockSipClient))
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      const extraHeaders = { 'X-Custom-Header': 'custom-value' }
      await dial('+1234567890', { extraHeaders })

      expect(mockSipClient.makeCall).toHaveBeenCalledWith('+1234567890', {
        video: false,
        extraHeaders,
      })
    })

    it('should handle SIP INVITE errors', async () => {
      mockSipClient.makeCall.mockRejectedValue(new Error('Network error'))
      const { configure, dial, error, lastResult } = useDialStrategy(ref(mockSipClient))
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      const result = await dial('+1234567890')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(error.value).toBe('Network error')
      expect(lastResult.value?.success).toBe(false)
    })

    it('should return error when dial already in progress', async () => {
      const { configure, dial, isDialing } = useDialStrategy(ref(mockSipClient))
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      // Start first dial
      const firstDial = dial('+1234567890')

      // Wait for dialing to start
      await vi.waitFor(() => {
        expect(isDialing.value).toBe(true)
      })

      // Try second dial - should fail
      const secondResult = await dial('+9876543210')

      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toBe('Dial already in progress')

      // Clean up
      await firstDial
    })
  })

  describe('dial with REST originate strategy', () => {
    it('should successfully dial using 46elks REST originate', async () => {
      ;(originate46ElksCall as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'elks-call-456' })

      const { configure, dial, lastResult, error } = useDialStrategy(ref(null))
      configure({ providerId: '46elks', strategy: 'rest-originate', autoDetect: false })

      const result = await dial('+1234567890', {
        apiUsername: 'test-user',
        apiPassword: 'test-pass',
        callerId: '+46700000000',
        webrtcNumber: '100',
        destination: '+1234567890',
      })

      expect(result.success).toBe(true)
      expect(result.callId).toBe('elks-call-456')
      expect(originate46ElksCall).toHaveBeenCalledWith({
        credentials: { username: 'test-user', password: 'test-pass' },
        callerId: '+46700000000',
        webrtcNumber: '100',
        destination: '+1234567890',
      })
      expect(lastResult.value?.success).toBe(true)
      expect(error.value).toBe(null)
    })

    it('should return error when REST options are missing', async () => {
      const { configure, dial, error } = useDialStrategy(ref(null))
      configure({ providerId: '46elks', strategy: 'rest-originate', autoDetect: false })

      const result = await dial('+1234567890', {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid REST originate options')
      // error.value gets set after the strategy dials
      expect(error.value).toBe(null)
    })

    it('should return error when REST options is not an object', async () => {
      const { configure, dial } = useDialStrategy(ref(null))
      configure({ providerId: '46elks', strategy: 'rest-originate', autoDetect: false })

      const result = await dial('+1234567890', 'invalid-options' as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('REST originate requires options object')
    })

    it('should handle REST originate errors', async () => {
      ;(originate46ElksCall as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'))

      const { configure, dial, error, lastResult } = useDialStrategy(ref(null))
      configure({ providerId: '46elks', strategy: 'rest-originate', autoDetect: false })

      const result = await dial('+1234567890', {
        apiUsername: 'test-user',
        apiPassword: 'test-pass',
        callerId: '+46700000000',
        webrtcNumber: '100',
        destination: '+1234567890',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('API error')
      expect(error.value).toBe('API error')
      expect(lastResult.value?.success).toBe(false)
    })

    it('should auto-detect 46elks and use REST originate', async () => {
      ;(originate46ElksCall as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'auto-elks-call' })

      const { configure, dial, strategy } = useDialStrategy(ref(null))
      configure({ providerId: '46elks', strategy: 'sip-invite', autoDetect: true })

      expect(strategy.value).toBe('rest-originate')

      await dial('+1234567890', {
        apiUsername: 'test-user',
        apiPassword: 'test-pass',
        callerId: '+46700000000',
        webrtcNumber: '100',
        destination: '+1234567890',
      })

      expect(originate46ElksCall).toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('should reset dial state', async () => {
      const { configure, dial, reset, lastResult, error, isDialing } = useDialStrategy(
        ref(mockSipClient)
      )
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      await dial('+1234567890')

      expect(lastResult.value?.success).toBe(true)

      reset()

      expect(lastResult.value).toBe(null)
      expect(error.value).toBe(null)
      expect(isDialing.value).toBe(false)
    })

    it('should not reset during active dialing', async () => {
      const { configure, dial, reset, isDialing, lastResult } = useDialStrategy(ref(mockSipClient))
      configure({ providerId: 'test', strategy: 'sip-invite', autoDetect: false })

      const dialPromise = dial('+1234567890')

      await vi.waitFor(() => {
        expect(isDialing.value).toBe(true)
      })

      // reset should not clear state during dialing
      const lastResultBefore = lastResult.value
      reset()

      expect(lastResult.value).toBe(lastResultBefore)

      await dialPromise
    })
  })

  describe('strategy registry', () => {
    it('should find matching strategy for known provider', () => {
      const { configure, strategy } = useDialStrategy(ref(null))

      // Test 46elks auto-detection
      configure({ providerId: '46elks', strategy: 'sip-invite', autoDetect: true })
      expect(strategy.value).toBe('rest-originate')
    })

    it('should default to sip-invite for unknown providers', () => {
      const { configure, strategy } = useDialStrategy(ref(null))

      configure({
        providerId: 'unknown-voip-provider',
        strategy: 'rest-originate',
        autoDetect: true,
      })
      expect(strategy.value).toBe('sip-invite')
    })
  })
})
