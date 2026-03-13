/**
 * Environment Utilities
 *
 * Provides utilities for detecting runtime environment and debug/test modes.
 *
 * @module utils/env
 */

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
