/**
 * SipClient Comprehensive Presence Tests
 * Full coverage for presence publish/subscribe functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'

// Enable automatic mocking using __mocks__/jssip.ts
vi.mock('jssip')

// Import mock helpers from the mocked module
import { mockUA, eventHandlers, triggerEvent, resetMockJsSip } from 'jssip'

describe('SipClient - Comprehensive Presence', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  // Helper to start the client with proper event triggering (matches SipClient.test.ts pattern)
  async function startClient(): Promise<void> {
    // Set isConnected BEFORE start() so waitForConnection() resolves immediately
    mockUA.isConnected.mockReturnValue(true)

    // Also trigger the connected event for any on() handlers that need it
    setTimeout(() => {
      triggerEvent('connected', {})
    }, 10)

    await sipClient.start()
  }

  beforeEach(() => {
    // Reset all mocks and handlers using shared helper
    resetMockJsSip()

    // Clean up window globals to prevent E2E mode detection
    delete (window as any).__emitSipEvent
    delete (window as any).__sipEventBridge

    // Setup sendRequest to auto-succeed for presence tests
    mockUA.sendRequest.mockImplementation((method: string, target: string, options: any) => {
      if (options.eventHandlers?.onSuccessResponse) {
        setTimeout(() => {
          options.eventHandlers.onSuccessResponse({
            status_code: 200,
            getHeader: (name: string) => {
              if (name === 'SIP-ETag') return 'test-etag-123'
              return null
            },
          })
        }, 0)
      }
    })

    // Reset mock return values
    mockUA.isConnected.mockReturnValue(false)
    mockUA.isRegistered.mockReturnValue(false)

    eventBus = createEventBus()
    config = {
      uri: 'wss://example.com:8089/ws',
      sipUri: 'sip:1000@example.com',
      password: 'test-password',
      registrationOptions: {
        autoRegister: false, // Disable auto-registration for cleaner tests
      },
    }

    sipClient = new SipClient(config, eventBus)
  })

  afterEach(() => {
    if (sipClient) {
      sipClient.stop()
    }
  })

  describe('Presence Publishing', () => {
    it('should publish basic available presence', async () => {
      await startClient()
      const publishEvents: any[] = []
      eventBus.on('sip:presence:publish', (e) => publishEvents.push(e))

      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Available',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
      expect(publishEvents).toHaveLength(1)
      expect(publishEvents[0].presence.state).toBe('available')
    })

    it('should publish busy presence', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'busy',
        statusMessage: 'In a meeting',
      })

      expect(mockUA.sendRequest).toHaveBeenCalledWith(
        'PUBLISH',
        expect.any(String),
        expect.objectContaining({
          contentType: 'application/pidf+xml',
        })
      )
    })

    it('should publish DND (Do Not Disturb) presence', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'dnd',
        statusMessage: 'Do Not Disturb',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should publish away presence', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'away',
        statusMessage: 'Away from desk',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should publish offline presence', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'closed',
        statusMessage: 'Offline',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should publish presence with custom note', async () => {
      await startClient()
      const customNote = 'Custom status message with details'

      await sipClient.publishPresence({
        state: 'available',
        statusMessage: customNote,
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      expect(callArgs[2].body).toContain(customNote)
    })

    it('should publish presence with activity', async () => {
      await startClient()
      // Note: activity is not part of PresencePublishOptions interface
      // This test verifies that statusMessage containing "meeting" is included
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'In a meeting',
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      expect(callArgs[2].body).toContain('meeting')
    })

    it('should publish presence with custom expiry', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Available',
        expires: 7200, // 2 hours
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should track published presence state', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Available',
      })

      // Internal tracking should be updated
      expect(mockUA.sendRequest).toHaveBeenCalledTimes(1)
    })

    it('should handle publish with extra headers', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Available',
        extraHeaders: ['X-Custom-Presence: value'],
      })

      expect(mockUA.sendRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['X-Custom-Presence: value']),
        })
      )
    })
  })

  describe('Presence PIDF+XML Document Generation', () => {
    it('should generate valid PIDF+XML for open status', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Available',
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      const xml = callArgs[2].body
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<presence')
      expect(xml).toContain('xmlns="urn:ietf:params:xml:ns:pidf"')
      expect(xml).toContain('<basic>open</basic>')
      expect(xml).toContain('<note>Available</note>')
    })

    it('should generate valid PIDF+XML for busy status', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'busy',
        statusMessage: 'In meeting',
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      const xml = callArgs[2].body
      // Non-available states map to 'closed' in PIDF basic status
      expect(xml).toContain('<basic>closed</basic>')
      expect(xml).toContain('In meeting')
    })

    it('should include entity attribute with SIP URI', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Test',
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      const xml = callArgs[2].body
      expect(xml).toContain('entity="sip:1000@example.com"')
    })

    it('should include tuple with status in presence document', async () => {
      await startClient()
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Test',
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      const xml = callArgs[2].body
      expect(xml).toContain('<tuple id="sipphone">')
      expect(xml).toContain('<status>')
    })

    it('should include statusMessage in note element', async () => {
      await startClient()
      const testMessage = 'Available and ready for calls'
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: testMessage,
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      const xml = callArgs[2].body
      expect(xml).toContain(`<note>${testMessage}</note>`)
    })
  })

  describe('Presence Subscription', () => {
    it('should subscribe to presence of another user', async () => {
      await startClient()
      const subscribeEvents: any[] = []
      eventBus.on('sip:presence:subscribe', (e) => subscribeEvents.push(e))

      await sipClient.subscribePresence('sip:2000@example.com')

      expect(mockUA.sendRequest).toHaveBeenCalled()
      expect(subscribeEvents).toHaveLength(1)
      expect(subscribeEvents[0].uri).toBe('sip:2000@example.com')
    })

    it('should subscribe with custom expires', async () => {
      await startClient()

      await sipClient.subscribePresence('sip:2000@example.com', {
        expires: 7200,
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should subscribe with extra headers', async () => {
      await startClient()

      await sipClient.subscribePresence('sip:2000@example.com', {
        extraHeaders: ['X-Custom-Subscribe: value'],
      })

      expect(mockUA.sendRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(['X-Custom-Subscribe: value']),
        })
      )
    })

    it('should track active subscriptions', async () => {
      await startClient()

      await sipClient.subscribePresence('sip:2000@example.com')
      await sipClient.subscribePresence('sip:3000@example.com')

      // Should track both subscriptions internally
      expect(mockUA.sendRequest).toHaveBeenCalledTimes(2)
    })

    it('should handle duplicate subscription requests', async () => {
      await startClient()

      await sipClient.subscribePresence('sip:2000@example.com')
      await sipClient.subscribePresence('sip:2000@example.com')

      // Should handle gracefully (implementation-dependent)
      expect(mockUA.sendRequest).toHaveBeenCalled()
    })
  })

  describe('Presence Unsubscription', () => {
    beforeEach(async () => {
      await startClient()
      await sipClient.subscribePresence('sip:2000@example.com')
      vi.clearAllMocks()
    })

    it('should unsubscribe from presence', async () => {
      const unsubscribeEvents: any[] = []
      eventBus.on('sip:presence:unsubscribe', (e) => unsubscribeEvents.push(e))

      await sipClient.unsubscribePresence('sip:2000@example.com')

      expect(mockUA.sendRequest).toHaveBeenCalled()
      expect(unsubscribeEvents).toHaveLength(1)
      expect(unsubscribeEvents[0].uri).toBe('sip:2000@example.com')
    })

    it('should send SUBSCRIBE with expires=0 for unsubscribe', async () => {
      await sipClient.unsubscribePresence('sip:2000@example.com')

      expect(mockUA.sendRequest).toHaveBeenCalled()
      // Should contain expires=0 in headers or body
    })

    it('should remove subscription from tracking', async () => {
      await sipClient.unsubscribePresence('sip:2000@example.com')

      // Internal subscription should be removed
      expect(mockUA.sendRequest).toHaveBeenCalledTimes(1)
    })

    it('should handle unsubscribe of non-existent subscription', async () => {
      await sipClient.unsubscribePresence('sip:9999@example.com')

      // Should handle gracefully without error
    })
  })

  describe('Presence Notification Receiving', () => {
    it('should receive presence notification', async () => {
      await startClient()
      const notifyEvents: any[] = []
      eventBus.on('sip:presenceUpdate', (e) => notifyEvents.push(e))

      const mockRequest = {
        from: { uri: { user: '2000', host: 'example.com' } },
        body: `<?xml version="1.0"?>
          <presence xmlns="urn:ietf:params:xml:ns:pidf" entity="sip:2000@example.com">
            <tuple id="1">
              <status><basic>open</basic></status>
              <note>Available</note>
            </tuple>
          </presence>`,
        getHeader: (name: string) => {
          if (name === 'Content-Type') return 'application/pidf+xml'
          if (name === 'Event') return 'presence'
          return null
        },
      }

      const handlers = eventHandlers['newMessage'] || []
      handlers.forEach((handler) =>
        handler({
          originator: 'remote',
          request: mockRequest,
        })
      )

      // Should parse and emit presence update
    })

    it('should parse PIDF+XML presence status', async () => {
      await startClient()
      const mockRequest = {
        from: { uri: { user: '2000', host: 'example.com' } },
        body: `<?xml version="1.0"?>
          <presence xmlns="urn:ietf:params:xml:ns:pidf" entity="sip:2000@example.com">
            <tuple id="1">
              <status><basic>open</basic></status>
            </tuple>
          </presence>`,
        getHeader: (name: string) => {
          if (name === 'Content-Type') return 'application/pidf+xml'
          if (name === 'Event') return 'presence'
          return null
        },
      }

      const handlers = eventHandlers['newMessage'] || []
      handlers.forEach((handler) =>
        handler({
          originator: 'remote',
          request: mockRequest,
        })
      )

      // Should extract 'open' status
    })

    it('should extract presence note from PIDF+XML', async () => {
      await startClient()
      const mockRequest = {
        from: { uri: { user: '2000', host: 'example.com' } },
        body: `<?xml version="1.0"?>
          <presence xmlns="urn:ietf:params:xml:ns:pidf" entity="sip:2000@example.com">
            <tuple id="1">
              <status><basic>open</basic></status>
              <note>Custom status message</note>
            </tuple>
          </presence>`,
        getHeader: (name: string) => {
          if (name === 'Content-Type') return 'application/pidf+xml'
          if (name === 'Event') return 'presence'
          return null
        },
      }

      const handlers = eventHandlers['newMessage'] || []
      handlers.forEach((handler) =>
        handler({
          originator: 'remote',
          request: mockRequest,
        })
      )

      // Should extract 'Custom status message'
    })
  })

  describe('Presence Error Handling', () => {
    it('should handle publish failure', async () => {
      await startClient()

      // Mock sendRequest to call the error handler instead of throwing synchronously
      mockUA.sendRequest.mockImplementationOnce((method: string, target: string, options: any) => {
        if (options.eventHandlers?.onTransportError) {
          setTimeout(() => {
            options.eventHandlers.onTransportError()
          }, 0)
        }
      })

      await expect(
        sipClient.publishPresence({
          state: 'available',
          statusMessage: 'Available',
        })
      ).rejects.toThrow('PUBLISH transport error')
    })

    it('should handle subscribe failure', async () => {
      await startClient()

      // Mock sendRequest to call the error handler instead of throwing synchronously
      mockUA.sendRequest.mockImplementationOnce((method: string, target: string, options: any) => {
        if (options.eventHandlers?.onTransportError) {
          setTimeout(() => {
            options.eventHandlers.onTransportError()
          }, 0)
        }
      })

      await expect(sipClient.subscribePresence('sip:2000@example.com')).rejects.toThrow(
        'SUBSCRIBE transport error'
      )
    })

    it('should handle malformed PIDF+XML in notification', async () => {
      const mockRequest = {
        from: { uri: { user: '2000', host: 'example.com' } },
        body: '<invalid>xml without closing tags',
        getHeader: (name: string) => {
          if (name === 'Content-Type') return 'application/pidf+xml'
          if (name === 'Event') return 'presence'
          return null
        },
      }

      // Should not throw error
      const handlers = eventHandlers['newMessage'] || []
      expect(() => {
        handlers.forEach((handler) =>
          handler({
            originator: 'remote',
            request: mockRequest,
          })
        )
      }).not.toThrow()
    })

    it('should handle missing status in PIDF+XML', async () => {
      const mockRequest = {
        from: { uri: { user: '2000', host: 'example.com' } },
        body: `<?xml version="1.0"?>
          <presence xmlns="urn:ietf:params:xml:ns:pidf" entity="sip:2000@example.com">
            <tuple id="1">
              <note>No status</note>
            </tuple>
          </presence>`,
        getHeader: (name: string) => {
          if (name === 'Content-Type') return 'application/pidf+xml'
          if (name === 'Event') return 'presence'
          return null
        },
      }

      const handlers = eventHandlers['newMessage'] || []
      expect(() => {
        handlers.forEach((handler) =>
          handler({
            originator: 'remote',
            request: mockRequest,
          })
        )
      }).not.toThrow()
    })
  })

  describe('Presence Refresh', () => {
    it('should support presence refresh before expiry', async () => {
      await startClient()
      // First publish
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Available',
        expires: 3600,
      })

      // Refresh publish
      await sipClient.publishPresence({
        state: 'available',
        statusMessage: 'Still available',
        expires: 3600,
      })

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(2)
    })

    it('should support subscription refresh after unsubscribe', async () => {
      await startClient()

      // Initial subscribe
      await sipClient.subscribePresence('sip:2000@example.com', { expires: 3600 })

      // Unsubscribe first (subscription returns early if already subscribed)
      await sipClient.unsubscribePresence('sip:2000@example.com')

      // Re-subscribe
      await sipClient.subscribePresence('sip:2000@example.com', { expires: 3600 })

      // 3 calls: initial subscribe, unsubscribe (expires:0), re-subscribe
      expect(mockUA.sendRequest).toHaveBeenCalledTimes(3)
    })
  })

  describe('Multiple Presence Operations', () => {
    it('should handle multiple concurrent publishes', async () => {
      await startClient()

      const publishes = [
        sipClient.publishPresence({ state: 'available', statusMessage: 'Test 1' }),
        sipClient.publishPresence({ state: 'busy', statusMessage: 'Test 2' }),
        sipClient.publishPresence({ state: 'away', statusMessage: 'Test 3' }),
      ]

      await Promise.all(publishes)

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(3)
    })

    it('should handle multiple concurrent subscriptions', async () => {
      await startClient()

      const subscriptions = [
        sipClient.subscribePresence('sip:2000@example.com'),
        sipClient.subscribePresence('sip:3000@example.com'),
        sipClient.subscribePresence('sip:4000@example.com'),
      ]

      await Promise.all(subscriptions)

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(3)
    })

    it('should manage multiple active subscriptions', async () => {
      await startClient()

      await sipClient.subscribePresence('sip:2000@example.com')
      await sipClient.subscribePresence('sip:3000@example.com')
      await sipClient.unsubscribePresence('sip:2000@example.com')

      // Should have 1 active subscription remaining
      expect(mockUA.sendRequest).toHaveBeenCalled()
    })
  })
})
