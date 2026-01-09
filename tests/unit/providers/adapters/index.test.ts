/**
 * Provider Adapters module exports unit tests
 */

import { describe, it, expect } from 'vitest'
import { twilioAdapter, adapters } from '@/providers/adapters'

describe('Provider Adapters Module Exports', () => {
  describe('twilioAdapter Export', () => {
    it('should export twilioAdapter', () => {
      expect(twilioAdapter).toBeDefined()
    })

    it('should have correct id', () => {
      expect(twilioAdapter.id).toBe('twilio')
    })

    it('should have correct name', () => {
      expect(twilioAdapter.name).toBe('Twilio')
    })

    it('should have required fields array', () => {
      expect(Array.isArray(twilioAdapter.fields)).toBe(true)
      expect(twilioAdapter.fields.length).toBeGreaterThan(0)
    })

    it('should have mapCredentials function', () => {
      expect(typeof twilioAdapter.mapCredentials).toBe('function')
    })

    it('should have connect function', () => {
      expect(typeof twilioAdapter.connect).toBe('function')
    })
  })

  describe('adapters Array Export', () => {
    it('should export adapters array', () => {
      expect(adapters).toBeDefined()
      expect(Array.isArray(adapters)).toBe(true)
    })

    it('should have exactly 1 entry', () => {
      expect(adapters.length).toBe(1)
    })

    it('should contain twilioAdapter', () => {
      expect(adapters).toContain(twilioAdapter)
    })

    it('should have adapters with required properties', () => {
      for (const adapter of adapters) {
        expect(adapter.id).toBeDefined()
        expect(adapter.name).toBeDefined()
        expect(adapter.fields).toBeDefined()
        expect(adapter.mapCredentials).toBeDefined()
      }
    })
  })

  describe('Type Re-exports', () => {
    it('should allow importing module exports', async () => {
      const module = await import('@/providers/adapters')
      expect(module).toBeDefined()
      expect(module.twilioAdapter).toBeDefined()
      expect(module.adapters).toBeDefined()
    })
  })
})
