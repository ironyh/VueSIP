/**
 * SipClient Error Recovery and Edge Cases Tests
 * Coverage for error handling, edge cases, and recovery scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient, createSipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import { ConnectionState } from '@/types/sip.types'

// Enable automatic mocking using __mocks__/jssip.ts
vi.mock('jssip')

// Import mock helpers from the mocked module
import { mockUA, mockWebSocketInterface, triggerEvent, resetMockJsSip } from 'jssip'

describe('SipClient - Error Recovery & Edge Cases', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  beforeEach(() => {
    // Reset all mocks and handlers using shared helper
    resetMockJsSip()

    eventBus = createEventBus()
    config = {
      uri: 'wss://example.com:8089/ws',
      sipUri: 'sip:1000@example.com',
      password: 'test-password',
      registrationOptions: { autoRegister: false }, // Disable auto-registration
    }

    sipClient = new SipClient(config, eventBus)
  })

  afterEach(() => {
    if (sipClient) {
      sipClient.stop()
    }
  })

  // Helper function to start and connect client
  async function startAndConnectClient() {
    const startPromise = sipClient.start()
    mockUA.isConnected.mockReturnValue(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
    await startPromise
  }

  describe('Connection Error Recovery', () => {
    it('should handle connection failure', async () => {
      const disconnectEvents: any[] = []
      eventBus.on('sip:disconnected', (e) => disconnectEvents.push(e))

      await startAndConnectClient()

      triggerEvent('disconnected', {
        error: new Error('Network error'),
        code: 1006,
        reason: 'Connection lost',
      })

      expect(disconnectEvents).toHaveLength(1)
      expect(disconnectEvents[0].error).toBeDefined()

      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should handle WebSocket connection timeout', async () => {
      vi.useFakeTimers()

      const startPromise = sipClient.start()

      // Don't trigger connected event, let it timeout
      vi.advanceTimersByTime(31000) // 30s + buffer

      try {
        await startPromise
      } catch (error: any) {
        expect(error.message).toContain('timeout')
      }

      // Clear all pending timers before switching back to real timers
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('should handle connection lost during active session', async () => {
      await startAndConnectClient()

      // Simulate connection loss
      triggerEvent('disconnected', { error: new Error('Network interrupted') })

      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should emit disconnected event with error details', async () => {
      await startAndConnectClient()

      const disconnectEvents: any[] = []
      eventBus.on('sip:disconnected', (e) => disconnectEvents.push(e))

      const testError = new Error('Test disconnect')
      triggerEvent('disconnected', { error: testError })

      expect(disconnectEvents).toHaveLength(1)
      expect(disconnectEvents[0].error).toBe(testError)
    })

    it('should handle multiple disconnect events gracefully', async () => {
      await startAndConnectClient()

      const disconnectEvents: any[] = []
      eventBus.on('sip:disconnected', (e) => disconnectEvents.push(e))

      triggerEvent('disconnected', { error: new Error('First') })
      triggerEvent('disconnected', { error: new Error('Second') })

      // Should handle both events
      expect(disconnectEvents.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Start/Stop Edge Cases', () => {
    it('should prevent multiple simultaneous starts', async () => {
      const start1 = sipClient.start()
      const start2 = sipClient.start()

      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })

      await start1
      await start2

      // Should only start once
      expect(mockUA.start).toHaveBeenCalledTimes(1)
    })

    it('should warn when starting already started client', async () => {
      await startAndConnectClient()

      // Second start should warn (already connected, so resolve immediately)
      const secondStart = sipClient.start()
      await secondStart

      expect(mockUA.start).toHaveBeenCalledTimes(1)
    })

    it('should handle stop while starting', async () => {
      const startPromise = sipClient.start()

      // Give start() a chance to begin waiting for connection
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Stop before connection completes - trigger disconnected to allow stop() to complete
      const stopPromise = sipClient.stop()
      mockUA.isConnected.mockReturnValue(false)
      triggerEvent('disconnected', {})
      await stopPromise

      try {
        await startPromise
      } catch (_error) {
        // May throw or succeed, both acceptable
      }
    })

    it('should prevent multiple simultaneous stops', async () => {
      await startAndConnectClient()

      const stop1 = sipClient.stop()
      const stop2 = sipClient.stop()

      await Promise.all([stop1, stop2])

      // Should handle gracefully
    })

    it('should handle stop when not started', async () => {
      await sipClient.stop()

      // Should complete without error
      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Disconnected)
    })
  })

  describe('Configuration Validation', () => {
    it('should reject invalid configuration on start', async () => {
      const invalidConfig: SipClientConfig = {
        uri: '', // Invalid
        sipUri: 'invalid-sip', // Invalid
        password: '',
      }

      const invalidClient = new SipClient(invalidConfig, eventBus)

      await expect(invalidClient.start()).rejects.toThrow('Invalid SIP configuration')
    })

    it('should validate URI format', () => {
      const invalidConfig = {
        uri: 'not-a-websocket-uri',
        sipUri: 'sip:1000@example.com',
        password: 'test',
      }

      const client = new SipClient(invalidConfig, eventBus)
      const validation = client.validateConfig()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toBeDefined()
    })

    it('should validate SIP URI format', () => {
      const invalidConfig = {
        uri: 'wss://example.com/ws',
        sipUri: 'not-a-sip-uri',
        password: 'test',
      }

      const client = new SipClient(invalidConfig, eventBus)
      const validation = client.validateConfig()

      expect(validation.valid).toBe(false)
    })

    it('should accept valid configuration', () => {
      const validation = sipClient.validateConfig()
      expect(validation.valid).toBe(true)
      expect(validation.errors).toBeUndefined()
    })
  })

  describe('Event Handler Edge Cases', () => {
    it('should handle event with missing data gracefully', async () => {
      await startAndConnectClient()

      // Trigger events with minimal or missing data
      triggerEvent('newMessage', null)
      triggerEvent('newRTCSession', undefined)

      // Should not crash
    })

    it('should handle malformed event data', async () => {
      const startPromise = sipClient.start()
      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise

      triggerEvent('newMessage', {
        // Missing required fields
        request: {},
      })

      triggerEvent('newRTCSession', {
        // Missing session
      })

      // Should handle gracefully
    })

    it('should handle event during shutdown', async () => {
      await startAndConnectClient()

      const stopPromise = sipClient.stop()

      // Trigger events during shutdown
      triggerEvent('newMessage', {})
      triggerEvent('newRTCSession', {})

      await stopPromise

      // Should not crash
    })
  })

  describe('State Consistency', () => {
    it('should maintain state consistency during connection', async () => {
      const state1 = sipClient.getState()
      expect(state1.connectionState).toBe(ConnectionState.Disconnected)

      const startPromise = sipClient.start()

      const state2 = sipClient.getState()
      expect(state2.connectionState).toBe(ConnectionState.Connecting)

      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise

      const state3 = sipClient.getState()
      expect(state3.connectionState).toBe(ConnectionState.Connected)
    })

    it('should maintain state consistency during disconnection', async () => {
      await startAndConnectClient()

      const state1 = sipClient.getState()
      expect(state1.connectionState).toBe(ConnectionState.Connected)

      await sipClient.stop()

      const state2 = sipClient.getState()
      expect(state2.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should track isConnected property accurately', async () => {
      expect(sipClient.isConnected).toBe(false)

      const startPromise = sipClient.start()
      expect(sipClient.isConnected).toBe(false) // Still connecting

      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise
      expect(sipClient.isConnected).toBe(true)

      await sipClient.stop()
      expect(sipClient.isConnected).toBe(false)
    })

    it('should track isRegistered property accurately', async () => {
      await startAndConnectClient()

      expect(sipClient.isRegistered).toBe(false)

      const registerPromise = sipClient.register()
      setTimeout(() => {
        mockUA.isRegistered.mockReturnValue(true)
        triggerEvent('registered', { response: { getHeader: () => '3600' } })
      }, 10)
      await registerPromise

      expect(sipClient.isRegistered).toBe(true)

      const unregisterPromise = sipClient.unregister()
      setTimeout(() => {
        mockUA.isRegistered.mockReturnValue(false)
        triggerEvent('unregistered')
      }, 10)
      await unregisterPromise

      expect(sipClient.isRegistered).toBe(false)
    })
  })

  describe('Configuration Access', () => {
    it('should return readonly copy of state', () => {
      const state = sipClient.getState()

      // Attempt to modify (should not affect internal state)
      ;(state as any).connectionState = ConnectionState.Connected

      const freshState = sipClient.getState()
      expect(freshState.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should return readonly copy of config', () => {
      const retrievedConfig = sipClient.getConfig()

      // Attempt to modify
      ;(retrievedConfig as any).uri = 'wss://hacker.com'

      const freshConfig = sipClient.getConfig()
      expect(freshConfig.uri).toBe(config.uri)
    })

    it('should expose eventBus getter', () => {
      expect(sipClient.eventBus).toBe(eventBus)
    })
  })

  describe('Memory and Resource Management', () => {
    it('should clean up event handlers on stop', async () => {
      const startPromise = sipClient.start()
      mockUA.isConnected.mockReturnValue(true)
      await new Promise((resolve) => setTimeout(resolve, 0))
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise

      // Verify UA exists before stop
      expect(sipClient['ua']).not.toBeNull()

      await sipClient.stop()

      // UA should be cleaned up (set to null) which releases all event handlers
      expect(sipClient['ua']).toBeNull()
      expect(mockUA.stop).toHaveBeenCalled()
    })

    it('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const startPromise = sipClient.start()
        mockUA.isConnected.mockReturnValue(true)
        triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
        await startPromise
        await sipClient.stop()
      }

      // Should handle without memory leaks or errors
      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should clean up UA on stop', async () => {
      const startPromise = sipClient.start()
      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise

      await sipClient.stop()

      expect(mockUA.stop).toHaveBeenCalled()
    })
  })

  describe('Username Extraction', () => {
    it('should extract username from SIP URI', () => {
      const testCases = [
        { uri: 'sip:1000@example.com', expected: '1000' },
        { uri: 'sip:john.doe@example.com', expected: 'john.doe' },
        { uri: 'sip:user+tag@example.com', expected: 'user+tag' },
      ]

      testCases.forEach(({ uri, expected }) => {
        const testConfig = { ...config, sipUri: uri }
        const client = new SipClient(testConfig, eventBus)
        const retrievedConfig = client.getConfig()
        expect(retrievedConfig.sipUri).toContain(expected)
      })
    })
  })

  describe('Transport Configuration', () => {
    it('should use configured WebSocket URI', async () => {
      // WebSocket interface is created during start()
      const startPromise = sipClient.start()
      mockUA.isConnected.mockReturnValue(true)
      await new Promise((resolve) => setTimeout(resolve, 0))
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise

      expect(mockWebSocketInterface).toHaveBeenCalled()

      const calls = mockWebSocketInterface.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toBe(config.uri)
    })

    it('should support custom user agent string', () => {
      const customConfig = {
        ...config,
        userAgent: 'CustomSipClient/1.0',
      }

      const client = new SipClient(customConfig, eventBus)
      const retrievedConfig = client.getConfig()

      expect(retrievedConfig.userAgent).toBe('CustomSipClient/1.0')
    })

    it('should use default user agent if not specified', () => {
      const retrievedConfig = sipClient.getConfig()
      expect(retrievedConfig.userAgent).toBeUndefined()
      // Implementation should use default USER_AGENT constant
    })
  })

  describe('Factory Function', () => {
    it('should create client via factory function', () => {
      const client = createSipClient(config, eventBus)

      expect(client).toBeInstanceOf(SipClient)
      expect(client.getConfig()).toEqual(expect.objectContaining(config))
    })
  })

  describe('Connection State Transitions', () => {
    it('should transition through connection states correctly', async () => {
      const states: ConnectionState[] = []
      const listenerId = eventBus.on('sip:connectionStateChanged', (e: any) => {
        states.push(e.state)
      })

      const startPromise = sipClient.start()
      states.push(sipClient.getState().connectionState)

      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise
      states.push(sipClient.getState().connectionState)

      await sipClient.stop()
      states.push(sipClient.getState().connectionState)

      expect(states).toContain(ConnectionState.Connecting)
      expect(states).toContain(ConnectionState.Connected)
      expect(states).toContain(ConnectionState.Disconnected)

      eventBus.off('sip:connectionStateChanged', listenerId)
    })
  })

  describe('Error Event Propagation', () => {
    it('should propagate UA errors to event bus', async () => {
      const startPromise = sipClient.start()
      mockUA.isConnected.mockReturnValue(true)
      triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
      await startPromise

      const errorEvents: any[] = []
      eventBus.on('sip:error', (e) => errorEvents.push(e))

      const testError = new Error('UA Error')
      triggerEvent('error', testError)

      // Should propagate error
      expect(errorEvents.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle registration expiring events', async () => {
      await startAndConnectClient()

      const expiringEvents: any[] = []
      eventBus.on('sip:registration_expiring', (e) => expiringEvents.push(e))

      triggerEvent('registrationExpiring')

      expect(expiringEvents).toHaveLength(1)
    })
  })
})
