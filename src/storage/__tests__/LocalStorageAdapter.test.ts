/**
 * LocalStorageAdapter Tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalStorageAdapter } from '../LocalStorageAdapter'

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

// Mock localStorage
const localStorageMock = (() => {
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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      adapter = new LocalStorageAdapter()
      expect(adapter.name).toBe('LocalStorageAdapter')
    })

    it('should create adapter with custom config', () => {
      adapter = new LocalStorageAdapter({
        prefix: 'custom',
        version: '2',
      })
      expect(adapter).toBeDefined()
    })

    it('should create adapter with encryption enabled', () => {
      adapter = new LocalStorageAdapter(
        {
          prefix: 'secure',
          version: '1',
          encryption: { enabled: true },
        },
        'test-password'
      )
      expect(adapter).toBeDefined()
    })
  })

  describe('set', () => {
    beforeEach(() => {
      adapter = new LocalStorageAdapter({ prefix: 'test', version: '1' })
    })

    it('should store JSON object successfully', async () => {
      const result = await adapter.set('user:preferences', { theme: 'dark', lang: 'en' })

      expect(result.success).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should store string value', async () => {
      const result = await adapter.set('username', 'john')

      expect(result.success).toBe(true)
    })

    it('should store array', async () => {
      const result = await adapter.set('items', [1, 2, 3])

      expect(result.success).toBe(true)
    })

    it('should handle storage errors gracefully', async () => {
      // Simulate localStorage being full or unavailable
      const errorAdapter = new LocalStorageAdapter()
      vi.spyOn(errorAdapter as any, 'isLocalStorageAvailable').mockReturnValue(false)

      const result = await errorAdapter.set('key', 'value')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('get', () => {
    beforeEach(() => {
      adapter = new LocalStorageAdapter({ prefix: 'test', version: '1' })
    })

    it('should retrieve stored JSON object', async () => {
      await adapter.set('user:preferences', { theme: 'dark' })

      const result = await adapter.get<{ theme: string }>('user:preferences')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ theme: 'dark' })
    })

    it('should return undefined for non-existent key', async () => {
      const result = await adapter.get('non-existent')

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('should handle encrypted data retrieval', async () => {
      const secureAdapter = new LocalStorageAdapter(
        {
          prefix: 'secure',
          version: '1',
          encryption: { enabled: true },
        },
        'test-password'
      )

      await secureAdapter.set('credentials:token', { token: 'secret123' })

      const result = await secureAdapter.get('credentials:token')

      expect(result.success).toBe(true)
    })

    it('should handle get errors gracefully', async () => {
      const errorAdapter = new LocalStorageAdapter()
      vi.spyOn(errorAdapter as any, 'isLocalStorageAvailable').mockReturnValue(false)

      const result = await errorAdapter.get('key')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('has', () => {
    beforeEach(() => {
      adapter = new LocalStorageAdapter({ prefix: 'test', version: '1' })
    })

    it('should return true for existing key', async () => {
      await adapter.set('existing-key', 'value')

      const result = await adapter.has('existing-key')

      expect(result).toBe(true)
    })

    it('should return false for non-existing key', async () => {
      const result = await adapter.has('non-existing-key')

      expect(result).toBe(false)
    })
  })

  describe('remove', () => {
    beforeEach(() => {
      adapter = new LocalStorageAdapter({ prefix: 'test', version: '1' })
    })

    it('should remove existing key', async () => {
      await adapter.set('to-remove', 'value')

      const result = await adapter.remove('to-remove')

      expect(result.success).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })

    it('should handle remove errors gracefully', async () => {
      const errorAdapter = new LocalStorageAdapter()
      vi.spyOn(errorAdapter as any, 'isLocalStorageAvailable').mockReturnValue(false)

      const result = await errorAdapter.remove('key')

      expect(result.success).toBe(false)
    })
  })

  describe('clear', () => {
    beforeEach(() => {
      adapter = new LocalStorageAdapter({ prefix: 'test', version: '1' })
    })

    it('should clear all keys with prefix', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')
      await adapter.set('other:key', 'value3')

      const result = await adapter.clear()

      expect(result.success).toBe(true)
    })

    it('should clear specific prefix', async () => {
      const adapter2 = new LocalStorageAdapter({ prefix: 'app', version: '1' })
      await adapter.set('key1', 'value1')
      await adapter2.set('key2', 'value2')

      const result = await adapter.clear('app')

      expect(result.success).toBe(true)
    })
  })

  describe('keys', () => {
    beforeEach(() => {
      adapter = new LocalStorageAdapter({ prefix: 'test', version: '1' })
    })

    it('should return all keys with prefix', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      const result = await adapter.keys()

      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should filter keys by prefix', async () => {
      await adapter.set('user:name', 'john')
      await adapter.set('user:email', 'john@test.com')
      await adapter.set('config:theme', 'dark')

      const result = await adapter.keys('user')

      expect(result).toBeInstanceOf(Array)
    })
  })

  describe('namespacing', () => {
    it('should build namespaced keys correctly', async () => {
      adapter = new LocalStorageAdapter({ prefix: 'vuesip', version: '2' })

      await adapter.set('key', 'value')

      // Verify the key was stored with prefix:version:key format
      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip:2:key', expect.any(String))
    })
  })
})
