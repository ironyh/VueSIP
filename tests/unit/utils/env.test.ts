/**
 * Environment utilities unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isDebugMode } from '@/utils/env'

describe('env utils', () => {
  describe('isDebugMode()', () => {
    let originalWindow: any

    beforeEach(() => {
      // Save original values
      originalWindow = global.window
    })

    afterEach(() => {
      // Restore original values
      global.window = originalWindow
      vi.unstubAllGlobals()
    })

    it('should return false when window is undefined', () => {
      // @ts-expect-error - testing undefined window
      global.window = undefined
      expect(isDebugMode()).toBe(false)
    })

    it('should return true when VITE_DEBUG is true string', () => {
      vi.stubGlobal('window', {})
      Object.defineProperty(import.meta, 'env', {
        value: { VITE_DEBUG: 'true' },
        configurable: true,
      })
      expect(isDebugMode()).toBe(true)
    })

    it('should return true when VITE_DEBUG is boolean true', () => {
      vi.stubGlobal('window', {})
      Object.defineProperty(import.meta, 'env', {
        value: { VITE_DEBUG: true },
        configurable: true,
      })
      expect(isDebugMode()).toBe(true)
    })

    it('should return true when MODE is test', () => {
      vi.stubGlobal('window', {})
      Object.defineProperty(import.meta, 'env', {
        value: { MODE: 'test' },
        configurable: true,
      })
      expect(isDebugMode()).toBe(true)
    })

    it('should return true when TEST env var is set', () => {
      vi.stubGlobal('window', {})
      Object.defineProperty(import.meta, 'env', {
        value: { TEST: true },
        configurable: true,
      })
      expect(isDebugMode()).toBe(true)
    })

    it('should return true when __PLAYWRIGHT_TEST__ is set', () => {
      vi.stubGlobal('window', { __PLAYWRIGHT_TEST__: true })
      Object.defineProperty(import.meta, 'env', {
        value: {},
        configurable: true,
      })
      expect(isDebugMode()).toBe(true)
    })

    it('should return true in test environment', () => {
      // In vitest, import.meta.env.MODE is 'test', so this returns true
      expect(isDebugMode()).toBe(true)
    })
  })
})
