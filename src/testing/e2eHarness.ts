/**
 * E2E / EventBridge test harness
 *
 * Single place for "test mode" detection and access to E2E-injected globals.
 * Playwright/integration tests set window.__sipEventBridge and window.__emitSipEvent
 * so the app can be driven and asserted on. Production behavior is unchanged.
 *
 * @module testing/e2eHarness
 */

import type { EventBus } from '@/core/EventBus'

/** E2E emit function signature (event name, optional payload) */
export type E2EEmitFn = (event: string, data?: unknown) => void

declare global {
  interface Window {
    __emitSipEvent?: E2EEmitFn
    __sipEventBridge?: EventBus
    __sipListenersReady?: boolean
  }
}

/**
 * True when running in a browser and E2E harness is present
 * (window.__emitSipEvent is a function or window.__sipEventBridge is defined).
 */
export function isE2EMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const hasEmit = typeof window.__emitSipEvent === 'function'
  const hasBridge = typeof window.__sipEventBridge !== 'undefined'
  return hasEmit || hasBridge
}

/**
 * Returns the E2E emit function if available, otherwise null.
 * Use this to send events to the test harness (e.g. connection:connected, call:answered).
 */
export function getE2EEmit(): E2EEmitFn | null {
  if (typeof window === 'undefined') return null
  return typeof window.__emitSipEvent === 'function' ? window.__emitSipEvent : null
}

/**
 * Returns the E2E EventBridge instance if available.
 * Tests inject this so the app and tests share the same EventBus.
 */
export function getEventBridge(): EventBus | undefined {
  if (typeof window === 'undefined') return undefined
  return window.__sipEventBridge
}

/**
 * Signals to E2E tests that all event listeners are registered.
 * Call this after setting up EventBus listeners so tests can avoid races.
 * No-op when not in E2E mode.
 */
export function setListenersReady(): void {
  if (typeof window === 'undefined') return
  if (isE2EMode()) {
    window.__sipListenersReady = true
  }
}
