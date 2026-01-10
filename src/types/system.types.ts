/**
 * System Health Types
 *
 * Type definitions for Asterisk system health monitoring via AMI.
 *
 * @module types/system.types
 */

import type { BaseAmiOptions } from './common'

// ============================================================================
// Core Types
// ============================================================================

/**
 * Asterisk core system status
 */
export interface CoreStatus {
  /** Asterisk version string */
  asteriskVersion: string
  /** System uptime in seconds */
  uptime: number
  /** Number of times configuration was reloaded */
  reloadCount: number
  /** Last reload timestamp */
  lastReload: Date
  /** Current active call count */
  currentCalls: number
  /** Maximum concurrent calls seen */
  maxCalls: number
  /** System startup time */
  startupTime?: Date
  /** Current system time on server */
  systemTime?: Date
}

/**
 * Active channel information
 */
export interface CoreChannel {
  /** Unique channel identifier */
  channel: string
  /** Channel unique ID */
  uniqueId: string
  /** Current channel state (Up, Ring, Ringing, Down, etc.) */
  state: string
  /** Numeric channel state code */
  stateCode: number
  /** Application currently running */
  application: string
  /** Application data/arguments */
  data: string
  /** Caller ID number */
  callerIdNum: string
  /** Caller ID name */
  callerIdName: string
  /** Connected line number */
  connectedLineNum: string
  /** Connected line name */
  connectedLineName: string
  /** Call duration in seconds */
  duration: number
  /** Account code */
  accountCode?: string
  /** Bridge ID if in a bridge */
  bridgeId?: string
  /** Context */
  context?: string
  /** Extension */
  extension?: string
  /** Priority */
  priority?: number
}

/**
 * Asterisk module information
 */
export interface ModuleInfo {
  /** Module name (e.g., res_pjsip.so) */
  module: string
  /** Module description */
  description: string
  /** Load status */
  status: 'Running' | 'Stopped' | 'Not Running' | 'Failed'
  /** Reference count (number of things using this module) */
  useCount: number
  /** Support level */
  supportLevel?: 'core' | 'extended' | 'deprecated'
  /** Module version */
  version?: string
}

/**
 * Bridge information
 */
export interface BridgeInfo {
  /** Unique bridge identifier */
  bridgeId: string
  /** Bridge type (mixing, holding, etc.) */
  bridgeType: string
  /** Bridge technology */
  bridgeTechnology: string
  /** Number of channels in bridge */
  channelCount: number
  /** Bridge creation time */
  createdAt: Date
  /** Video mode */
  videoMode?: string
  /** Bridge name */
  name?: string
}

// ============================================================================
// Event Types
// ============================================================================

export interface AmiCoreShowChannelEvent {
  Event: 'CoreShowChannel'
  Channel: string
  Uniqueid: string
  State: string
  StateDesc?: string
  Application: string
  ApplicationData?: string
  CallerIDNum?: string
  CallerIDName?: string
  ConnectedLineNum?: string
  ConnectedLineName?: string
  Duration?: string
  Accountcode?: string
  BridgeId?: string
  Context?: string
  Extension?: string
  Priority?: string
}

export interface AmiCoreStatusEvent {
  Event: 'CoreStatus'
  CoreStartupDate?: string
  CoreStartupTime?: string
  CoreReloadDate?: string
  CoreReloadTime?: string
  CoreCurrentCalls?: string
  CoreMaxCalls?: string
}

export interface AmiModuleLoadEvent {
  Event: 'ModuleLoadReport'
  ModuleLoadStatus: string
  ModuleSelection: string
  ModuleCount?: string
}

export interface AmiBridgeListItemEvent {
  Event: 'BridgeListItem'
  BridgeUniqueid: string
  BridgeType: string
  BridgeTechnology: string
  BridgeNumChannels: string
  BridgeVideoSourceMode?: string
  BridgeCreator?: string
  BridgeName?: string
}

// ============================================================================
// Options Types
// ============================================================================

export interface UseAmiSystemOptions extends BaseAmiOptions {
  /** Polling interval for status updates in milliseconds */
  statusPollInterval?: number
  /** Enable automatic polling */
  enablePolling?: boolean
  /** Callback when core status is updated */
  onStatusUpdate?: (status: CoreStatus) => void
  /** Callback when channels change */
  onChannelsUpdate?: (channels: CoreChannel[]) => void
}

// ============================================================================
// Return Types
// ============================================================================

export interface UseAmiSystemReturn {
  // State
  /** Current core status */
  coreStatus: import('vue').Ref<CoreStatus | null>
  /** Active channels map by channel name */
  channels: import('vue').Ref<Map<string, CoreChannel>>
  /** Loaded modules map by module name */
  modules: import('vue').Ref<Map<string, ModuleInfo>>
  /** Active bridges map by bridge ID */
  bridges: import('vue').Ref<Map<string, BridgeInfo>>
  /** Loading state */
  isLoading: import('vue').Ref<boolean>
  /** Error message */
  error: import('vue').Ref<string | null>
  /** Last ping latency in ms */
  latency: import('vue').Ref<number | null>

  // Computed
  /** Channels as array */
  channelList: import('vue').ComputedRef<CoreChannel[]>
  /** Modules as array */
  moduleList: import('vue').ComputedRef<ModuleInfo[]>
  /** Bridges as array */
  bridgeList: import('vue').ComputedRef<BridgeInfo[]>
  /** Human-readable uptime string */
  formattedUptime: import('vue').ComputedRef<string>
  /** System health status */
  isHealthy: import('vue').ComputedRef<boolean>
  /** Total active channel count */
  totalChannels: import('vue').ComputedRef<number>
  /** Total active bridge count */
  totalBridges: import('vue').ComputedRef<number>

  // Actions
  /** Get core status */
  getCoreStatus: () => Promise<CoreStatus>
  /** List all active channels */
  getChannels: () => Promise<CoreChannel[]>
  /** List all loaded modules */
  getModules: () => Promise<ModuleInfo[]>
  /** List all active bridges */
  getBridges: () => Promise<BridgeInfo[]>
  /** Reload a module */
  reloadModule: (module: string) => Promise<boolean>
  /** Load a module */
  loadModule: (module: string) => Promise<boolean>
  /** Unload a module */
  unloadModule: (module: string) => Promise<boolean>
  /** Ping the AMI server and return latency */
  ping: () => Promise<number>
  /** Originate a call */
  originate: (options: OriginateOptions) => Promise<boolean>

  // Utilities
  /** Refresh all system data */
  refresh: () => Promise<void>
  /** Start status polling */
  startPolling: () => void
  /** Stop status polling */
  stopPolling: () => void
  /** Get channel by name */
  getChannel: (channelName: string) => CoreChannel | undefined
  /** Hangup a channel */
  hangupChannel: (channel: string) => Promise<boolean>
}

// ============================================================================
// Helper Types
// ============================================================================

export interface OriginateOptions {
  /** Channel to call (e.g., PJSIP/1001) */
  channel: string
  /** Context for the call */
  context: string
  /** Extension to dial */
  extension: string
  /** Priority */
  priority?: number
  /** Timeout in seconds */
  timeout?: number
  /** Caller ID */
  callerId?: string
  /** Application to run instead of context/extension */
  application?: string
  /** Application data */
  data?: string
  /** Account code */
  accountCode?: string
  /** Channel variables */
  variables?: Record<string, string>
  /** Async originate */
  async?: boolean
}
