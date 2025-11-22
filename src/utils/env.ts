/**
 * Environment Utilities
 *
 * Provides utilities for detecting runtime environment and debug/test modes.
 *
 * @module utils/env
 */

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
    const meta = import.meta as any
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
  if ((window as any).__PLAYWRIGHT_TEST__) {
    return true
  }

  return false
}

