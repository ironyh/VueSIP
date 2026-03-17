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

  describe('isSecureContext', () => {
    it('should return false when window is undefined (SSR)', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isSecureContext } = await import('../env')
      const result = isSecureContext()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true when window.isSecureContext is true', async () => {
      const originalWindow = globalThis.window

      globalThis.window = {
        ...originalWindow,
        isSecureContext: true,
      } as Record<string, unknown>

      vi.resetModules()
      const { isSecureContext } = await import('../env')
      const result = isSecureContext()

      globalThis.window = originalWindow
      expect(result).toBe(true)
    })

    it('should return false when window.isSecureContext is false', async () => {
      const originalWindow = globalThis.window

      globalThis.window = {
        ...originalWindow,
        isSecureContext: false,
      } as Record<string, unknown>

      vi.resetModules()
      const { isSecureContext } = await import('../env')
      const result = isSecureContext()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })
  })

  describe('isIOS', () => {
    it('should return false when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isIOS } = await import('../env')
      const result = isIOS()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true for iPhone user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      })

      const { isIOS } = await import('../env')
      expect(isIOS()).toBe(true)
    })

    it('should return true for iPad user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      })

      const { isIOS } = await import('../env')
      expect(isIOS()).toBe(true)
    })

    it('should return false for Android user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
      })

      const { isIOS } = await import('../env')
      expect(isIOS()).toBe(false)
    })

    it('should return false for desktop user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      })

      const { isIOS } = await import('../env')
      expect(isIOS()).toBe(false)
    })
  })

  describe('isAndroid', () => {
    it('should return false when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isAndroid } = await import('../env')
      const result = isAndroid()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true for Android user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
      })

      const { isAndroid } = await import('../env')
      expect(isAndroid()).toBe(true)
    })

    it('should return false for iOS user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      })

      const { isAndroid } = await import('../env')
      expect(isAndroid()).toBe(false)
    })

    it('should return false for desktop user agent', async () => {
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })

      const { isAndroid } = await import('../env')
      expect(isAndroid()).toBe(false)
    })
  })

  describe('isIframe', () => {
    it('should return false when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isIframe } = await import('../env')
      const result = isIframe()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return false when not in iframe (window.self === window.top)', async () => {
      vi.stubGlobal('window', {
        self: {},
        top: {},
      })
      // Make them equal to simulate not in iframe
      vi.stubGlobal('window', {
        self: globalThis,
        top: globalThis,
      })

      const { isIframe } = await import('../env')
      expect(isIframe()).toBe(false)
    })

    it('should return true when in iframe (window.self !== window.top)', async () => {
      const mockSelf = {}
      const mockTop = {} // Different object reference = different context

      vi.stubGlobal('window', {
        self: mockSelf,
        top: mockTop,
      })

      const { isIframe } = await import('../env')
      expect(isIframe()).toBe(true)
    })

    it('should return true when accessing window.top throws SecurityError', async () => {
      vi.stubGlobal('window', {
        self: {},
        get top() {
          throw new DOMException('Blocked', 'SecurityError')
        },
      })

      const { isIframe } = await import('../env')
      expect(isIframe()).toBe(true)
    })
  })

  describe('getBrowserName', () => {
    it('should return unknown when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { getBrowserName } = await import('../env')
      const result = getBrowserName()

      globalThis.window = originalWindow
      expect(result).toBe('unknown')
    })

    it('should return chrome for Chrome user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })

      const { getBrowserName } = await import('../env')
      expect(getBrowserName()).toBe('chrome')
    })

    it('should return firefox for Firefox user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      })

      const { getBrowserName } = await import('../env')
      expect(getBrowserName()).toBe('firefox')
    })

    it('should return safari for Safari user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      })

      const { getBrowserName } = await import('../env')
      expect(getBrowserName()).toBe('safari')
    })

    it('should return edge for Edge user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      })

      const { getBrowserName } = await import('../env')
      expect(getBrowserName()).toBe('edge')
    })

    it('should return opera for Opera user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
      })

      const { getBrowserName } = await import('../env')
      expect(getBrowserName()).toBe('opera')
    })

    it('should return chrome when both Chrome and Safari in user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })

      const { getBrowserName } = await import('../env')
      expect(getBrowserName()).toBe('chrome')
    })
  })

  describe('getOS', () => {
    it('should return unknown when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { getOS } = await import('../env')
      const result = getOS()

      globalThis.window = originalWindow
      expect(result).toBe('unknown')
    })

    it('should return windows for Windows user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Win32',
      })

      const { getOS } = await import('../env')
      expect(getOS()).toBe('windows')
    })

    it('should return mac for Mac user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
      })

      const { getOS } = await import('../env')
      expect(getOS()).toBe('mac')
    })

    it('should return linux for Linux user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        platform: 'Linux x86_64',
      })

      const { getOS } = await import('../env')
      expect(getOS()).toBe('linux')
    })

    it('should return ios for iPhone user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        platform: 'iPhone',
      })

      const { getOS } = await import('../env')
      expect(getOS()).toBe('ios')
    })

    it('should return ios for iPad user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
        platform: 'iPad',
      })

      const { getOS } = await import('../env')
      expect(getOS()).toBe('ios')
    })

    it('should return android for Android user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
        platform: 'Linux aarch64',
      })

      const { getOS } = await import('../env')
      expect(getOS()).toBe('android')
    })

    it('should return unknown for unrecognized user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: '',
        platform: '',
      })

      const { getOS } = await import('../env')
      expect(getOS()).toBe('unknown')
    })
  })

  describe('isBrowser', () => {
    it('should return false when window is undefined (Node.js/SSR)', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isBrowser } = await import('../env')
      const result = isBrowser()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true when window is defined', async () => {
      vi.stubGlobal('window', {})

      const { isBrowser } = await import('../env')
      expect(isBrowser()).toBe(true)
    })
  })

  describe('isProductionMode - edge cases', () => {
    it('should return false when import.meta.env throws', async () => {
      // Test the catch block in isProductionMode
      const originalWindow = globalThis.window
      globalThis.window = {
        isSecureContext: true,
      } as Record<string, unknown>

      // Make import.meta.env throw by making it undefined when accessed
      const originalMeta = Object.getOwnPropertyDescriptor(import.meta, 'env')
      Object.defineProperty(import.meta, 'env', {
        get() {
          throw new Error('import.meta.env not available')
        },
        configurable: true,
      })

      vi.resetModules()
      const { isProductionMode } = await import('../env')
      const result = isProductionMode()

      // Restore
      globalThis.window = originalWindow
      if (originalMeta) {
        Object.defineProperty(import.meta, 'env', originalMeta)
      }

      expect(result).toBe(false)
    })
  })

  describe('isMobileDevice', () => {
    it('should return false when window is undefined', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isMobileDevice } = await import('../env')
      const result = isMobileDevice()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true for Android user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
      })

      const { isMobileDevice } = await import('../env')
      expect(isMobileDevice()).toBe(true)
    })

    it('should return true for iPhone user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      })

      const { isMobileDevice } = await import('../env')
      expect(isMobileDevice()).toBe(true)
    })

    it('should return true for iPad user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
      })

      const { isMobileDevice } = await import('../env')
      expect(isMobileDevice()).toBe(true)
    })

    it('should return false for desktop user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      })

      const { isMobileDevice } = await import('../env')
      expect(isMobileDevice()).toBe(false)
    })

    it('should return true for BlackBerry user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)',
      })

      const { isMobileDevice } = await import('../env')
      expect(isMobileDevice()).toBe(true)
    })

    it('should return true for Opera Mini user agent', async () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Opera/9.80 (Android; Opera Mini/36.2.2254)',
      })

      const { isMobileDevice } = await import('../env')
      expect(isMobileDevice()).toBe(true)
    })
  })

  describe('isPWA', () => {
    it('should return false when window is undefined (SSR)', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isPWA } = await import('../env')
      const result = isPWA()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true when navigator.standalone is set (iOS PWA)', async () => {
      vi.stubGlobal('navigator', {
        standalone: 'standalone',
      })
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      })

      const { isPWA } = await import('../env')
      expect(isPWA()).toBe(true)
    })

    it('should return true when display-mode is standalone', async () => {
      vi.stubGlobal('navigator', {})
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      })

      const { isPWA } = await import('../env')
      expect(isPWA()).toBe(true)
    })

    it('should return true when display-mode is minimal-ui', async () => {
      vi.stubGlobal('navigator', {})
      vi.stubGlobal('window', {
        matchMedia: vi.fn((query: string) => {
          if (query === '(display-mode: standalone)') {
            return { matches: false }
          }
          if (query === '(display-mode: minimal-ui)') {
            return { matches: true }
          }
          return { matches: false }
        }),
      })

      const { isPWA } = await import('../env')
      expect(isPWA()).toBe(true)
    })

    it('should return false when not running as PWA', async () => {
      vi.stubGlobal('navigator', {})
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      })

      const { isPWA } = await import('../env')
      expect(isPWA()).toBe(false)
    })
  })

  describe('isServiceWorkerSupported', () => {
    it('should return false when window is undefined (SSR)', async () => {
      const originalWindow = globalThis.window
      delete (globalThis as Record<string, unknown>).window

      const { isServiceWorkerSupported } = await import('../env')
      const result = isServiceWorkerSupported()

      globalThis.window = originalWindow
      expect(result).toBe(false)
    })

    it('should return true when serviceWorker is in navigator', async () => {
      vi.stubGlobal('navigator', {
        serviceWorker: {},
      })

      const { isServiceWorkerSupported } = await import('../env')
      expect(isServiceWorkerSupported()).toBe(true)
    })

    it('should return false when serviceWorker is not in navigator', async () => {
      vi.stubGlobal('navigator', {})

      const { isServiceWorkerSupported } = await import('../env')
      expect(isServiceWorkerSupported()).toBe(false)
    })
  })
})
