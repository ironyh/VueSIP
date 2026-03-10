/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSipConnection } from '../useSipConnection'

// Mock JsSIP with proper method mocking using vi.fn()
vi.mock('jssip', () => {
  const mockOn = vi.fn()
  const mockStart = vi.fn()
  const mockStop = vi.fn()
  const mockRegister = vi.fn()
  const mockUnregister = vi.fn()

  const MockUA = vi.fn(() => ({
    on: mockOn,
    start: mockStart,
    stop: mockStop,
    register: mockRegister,
    unregister: mockUnregister,
  }))

  return {
    default: {
      UA: MockUA,
      WebSocketInterface: vi.fn(() => ({})),
    },
    __mockOn: mockOn,
    __mockStart: mockStart,
    __mockStop: mockStop,
    __mockRegister: mockRegister,
    __mockUnregister: mockUnregister,
  }
})

describe('useSipConnection', () => {
  const mockConfig = {
    username: 'testuser',
    server: 'sip.example.com',
    password: 'testpass',
    displayName: 'Test User',
    autoRegister: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { isConnected, isRegistered, isConnecting, error } = useSipConnection(mockConfig)

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(isConnecting.value).toBe(false)
      expect(error.value).toBe(null)
    })

    it('should return all required methods', () => {
      const { connect, disconnect, register, unregister } = useSipConnection(mockConfig)

      expect(typeof connect).toBe('function')
      expect(typeof disconnect).toBe('function')
      expect(typeof register).toBe('function')
      expect(typeof unregister).toBe('function')
    })
  })

  describe('connect', () => {
    it('should set error on connection failure when UA throws', async () => {
      const JsSIP = await import('jssip')
      // Make UA throw on construction
      ;(JsSIP.default.UA as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('Connection failed')
      })

      const { connect, error } = useSipConnection(mockConfig)

      try {
        await connect()
      } catch {
        // Expected
      }

      expect(error.value).not.toBe(null)
      expect(error.value?.name).toBe('ConnectionError')
    })
  })

  describe('disconnect', () => {
    it('should reset all state values', async () => {
      const { disconnect, isConnected, isRegistered, isConnecting } = useSipConnection(mockConfig)

      // Call disconnect - UA won't be initialized but we can still test reset
      try {
        await disconnect()
      } catch {
        // Ignore errors
      }

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(isConnecting.value).toBe(false)
    })
  })

  describe('register', () => {
    it('should throw if UA not initialized', async () => {
      const { register } = useSipConnection(mockConfig)

      await expect(register()).rejects.toThrow('UA not initialized')
    })
  })

  describe('unregister', () => {
    it('should throw if UA not initialized', async () => {
      const { unregister } = useSipConnection(mockConfig)

      await expect(unregister()).rejects.toThrow('UA not initialized')
    })
  })

  describe('config handling', () => {
    it('should handle config with autoRegister: true', () => {
      const config = {
        username: 'test',
        server: 'sip.test.com',
        password: 'pass',
        autoRegister: true,
      }

      const { isConnected } = useSipConnection(config)

      expect(isConnected.value).toBe(false)
    })

    it('should handle config with autoRegister: false', () => {
      const config = {
        username: 'test',
        server: 'sip.test.com',
        password: 'pass',
        autoRegister: false,
      }

      const { isConnected, isRegistered, isConnecting } = useSipConnection(config)

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(isConnecting.value).toBe(false)
    })

    it('should handle config without autoRegister (defaults to true)', () => {
      const config = {
        username: 'test',
        server: 'sip.test.com',
        password: 'pass',
      }

      const { isConnected } = useSipConnection(config)

      expect(isConnected.value).toBe(false)
    })

    it('should handle minimal config', () => {
      const {
        isConnected,
        isRegistered,
        isConnecting,
        error,
        connect,
        disconnect,
        register,
        unregister,
      } = useSipConnection({})

      expect(isConnected.value).toBe(false)
      expect(isRegistered.value).toBe(false)
      expect(isConnecting.value).toBe(false)
      expect(error.value).toBe(null)
      expect(typeof connect).toBe('function')
      expect(typeof disconnect).toBe('function')
      expect(typeof register).toBe('function')
      expect(typeof unregister).toBe('function')
    })
  })

  describe('return value structure', () => {
    it('should return correct structure', () => {
      const result = useSipConnection(mockConfig)

      expect(result).toHaveProperty('isConnected')
      expect(result).toHaveProperty('isRegistered')
      expect(result).toHaveProperty('isConnecting')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('connect')
      expect(result).toHaveProperty('disconnect')
      expect(result).toHaveProperty('register')
      expect(result).toHaveProperty('unregister')
    })

    it('should return Ref objects for reactive state', () => {
      const { isConnected, isRegistered, isConnecting, error } = useSipConnection(mockConfig)

      // These should be Vue Refs
      expect(isConnected.value).toBeDefined()
      expect(isRegistered.value).toBeDefined()
      expect(isConnecting.value).toBeDefined()
      expect(error.value).toBeDefined()
    })
  })
})
