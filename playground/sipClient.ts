/**
 * Shared SIP client instance for playground
 * This ensures all components use the same SIP client state
 *
 * IMPORTANT: This file has been disabled because it was causing issues in E2E tests.
 * The module-level useSipClient() call was executing before test fixtures could set up
 * window.__sipEventBridge, causing event listeners to be registered on the wrong EventBus
 * instance.
 *
 * If you need to use this file, you must refactor it to NOT call useSipClient() at module level.
 * Instead, export a function that creates the instance on-demand.
 */
import type { EventBus as _EventBus } from '../src/core/EventBus'
import type { useSipClient as _useSipClient } from '../src'

// DISABLED: Commenting out to prevent module-level execution
// const sharedEventBus = new EventBus()
// export const playgroundSipClient = useSipClient(undefined, {
//   eventBus: sharedEventBus,
//   autoCleanup: false,
// })

// Export a placeholder to prevent import errors
export const playgroundSipClient = null as any
