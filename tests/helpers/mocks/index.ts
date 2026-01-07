/**
 * Mock factories for unit testing
 *
 * Centralized mock infrastructure for consistent test setup.
 */

// JsSIP UA mocks
export {
  createMockJsSipUA,
  createHoistedMockJsSipUA,
  type MockUA,
  type MockRTCSession,
  type MockJsSipUAResult,
  type EventHandler,
} from './MockJsSipUA'
