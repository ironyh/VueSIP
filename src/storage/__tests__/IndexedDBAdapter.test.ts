/**
 * IndexedDBAdapter Tests
 *
 * Unit tests for IndexedDBAdapter storage module.
 * Focuses on testing constructor, initialization, and error handling.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IndexedDBAdapter } from '../IndexedDBAdapter'

// Mock dependencies
vi.mock('../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

// Mock IndexedDB
const createMockIndexedDB = () => {
  const mockDB = {
    objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
    createObjectStore: vi.fn(),
    close: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        get: vi.fn(() => ({ onsuccess: null, onerror: null })),
        put: vi.fn(() => ({ onsuccess: null, onerror: null })),
        delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
        clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
        getKey: vi.fn(() => ({ onsuccess: null, onerror: null })),
        getAllKeys: vi.fn(() => ({ onsuccess: null, onerror: null })),
        openCursor: vi.fn(() => ({ onsuccess: null, onerror: null })),
      })),
      complete: true,
    })),
  }

  const mockOpen = vi.fn(() => {
    const req: any = {}
    Promise.resolve().then(() => {
      req.onsuccess?.({ target: req, result: mockDB })
    })
    return req
  })

  const mockDeleteDB = vi.fn(() => ({ onsuccess: null, onerror: null }))

  return {
    open: mockOpen,
    deleteDatabase: mockDeleteDB,
    mockDB,
  }
}

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter
  let mockIDB: ReturnType<typeof createMockIndexedDB>

  beforeEach(() => {
    mockIDB = createMockIndexedDB()
    // @ts-ignore - Test environment
    globalThis.indexedDB = mockIDB
    adapter = new IndexedDBAdapter({ prefix: 'test', version: '1' })
  })

  describe('constructor', () => {
    it('should have correct name', () => {
      expect(adapter.name).toBe('IndexedDBAdapter')
    })

    it('should accept custom config', () => {
      const customAdapter = new IndexedDBAdapter({
        prefix: 'myapp',
        version: '2',
      })
      expect(customAdapter.name).toBe('IndexedDBAdapter')
    })

    it('should use default config when not provided', () => {
      const defaultAdapter = new IndexedDBAdapter()
      expect(defaultAdapter.name).toBe('IndexedDBAdapter')
    })
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await adapter.initialize()
      expect(mockIDB.open).toHaveBeenCalled()
    })

    it('should not reinitialize if already initialized', async () => {
      await adapter.initialize()
      const callCount = mockIDB.open.mock.calls.length
      await adapter.initialize()
      expect(mockIDB.open.mock.calls.length).toBe(callCount)
    })
  })

  describe('error handling', () => {
    it('should handle operations when not initialized', async () => {
      const uninitAdapter = new IndexedDBAdapter({ prefix: 'uninit', version: '1' })
      const result = await uninitAdapter.get('key')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle set when not initialized', async () => {
      const uninitAdapter = new IndexedDBAdapter({ prefix: 'uninit', version: '1' })
      const result = await uninitAdapter.set('key', 'value')
      expect(result.success).toBe(false)
    })

    it('should handle remove when not initialized', async () => {
      const uninitAdapter = new IndexedDBAdapter({ prefix: 'uninit', version: '1' })
      const result = await uninitAdapter.remove('key')
      expect(result.success).toBe(false)
    })

    it('should handle clear when not initialized', async () => {
      const uninitAdapter = new IndexedDBAdapter({ prefix: 'uninit', version: '1' })
      const result = await uninitAdapter.clear()
      expect(result.success).toBe(false)
    })

    it('should handle has when not initialized', async () => {
      const uninitAdapter = new IndexedDBAdapter({ prefix: 'uninit', version: '1' })
      const result = await uninitAdapter.has('key')
      expect(result).toBe(false)
    })

    it('should handle keys when not initialized', async () => {
      const uninitAdapter = new IndexedDBAdapter({ prefix: 'uninit', version: '1' })
      const result = await uninitAdapter.keys()
      expect(result).toEqual([])
    })

    it('should handle close when not initialized', async () => {
      const uninitAdapter = new IndexedDBAdapter({ prefix: 'uninit', version: '1' })
      await uninitAdapter.close() // Should not throw
    })
  })
})
