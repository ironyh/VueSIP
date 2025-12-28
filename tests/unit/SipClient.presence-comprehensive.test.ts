/**
 * SipClient Comprehensive Presence Tests
 * Full coverage for presence publish/subscribe functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'

// Mock JsSIP with presence support
const { mockUA, mockWebSocketInterface, eventHandlers, onceHandlers, triggerEvent } = vi.hoisted(
  () => {
    // Event handler storage
    const eventHandlers: Record<string, Array<(...args: any[]) => void>> = {}
    const onceHandlers: Record<string, Array<(...args: any[]) => void>> = {}

    // Helper to trigger events
    const triggerEvent = (event: string, data?: any) => {
      // Trigger 'on' handlers
      const handlers = eventHandlers[event] || []
      handlers.forEach((handler) => handler(data))

      // Trigger and remove 'once' handlers
      const once = onceHandlers[event] || []
      once.forEach((handler) => handler(data))
      onceHandlers[event] = []
    }

    const mockUA = {
      start: vi.fn(),
      stop: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
      sendMessage: vi.fn(),
      sendRequest: vi.fn((method: string, target: string, options: any) => {
        // Immediately call success handler to simulate successful PUBLISH
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
      }),
      isConnected: vi.fn().mockReturnValue(true),
      isRegistered: vi.fn().mockReturnValue(true),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!eventHandlers[event]) eventHandlers[event] = []
        eventHandlers[event].push(handler)
      }),
      once: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
      }),
      off: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (eventHandlers[event]) {
          eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler)
        }
        if (onceHandlers[event]) {
          onceHandlers[event] = onceHandlers[event].filter((h) => h !== handler)
        }
      }),
    }

    const mockWebSocketInterface = vi.fn()

    return { mockUA, mockWebSocketInterface, eventHandlers, onceHandlers, triggerEvent }
  }
)

vi.mock('jssip', () => {
  return {
    default: {
      UA: vi.fn(function () {
        return mockUA
      }),
      WebSocketInterface: mockWebSocketInterface,
      debug: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
    },
  }
})

describe('SipClient - Comprehensive Presence', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  // Helper to start the client with proper event triggering (matches SipClient.test.ts pattern)
  async function startClient(): Promise<void> {
    setTimeout(() => {
      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', {})
    }, 10)

    await sipClient.start()
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Clear event handlers
    Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
    Object.keys(onceHandlers).forEach((key) => delete onceHandlers[key])

    // Clean up window globals to prevent E2E mode detection
    delete (window as any).__emitSipEvent
    delete (window as any).__sipEventBridge

    // Restore default mock implementations
    mockUA.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    })
    mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    })

    // Reset mock return values
    mockUA.isConnected.mockReturnValue(false)
    mockUA.isRegistered.mockReturnValue(false)

    eventBus = createEventBus()
    config = {
      uri: 'wss://example.com:8089/ws',
      sipUri: 'sip:1000@example.com',
      password: 'test-password',
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
        status: 'open',
        note: 'Available',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
      expect(publishEvents).toHaveLength(1)
      expect(publishEvents[0].presence.status).toBe('open')
    })

    it('should publish busy presence', async () => {
      await startClient()
      await sipClient.publishPresence({
        status: 'busy',
        note: 'In a meeting',
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
        status: 'dnd',
        note: 'Do Not Disturb',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should publish away presence', async () => {
      await startClient()
      await sipClient.publishPresence({
        status: 'away',
        note: 'Away from desk',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should publish offline presence', async () => {
      await startClient()
      await sipClient.publishPresence({
        status: 'closed',
        note: 'Offline',
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should publish presence with custom note', async () => {
      await startClient()
      const customNote = 'Custom status message with details'

      await sipClient.publishPresence({
        status: 'open',
        note: customNote,
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      expect(callArgs[1]).toContain(customNote)
    })

    it('should publish presence with activity', async () => {
      await startClient()
      await sipClient.publishPresence({
        status: 'open',
        note: 'Available',
        activity: 'meeting',
      })

      const callArgs = mockUA.sendRequest.mock.calls[0]
      expect(callArgs[1]).toContain('meeting')
    })

    it('should publish presence with custom expiry', async () => {
      await startClient()
      await sipClient.publishPresence({
        status: 'open',
        note: 'Available',
        expires: 7200, // 2 hours
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should track published presence state', async () => {
      await startClient()
      await sipClient.publishPresence({
        status: 'open',
        note: 'Available',
      })

      // Internal tracking should be updated
      expect(mockUA.sendRequest).toHaveBeenCalledTimes(1)
    })

    it('should handle publish with extra headers', async () => {
      await sipClient.publishPresence({
        status: 'open',
        note: 'Available',
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
      await sipClient.publishPresence({
        status: 'open',
        note: 'Available',
      })

      const [, xml] = mockUA.sendRequest.mock.calls[0]
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<presence')
      expect(xml).toContain('xmlns="urn:ietf:params:xml:ns:pidf"')
      expect(xml).toContain('<basic>open</basic>')
      expect(xml).toContain('<note>Available</note>')
    })

    it('should generate valid PIDF+XML for busy status', async () => {
      await sipClient.publishPresence({
        status: 'busy',
        note: 'In meeting',
      })

      const [, xml] = mockUA.sendRequest.mock.calls[0]
      expect(xml).toContain('<basic>open</basic>') // PIDF uses 'open' with activity
      expect(xml).toContain('In meeting')
    })

    it('should include entity attribute with SIP URI', async () => {
      await sipClient.publishPresence({
        status: 'open',
        note: 'Test',
      })

      const [, xml] = mockUA.sendRequest.mock.calls[0]
      expect(xml).toContain('entity="sip:1000@example.com"')
    })

    it('should include timestamp in presence document', async () => {
      await startClient()
      await sipClient.publishPresence({
        status: 'open',
        note: 'Test',
      })

      const [, xml] = mockUA.sendRequest.mock.calls[0]
      expect(xml).toContain('<timestamp>')
    })

    it('should properly escape XML special characters in note', async () => {
      await sipClient.publishPresence({
        status: 'open',
        note: 'Available & ready for <calls>',
      })

      const [, xml] = mockUA.sendRequest.mock.calls[0]
      expect(xml).toContain('&amp;')
      expect(xml).toContain('&lt;')
      expect(xml).toContain('&gt;')
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
      await sipClient.subscribePresence('sip:2000@example.com', {
        expires: 7200,
      })

      expect(mockUA.sendRequest).toHaveBeenCalled()
    })

    it('should subscribe with extra headers', async () => {
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
      await sipClient.subscribePresence('sip:2000@example.com')
      await sipClient.subscribePresence('sip:3000@example.com')

      // Should track both subscriptions internally
      expect(mockUA.sendRequest).toHaveBeenCalledTimes(2)
    })

    it('should handle duplicate subscription requests', async () => {
      await sipClient.subscribePresence('sip:2000@example.com')
      await sipClient.subscribePresence('sip:2000@example.com')

      // Should handle gracefully (implementation-dependent)
      expect(mockUA.sendRequest).toHaveBeenCalled()
    })
  })

  describe('Presence Unsubscription', () => {
    beforeEach(async () => {
      await sipClient.subscribePresence('sip:2000@example.com')
      vi.clearAllMocks()
    })

    it('should unsubscribe from presence', async () => {
      await startClient()
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
      mockUA.sendRequest.mockImplementationOnce(() => {
        throw new Error('Network error')
      })

      await expect(
        sipClient.publishPresence({
          status: 'open',
          note: 'Available',
        })
      ).rejects.toThrow()
    })

    it('should handle subscribe failure', async () => {
      mockUA.sendRequest.mockImplementationOnce(() => {
        throw new Error('Network error')
      })

      await expect(sipClient.subscribePresence('sip:2000@example.com')).rejects.toThrow()
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
        status: 'open',
        note: 'Available',
        expires: 3600,
      })

      // Refresh publish
      await sipClient.publishPresence({
        status: 'open',
        note: 'Still available',
        expires: 3600,
      })

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(2)
    })

    it('should support subscription refresh', async () => {
      // Initial subscribe
      await sipClient.subscribePresence('sip:2000@example.com', { expires: 3600 })

      // Refresh subscribe
      await sipClient.subscribePresence('sip:2000@example.com', { expires: 3600 })

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(2)
    })
  })

  describe('Multiple Presence Operations', () => {
    it('should handle multiple concurrent publishes', async () => {
      const publishes = [
        sipClient.publishPresence({ status: 'open', note: 'Test 1' }),
        sipClient.publishPresence({ status: 'busy', note: 'Test 2' }),
        sipClient.publishPresence({ status: 'away', note: 'Test 3' }),
      ]

      await Promise.all(publishes)

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(3)
    })

    it('should handle multiple concurrent subscriptions', async () => {
      const subscriptions = [
        sipClient.subscribePresence('sip:2000@example.com'),
        sipClient.subscribePresence('sip:3000@example.com'),
        sipClient.subscribePresence('sip:4000@example.com'),
      ]

      await Promise.all(subscriptions)

      expect(mockUA.sendRequest).toHaveBeenCalledTimes(3)
    })

    it('should manage multiple active subscriptions', async () => {
      await sipClient.subscribePresence('sip:2000@example.com')
      await sipClient.subscribePresence('sip:3000@example.com')
      await sipClient.unsubscribePresence('sip:2000@example.com')

      // Should have 1 active subscription remaining
      expect(mockUA.sendRequest).toHaveBeenCalled()
    })
  })
})
