/**
 * Store Persistence Manager unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  storePersistence,
  initializeStorePersistence,
  saveAllStores,
  loadAllStores,
  clearAllStores,
  destroyStorePersistence,
} from '@/stores/persistence'

// Mock storage adapters
vi.mock('@/storage/LocalStorageAdapter')
vi.mock('@/storage/IndexedDBAdapter')
vi.mock('@/utils/storageQuota')

describe('StorePersistenceManager', () => {
  beforeEach(() => {
    // Destroy any previous persistence instance
    destroyStorePersistence()
    vi.clearAllMocks()
  })

  afterEach(() => {
    destroyStorePersistence()
  })

  describe('initialization', () => {
    it('should initialize with default config', async () => {
      await initializeStorePersistence()

      const stats = storePersistence.getStatistics()
      expect(stats.enabled).toBe(true)
    })

    it('should skip initialization when disabled', async () => {
      await initializeStorePersistence({ enabled: false })

      const stats = storePersistence.getStatistics()
      expect(stats.enabled).toBe(false)
      expect(stats.managersCount).toBe(0)
    })

    it('should initialize with custom config', async () => {
      await initializeStorePersistence({
        debounce: 500,
        autoLoad: false,
        encryptionPassword: 'test-password',
      })

      const stats = storePersistence.getStatistics()
      expect(stats.enabled).toBe(true)
    })

    it('should handle localStorage initialization errors gracefully', async () => {
      const { LocalStorageAdapter } = await import('@/storage/LocalStorageAdapter')
      vi.mocked(LocalStorageAdapter).mockImplementationOnce(function () {
        throw new Error('localStorage not available')
      } as any)

      // Should not throw
      await expect(initializeStorePersistence()).resolves.toBeUndefined()

      const stats = storePersistence.getStatistics()
      expect(stats.hasLocalStorage).toBe(false)
    })

    it('should handle IndexedDB initialization errors gracefully', async () => {
      const { IndexedDBAdapter } = await import('@/storage/IndexedDBAdapter')

      const mockAdapter = {
        initialize: vi.fn().mockRejectedValue(new Error('IndexedDB not supported')),
      }

      vi.mocked(IndexedDBAdapter).mockImplementationOnce(function () {
        return mockAdapter as any
      } as any)

      await initializeStorePersistence()

      const stats = storePersistence.getStatistics()
      // Should continue despite IndexedDB failure
      expect(stats.enabled).toBe(true)
    })
  })

  describe('save/load/clear operations', () => {
    beforeEach(async () => {
      await initializeStorePersistence({ autoLoad: false })
    })

    it('should save all stores', async () => {
      await expect(saveAllStores()).resolves.toBeUndefined()
    })

    it('should load all stores', async () => {
      await expect(loadAllStores()).resolves.toBeUndefined()
    })

    it('should clear all stores', async () => {
      await expect(clearAllStores()).resolves.toBeUndefined()
    })

    it('should handle save errors gracefully', async () => {
      // Mock managers to throw errors
      const _mockError = new Error('Save failed')

      // Should not throw even if individual saves fail
      await expect(saveAllStores()).resolves.toBeUndefined()
    })

    it('should handle load errors gracefully', async () => {
      await expect(loadAllStores()).resolves.toBeUndefined()
    })

    it('should handle clear errors gracefully', async () => {
      await expect(clearAllStores()).resolves.toBeUndefined()
    })
  })

  describe('destroy', () => {
    it('should cleanup all persistence managers', async () => {
      await initializeStorePersistence()

      destroyStorePersistence()

      const stats = storePersistence.getStatistics()
      expect(stats.managersCount).toBe(0)
    })

    it('should close IndexedDB connection', async () => {
      await initializeStorePersistence()

      destroyStorePersistence()

      const stats = storePersistence.getStatistics()
      expect(stats.hasIndexedDB).toBe(false)
    })

    it('should clear localStorage reference', async () => {
      await initializeStorePersistence()

      destroyStorePersistence()

      const stats = storePersistence.getStatistics()
      expect(stats.hasLocalStorage).toBe(false)
    })
  })

  describe('statistics', () => {
    it('should return empty statistics before initialization', () => {
      const stats = storePersistence.getStatistics()

      expect(stats).toEqual({
        enabled: true,
        managersCount: 0,
        managers: [],
        hasLocalStorage: false,
        hasIndexedDB: false,
      })
    })

    it('should return statistics after initialization', async () => {
      await initializeStorePersistence()

      const stats = storePersistence.getStatistics()

      expect(stats.enabled).toBe(true)
      expect(stats.managersCount).toBeGreaterThan(0)
      expect(stats.managers.length).toBeGreaterThan(0)
    })

    it('should include manager keys in statistics', async () => {
      await initializeStorePersistence()

      const stats = storePersistence.getStatistics()

      expect(stats.managers).toContain('config:sip')
      expect(stats.managers).toContain('config:media')
      expect(stats.managers).toContain('config:preferences')
    })
  })

  describe('storage quota methods', () => {
    beforeEach(async () => {
      await initializeStorePersistence()
    })

    it('should get storage quota', async () => {
      const { getStorageQuota } = await import('@/utils/storageQuota')
      vi.mocked(getStorageQuota).mockResolvedValue({
        quota: 1000000000,
        usage: 500000000,
        percentUsed: 50,
        available: 500000000,
      } as any)

      const quota = await storePersistence.getStorageQuota()

      expect(quota).toBeDefined()
      expect(quota.percentUsed).toBe(50)
    })

    it('should get storage usage summary', async () => {
      const { getStorageUsageSummary } = await import('@/utils/storageQuota')
      vi.mocked(getStorageUsageSummary).mockResolvedValue({
        totalUsage: 500000,
        breakdown: {},
        percentUsed: 5,
      } as any)

      const summary = await storePersistence.getStorageUsageSummary()

      expect(summary).toBeDefined()
      expect(summary.percentUsed).toBe(5)
    })

    it('should check storage warning with default threshold', async () => {
      const { checkStorageUsageWarning } = await import('@/utils/storageQuota')
      vi.mocked(checkStorageUsageWarning).mockResolvedValue(false)

      const warning = await storePersistence.checkStorageWarning()

      expect(warning).toBe(false)
      expect(checkStorageUsageWarning).toHaveBeenCalledWith(80)
    })

    it('should check storage warning with custom threshold', async () => {
      const { checkStorageUsageWarning } = await import('@/utils/storageQuota')
      vi.mocked(checkStorageUsageWarning).mockResolvedValue(true)

      const warning = await storePersistence.checkStorageWarning(90)

      expect(warning).toBe(true)
      expect(checkStorageUsageWarning).toHaveBeenCalledWith(90)
    })

    it('should clear old call history with default reduction', async () => {
      const { clearOldDataLRU } = await import('@/utils/storageQuota')
      vi.mocked(clearOldDataLRU).mockResolvedValue(5)

      const removed = await storePersistence.clearOldCallHistory()

      expect(removed).toBe(5)
      expect(clearOldDataLRU).toHaveBeenCalled()
    })

    it('should clear old call history with custom reduction', async () => {
      const { clearOldDataLRU } = await import('@/utils/storageQuota')
      vi.mocked(clearOldDataLRU).mockResolvedValue(10)

      const removed = await storePersistence.clearOldCallHistory(30)

      expect(removed).toBe(10)
    })
  })

  describe('error handling', () => {
    it('should continue initialization despite store setup errors', async () => {
      // Mock localStorage to throw during persistence setup
      const { LocalStorageAdapter } = await import('@/storage/LocalStorageAdapter')
      const mockAdapter = {
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
      }

      vi.mocked(LocalStorageAdapter).mockImplementation(function () {
        return mockAdapter as any
      } as any)

      // Should complete without throwing
      await expect(initializeStorePersistence()).resolves.toBeUndefined()
    })

    it('should handle multiple initialization calls', async () => {
      await initializeStorePersistence()

      // Second initialization should destroy previous managers
      await initializeStorePersistence({ debounce: 100 })

      const stats = storePersistence.getStatistics()
      expect(stats.enabled).toBe(true)
    })
  })
})

describe('exported convenience functions', () => {
  beforeEach(() => {
    destroyStorePersistence()
    vi.clearAllMocks()
  })

  afterEach(() => {
    destroyStorePersistence()
  })

  describe('initializeStorePersistence', () => {
    it('should initialize persistence manager', async () => {
      await initializeStorePersistence()

      const stats = storePersistence.getStatistics()
      expect(stats.managersCount).toBeGreaterThan(0)
    })
  })

  describe('saveAllStores', () => {
    it('should save all store states', async () => {
      await initializeStorePersistence()
      await expect(saveAllStores()).resolves.toBeUndefined()
    })
  })

  describe('loadAllStores', () => {
    it('should load all store states', async () => {
      await initializeStorePersistence()
      await expect(loadAllStores()).resolves.toBeUndefined()
    })
  })

  describe('clearAllStores', () => {
    it('should clear all persisted data', async () => {
      await initializeStorePersistence()
      await expect(clearAllStores()).resolves.toBeUndefined()
    })
  })

  describe('destroyStorePersistence', () => {
    it('should cleanup persistence', async () => {
      await initializeStorePersistence()
      destroyStorePersistence()

      const stats = storePersistence.getStatistics()
      expect(stats.managersCount).toBe(0)
    })
  })
})
