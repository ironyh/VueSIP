/**
 * Plugins module exports unit tests
 */

import { describe, it, expect } from 'vitest'
import { PluginManager, HookManager, createAnalyticsPlugin, createRecordingPlugin } from '@/plugins'

describe('Plugins Module Exports', () => {
  describe('Core Classes', () => {
    it('should export PluginManager', () => {
      expect(PluginManager).toBeDefined()
      expect(typeof PluginManager).toBe('function')
      expect(PluginManager.name).toBe('PluginManager')
    })

    it('should export HookManager', () => {
      expect(HookManager).toBeDefined()
      expect(typeof HookManager).toBe('function')
      expect(HookManager.name).toBe('HookManager')
    })
  })

  describe('Plugin Factory Functions', () => {
    it('should export createAnalyticsPlugin', () => {
      expect(createAnalyticsPlugin).toBeDefined()
      expect(typeof createAnalyticsPlugin).toBe('function')
    })

    it('should export createRecordingPlugin', () => {
      expect(createRecordingPlugin).toBeDefined()
      expect(typeof createRecordingPlugin).toBe('function')
    })
  })

  describe('Type Re-exports', () => {
    it('should allow importing type exports', async () => {
      const module = await import('@/plugins')
      expect(module).toBeDefined()
    })
  })
})
