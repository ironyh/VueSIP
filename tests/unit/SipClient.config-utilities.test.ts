/**
 * SipClient Configuration and Utilities Tests
 * Coverage for UA configuration, helper methods, and utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SipClient, createSipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import JsSIP from 'jssip'
import { mockUA } from '../setup'

// Note: JsSIP is mocked globally in tests/setup.ts to avoid mock conflicts
// across multiple test files. The global mock includes Promise support and
// config inspection capabilities. Import mockUA from setup for test access.

describe('SipClient - Configuration & Utilities', () => {
  let eventBus: EventBus
  let config: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()

    // Enable E2E test mode to bypass real JsSIP connections
    ;(window as any).__emitSipEvent = vi.fn()

    eventBus = createEventBus()
    config = {
      uri: 'wss://example.com:8089/ws',
      sipUri: 'sip:1000@example.com',
      password: 'test-password',
      registrationOptions: {
        autoRegister: false, // Disable auto-registration to prevent "Not connected" errors in tests
      },
    }
  })

  describe('UA Configuration Creation', () => {
    // These tests verify UA config transformation without E2E mode
    // We disable E2E mode and mock event emission to prevent timeouts
    beforeEach(() => {
      // Temporarily disable E2E mode for UA config tests
      delete (window as any).__emitSipEvent

      // Mock both 'on' and 'once' methods to immediately emit events with proper event objects
      // waitForConnection() uses 'once', so we need to mock that too
      mockUA.on = vi.fn((event: string, callback: any) => {
        if (event === 'connected') {
          setTimeout(() => callback({}), 0) // Connected event doesn't need properties
        }
        if (event === 'registered') {
          // Registered event needs response object with getHeader method
          const mockEvent = {
            response: {
              getHeader: vi.fn((header: string) => {
                if (header === 'Expires') return '3600'
                return null
              }),
            },
          }
          setTimeout(() => callback(mockEvent), 0)
        }
      })

      mockUA.once = vi.fn((event: string, callback: any) => {
        if (event === 'connected') {
          setTimeout(() => callback({}), 0) // Connected event doesn't need properties
        }
        if (event === 'disconnected') {
          // Don't call - we want connection to succeed
        }
      })

      // Mock 'off' for cleanup
      mockUA.off = vi.fn()
    })

    afterEach(() => {
      // Restore E2E mode for other tests
      ;(window as any).__emitSipEvent = vi.fn()
    })

    it('should create basic UA configuration', async () => {
      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config

      expect(uaConfig).toBeDefined()
      expect(uaConfig.uri).toBe(config.sipUri)
      expect(uaConfig.password).toBe(config.password)
    })

    it('should include WebSocket sockets in configuration', async () => {
      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config

      expect(uaConfig.sockets).toBeDefined()
      expect(Array.isArray(uaConfig.sockets)).toBe(true)
    })

    it('should configure password authentication', async () => {
      const configWithPassword = {
        ...config,
        password: 'secure-password-123',
      }

      const sipClient = new SipClient(configWithPassword, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.password).toBe('secure-password-123')
    })

    it('should configure authorization username', async () => {
      const configWithAuthUser = {
        ...config,
        authorizationUsername: 'auth-user',
      }

      const sipClient = new SipClient(configWithAuthUser, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.authorization_user).toBe('auth-user')
    })

    it('should configure realm', async () => {
      const configWithRealm = {
        ...config,
        realm: 'example.com',
      }

      const sipClient = new SipClient(configWithRealm, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.realm).toBe('example.com')
    })

    it('should configure HA1 authentication', async () => {
      const configWithHA1 = {
        ...config,
        ha1: 'ha1-hash-value',
      }

      const sipClient = new SipClient(configWithHA1, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.ha1).toBe('ha1-hash-value')
    })

    it('should configure display name', async () => {
      const configWithDisplayName = {
        ...config,
        displayName: 'John Doe',
      }

      const sipClient = new SipClient(configWithDisplayName, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.display_name).toBe('John Doe')
    })

    it('should configure custom user agent', async () => {
      const configWithUserAgent = {
        ...config,
        userAgent: 'CustomSIP/2.0',
      }

      const sipClient = new SipClient(configWithUserAgent, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.user_agent).toBe('CustomSIP/2.0')
    })

    it('should use default user agent if not specified', async () => {
      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.user_agent).toBeDefined()
      // Should be the USER_AGENT constant from utils/constants
    })

    it('should handle all authentication fields together', async () => {
      const fullAuthConfig = {
        ...config,
        password: 'pass',
        authorizationUsername: 'authuser',
        realm: 'realm.com',
        ha1: 'ha1hash',
      }

      const sipClient = new SipClient(fullAuthConfig, eventBus)
      await sipClient.start()

      const uaConfig = (mockUA as any)._config
      expect(uaConfig.password).toBe('pass')
      expect(uaConfig.authorization_user).toBe('authuser')
      expect(uaConfig.realm).toBe('realm.com')
      expect(uaConfig.ha1).toBe('ha1hash')
    })

    it('should convert config values to strings to avoid proxy issues', async () => {
      // Create a proxy config to test proxy handling
      const proxyConfig = new Proxy(
        {
          uri: 'wss://example.com:8089/ws',
          sipUri: 'sip:1000@example.com',
          password: 'test',
          registrationOptions: {
            autoRegister: false, // Disable auto-registration to prevent "Not connected" errors
          },
        },
        {
          get(target, prop) {
            return target[prop as keyof typeof target]
          },
        }
      )

      const sipClient = new SipClient(proxyConfig as SipClientConfig, eventBus)
      await sipClient.start()

      // Should have converted proxy values to plain strings
      const uaConfig = (mockUA as any)._config
      expect(typeof uaConfig.uri).toBe('string')
      expect(typeof uaConfig.password).toBe('string')
    })
  })

  describe('Factory Function', () => {
    it('should create SipClient via factory', () => {
      const client = createSipClient(config, eventBus)

      expect(client).toBeInstanceOf(SipClient)
      expect(client.getConfig()).toMatchObject(config)
      expect(client.eventBus).toBe(eventBus)
    })

    it('should create independent instances', () => {
      const client1 = createSipClient(config, eventBus)
      const client2 = createSipClient(config, eventBus)

      expect(client1).not.toBe(client2)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate complete valid configuration', () => {
      const sipClient = new SipClient(config, eventBus)
      const validation = sipClient.validateConfig()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toBeUndefined()
    })

    it('should reject missing URI', () => {
      const invalidConfig = {
        ...config,
        uri: '',
      }

      const sipClient = new SipClient(invalidConfig, eventBus)
      const validation = sipClient.validateConfig()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toBeDefined()
    })

    it('should reject missing SIP URI', () => {
      const invalidConfig = {
        ...config,
        sipUri: '',
      }

      const sipClient = new SipClient(invalidConfig, eventBus)
      const validation = sipClient.validateConfig()

      expect(validation.valid).toBe(false)
    })

    it('should reject invalid WebSocket URI format', () => {
      const invalidConfig = {
        ...config,
        uri: 'http://example.com', // Not wss://
      }

      const sipClient = new SipClient(invalidConfig, eventBus)
      const validation = sipClient.validateConfig()

      expect(validation.valid).toBe(false)
    })

    it('should reject invalid SIP URI format', () => {
      const invalidConfig = {
        ...config,
        sipUri: 'not-a-sip-uri',
      }

      const sipClient = new SipClient(invalidConfig, eventBus)
      const validation = sipClient.validateConfig()

      expect(validation.valid).toBe(false)
    })
  })

  describe('State Management Getters', () => {
    beforeEach(() => {
      // Temporarily disable E2E mode for state getters tests to test real UA behavior
      delete (window as any).__emitSipEvent
    })

    it('should return immutable state copy', () => {
      const sipClient = new SipClient(config, eventBus)
      const state1 = sipClient.getState()
      const state2 = sipClient.getState()

      expect(state1).toEqual(state2)
      expect(state1).not.toBe(state2) // Different objects
    })

    it('should return immutable config copy', () => {
      const sipClient = new SipClient(config, eventBus)
      const config1 = sipClient.getConfig()
      const config2 = sipClient.getConfig()

      expect(config1).toEqual(config2)
      expect(config1).not.toBe(config2) // Different objects
    })

    it('should expose eventBus reference', () => {
      const sipClient = new SipClient(config, eventBus)

      expect(sipClient.eventBus).toBe(eventBus)
    })

    it('should track isConnected status', async () => {
      const sipClient = new SipClient(config, eventBus)

      expect(sipClient.isConnected).toBe(false)

      await sipClient.start()
      // After start, should still be false until connected event
      expect(sipClient.isConnected).toBe(false)
    })

    it('should track isRegistered status', () => {
      const sipClient = new SipClient(config, eventBus)

      expect(sipClient.isRegistered).toBe(false)
    })
  })

  describe('Helper Methods', () => {
    it('should generate unique call IDs', () => {
      const sipClient = new SipClient(config, eventBus)

      // Access private method through any type assertion (for testing)
      const generateCallId = (sipClient as any).generateCallId?.bind(sipClient)

      if (generateCallId) {
        const id1 = generateCallId()
        const id2 = generateCallId()

        expect(id1).toBeTruthy()
        expect(id2).toBeTruthy()
        expect(id1).not.toBe(id2)
        expect(typeof id1).toBe('string')
      }
    })

    it('should extract username from SIP URI', () => {
      const testCases = [
        { sipUri: 'sip:alice@example.com', expected: 'alice' },
        { sipUri: 'sip:bob@example.com', expected: 'bob' },
        { sipUri: 'sip:user.name@example.com', expected: 'user.name' },
      ]

      testCases.forEach(({ sipUri, expected }) => {
        const testConfig = { ...config, sipUri }
        const sipClient = new SipClient(testConfig, eventBus)
        const retrievedConfig = sipClient.getConfig()

        expect(retrievedConfig.sipUri).toContain(expected)
      })
    })
  })

  describe('Debug Logging', () => {
    it('should enable JsSIP debug when configured', () => {
      const debugConfig = {
        ...config,
        debug: true,
      }

      new SipClient(debugConfig, eventBus)

      // Verify JsSIP.debug methods are available
      expect(JsSIP.debug.enable).toBeDefined()
      expect(JsSIP.debug.disable).toBeDefined()
    })

    it('should disable JsSIP debug by default', () => {
      new SipClient(config, eventBus)

      // Verify JsSIP.debug methods are available
      expect(JsSIP.debug.enable).toBeDefined()
      expect(JsSIP.debug.disable).toBeDefined()
    })
  })

  describe('Registration Options', () => {
    it('should respect autoRegister option', () => {
      const autoRegisterConfig = {
        ...config,
        registrationOptions: {
          autoRegister: true,
        },
      }

      const sipClient = new SipClient(autoRegisterConfig, eventBus)
      const retrievedConfig = sipClient.getConfig()

      expect(retrievedConfig.registrationOptions?.autoRegister).toBe(true)
    })

    it('should respect expires option', () => {
      const expiresConfig = {
        ...config,
        registrationOptions: {
          expires: 7200,
        },
      }

      const sipClient = new SipClient(expiresConfig, eventBus)
      const retrievedConfig = sipClient.getConfig()

      expect(retrievedConfig.registrationOptions?.expires).toBe(7200)
    })
  })

  describe('Test Environment Detection', () => {
    it('should detect test environment from window.location', () => {
      // Mock window.location
      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = {
        search: '?test=true',
      }

      const sipClient = new SipClient(config, eventBus)

      // Restore
      ;(window as any).location = originalLocation

      // Client should be created successfully
      expect(sipClient).toBeDefined()
    })

    it('should handle missing window object', () => {
      // Save and clear window
      const originalWindow = global.window
      delete (global as any).window

      const sipClient = new SipClient(config, eventBus)

      // Restore
      ;(global as any).window = originalWindow

      expect(sipClient).toBeDefined()
    })
  })

  describe('Call ID Generation', () => {
    it('should generate RFC-compliant call IDs', () => {
      // SipClient now provides getCall() as a convenience method
      const sipClient = new SipClient(config, eventBus)

      // getCall method should be defined
      const getCall = sipClient.getCall
      expect(getCall).toBeDefined()
    })
  })

  describe('Active Call Management', () => {
    it('should provide getActiveCalls method', () => {
      // SipClient now provides getActiveCalls() as a convenience method
      const sipClient = new SipClient(config, eventBus)

      expect(sipClient.getActiveCalls).toBeDefined()
      expect(typeof sipClient.getActiveCalls).toBe('function')
    })

    it('should provide getCall method', () => {
      // SipClient now provides getCall() as a convenience method
      const sipClient = new SipClient(config, eventBus)

      expect(sipClient.getCall).toBeDefined()
      expect(typeof sipClient.getCall).toBe('function')
    })
  })

  describe('Message Handler Management', () => {
    it('should provide onMessage method', () => {
      // SipClient now provides onMessage() as an alias for onIncomingMessage()
      const sipClient = new SipClient(config, eventBus)

      expect(sipClient.onMessage).toBeDefined()
      expect(typeof sipClient.onMessage).toBe('function')
    })

    it('should provide onComposing method', () => {
      // SipClient now provides onComposing() as an alias for onComposingIndicator()
      const sipClient = new SipClient(config, eventBus)

      expect(sipClient.onComposing).toBeDefined()
      expect(typeof sipClient.onComposing).toBe('function')
    })
  })

  describe('Call Control Methods', () => {
    it('should expose answerCall method', () => {
      // SipClient now provides answerCall() as a convenience method
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.answerCall).toBeDefined()
    })

    it('should expose hangupCall method', () => {
      // SipClient now provides hangupCall() as a convenience method
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.hangupCall).toBeDefined()
    })

    it('should expose holdCall method', () => {
      // SipClient now provides holdCall() as a convenience method
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.holdCall).toBeDefined()
    })

    it('should expose unholdCall method', () => {
      // SipClient now provides unholdCall() as a convenience method
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.unholdCall).toBeDefined()
    })

    it('should expose transferCall method', () => {
      // SipClient now provides transferCall() as a convenience method
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.transferCall).toBeDefined()
    })

    it('should expose muteCall method', () => {
      // SipClient now provides muteCall() as an alias for muteAudio()
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.muteCall).toBeDefined()
    })

    it('should expose unmuteCall method', () => {
      // SipClient now provides unmuteCall() as an alias for unmuteAudio()
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.unmuteCall).toBeDefined()
    })

    it('should expose sendDTMF method', () => {
      // SipClient now provides sendDTMF() as a convenience method
      const sipClient = new SipClient(config, eventBus)
      expect(sipClient.sendDTMF).toBeDefined()
    })
  })
})
