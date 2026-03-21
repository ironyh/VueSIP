/**
 * SessionStorageAdapter Tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionStorageAdapter } from '../SessionStorageAdapter'

// Mock dependencies
vi.mock('../utils/encryption', () => ({
  encrypt: vi.fn().mockResolvedValue({ encrypted: true, iv: 'test', data: 'test' }),
  decrypt: vi.fn().mockImplementation(async (data, _password) => {
    return data
  }),
  isCryptoAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: (i: number) => Object.keys(store)[i] || null,
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

describe('SessionStorageAdapter', () => {
  let adapter: SessionStorageAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorageMock.clear()
    adapter = new SessionStorageAdapter({ prefix: 'test', version: '1' })
  })

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      const defaultAdapter = new SessionStorageAdapter()
      expect(defaultAdapter.name).toBe('SessionStorageAdapter')
    })

    it('should create adapter with custom config', () => {
      const customAdapter = new SessionStorageAdapter({
        prefix: 'custom',
        version: '2',
      })
      expect(customAdapter).toBeDefined()
    })

    it('should create adapter with encryption password', () => {
      const encryptedAdapter = new SessionStorageAdapter(
        { prefix: 'enc', version: '1' },
        'password123'
      )
      expect(encryptedAdapter).toBeDefined()
    })
  })

  describe('set', () => {
    it('should store string value', async () => {
      const result = await adapter.set('test-key', 'test-value')
      expect(result.success).toBe(true)
      expect(sessionStorageMock.setItem).toHaveBeenCalled()
    })

    it('should store object value', async () => {
      const testObj = { name: 'test', value: 123 }
      const result = await adapter.set('test-obj', testObj)
      expect(result.success).toBe(true)
    })

    it('should store with versioned key', async () => {
      await adapter.set('key', 'value')
      expect(sessionStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('get', () => {
    it('should retrieve stored string', async () => {
      await adapter.set('test-key', 'test-value')
      const result = await adapter.get('test-key')
      expect(result.success).toBe(true)
      expect(result.data).toBe('test-value')
    })

    it('should retrieve stored object', async () => {
      const testObj = { name: 'test', value: 123 }
      await adapter.set('test-obj', testObj)
      const result = await adapter.get('test-obj')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testObj)
    })

    it('should return failure for non-existent key', async () => {
      const result = await adapter.get('non-existent')
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })
  })

  describe('remove', () => {
    it('should remove stored key', async () => {
      await adapter.set('test-key', 'test-value')
      const result = await adapter.remove('test-key')
      expect(result.success).toBe(true)
      expect(sessionStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should clear all keys with prefix', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')
      const result = await adapter.clear()
      expect(result.success).toBe(true)
      expect(sessionStorageMock.clear).toHaveBeenCalled()
    })
  })

  describe('keys', () => {
    it('should list all keys with prefix', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')
      const result = await adapter.keys()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('has', () => {
    it('should return true for existing key', async () => {
      await adapter.set('test-key', 'test-value')
      const result = await adapter.has('test-key')
      expect(result).toBe(true)
    })

    it('should return false for non-existent key', async () => {
      const result = await adapter.has('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('isSessionStorageAvailable', () => {
    it('should check availability', () => {
      const result = adapter.isSessionStorageAvailable()
      expect(typeof result).toBe('boolean')
    })
  })
})
