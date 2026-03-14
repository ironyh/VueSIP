/**
 * Environment Utilities
 *
 * Provides utilities for detecting runtime environment and debug/test modes.
 *
 * @module utils/env
 */

/**
 * Check if running in a browser environment (vs Node.js/server-side)
 *
 * Useful for code that needs to run differently in browser vs server contexts.
 *
 * @returns true if running in a browser environment
 *
 * @example
 * ```typescript
 * if (isBrowser()) {
 *   // Access window, document, navigator, etc.
 * }
 * ```
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if running in production environment
 *
 * @returns true if running in production mode
 */
export function isProductionMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const meta = import.meta as {
      env?: { MODE?: string; PROD?: boolean; VITE_PROD?: string | boolean }
    }
    // Check for Vite environment variable
    if (meta.env?.MODE === 'production' || meta.env?.PROD || meta.env?.VITE_PROD === 'true') {
      return true
    }
  } catch {
    // import.meta not available
  }

  return false
}

/**
 * Check if running in development environment
 *
 * @returns true if running in development mode (not production)
 */
export function isDevelopmentMode(): boolean {
  return !isProductionMode()
}

/**
 * Check if debug mode is enabled
 *
 * Uses Vite environment variables (VITE_DEBUG) or build-time flags.
 * Can be set via environment variable: VITE_DEBUG=true
 *
 * @returns true if debug mode is enabled
 */
export function isDebugMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const meta = import.meta as {
      env?: { VITE_DEBUG?: string | boolean; MODE?: string; TEST?: boolean }
    }
    // Check for Vite environment variable (prefixed with VITE_)
    if (meta.env?.VITE_DEBUG === 'true' || meta.env?.VITE_DEBUG === true) {
      return true
    }
    // Check for test mode
    if (meta.env?.MODE === 'test' || meta.env?.TEST) {
      return true
    }
  } catch {
    // import.meta not available, continue to other checks
  }

  // Fallback: check for Playwright test marker (for E2E tests)
  if ((window as { __PLAYWRIGHT_TEST__?: boolean }).__PLAYWRIGHT_TEST__) {
    return true
  }

  return false
}

/**
 * Check if running in a secure context (HTTPS or localhost)
 *
 * WebRTC and getUserMedia require a secure context.
 * This utility helps detect whether the app can use these APIs.
 *
 * @returns true if running in a secure context
 *
 * @example
 * ```typescript
 * if (!isSecureContext()) {
 *   console.warn('getUserMedia requires HTTPS or localhost')
 * }
 * ```
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // Use the browser's built-in secure context check
  // This returns true for HTTPS, wss://, and localhost (including file:// in some browsers)
  return window.isSecureContext === true
}

/**
 * Check if running on a mobile device (phone or tablet)
 *
 * Useful for adapting UI and behavior for mobile vs desktop.
 * Checks for common mobile indicators in the user agent string.
 *
 * @returns true if running on a mobile device
 *
 * @example
 * ```typescript
 * if (isMobileDevice()) {
 *   // Show mobile-optimized UI
 *   enablePushNotifications()
 * }
 * ```
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !navigator) {
    return false
  }

  const userAgent = navigator.userAgent || ''

  // Check for common mobile indicators
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /IEMobile/i,
    /Opera Mini/i,
    /Mobile/i,
  ]

  return mobilePatterns.some((pattern) => pattern.test(userAgent))
}

/**
 * Check if running on an iOS device (iPhone, iPad, iPod)
 *
 * @returns true if running on an iOS device
 *
 * @example
 * ```typescript
 * if (isIOS()) {
 *   // iOS-specific handling (Safari, WebKit quirks)
 * }
 * ```
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || !navigator) {
    return false
  }

  const userAgent = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(userAgent)
}

/**
 * Check if running on an Android device
 *
 * @returns true if running on an Android device
 *
 * @example
 * ```typescript
 * if (isAndroid()) {
 *   // Android-specific handling
 * }
 * ```
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined' || !navigator) {
    return false
  }

  const userAgent = navigator.userAgent || ''
  return /Android/i.test(userAgent)
}

/**
 * Get the current browser name
 *
 * @returns browser name string ('chrome', 'firefox', 'safari', 'edge', 'opera', 'unknown')
 *
 * @example
 * ```typescript
 * const browser = getBrowserName()
 * if (browser === 'safari') {
 *   // Safari-specific handling
 * }
 * ```
 */
export function getBrowserName(): 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown' {
  if (typeof window === 'undefined' || !navigator) {
    return 'unknown'
  }

  const userAgent = navigator.userAgent || ''

  // Order matters: Opera must be checked before Chrome
  // Edge must be checked before Chrome
  if (/OPR|Opera/i.test(userAgent)) {
    return 'opera'
  }
  if (/Edg/i.test(userAgent)) {
    return 'edge'
  }
  if (/Chrome/i.test(userAgent)) {
    return 'chrome'
  }
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    return 'safari'
  }
  if (/Firefox/i.test(userAgent)) {
    return 'firefox'
  }

  return 'unknown'
}

/**
 * Get the current operating system
 *
 * @returns OS name string ('windows', 'mac', 'linux', 'android', 'ios', 'unknown')
 *
 * @example
 * ```typescript
 * const os = getOS()
 * if (os === 'windows') {
 *   // Windows-specific handling
 * }
 * ```
 */
export function getOS(): 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown' {
  if (typeof window === 'undefined' || !navigator) {
    return 'unknown'
  }

  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''

  // Check for iOS first (before Mac)
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios'
  }
  // Check for Android
  if (/Android/i.test(userAgent)) {
    return 'android'
  }
  // Check for Mac
  if (/Mac/i.test(platform) || /Mac/i.test(userAgent)) {
    return 'mac'
  }
  // Check for Windows
  if (/Win/i.test(platform) || /Win/i.test(userAgent)) {
    return 'windows'
  }
  // Check for Linux
  if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
    return 'linux'
  }

  return 'unknown'
}
