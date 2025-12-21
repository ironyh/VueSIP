/**
 * Storage quota utilities unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getStorageQuota,
  isStorageAvailable,
  estimateLocalStorageUsage,
  hasEnoughSpace,
  QuotaExceededError,
  checkStorageUsageWarning,
  clearOldDataLRU,
  getStorageUsageSummary,
} from '@/utils/storageQuota'

describe('storageQuota utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  describe('getStorageQuota()', () => {
    it('should return quota info when Storage API is available', async () => {
      const mockEstimate = {
        quota: 1000000,
        usage: 500000,
      }

      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue(mockEstimate),
        },
      })

      const result = await getStorageQuota()

      expect(result.quota).toBe(1000000)
      expect(result.usage).toBe(500000)
      expect(result.available).toBe(500000)
      expect(result.usagePercent).toBe(50)
      expect(result.supported).toBe(true)
    })

    it('should return default values when Storage API is not available', async () => {
      vi.stubGlobal('navigator', {})

      const result = await getStorageQuota()

      expect(result.quota).toBe(0)
      expect(result.usage).toBe(0)
      expect(result.available).toBe(0)
      expect(result.usagePercent).toBe(0)
      expect(result.supported).toBe(false)
    })

    it('should handle Storage API errors', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockRejectedValue(new Error('Storage error')),
        },
      })

      const result = await getStorageQuota()

      expect(result.supported).toBe(false)
    })

    it('should handle zero quota', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({ quota: 0, usage: 0 }),
        },
      })

      const result = await getStorageQuota()

      expect(result.usagePercent).toBe(0)
    })
  })

  describe('isStorageAvailable()', () => {
    it('should return true for available localStorage', () => {
      expect(isStorageAvailable('localStorage')).toBe(true)
    })

    it('should return true for available sessionStorage', () => {
      expect(isStorageAvailable('sessionStorage')).toBe(true)
    })

    it('should return true for available indexedDB', () => {
      vi.stubGlobal('indexedDB', {})
      expect(isStorageAvailable('indexedDB')).toBe(true)
    })

    it('should return false when indexedDB is undefined', () => {
      vi.stubGlobal('indexedDB', undefined)
      expect(isStorageAvailable('indexedDB')).toBe(false)
    })

    it('should return false when storage throws error', () => {
      const mockStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage error')
        }),
        removeItem: vi.fn(),
      }

      vi.stubGlobal('localStorage', mockStorage)

      expect(isStorageAvailable('localStorage')).toBe(false)
    })
  })

  describe('estimateLocalStorageUsage()', () => {
    it('should return 0 when localStorage is not available', () => {
      vi.stubGlobal('localStorage', undefined)
      expect(estimateLocalStorageUsage()).toBe(0)
    })

    it('should estimate localStorage usage', () => {
      localStorage.setItem('key1', 'value1')
      localStorage.setItem('key2', 'value2')

      const usage = estimateLocalStorageUsage()

      // (key1.length + value1.length) * 2 + (key2.length + value2.length) * 2
      // (4 + 6) * 2 + (4 + 6) * 2 = 20 + 20 = 40
      expect(usage).toBe(40)
    })

    it('should handle null values', () => {
      localStorage.setItem('key1', 'value1')

      vi.spyOn(localStorage, 'getItem').mockReturnValue(null)

      const usage = estimateLocalStorageUsage()

      expect(usage).toBeGreaterThan(0)
    })
  })

  describe('hasEnoughSpace()', () => {
    it('should return true when enough space is available', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 100000 }),
        },
      })

      const result = await hasEnoughSpace(100000)

      expect(result).toBe(true)
    })

    it('should return false when not enough space', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 950000 }),
        },
      })

      const result = await hasEnoughSpace(100000)

      expect(result).toBe(false)
    })

    it('should return true when quota API is not supported', async () => {
      vi.stubGlobal('navigator', {})

      const result = await hasEnoughSpace(100000)

      expect(result).toBe(true)
    })

    it('should account for buffer', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 850000 }),
        },
      })

      // Need 100000 + 10% buffer = 110000
      // Available = 150000
      const result = await hasEnoughSpace(100000, 0.1)

      expect(result).toBe(true)
    })
  })

  describe('QuotaExceededError', () => {
    it('should create error with quota info', () => {
      const quotaInfo = {
        quota: 1000,
        usage: 900,
        available: 100,
        usagePercent: 90,
        supported: true,
      }

      const error = new QuotaExceededError('Quota exceeded', quotaInfo)

      expect(error.message).toBe('Quota exceeded')
      expect(error.name).toBe('QuotaExceededError')
      expect(error.quotaInfo).toBe(quotaInfo)
    })
  })

  describe('checkStorageUsageWarning()', () => {
    it('should return true when usage exceeds threshold', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({ quota: 1000, usage: 850 }),
        },
      })

      const result = await checkStorageUsageWarning(80)

      expect(result).toBe(true)
    })

    it('should return false when usage is below threshold', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({ quota: 1000, usage: 700 }),
        },
      })

      const result = await checkStorageUsageWarning(80)

      expect(result).toBe(false)
    })

    it('should return false when quota API is not supported', async () => {
      vi.stubGlobal('navigator', {})

      const result = await checkStorageUsageWarning(80)

      expect(result).toBe(false)
    })
  })

  describe('clearOldDataLRU()', () => {
    it('should remove oldest items', async () => {
      const data = [
        { id: '1', timestamp: new Date('2024-01-01') },
        { id: '2', timestamp: new Date('2024-01-03') },
        { id: '3', timestamp: new Date('2024-01-02') },
      ]

      const removed: string[] = []
      const removeData = (ids: string[]) => {
        removed.push(...ids)
      }

      const count = await clearOldDataLRU(() => data, removeData, 33)

      expect(count).toBe(1)
      expect(removed).toContain('1') // Oldest item
    })

    it('should handle numeric timestamps', async () => {
      const data = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 3000 },
        { id: '3', timestamp: 2000 },
      ]

      const removed: string[] = []
      const removeData = (ids: string[]) => {
        removed.push(...ids)
      }

      const count = await clearOldDataLRU(() => data, removeData, 33)

      expect(count).toBe(1)
      expect(removed).toContain('1')
    })

    it('should return 0 when no data', async () => {
      const count = await clearOldDataLRU(() => [], () => {})

      expect(count).toBe(0)
    })

    it('should handle async removeData', async () => {
      const data = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 2000 },
      ]

      const removeData = async (ids: string[]) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const count = await clearOldDataLRU(() => data, removeData, 50)

      expect(count).toBe(1)
    })
  })

  describe('getStorageUsageSummary()', () => {
    it('should return comprehensive storage summary', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({ quota: 1000000, usage: 500000 }),
        },
      })

      vi.stubGlobal('indexedDB', {})

      const summary = await getStorageUsageSummary()

      expect(summary.overall.quota).toBe(1000000)
      expect(summary.overall.usage).toBe(500000)
      expect(summary.localStorage.available).toBe(true)
      expect(summary.sessionStorage.available).toBe(true)
      expect(summary.indexedDB.available).toBe(true)
    })
  })
})
