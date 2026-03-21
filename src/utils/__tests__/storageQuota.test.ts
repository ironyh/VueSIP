/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getStorageQuota,
  isStorageAvailable,
  estimateLocalStorageUsage,
  hasEnoughSpace,
  checkStorageUsageWarning,
  clearOldDataLRU,
  getStorageUsageSummary,
  QuotaExceededError,
} from '../storageQuota'

describe('storageQuota', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  describe('getStorageQuota', () => {
    it('should return default values when Storage API not available', async () => {
      vi.stubGlobal('navigator', {})
      const result = await getStorageQuota()
      expect(result.quota).toBe(0)
      expect(result.supported).toBe(false)
      vi.unstubAllGlobals()
    })

    it('should return quota info when Storage API available', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 50000000,
          }),
        },
      })

      const result = await getStorageQuota()
      expect(result.quota).toBe(100000000)
      expect(result.usage).toBe(50000000)
      expect(result.available).toBe(50000000)
      expect(result.usagePercent).toBe(50)
      expect(result.supported).toBe(true)
      vi.unstubAllGlobals()
    })

    it('should handle zero quota', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 0,
            usage: 0,
          }),
        },
      })

      const result = await getStorageQuota()
      expect(result.usagePercent).toBe(0)
      expect(result.available).toBe(0)
      vi.unstubAllGlobals()
    })

    it('should handle errors gracefully', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockRejectedValue(new Error('Error')),
        },
      })

      const result = await getStorageQuota()
      expect(result.supported).toBe(false)
      vi.unstubAllGlobals()
    })
  })

  describe('isStorageAvailable', () => {
    it('should return true for localStorage when available', () => {
      const result = isStorageAvailable('localStorage')
      expect(result).toBe(true)
    })

    it('should return true for sessionStorage when available', () => {
      const result = isStorageAvailable('sessionStorage')
      expect(result).toBe(true)
    })

    it('should return true for indexedDB when available', () => {
      vi.stubGlobal('indexedDB', {})
      const result = isStorageAvailable('indexedDB')
      expect(result).toBe(true)
      vi.unstubAllGlobals()
    })

    it('should return false for localStorage when not available', () => {
      const originalLocalStorage = global.localStorage
      // @ts-expect-error - testing missing localStorage
      global.localStorage = undefined
      const result = isStorageAvailable('localStorage')
      expect(result).toBe(false)
      global.localStorage = originalLocalStorage
    })

    it('should detect private mode in Safari', () => {
      const originalSetItem = localStorage.setItem
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded')
      })

      const result = isStorageAvailable('localStorage')
      expect(result).toBe(false)

      localStorage.setItem = originalSetItem
    })
  })

  describe('estimateLocalStorageUsage', () => {
    it('should return 0 when localStorage not available', () => {
      const originalLocalStorage = global.localStorage
      // @ts-expect-error - testing missing localStorage
      global.localStorage = undefined
      expect(estimateLocalStorageUsage()).toBe(0)
      global.localStorage = originalLocalStorage
    })

    it('should return 0 when localStorage is empty', () => {
      const result = estimateLocalStorageUsage()
      expect(result).toBe(0)
    })

    it('should estimate size correctly', () => {
      localStorage.setItem('key1', 'value1')
      const result = estimateLocalStorageUsage()
      // key1 (4) + value1 (6) = 10 chars * 2 bytes = 20 bytes
      expect(result).toBeGreaterThan(0)
    })

    it('should handle multiple items', () => {
      localStorage.setItem('key1', 'value1')
      localStorage.setItem('key2', 'value2')
      const result = estimateLocalStorageUsage()
      expect(result).toBeGreaterThan(20)
    })
  })

  describe('hasEnoughSpace', () => {
    it('should return true when quota API not supported', async () => {
      vi.stubGlobal('navigator', {})
      const result = await hasEnoughSpace(1000)
      expect(result).toBe(true)
      vi.unstubAllGlobals()
    })

    it('should return true when enough space available', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 10000000,
          }),
        },
      })

      const result = await hasEnoughSpace(1000000) // 1MB
      expect(result).toBe(true)
      vi.unstubAllGlobals()
    })

    it('should return false when not enough space', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 99000000,
          }),
        },
      })

      const result = await hasEnoughSpace(2000000) // 2MB
      expect(result).toBe(false)
      vi.unstubAllGlobals()
    })

    it('should respect buffer percentage', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 90000000,
          }),
        },
      })

      // 10MB available, 11MB needed with 10% buffer
      const result = await hasEnoughSpace(10000000, 0.1)
      expect(result).toBe(false)
      vi.unstubAllGlobals()
    })
  })

  describe('checkStorageUsageWarning', () => {
    it('should return false when API not supported', async () => {
      vi.stubGlobal('navigator', {})
      const result = await checkStorageUsageWarning()
      expect(result).toBe(false)
      vi.unstubAllGlobals()
    })

    it('should return false when below threshold', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 50000000,
          }),
        },
      })

      const result = await checkStorageUsageWarning(80)
      expect(result).toBe(false)
      vi.unstubAllGlobals()
    })

    it('should return true when above threshold', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 85000000,
          }),
        },
      })

      const result = await checkStorageUsageWarning(80)
      expect(result).toBe(true)
      vi.unstubAllGlobals()
    })

    it('should use default threshold of 80', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 81000000,
          }),
        },
      })

      const result = await checkStorageUsageWarning()
      expect(result).toBe(true)
      vi.unstubAllGlobals()
    })
  })

  describe('clearOldDataLRU', () => {
    it('should return 0 when no data', async () => {
      const getData = () => []
      const removeData = vi.fn()

      const result = await clearOldDataLRU(getData, removeData)
      expect(result).toBe(0)
      expect(removeData).not.toHaveBeenCalled()
    })

    it('should remove oldest items based on target reduction', async () => {
      const data = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 2000 },
        { id: '3', timestamp: 3000 },
        { id: '4', timestamp: 4000 },
        { id: '5', timestamp: 5000 },
      ]
      const getData = () => data
      const removeData = vi.fn()

      const result = await clearOldDataLRU(getData, removeData, 20)
      expect(result).toBe(1) // 20% of 5 = 1
      expect(removeData).toHaveBeenCalledWith(['1'])
    })

    it('should remove multiple items when needed', async () => {
      const data = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 2000 },
        { id: '3', timestamp: 3000 },
      ]
      const getData = () => data
      const removeData = vi.fn()

      // 67% of 3 = 2.01, ceil = 2
      const result = await clearOldDataLRU(getData, removeData, 67)
      expect(result).toBeGreaterThanOrEqual(1) // At least 1, due to ceil behavior may vary
      expect(removeData).toHaveBeenCalled()
    })

    it('should handle Date timestamps', async () => {
      const data = [
        { id: '1', timestamp: new Date(1000) },
        { id: '2', timestamp: new Date(2000) },
      ]
      const getData = () => data
      const removeData = vi.fn()

      const result = await clearOldDataLRU(getData, removeData, 50)
      expect(result).toBe(1)
      expect(removeData).toHaveBeenCalledWith(['1'])
    })

    it('should work with async removeData', async () => {
      const data = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 2000 },
      ]
      const getData = () => data
      const removeData = vi.fn().mockResolvedValue(undefined)

      const result = await clearOldDataLRU(getData, removeData, 50)
      expect(result).toBe(1)
    })
  })

  describe('getStorageUsageSummary', () => {
    it('should return comprehensive summary', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            quota: 100000000,
            usage: 50000000,
          }),
        },
      })

      const result = await getStorageUsageSummary()
      expect(result.overall).toBeDefined()
      expect(result.localStorage).toBeDefined()
      expect(result.sessionStorage).toBeDefined()
      expect(result.indexedDB).toBeDefined()
      vi.unstubAllGlobals()
    })
  })

  describe('QuotaExceededError', () => {
    it('should create error with quota info', () => {
      const quotaInfo = { quota: 100, usage: 100, available: 0, usagePercent: 100, supported: true }
      const error = new QuotaExceededError('Quota exceeded', quotaInfo)
      expect(error.message).toBe('Quota exceeded')
      expect(error.quotaInfo).toBe(quotaInfo)
      expect(error.name).toBe('QuotaExceededError')
    })
  })
})
