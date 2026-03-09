/**
 * Global Type Augmentations
 *
 * Augments global types for VueSIP
 */

import type { E2EEmitFunction } from './jssip.types'

declare global {
  interface Window {
    /**
     * E2E test event bridge function
     * Set by Playwright/integration tests to capture SIP events
     */
    __emitSipEvent?: E2EEmitFunction

    /**
     * E2E test event bridge object (alternative to function)
     */
    __sipEventBridge?: {
      emit: (eventType: string, eventData: Record<string, unknown>) => void
    }
  }
}

export {}
