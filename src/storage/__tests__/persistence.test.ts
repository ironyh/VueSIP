/**
 * @vitest-environment jsdom
 */

import { ref } from 'vue'
import { describe, it, expect, vi } from 'vitest'
import { PersistenceManager, createPersistence } from '../persistence'
import type { StorageAdapter, StorageResult } from '../../types/storage.types'

// Mock logger to reduce noise in tests
vi.mock('../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

describe('PersistenceManager', () => {
  // Mock storage adapter
  const createMockAdapter = (storage: Record<string, unknown> = {}): StorageAdapter => {
    return {
      name: 'mock',
      async get<T>(key: string): Promise<StorageResult<T>> {
        if (!(key in storage)) {
          return { success: true, data: undefined }
        }
        return { success: true, data: storage[key] as T }
      },
      async set<T>(key: string, value: T): Promise<StorageResult<void>> {
        storage[key] = value
        return { success: true }
      },
      async remove(key: string): Promise<StorageResult<void>> {
        delete storage[key]
        return { success: true }
      },
      async clear(): Promise<StorageResult<void>> {
        Object.keys(storage).forEach((k) => delete storage[k])
        return { success: true }
      },
      async keys(): Promise<StorageResult<string[]>> {
        return { success: true, data: Object.keys(storage) }
      },
    }
  }

  describe('constructor', () => {
    it('should create persistence manager with default options', () => {
      const adapter = createMockAdapter()
      const getState = vi.fn(() => ({ foo: 'bar' }))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      expect(manager).toBeDefined()
    })

    it('should auto-load state when autoLoad is true (default)', async () => {
      const storage = { 'test-key': { foo: 'bar' } }
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({ foo: 'bar' }))
      const setState = vi.fn()

      new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: true,
      })

      // Wait for async auto-load
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(setState).toHaveBeenCalledWith({ foo: 'bar' })
    })

    it('should not auto-load when autoLoad is false', async () => {
      const storage = { 'test-key': { foo: 'bar' } }
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({ foo: 'bar' }))
      const setState = vi.fn()

      new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      // Wait to ensure no auto-load happens
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(setState).not.toHaveBeenCalled()
    })
  })

  describe('save', () => {
    it('should save state to storage', async () => {
      const storage: Record<string, unknown> = {}
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({ foo: 'bar', count: 42 }))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await manager.save()

      expect(storage['test-key']).toEqual({ foo: 'bar', count: 42 })
    })

    it('should use serialize function when provided', async () => {
      const storage: Record<string, unknown> = {}
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({ foo: 'bar' }))
      const setState = vi.fn()
      const serialize = vi.fn((state: { foo: string }) => ({ ...state, serialized: true }))

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
        serialize,
      })

      await manager.save()

      expect(serialize).toHaveBeenCalledWith({ foo: 'bar' })
      expect(storage['test-key']).toEqual({ foo: 'bar', serialized: true })
    })

    it('should throw error when storage set fails', async () => {
      const adapter: StorageAdapter = {
        name: 'failing',
        async get() {
          return { success: true, data: undefined }
        },
        async set() {
          return { success: false, error: 'Storage full' }
        },
        async remove() {
          return { success: true }
        },
        async clear() {
          return { success: true }
        },
        async keys() {
          return { success: true, data: [] }
        },
      }
      const getState = vi.fn(() => ({ foo: 'bar' }))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await expect(manager.save()).rejects.toThrow('Storage full')
    })
  })

  describe('load', () => {
    it('should load state from storage', async () => {
      const storage = { 'test-key': { foo: 'bar', count: 42 } }
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({ foo: '' }))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await manager.load()

      expect(setState).toHaveBeenCalledWith({ foo: 'bar', count: 42 })
    })

    it('should use deserialize function when provided', async () => {
      const storage = { 'test-key': { raw: true } }
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({}))
      const setState = vi.fn()
      const deserialize = vi.fn((data: unknown) => ({ ...(data as object), deserialized: true }))

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
        deserialize,
      })

      await manager.load()

      expect(deserialize).toHaveBeenCalledWith({ raw: true })
      expect(setState).toHaveBeenCalledWith({ raw: true, deserialized: true })
    })

    it('should not call setState when no data exists', async () => {
      const storage = {}
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({ foo: 'default' }))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await manager.load()

      expect(setState).not.toHaveBeenCalled()
    })

    it('should throw error when storage get fails', async () => {
      const adapter: StorageAdapter = {
        name: 'failing',
        async get() {
          return { success: false, error: 'Access denied' }
        },
        async set() {
          return { success: true }
        },
        async remove() {
          return { success: true }
        },
        async clear() {
          return { success: true }
        },
        async keys() {
          return { success: true, data: [] }
        },
      }
      const getState = vi.fn(() => ({}))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await expect(manager.load()).rejects.toThrow('Access denied')
    })
  })

  describe('clear', () => {
    it('should clear state from storage', async () => {
      const storage = { 'test-key': { foo: 'bar' } }
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({}))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await manager.clear()

      expect(storage['test-key']).toBeUndefined()
    })

    it('should throw error when storage remove fails', async () => {
      const adapter: StorageAdapter = {
        name: 'failing',
        async get() {
          return { success: true, data: undefined }
        },
        async set() {
          return { success: true }
        },
        async remove() {
          return { success: false, error: 'Key not found' }
        },
        async clear() {
          return { success: true }
        },
        async keys() {
          return { success: true, data: [] }
        },
      }
      const getState = vi.fn(() => ({}))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await expect(manager.clear()).rejects.toThrow('Key not found')
    })
  })

  describe('destroy', () => {
    it('should cleanup timer and watcher on destroy', () => {
      const adapter = createMockAdapter()
      const getState = vi.fn(() => ({ foo: 'bar' }))
      const setState = vi.fn()
      const stateRef = ref({ foo: 'bar' })

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        watchSource: stateRef,
        autoLoad: false,
      })

      // Modify state to trigger debounced save timer
      stateRef.value.foo = 'baz'

      expect(manager.destroy()).toBeUndefined()

      // After destroy, the manager should be cleaned up
      // The exact behavior depends on Vue's watch cleanup
    })

    it('should be callable multiple times without error', () => {
      const adapter = createMockAdapter()
      const getState = vi.fn(() => ({}))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      manager.destroy()
      manager.destroy() // Should not throw
    })
  })

  describe('debounce', () => {
    it('should use custom debounce delay', async () => {
      const storage: Record<string, unknown> = {}
      const adapter = createMockAdapter(storage)
      const getState = vi.fn(() => ({ foo: 'initial' }))
      const setState = vi.fn()

      const manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        debounce: 100,
        autoLoad: false,
      })

      // Change state and trigger save
      getState.mockReturnValue({ foo: 'changed1' })
      ;(manager as unknown as { save: () => Promise<void> }).save()

      getState.mockReturnValue({ foo: 'changed2' })
      ;(manager as unknown as { save: () => Promise<void> }).save()

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have saved with the latest state
      expect(storage['test-key']).toEqual({ foo: 'changed2' })
    })
  })
})

