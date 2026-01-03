/**
 * Adapters module exports unit tests
 */

import { describe, it, expect } from 'vitest'
import { AdapterFactory, createSipAdapter } from '@/adapters'

describe('Adapters Module Exports', () => {
  describe('Class Exports', () => {
    it('should export AdapterFactory class', () => {
      expect(AdapterFactory).toBeDefined()
      expect(typeof AdapterFactory).toBe('function')
      expect(AdapterFactory.name).toBe('AdapterFactory')
    })

    it('should export AdapterFactory.createAdapter static method', () => {
      expect(AdapterFactory.createAdapter).toBeDefined()
      expect(typeof AdapterFactory.createAdapter).toBe('function')
    })

    it('should export AdapterFactory.isLibraryAvailable static method', () => {
      expect(AdapterFactory.isLibraryAvailable).toBeDefined()
      expect(typeof AdapterFactory.isLibraryAvailable).toBe('function')
    })

    it('should export AdapterFactory.getAvailableLibraries static method', () => {
      expect(AdapterFactory.getAvailableLibraries).toBeDefined()
      expect(typeof AdapterFactory.getAvailableLibraries).toBe('function')
    })

    it('should export AdapterFactory.getAdapterInfo static method', () => {
      expect(AdapterFactory.getAdapterInfo).toBeDefined()
      expect(typeof AdapterFactory.getAdapterInfo).toBe('function')
    })
  })

  describe('Function Exports', () => {
    it('should export createSipAdapter function', () => {
      expect(createSipAdapter).toBeDefined()
      expect(typeof createSipAdapter).toBe('function')
    })
  })

  describe('Type Re-exports', () => {
    // Type exports can't be tested at runtime, but we verify they exist via TypeScript
    // This ensures the exports are correct and don't cause import errors
    it('should allow importing type exports', async () => {
      // If this import succeeds, the types are exported correctly
      const module = await import('@/adapters')
      expect(module).toBeDefined()
    })
  })
})
