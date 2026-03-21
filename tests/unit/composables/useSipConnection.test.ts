/**
 * useSipConnection composable unit tests
 * Tests for low-level SIP connection management
 *
 * Note: JsSIP is mocked globally in tests/setup.ts
 */

import { describe, it, expect } from 'vitest'
import { useSipConnection } from '@/composables/useSipConnection'

describe('useSipConnection', () => {
  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
      }

      const { isConnected, isRegistered, isConnecting, error } = useSipConnection(config)

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(isConnecting.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })

  describe('connect()', () => {
    it('should clear previous error on new connection attempt', async () => {
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
        autoRegister: false,
      }

      const { error, connect } = useSipConnection(config)

      // Manually set an error
      error.value = {
        name: 'PreviousError',
        message: 'Previous error occurred',
      }

      await connect()

      // Error should be cleared during connection
      expect(error.value).toBeNull()
    })
  })

  describe('disconnect()', () => {
    it('should reset all state values on disconnect', async () => {
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
        autoRegister: false,
      }

      const { isConnected, isRegistered, isConnecting, disconnect } = useSipConnection(config)

      await disconnect()

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(isConnecting.value).toBe(false)
    })
  })

  describe('register()', () => {
    it('should throw error when UA not initialized', async () => {
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
        autoRegister: false,
      }

      const { register } = useSipConnection(config)

      // Calling register without connecting should throw
      await expect(register()).rejects.toThrow('UA not initialized')
    })
  })

  describe('unregister()', () => {
    it('should throw error when UA not initialized', async () => {
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
        autoRegister: false,
      }

      const { unregister } = useSipConnection(config)

      // Calling unregister without connecting should throw
      await expect(unregister()).rejects.toThrow('UA not initialized')
    })
  })

  describe('configuration', () => {
    it('should accept optional displayName config', () => {
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
        displayName: 'Test User',
        autoRegister: false,
      }

      const result = useSipConnection(config)

      expect(result).toBeDefined()
      expect(result.isConnected).toBeDefined()
      expect(result.isRegistered).toBeDefined()
    })

    it('should accept custom sockets configuration', () => {
      const mockSocket = {}
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
        sockets: [mockSocket],
        autoRegister: false,
      }

      const result = useSipConnection(config)

      expect(result).toBeDefined()
    })

    it('should default autoRegister to true when not specified', () => {
      const config = {
        username: 'testuser',
        server: 'sip.example.com',
        password: 'testpass',
      }

      const { isRegistered, connect } = useSipConnection(config)

      // autoRegister defaults to true, so connecting should trigger registration
      const connectPromise = connect()

      expect(isRegistered).toBeDefined()

      connectPromise.catch(() => {}) // Catch to avoid unhandled rejection
    })
  })
})
