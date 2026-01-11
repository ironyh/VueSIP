/**
 * Call Center Provider System
 *
 * Provider-agnostic call center functionality with platform adapters.
 *
 * @module providers/call-center
 */

// Types
export type {
  CallCenterProvider,
  CallCenterCapabilities,
  CallCenterProviderConfig,
  AgentState,
  AgentStatus,
  AgentMetrics,
  AgentLoginOptions,
  AgentLogoutOptions,
  AgentPauseOptions,
  QueueInfo,
  CurrentCallInfo,
  BreakType,
  StateChangeCallback,
  QueueEventCallback,
  QueueEventType,
  Unsubscribe,
} from './types'

// Adapters
export { createAsteriskAdapter } from './adapters'
// Future: export { createFreeSwitchAdapter } from './adapters'
// Future: export { createCloudAdapter } from './adapters'
