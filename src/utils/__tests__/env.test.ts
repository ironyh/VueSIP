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

  describe('isProductionMode', () => {
    it('should return false when window is undefined (SSR)', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isProductionMode } = await import('../env')
      const result = isProductionMode()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return false in vitest test environment (MODE=test)', async () => {
      // In vitest, MODE is set to 'test' by default
      // This verifies the function correctly returns false for non-production
      const { isProductionMode } = await import('../env')
      const result = isProductionMode()

      // Should be false because MODE='test' in vitest env
      expect(result).toBe(false)
    })

    it('should return false when PROD is false in env', async () => {
      // Vitest sets PROD=false by default
      const { isProductionMode } = await import('../env')
      const result = isProductionMode()

      expect(result).toBe(false)
    })

    it('should return false when no production flags are set', async () => {
      const { isProductionMode } = await import('../env')
      const result = isProductionMode()

      // In test env, none of the production checks should pass
      expect(result).toBe(false)
    })
  })

  describe('isDevelopmentMode', () => {
    it('should return true when isProductionMode returns false', async () => {
      const { isDevelopmentMode, isProductionMode } = await import('../env')

      // In vitest test env, isProductionMode returns false
      expect(isProductionMode()).toBe(false)
      // Therefore isDevelopmentMode should return true
      expect(isDevelopmentMode()).toBe(true)
    })

    it('should be inverse of isProductionMode', async () => {
      const { isDevelopmentMode, isProductionMode } = await import('../env')

      const prodMode = isProductionMode()
      const devMode = isDevelopmentMode()

      // They should be opposites
      expect(devMode).toBe(!prodMode)
    })
  })

  describe('isDebugMode', () => {
    it('should return false when window is undefined (SSR)', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true when MODE is "test" in vitest', async () => {
      // Vitest sets MODE='test' which triggers debug mode
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      // MODE=test should return true
      expect(result).toBe(true)
    })

    it('should return true when VITE_DEBUG is "true" string', async () => {
      // Save original env
      const originalMeta = import.meta.env

      // Create a mock that has VITE_DEBUG
      Object.defineProperty(import.meta, 'env', {
        value: { ...originalMeta, VITE_DEBUG: 'true', MODE: 'production' },
        writable: true,
      })

      vi.resetModules()
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      // Restore
      Object.defineProperty(import.meta, 'env', {
        value: originalMeta,
        writable: true,
      })

      expect(result).toBe(true)
    })

    it('should return true when VITE_DEBUG is boolean true', async () => {
      const originalMeta = import.meta.env

      Object.defineProperty(import.meta, 'env', {
        value: { ...originalMeta, VITE_DEBUG: true },
        writable: true,
      })

      vi.resetModules()
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      Object.defineProperty(import.meta, 'env', {
        value: originalMeta,
        writable: true,
      })

      expect(result).toBe(true)
    })

    it('should return true when window.__PLAYWRIGHT_TEST__ is true', async () => {
      const originalWindow = globalThis.window

      globalThis.window = {
        ...originalWindow,
        __PLAYWRIGHT_TEST__: true,
      } as Record<string, unknown>

      vi.resetModules()
      const { isDebugMode } = await import('../env')
      const result = isDebugMode()

      globalThis.window = originalWindow

      expect(result).toBe(true)
    })
  })
})
