/**
 * useDialStrategy composable unit tests
 * Tests for provider-aware outbound calling strategies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useDialStrategy } from '@/composables/useDialStrategy'
import type { SipClient } from '@/core/SipClient'
import { withSetup } from '../../utils/test-helpers'

// Mock SIP client
vi.mock('@/core/SipClient', () => ({
  createSipClient: () => ({}) as any,
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useDialStrategy', () => {
  let mockSipClient: SipClient

  beforeEach(() => {
    mockSipClient = {
      makeCall: vi.fn().mockResolvedValue('mock-call-id'),
      getClient: vi.fn().mockReturnValue(null),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: false,
      isRegistered: false,
      isConnecting: false,
    } as unknown as SipClient
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should initialize with default sip-invite strategy', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      expect(result.strategy.value).toBe('sip-invite')
      unmount()
    })

    it('should auto-detect 46elks as rest-originate strategy', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: '46elks',
        autoDetect: true,
      })

      expect(result.strategy.value).toBe('rest-originate')
      unmount()
    })

    it('should use sip-invite for non-46elks providers with auto-detect', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'telnyx',
        autoDetect: true,
      })

      expect(result.strategy.value).toBe('sip-invite')
      unmount()
    })

    it('should use explicitly configured strategy', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'custom',
        strategy: 'rest-originate',
      })

      expect(result.strategy.value).toBe('rest-originate')
      unmount()
    })
  })

  describe('SIP INVITE Strategy', () => {
    it('should dial using SIP INVITE with sip-invite strategy', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'standard',
        strategy: 'sip-invite',
      })

      const dialResult = await result.dial('sip:+46700123456@example.com')

      expect(dialResult.success).toBe(true)
      expect(dialResult.callId).toBe('mock-call-id')
      expect(mockSipClient.makeCall).toHaveBeenCalledWith('sip:+46700123456@example.com', {
        video: false,
      })
      expect(result.isDialing.value).toBe(false)
      expect(result.lastResult.value).toEqual(dialResult)
      expect(result.error.value).toBe(null)
      unmount()
    })

    it('should handle SIP INVITE errors', async () => {
      const mockError = new Error('Connection failed')
      ;(mockSipClient as any).makeCall = vi.fn().mockRejectedValue(mockError)

      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'standard',
        strategy: 'sip-invite',
      })

      const dialResult = await result.dial('sip:+46700123456@example.com')

      expect(dialResult.success).toBe(false)
      expect(dialResult.error).toBe('Connection failed')
      expect(result.error.value).toBe('Connection failed')
      expect(result.lastResult.value).toEqual(dialResult)
      expect(result.isDialing.value).toBe(false)
      unmount()
    })

    it('should support custom SIP headers with extraHeaders', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'standard',
        strategy: 'sip-invite',
      })

      const customHeaders = ['X-Custom-Header: value']
      const dialResult = await result.dial('sip:+46700123456@example.com', {
        extraHeaders: customHeaders,
      })

      expect(dialResult.success).toBe(true)
      expect(mockSipClient.makeCall).toHaveBeenCalledWith('sip:+46700123456@example.com', {
        video: false,
        extraHeaders: customHeaders,
      })
      unmount()
    })

    it('should set isDialing to true during SIP INVITE dial', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'standard',
        strategy: 'sip-invite',
      })

      let callStarted = false

      ;(mockSipClient as any).makeCall = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            callStarted = true
            setTimeout(() => resolve('mock-call-id'), 100)
          })
      )

      await result.dial('sip:+46700123456@example.com')

      expect(callStarted).toBe(true)
      expect(result.isDialing.value).toBe(false)
      unmount()
    })
  })

  describe('Strategy Selection Logic', () => {
    it('should select sip-invite for unknown providers with auto-detect', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'unknown-provider',
        autoDetect: true,
      })

      expect(result.strategy.value).toBe('sip-invite')
      unmount()
    })

    it('should respect explicit strategy over auto-detect', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: '46elks',
        autoDetect: true,
      })

      expect(result.strategy.value).toBe('rest-originate')

      result.configure({
        providerId: '46elks',
        strategy: 'sip-invite',
      })

      expect(result.strategy.value).toBe('sip-invite')
      unmount()
    })
  })

  describe('Error Handling', () => {
    it('should reject dial when SIP client is not initialized', async () => {
      const sipClientRef = ref<SipClient>(null)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'standard',
        strategy: 'sip-invite',
      })

      const dialResult = await result.dial('sip:+46700123456@example.com')

      expect(dialResult.success).toBe(false)
      expect(dialResult.error).toBe('SIP client not initialized')
      unmount()
    })

    it('should handle SIP client without makeCall method', async () => {
      const noMakeCallClient = { ...mockSipClient } as any
      delete noMakeCallClient.makeCall

      const sipClientRef = ref<SipClient>(noMakeCallClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'standard',
        strategy: 'sip-invite',
      })

      const dialResult = await result.dial('sip:+46700123456@example.com')

      expect(dialResult.success).toBe(false)
      expect(dialResult.error).toBe('SipClient.makeCall() is not implemented')
      unmount()
    })

    it('should reset state on reset() call', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: 'standard',
        strategy: 'sip-invite',
      })

      const dialResult = await result.dial('sip:+46700123456@example.com')

      expect(dialResult.success).toBe(true)
      expect(result.lastResult.value).toEqual(dialResult)

      result.reset()

      expect(result.isDialing.value).toBe(false)
      expect(result.lastResult.value).toBe(null)
      expect(result.error.value).toBe(null)
      unmount()
    })
  })

  describe('46elks REST Originate Strategy - Integration', () => {
    it('should detect 46elks provider and select rest-originate', () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: '46elks',
        autoDetect: true,
      })

      expect(result.strategy.value).toBe('rest-originate')
      unmount()
    })

    it('should accept rest-originate options without throwing', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: '46elks',
        autoDetect: true,
      })

      const restOptions = {
        apiUsername: 'u1234567890abcdef',
        apiPassword: 'test-password',
        callerId: '+46700000000',
        webrtcNumber: '+46700000000',
        destination: '+46700123456',
      }

      const dialPromise = result.dial('', restOptions)

      expect(dialPromise).toBeInstanceOf(Promise)
      unmount()
    })

    it('should not call SIP makeCall when using 46elks strategy', async () => {
      const sipClientRef = ref<SipClient>(mockSipClient)
      const { result, unmount } = withSetup(() => useDialStrategy(sipClientRef))

      result.configure({
        providerId: '46elks',
        autoDetect: true,
      })

      const restOptions = {
        apiUsername: 'u1234567890abcdef',
        apiPassword: 'test-password',
        callerId: '+46700000000',
        webrtcNumber: '+46700000000',
        destination: '+46700123456',
      }

      await result.dial('', restOptions)

      expect(mockSipClient.makeCall).not.toHaveBeenCalled()
      unmount()
    })
  })
})