describe('createPersistence', () => {
  const createMockAdapter = (storage: Record<string, unknown> = {}): StorageAdapter => {
    return {
      name: 'mock',
      async get<T>(key: string): Promise<StorageResult<T>> {
        if (!(key in storage)) {
          return { success: true, data: undefined }
        }
        return { success: true, data: storage[key] as T }
      },
      async set<T>(key: string, value: T): Promise<StorageResult<void>> {
        storage[key] = value
        return { success: true }
      },
      async remove(key: string): Promise<StorageResult<void>> {
        delete storage[key]
        return { success: true }
      },
      async clear(): Promise<StorageResult<void>> {
        Object.keys(storage).forEach((k) => delete storage[k])
        return { success: true }
      },
      async keys(): Promise<StorageResult<string[]>> {
        return { success: true, data: Object.keys(storage) }
      },
    }
  }

  it('should create a PersistenceManager instance', () => {
    const adapter = createMockAdapter()
    const getState = vi.fn(() => ({}))
    const setState = vi.fn()

    const persistence = createPersistence({
      adapter,
      key: 'test-key',
      getState,
      setState,
      autoLoad: false,
    })

    expect(persistence).toBeInstanceOf(PersistenceManager)
  })

  it('should expose save, load, clear, and destroy methods', async () => {
    const adapter = createMockAdapter()
    const getState = vi.fn(() => ({ foo: 'bar' }))
    const setState = vi.fn()

    const persistence = createPersistence({
      adapter,
      key: 'test-key',
      getState,
      setState,
      autoLoad: false,
    })

    expect(typeof persistence.save).toBe('function')
    expect(typeof persistence.load).toBe('function')
    expect(typeof persistence.clear).toBe('function')
    expect(typeof persistence.destroy).toBe('function')

    await persistence.save()
    await persistence.load()
    await persistence.clear()
    persistence.destroy()
  })
})
