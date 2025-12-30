/**
 * Stores module exports unit tests
 */

import { describe, it, expect } from 'vitest'
import {
  callStore,
  registrationStore,
  deviceStore,
  configStore,
  storePersistence,
  initializeStorePersistence,
  saveAllStores,
  loadAllStores,
  clearAllStores,
  destroyStorePersistence,
} from '@/stores'

describe('Stores Module Exports', () => {
  describe('Store Instances', () => {
    it('should export callStore', () => {
      expect(callStore).toBeDefined()
      expect(typeof callStore).toBe('object')
    })

    it('should export registrationStore', () => {
      expect(registrationStore).toBeDefined()
      expect(typeof registrationStore).toBe('object')
    })

    it('should export deviceStore', () => {
      expect(deviceStore).toBeDefined()
      expect(typeof deviceStore).toBe('object')
    })

    it('should export configStore', () => {
      expect(configStore).toBeDefined()
      expect(typeof configStore).toBe('object')
    })
  })

  describe('Persistence Functions', () => {
    it('should export storePersistence', () => {
      expect(storePersistence).toBeDefined()
      expect(typeof storePersistence).toBe('object')
    })

    it('should export initializeStorePersistence', () => {
      expect(initializeStorePersistence).toBeDefined()
      expect(typeof initializeStorePersistence).toBe('function')
    })

    it('should export saveAllStores', () => {
      expect(saveAllStores).toBeDefined()
      expect(typeof saveAllStores).toBe('function')
    })

    it('should export loadAllStores', () => {
      expect(loadAllStores).toBeDefined()
      expect(typeof loadAllStores).toBe('function')
    })

    it('should export clearAllStores', () => {
      expect(clearAllStores).toBeDefined()
      expect(typeof clearAllStores).toBe('function')
    })

    it('should export destroyStorePersistence', () => {
      expect(destroyStorePersistence).toBeDefined()
      expect(typeof destroyStorePersistence).toBe('function')
    })
  })

  describe('Type Re-exports', () => {
    it('should allow importing type exports', async () => {
      const module = await import('@/stores')
      expect(module).toBeDefined()
    })
  })
})
