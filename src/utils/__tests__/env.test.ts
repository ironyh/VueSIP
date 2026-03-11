/**
 * Environment Utilities Tests
 *
 * @module utils/__tests__/env.test.ts
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('env utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('isDebugMode', () => {
    it('should return false when window is undefined (SSR)', async () => {
      // Save and remove window
      const originalWindow = globalThis.window
      delete (globalThis as any).window

      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      // Restore window
      globalThis.window = originalWindow

      expect(result).toBe(false)
    })

    it('should return true when VITE_DEBUG is "true" string', async () => {
      // Stub import.meta before importing
      vi.stubGlobal('import.meta', {
        env: { VITE_DEBUG: 'true' },
      })

      vi.resetModules()
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      expect(result).toBe(true)
    })

    it('should return true when VITE_DEBUG is boolean true', async () => {
      vi.stubGlobal('import.meta', {
        env: { VITE_DEBUG: true },
      })

      vi.resetModules()
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      expect(result).toBe(true)
    })

    it('should return true when MODE is "test"', async () => {
      vi.stubGlobal('import.meta', {
        env: { MODE: 'test' },
      })

      vi.resetModules()
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      expect(result).toBe(true)
    })

    it('should return true when window.__PLAYWRIGHT_TEST__ is true', async () => {
      // Set window with __PLAYWRIGHT_TEST__ flag
      globalThis.window = { __PLAYWRIGHT_TEST__: true } as any

      // Set import.meta to have no debug flags (or at least not 'true')
      vi.stubGlobal('import.meta', {
        env: { VITE_DEBUG: false },
      })

      vi.resetModules()
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      expect(result).toBe(true)
    })
  })
})
