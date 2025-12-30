/**
 * Storage module exports unit tests
 */

import { describe, it, expect } from 'vitest'
import {
  LocalStorageAdapter,
  SessionStorageAdapter,
  IndexedDBAdapter,
  createPersistence,
  PersistenceManager,
} from '@/storage'

describe('Storage Module Exports', () => {
  describe('Storage Adapters', () => {
    it('should export LocalStorageAdapter', () => {
      expect(LocalStorageAdapter).toBeDefined()
      expect(typeof LocalStorageAdapter).toBe('function')
      expect(LocalStorageAdapter.name).toBe('LocalStorageAdapter')
    })

    it('should export SessionStorageAdapter', () => {
      expect(SessionStorageAdapter).toBeDefined()
      expect(typeof SessionStorageAdapter).toBe('function')
      expect(SessionStorageAdapter.name).toBe('SessionStorageAdapter')
    })

    it('should export IndexedDBAdapter', () => {
      expect(IndexedDBAdapter).toBeDefined()
      expect(typeof IndexedDBAdapter).toBe('function')
      expect(IndexedDBAdapter.name).toBe('IndexedDBAdapter')
    })
  })

  describe('Persistence Utilities', () => {
    it('should export createPersistence', () => {
      expect(createPersistence).toBeDefined()
      expect(typeof createPersistence).toBe('function')
    })

    it('should export PersistenceManager', () => {
      expect(PersistenceManager).toBeDefined()
      expect(typeof PersistenceManager).toBe('function')
      expect(PersistenceManager.name).toBe('PersistenceManager')
    })
  })

  describe('Type Re-exports', () => {
    it('should allow importing type exports', async () => {
      const module = await import('@/storage')
      expect(module).toBeDefined()
    })
  })
})
