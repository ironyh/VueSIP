/**
 * Persistence Manager Tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PersistenceManager, type PersistenceOptions } from '../persistence'

// Mock logger
vi.mock('../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

describe('PersistenceManager', () => {
  let mockAdapter: {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }

  const createMockAdapter = () => ({
    get: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    set: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
  })

  beforeEach(() => {
    mockAdapter = createMockAdapter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  const createManager = <T>(options: Partial<PersistenceOptions<T>>): PersistenceManager<T> => {
    const defaults: PersistenceOptions<T> = {
      adapter: mockAdapter as any,
      key: 'test-key',
      getState: () => ({ value: 'test' }) as T,
      setState: vi.fn(),
      autoLoad: false,
      debounce: 100,
      ...options,
    }
    return new PersistenceManager(defaults)
  }

  describe('initialization', () => {
    it('should not auto-load when autoLoad is false', () => {
      createManager({ autoLoad: false })
      expect(mockAdapter.get).not.toHaveBeenCalled()
    })

    it('should auto-load when autoLoad is true (default)', async () => {
      mockAdapter.get.mockResolvedValueOnce({ success: true, data: { value: 'loaded' } })

      const setState = vi.fn()
      createManager({
        autoLoad: true,
        setState,
      })

      // Wait for async load - use real timers for this test
      vi.useRealTimers()
      await new Promise((resolve) => setTimeout(resolve, 50))
      vi.useFakeTimers()

      expect(mockAdapter.get).toHaveBeenCalledWith('test-key')
      expect(setState).toHaveBeenCalledWith({ value: 'loaded' })
    })

    it('should handle auto-load failure gracefully', async () => {
      mockAdapter.get.mockRejectedValueOnce(new Error('Storage error'))
      const setState = vi.fn()

      createManager({
        autoLoad: true,
        setState,
      })

      // Wait for async load - use real timers for this test
      vi.useRealTimers()
      await new Promise((resolve) => setTimeout(resolve, 50))
      vi.useFakeTimers()

      expect(setState).not.toHaveBeenCalled()
    })
  })

  describe('save', () => {
    it('should save state to adapter', async () => {
      const getState = vi.fn().mockReturnValue({ value: 'test-state' })
      const manager = createManager({ getState })

      await manager.save()

      expect(mockAdapter.set).toHaveBeenCalledWith('test-key', { value: 'test-state' })
    })

    it('should use custom serialize function', async () => {
      const getState = vi.fn().mockReturnValue({ value: 'test' })
      const serialize = vi.fn().mockReturnValue({ serialized: true })
      const manager = createManager({ getState, serialize })

      await manager.save()

      expect(serialize).toHaveBeenCalledWith({ value: 'test' })
      expect(mockAdapter.set).toHaveBeenCalledWith('test-key', { serialized: true })
    })

    it('should throw when adapter.set fails', async () => {
      mockAdapter.set.mockResolvedValueOnce({ success: false, error: 'Quota exceeded' })
      const getState = vi.fn().mockReturnValue({ value: 'test' })
      const manager = createManager({ getState })

      await expect(manager.save()).rejects.toThrow('Quota exceeded')
    })
  })

  describe('load', () => {
    it('should load state from adapter', async () => {
      mockAdapter.get.mockResolvedValueOnce({ success: true, data: { value: 'loaded' } })
      const setState = vi.fn()
      const manager = createManager({ setState })

      await manager.load()

      expect(setState).toHaveBeenCalledWith({ value: 'loaded' })
    })

    it('should use custom deserialize function', async () => {
      mockAdapter.get.mockResolvedValueOnce({ success: true, data: { raw: true } })
      const setState = vi.fn()
      const deserialize = vi.fn().mockReturnValue({ deserialized: true })
      const manager = createManager({ setState, deserialize })

      await manager.load()

      expect(deserialize).toHaveBeenCalledWith({ raw: true })
      expect(setState).toHaveBeenCalledWith({ deserialized: true })
    })

    it('should not call setState when no data exists', async () => {
      mockAdapter.get.mockResolvedValueOnce({ success: true, data: undefined })
      const setState = vi.fn()
      const manager = createManager({ setState })

      await manager.load()

      expect(setState).not.toHaveBeenCalled()
    })

    it('should throw when adapter.get fails', async () => {
      mockAdapter.get.mockResolvedValueOnce({ success: false, error: 'Not found' })
      const setState = vi.fn()
      const manager = createManager({ setState })

      await expect(manager.load()).rejects.toThrow('Not found')
    })
  })

  describe('clear', () => {
    it('should remove state from adapter', async () => {
      const manager = createManager()

      await manager.clear()

      expect(mockAdapter.remove).toHaveBeenCalledWith('test-key')
    })

    it('should throw when adapter.remove fails', async () => {
      mockAdapter.remove.mockResolvedValueOnce({ success: false, error: 'Remove failed' })
      const manager = createManager()

      await expect(manager.clear()).rejects.toThrow('Remove failed')
    })
  })

  describe('destroy', () => {
    it('should cleanup timers and watchers', () => {
      const unwatchFn = vi.fn()
      const manager = createManager({
        watchSource: () => ({ value: 'test' }),
      } as any)

      // Access private property for testing
      ;(manager as any).unwatchFn = unwatchFn
      ;(manager as any).saveTimer = setTimeout(() => {}, 1000) as any

      manager.destroy()

      expect(unwatchFn).toHaveBeenCalled()
    })
  })
})

// Note: createPersistence is tested indirectly through PersistenceManager tests
// as it simply returns a new PersistenceManager instance
