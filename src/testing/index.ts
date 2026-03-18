/**
 * Testing utilities
 *
 * @module testing
 */

export { waitForCondition, waitForResult, waitForDefined, type WaitForOptions } from './waitFor'
export {
  isE2EMode,
  getE2EEmit,
  getEventBridge,
  setListenersReady,
  type E2EEmitFn,
} from './e2eHarness'
