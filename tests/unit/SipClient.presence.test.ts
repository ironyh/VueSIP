/**
 * SipClient presence features unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import { ConnectionState } from '@/types/sip.types'

// Enable automatic mocking using __mocks__/jssip.ts
vi.mock('jssip')

// Import mock helpers from the mocked module
import { mockUA, resetMockJsSip } from 'jssip'

describe('SipClient - Presence Features', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  beforeEach(() => {
    // Reset all mocks and handlers using shared helper
    resetMockJsSip()

    mockUA.isConnected.mockReturnValue(true)
    mockUA.isRegistered.mockReturnValue(true)

    eventBus = createEventBus()
    config = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      debug: false,
    }

    sipClient = new SipClient(config, eventBus)

    // Set UA reference and connection state for testing
    sipClient['ua'] = mockUA as any
    sipClient['state'].connectionState = ConnectionState.Connected
  })

  afterEach(() => {
    sipClient.destroy()
    eventBus.destroy()
  })

  describe('publishPresence()', () => {
    it('should publish presence successfully', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:presence:publish', eventHandler)

      // Mock successful PUBLISH response
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onSuccessResponse({
            status_code: 200,
            getHeader: () => 'test-etag-123',
          })
        }, 10)
      })

      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Working',
      })

      expect(mockUA.sendRequest).toHaveBeenCalledWith(
        'PUBLISH',
        'sip:testuser@example.com',
        expect.objectContaining({
          contentType: 'application/pidf+xml',
        })
      )
      expect(eventHandler).toHaveBeenCalled()
    })

    it('should throw error when not connected', async () => {
      mockUA.isConnected.mockReturnValue(false)
      await expect(sipClient.publishPresence({ state: 'available' })).rejects.toThrow(
        'Not connected'
      )
    })

    it('should throw error when UA is null', async () => {
      const client = new SipClient(config, eventBus)
      await expect(client.publishPresence({ state: 'available' })).rejects.toThrow('not started')
    })

    it('should handle PUBLISH error response', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onErrorResponse({
            status_code: 403,
            reason_phrase: 'Forbidden',
          })
        }, 10)
      })

      await expect(sipClient.publishPresence({ state: 'available' })).rejects.toThrow(
        'PUBLISH failed: 403 Forbidden'
      )
    })

    it('should handle PUBLISH timeout', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onRequestTimeout()
        }, 10)
      })

      await expect(sipClient.publishPresence({ state: 'available' })).rejects.toThrow(
        'PUBLISH request timeout'
      )
    })

    it('should handle PUBLISH transport error', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onTransportError()
        }, 10)
      })

      await expect(sipClient.publishPresence({ state: 'available' })).rejects.toThrow(
        'PUBLISH transport error'
      )
    })
  })

  describe('subscribePresence()', () => {
    it('should subscribe to presence successfully', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:presence:subscribe', eventHandler)

      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onSuccessResponse({ status_code: 200 })
        }, 10)
      })

      await sipClient.subscribePresence('sip:other@example.com')

      expect(mockUA.sendRequest).toHaveBeenCalledWith(
        'SUBSCRIBE',
        'sip:other@example.com',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Event: presence']),
        })
      )
      expect(eventHandler).toHaveBeenCalled()
    })

    it('should throw error when not connected', async () => {
      mockUA.isConnected.mockReturnValue(false)
      await expect(sipClient.subscribePresence('sip:other@example.com')).rejects.toThrow(
        'Not connected'
      )
    })

    it('should throw error when UA is null', async () => {
      const client = new SipClient(config, eventBus)
      await expect(client.subscribePresence('sip:other@example.com')).rejects.toThrow('not started')
    })

    it('should handle SUBSCRIBE error response', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onErrorResponse({
            status_code: 404,
            reason_phrase: 'Not Found',
          })
        }, 10)
      })

      await expect(sipClient.subscribePresence('sip:other@example.com')).rejects.toThrow(
        'SUBSCRIBE failed: 404 Not Found'
      )
    })

    it('should handle SUBSCRIBE timeout', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onRequestTimeout()
        }, 10)
      })

      await expect(sipClient.subscribePresence('sip:other@example.com')).rejects.toThrow(
        'SUBSCRIBE request timeout'
      )
    })

    it('should handle SUBSCRIBE transport error', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onTransportError()
        }, 10)
      })

      await expect(sipClient.subscribePresence('sip:other@example.com')).rejects.toThrow(
        'SUBSCRIBE transport error'
      )
    })

    it('should warn when already subscribed', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onSuccessResponse({ status_code: 200 })
        }, 10)
      })

      await sipClient.subscribePresence('sip:other@example.com')
      await sipClient.subscribePresence('sip:other@example.com') // Second call should warn

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('unsubscribePresence()', () => {
    beforeEach(() => {
      // Mark as subscribed
      sipClient['presenceSubscriptions'] = new Set(['sip:other@example.com'])
      vi.clearAllMocks()
    })

    it('should unsubscribe from presence successfully', async () => {
      const eventHandler = vi.fn()
      eventBus.on('sip:presence:unsubscribe', eventHandler)

      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onSuccessResponse({ status_code: 200 })
        }, 10)
      })

      await sipClient.unsubscribePresence('sip:other@example.com')

      expect(mockUA.sendRequest).toHaveBeenCalledWith(
        'SUBSCRIBE',
        'sip:other@example.com',
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['Expires: 0']),
        })
      )
      expect(eventHandler).toHaveBeenCalled()
    })

    it('should throw error when UA is null', async () => {
      const client = new SipClient(config, eventBus)
      await expect(client.unsubscribePresence('sip:other@example.com')).rejects.toThrow(
        'not started'
      )
    })

    it('should warn when not subscribed', async () => {
      await sipClient.unsubscribePresence('sip:nonexistent@example.com')
      expect(mockUA.sendRequest).not.toHaveBeenCalled()
    })

    it('should handle UNSUBSCRIBE error response', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onErrorResponse({
            status_code: 500,
            reason_phrase: 'Server Error',
          })
        }, 10)
      })

      await expect(sipClient.unsubscribePresence('sip:other@example.com')).rejects.toThrow(
        'UNSUBSCRIBE failed: 500 Server Error'
      )
    })

    it('should handle UNSUBSCRIBE timeout', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onRequestTimeout()
        }, 10)
      })

      await expect(sipClient.unsubscribePresence('sip:other@example.com')).rejects.toThrow(
        'UNSUBSCRIBE request timeout'
      )
    })

    it('should handle UNSUBSCRIBE transport error', async () => {
      mockUA.sendRequest.mockImplementation((_method, _uri, options) => {
        setTimeout(() => {
          options.eventHandlers.onTransportError()
        }, 10)
      })

      await expect(sipClient.unsubscribePresence('sip:other@example.com')).rejects.toThrow(
        'UNSUBSCRIBE transport error'
      )
    })
  })
})
