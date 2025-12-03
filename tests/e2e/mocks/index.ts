/**
 * E2E Test Mocks - Main entry point
 *
 * Exports all mock implementations for easy importing in tests
 */

export {
  EventBridge,
  initializeEventBridge,
  getEventBridge,
  type SipState,
  type CallState,
  type SipEvent,
  type SipEventType,
} from './EventBridge'

export {
  MockSipWebSocket,
  MockRTCPeerConnection,
  installMocks,
  getMockWebSocket,
  type SipMessage,
} from './MockSipServer'
