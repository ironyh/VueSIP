/**
 * Persistence helpers unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref as _ref, reactive } from 'vue'
import { PersistenceManager, createPersistence } from '@/storage/persistence'
import type { StorageAdapter, StorageResult } from '@/types/storage.types'

// Mock storage adapter
class MockStorageAdapter implements StorageAdapter {
  private storage = new Map<string, unknown>()

  async get<T>(key: string): Promise<StorageResult<T>> {
    const value = this.storage.get(key)
    return {
      success: true,
      data: value as T,
    }
  }

  async set(key: string, value: unknown): Promise<StorageResult<void>> {
    this.storage.set(key, value)
    return { success: true, data: undefined }
  }

  async remove(key: string): Promise<StorageResult<void>> {
    this.storage.delete(key)
    return { success: true, data: undefined }
  }

  async clear(): Promise<StorageResult<void>> {
    this.storage.clear()
    return { success: true, data: undefined }
  }

  async has(key: string): Promise<StorageResult<boolean>> {
    return {
      success: true,
      data: this.storage.has(key),
    }
  }

  async keys(): Promise<StorageResult<string[]>> {
    return {
      success: true,
      data: Array.from(this.storage.keys()),
    }
  }
}

describe('PersistenceManager', () => {
  let adapter: MockStorageAdapter
  let state: { count: number; name: string }
  let getState: () => typeof state
  let setState: (newState: typeof state) => void
  let manager: PersistenceManager

  beforeEach(() => {
    adapter = new MockStorageAdapter()
    state = { count: 0, name: 'test' }
    getState = () => state
    setState = (newState) => {
      state = newState
    }
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should create persistence manager with required options', () => {
      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      expect(manager).toBeInstanceOf(PersistenceManager)
    })

    it('should auto-load state by default', async () => {
      // Pre-populate storage
      await adapter.set('test-key', { count: 5, name: 'loaded' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
      })

      // Wait for async auto-load
      await vi.runAllTimersAsync()

      expect(state.count).toBe(5)
      expect(state.name).toBe('loaded')
    })

    it('should skip auto-load when autoLoad is false', async () => {
      await adapter.set('test-key', { count: 5, name: 'loaded' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await vi.runAllTimersAsync()

      expect(state.count).toBe(0)
      expect(state.name).toBe('test')
    })

    it('should setup auto-save when watchSource provided', async () => {
      const reactiveState = reactive({ count: 0, name: 'test' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState: () => reactiveState,
        setState: (newState) => Object.assign(reactiveState, newState),
        watchSource: () => reactiveState,
        autoLoad: false,
        debounce: 100,
      })

      // Modify state
      reactiveState.count = 10

      // Fast-forward debounce timer
      await vi.advanceTimersByTimeAsync(150)

      const result = await adapter.get('test-key')
      expect(result.data).toEqual({ count: 10, name: 'test' })
    })
  })

  describe('save', () => {
    it('should save current state to storage', async () => {
      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      state.count = 42
      state.name = 'saved'

      await manager.save()

      const result = await adapter.get('test-key')
      expect(result.data).toEqual({ count: 42, name: 'saved' })
    })

    it('should use serialize function if provided', async () => {
      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        serialize: (state) => ({ ...state, serialized: true }),
        autoLoad: false,
      })

      await manager.save()

      const result = await adapter.get('test-key')
      expect(result.data).toEqual({ count: 0, name: 'test', serialized: true })
    })

    it('should throw error when adapter save fails', async () => {
      const failingAdapter = new MockStorageAdapter()
      vi.spyOn(failingAdapter, 'set').mockResolvedValue({
        success: false,
        error: 'Storage full',
      } as any)

      manager = new PersistenceManager({
        adapter: failingAdapter,
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
      await adapter.set('test-key', { count: 99, name: 'loaded' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await manager.load()

      expect(state.count).toBe(99)
      expect(state.name).toBe('loaded')
    })

    it('should use deserialize function if provided', async () => {
      await adapter.set('test-key', { count: 50, name: 'test', extra: 'data' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        deserialize: (data: any) => ({ count: data.count * 2, name: data.name }),
        autoLoad: false,
      })

      await manager.load()

      expect(state.count).toBe(100)
      expect(state.name).toBe('test')
    })

    it('should handle missing data gracefully', async () => {
      manager = new PersistenceManager({
        adapter,
        key: 'missing-key',
        getState,
        setState,
        autoLoad: false,
      })

      await manager.load()

      // State should remain unchanged
      expect(state.count).toBe(0)
      expect(state.name).toBe('test')
    })

    it('should throw error when adapter load fails', async () => {
      const failingAdapter = new MockStorageAdapter()
      vi.spyOn(failingAdapter, 'get').mockResolvedValue({
        success: false,
        error: 'Network error',
      } as any)

      manager = new PersistenceManager({
        adapter: failingAdapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await expect(manager.load()).rejects.toThrow('Network error')
    })
  })

  describe('clear', () => {
    it('should clear state from storage', async () => {
      await adapter.set('test-key', { count: 42, name: 'data' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await manager.clear()

      const result = await adapter.get('test-key')
      expect(result.data).toBeUndefined()
    })

    it('should throw error when adapter clear fails', async () => {
      const failingAdapter = new MockStorageAdapter()
      vi.spyOn(failingAdapter, 'remove').mockResolvedValue({
        success: false,
        error: 'Permission denied',
      } as any)

      manager = new PersistenceManager({
        adapter: failingAdapter,
        key: 'test-key',
        getState,
        setState,
        autoLoad: false,
      })

      await expect(manager.clear()).rejects.toThrow('Permission denied')
    })
  })

  describe('destroy', () => {
    it('should stop auto-save and cleanup', async () => {
      const reactiveState = reactive({ count: 0, name: 'test' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState: () => reactiveState,
        setState: (newState) => Object.assign(reactiveState, newState),
        watchSource: () => reactiveState,
        autoLoad: false,
        debounce: 100,
      })

      manager.destroy()

      // Modify state after destroy
      reactiveState.count = 50

      await vi.advanceTimersByTimeAsync(150)

      // Should not have saved
      const result = await adapter.get('test-key')
      expect(result.data).toBeUndefined()
    })

    it('should clear pending save timer', async () => {
      const reactiveState = reactive({ count: 0, name: 'test' })

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState: () => reactiveState,
        setState: (newState) => Object.assign(reactiveState, newState),
        watchSource: () => reactiveState,
        autoLoad: false,
        debounce: 100,
      })

      // Trigger auto-save
      reactiveState.count = 10

      // Destroy before save completes
      manager.destroy()

      await vi.advanceTimersByTimeAsync(150)

      // Should not have saved
      const result = await adapter.get('test-key')
      expect(result.data).toBeUndefined()
    })
  })

  describe('debounced save', () => {
    it('should debounce multiple rapid changes', async () => {
      const reactiveState = reactive({ count: 0, name: 'test' })
      const saveSpy = vi.spyOn(adapter, 'set')

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState: () => reactiveState,
        setState: (newState) => Object.assign(reactiveState, newState),
        watchSource: () => reactiveState,
        autoLoad: false,
        debounce: 100,
      })

      // Multiple rapid changes
      reactiveState.count = 1
      reactiveState.count = 2
      reactiveState.count = 3

      // Should not have saved yet
      expect(saveSpy).not.toHaveBeenCalled()

      // Fast-forward past debounce
      await vi.advanceTimersByTimeAsync(150)

      // Should have saved only once with final value
      expect(saveSpy).toHaveBeenCalledTimes(1)
      const result = await adapter.get('test-key')
      expect(result.data).toEqual({ count: 3, name: 'test' })
    })

    it('should use custom debounce delay', async () => {
      const reactiveState = reactive({ count: 0, name: 'test' })
      const saveSpy = vi.spyOn(adapter, 'set')

      manager = new PersistenceManager({
        adapter,
        key: 'test-key',
        getState: () => reactiveState,
        setState: (newState) => Object.assign(reactiveState, newState),
        watchSource: () => reactiveState,
        autoLoad: false,
        debounce: 500,
      })

      reactiveState.count = 10

      // Should not save before custom delay
      await vi.advanceTimersByTimeAsync(300)
      expect(saveSpy).not.toHaveBeenCalled()

      // Should save after custom delay
      await vi.advanceTimersByTimeAsync(250)
      expect(saveSpy).toHaveBeenCalledTimes(1)
    })
  })
})

describe('createPersistence', () => {
  it('should create a PersistenceManager instance', () => {
    const adapter = new MockStorageAdapter()
    const state = { value: 'test' }

    const manager = createPersistence({
      adapter,
      key: 'test-key',
      getState: () => state,
      setState: (newState) => Object.assign(state, newState),
      autoLoad: false,
    })

    expect(manager).toBeInstanceOf(PersistenceManager)
  })

  it('should work with all options', async () => {
    const adapter = new MockStorageAdapter()
    const reactiveState = reactive({ count: 0 })

    const manager = createPersistence({
      adapter,
      key: 'test-key',
      getState: () => reactiveState,
      setState: (newState) => Object.assign(reactiveState, newState),
      watchSource: () => reactiveState,
      debounce: 50,
      autoLoad: false,
      serialize: (state) => ({ count: state.count * 10 }),
      deserialize: (data: any) => ({ count: data.count / 10 }),
    })

    expect(manager).toBeInstanceOf(PersistenceManager)
  })
})
