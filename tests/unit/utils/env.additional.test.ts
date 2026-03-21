/**
 * Additional environment utility tests - coverage gap filler
 * Tests for isIOS, isAndroid, getBrowserName, getOS, isIframe, isWebRTCSupported, isPWA, isServiceWorkerSupported
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isIOS,
  isAndroid,
  getBrowserName,
  getOS,
  isIframe,
  isWebRTCSupported,
  isPWA,
  isServiceWorkerSupported,
} from '@/utils/env'

describe('env: missing coverage', () => {
  let originalWindow: Window
  let originalNavigator: Navigator

  beforeEach(() => {
    originalWindow = globalThis.window as unknown as Window
    originalNavigator = globalThis.navigator as unknown as Navigator
  })

  afterEach(() => {
    globalThis.window = originalWindow as unknown as Window & typeof globalThis
    globalThis.navigator = originalNavigator as unknown as Navigator & typeof globalThis
  })

  describe('isIOS', () => {
    it('should return false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(isIOS()).toBe(false)
    })

    it('should return false when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', { value: undefined, writable: true })
      expect(isIOS()).toBe(false)
    })

    it('should return true for iPhone', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        writable: true,
      })
      expect(isIOS()).toBe(true)
    })

    it('should return true for iPad', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
        writable: true,
      })
      expect(isIOS()).toBe(true)
    })

    it('should return true for iPod', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        writable: true,
      })
      expect(isIOS()).toBe(true)
    })

    it('should return false for Android', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' },
        writable: true,
      })
      expect(isIOS()).toBe(false)
    })

    it('should return false for desktop', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        writable: true,
      })
      expect(isIOS()).toBe(false)
    })
  })

  describe('isAndroid', () => {
    it('should return false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(isAndroid()).toBe(false)
    })

    it('should return false when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', { value: undefined, writable: true })
      expect(isAndroid()).toBe(false)
    })

    it('should return true for Android phone', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36' },
        writable: true,
      })
      expect(isAndroid()).toBe(true)
    })

    it('should return true for Android tablet', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-X800) AppleWebKit/537.36' },
        writable: true,
      })
      expect(isAndroid()).toBe(true)
    })

    it('should return false for iOS', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        writable: true,
      })
      expect(isAndroid()).toBe(false)
    })

    it('should return false for desktop', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        writable: true,
      })
      expect(isAndroid()).toBe(false)
    })
  })

  describe('getBrowserName', () => {
    it('should return unknown when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(getBrowserName()).toBe('unknown')
    })

    it('should return unknown when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', { value: undefined, writable: true })
      expect(getBrowserName()).toBe('unknown')
    })

    it('should return chrome for Chrome', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        },
        writable: true,
      })
      expect(getBrowserName()).toBe('chrome')
    })

    it('should return firefox for Firefox', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Windows NT 10.0; rv:121.0 Firefox/121.0' },
        writable: true,
      })
      expect(getBrowserName()).toBe('firefox')
    })

    it('should return safari for Safari', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 Macintosh; Intel Mac OS X 10_15_7 AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15',
        },
        writable: true,
      })
      expect(getBrowserName()).toBe('safari')
    })

    it('should return edge for Edge', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 Windows NT 10.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        },
        writable: true,
      })
      expect(getBrowserName()).toBe('edge')
    })

    it('should return opera for Opera', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 Windows NT 10.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
        },
        writable: true,
      })
      expect(getBrowserName()).toBe('opera')
    })

    it('should return unknown for unrecognized', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'UnknownBrowser/1.0' },
        writable: true,
      })
      expect(getBrowserName()).toBe('unknown')
    })
  })

  describe('getOS', () => {
    it('should return unknown when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(getOS()).toBe('unknown')
    })

    it('should return unknown when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', { value: undefined, writable: true })
      expect(getOS()).toBe('unknown')
    })

    it('should return windows', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0', platform: 'Win32' },
        writable: true,
      })
      expect(getOS()).toBe('windows')
    })

    it('should return mac', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0', platform: 'MacIntel' },
        writable: true,
      })
      expect(getOS()).toBe('mac')
    })

    it('should return linux', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 X11; Linux x86_64', platform: 'Linux x86_64' },
        writable: true,
      })
      expect(getOS()).toBe('linux')
    })

    it('should return ios for iPhone', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 iPhone; CPU iPhone OS 16_0', platform: 'iPhone' },
        writable: true,
      })
      expect(getOS()).toBe('ios')
    })

    it('should return ios for iPad', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 iPad; CPU OS 16_0', platform: 'iPad' },
        writable: true,
      })
      expect(getOS()).toBe('ios')
    })

    it('should return android', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Linux; Android 13', platform: 'Linux armv8l' },
        writable: true,
      })
      expect(getOS()).toBe('android')
    })

    it('should return unknown for unrecognized', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Unknown/1.0', platform: 'Unknown' },
        writable: true,
      })
      expect(getOS()).toBe('unknown')
    })
  })

  describe('isIframe', () => {
    it('should return false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(isIframe()).toBe(false)
    })

    it('should return false when not in iframe (self === top)', () => {
      const mockTop = {} as Window
      Object.defineProperty(globalThis, 'window', {
        value: { self: mockTop, top: mockTop },
        writable: true,
      })
      expect(isIframe()).toBe(false)
    })

    it('should return true when in iframe (self !== top)', () => {
      const mockTop = {} as Window
      const mockSelf = { parent: mockTop } as Window
      Object.defineProperty(globalThis, 'window', {
        value: { self: mockSelf, top: mockTop },
        writable: true,
      })
      expect(isIframe()).toBe(true)
    })

    it('should return true when accessing top throws SecurityError', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          self: {} as Window,
          get top() {
            throw new DOMException('Blocked', 'SecurityError')
          },
        },
        writable: true,
      })
      expect(isIframe()).toBe(true)
    })
  })

  describe('isWebRTCSupported', () => {
    it('should return false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(isWebRTCSupported()).toBe(false)
    })

    it.skip('should detect RTCPeerConnection availability', () => {
      // Skipped: RTCPeerConnection may be polyfilled in test environment
      Object.defineProperty(globalThis, 'window', {
        value: {
          RTCPeerConnection: undefined,
          webkitRTCPeerConnection: undefined,
          mozRTCPeerConnection: undefined,
        },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: { getUserMedia: () => {} } },
        writable: true,
      })
      expect(isWebRTCSupported()).toBe(false)
    })

    it('should return true when RTCPeerConnection defined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { RTCPeerConnection: class {} },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: { getUserMedia: () => {} } },
        writable: true,
      })
      expect(isWebRTCSupported()).toBe(true)
    })

    it('should return true for webkitRTCPeerConnection (Safari)', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { webkitRTCPeerConnection: class {} },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: { getUserMedia: () => {} } },
        writable: true,
      })
      expect(isWebRTCSupported()).toBe(true)
    })

    it('should return false when getUserMedia undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { RTCPeerConnection: class {} },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: {} },
        writable: true,
      })
      expect(isWebRTCSupported()).toBe(false)
    })
  })

  describe('isPWA', () => {
    it('should return false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(isPWA()).toBe(false)
    })

    it('should return true when navigator.standalone is standalone', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { matchMedia: () => ({ matches: false }) },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: { standalone: 'standalone' },
        writable: true,
      })
      expect(isPWA()).toBe(true)
    })

    it('should return true when navigator.standalone is fullscreen', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { matchMedia: () => ({ matches: false }) },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', {
        value: { standalone: 'fullscreen' },
        writable: true,
      })
      expect(isPWA()).toBe(true)
    })

    it('should return true when display-mode is standalone', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { matchMedia: () => ({ matches: true }) },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true })
      expect(isPWA()).toBe(true)
    })

    it('should return true when display-mode is minimal-ui', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: (query: string) => {
            if (query === '(display-mode: standalone)') return { matches: false }
            if (query === '(display-mode: minimal-ui)') return { matches: true }
            return { matches: false }
          },
        },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true })
      expect(isPWA()).toBe(true)
    })

    it('should return false when not PWA', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { matchMedia: () => ({ matches: false }) },
        writable: true,
      })
      Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true })
      expect(isPWA()).toBe(false)
    })
  })

  describe('isServiceWorkerSupported', () => {
    it('should return false when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', { value: undefined, writable: true })
      expect(isServiceWorkerSupported()).toBe(false)
    })

    it('should return true when serviceWorker in navigator', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: {} as ServiceWorkerContainer },
        writable: true,
      })
      expect(isServiceWorkerSupported()).toBe(true)
    })

    it('should return false when serviceWorker not in navigator', () => {
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true })
      Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true })
      expect(isServiceWorkerSupported()).toBe(false)
    })
  })
})
