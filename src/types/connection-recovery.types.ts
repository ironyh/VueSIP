/**
 * Connection recovery type definitions
 * @packageDocumentation
 */

/**
 * Network information from Network Information API
 */
export interface NetworkInfo {
  /** Connection type (wifi, cellular, ethernet, etc.) */
  type: string
  /** Effective connection type (4g, 3g, 2g, slow-2g) */
  effectiveType: string
  /** Downlink speed in Mbps */
  downlink: number
  /** Round-trip time in ms */
  rtt: number
  /** Whether browser is online */
  isOnline: boolean
}

/**
 * Connection recovery state
 */
export type RecoveryState =
  | 'stable' // Connection is healthy
  | 'monitoring' // Detected issue, monitoring
  | 'recovering' // Actively attempting recovery
  | 'failed' // Recovery failed

/**
 * Recovery strategy to use
 */
export type RecoveryStrategy =
  | 'ice-restart' // Attempt ICE restart first
  | 'reconnect' // Full reconnection
  | 'none' // No automatic recovery

/**
 * ICE connection health status
 */
export interface IceHealthStatus {
  /** Current ICE connection state */
  iceState: RTCIceConnectionState
  /** Time since last state change (ms) */
  stateAge: number
  /** Number of recovery attempts */
  recoveryAttempts: number
  /** Whether connection is considered healthy */
  isHealthy: boolean
}

/**
 * Recovery attempt result
 */
export interface RecoveryAttempt {
  /** Attempt number */
  attempt: number
  /** Strategy used */
  strategy: RecoveryStrategy
  /** Whether attempt succeeded */
  success: boolean
  /** Duration of attempt (ms) */
  duration: number
  /** Error if failed */
  error?: string
  /** Timestamp */
  timestamp: number
}

/**
 * Connection recovery options
 */
export interface ConnectionRecoveryOptions {
  /** Enable automatic recovery (default: true) */
  autoRecover?: boolean
  /** Maximum recovery attempts before giving up (default: 3) */
  maxAttempts?: number
  /** Delay between attempts in ms (default: 2000) */
  attemptDelay?: number
  /** ICE restart timeout in ms (default: 10000) */
  iceRestartTimeout?: number
  /** Strategy to use (default: 'ice-restart') */
  strategy?: RecoveryStrategy
  /** Enable automatic reconnection on network changes (default: false) */
  autoReconnectOnNetworkChange?: boolean
  /** Delay before triggering recovery after network change in ms (default: 500) */
  networkChangeDelay?: number
  /** Callback when recovery starts */
  onRecoveryStart?: () => void
  /** Callback when recovery succeeds */
  onRecoverySuccess?: (attempt: RecoveryAttempt) => void
  /** Callback when recovery fails */
  onRecoveryFailed?: (attempts: RecoveryAttempt[]) => void
  /** Callback when network changes (type change or online/offline) */
  onNetworkChange?: (info: NetworkInfo) => void
}

/**
 * Connection recovery return type
 */
export interface UseConnectionRecoveryReturn {
  /** Current recovery state */
  state: import('vue').Ref<RecoveryState>
  /** Current ICE health status */
  iceHealth: import('vue').Ref<IceHealthStatus>
  /** History of recovery attempts */
  attempts: import('vue').Ref<RecoveryAttempt[]>
  /** Whether recovery is in progress */
  isRecovering: import('vue').ComputedRef<boolean>
  /** Whether connection is healthy */
  isHealthy: import('vue').ComputedRef<boolean>
  /** Last error message */
  error: import('vue').Ref<string | null>
  /** Current network information */
  networkInfo: import('vue').Ref<NetworkInfo>
  /** Manually trigger recovery */
  recover: () => Promise<boolean>
  /** Reset recovery state */
  reset: () => void
  /** Start monitoring a peer connection */
  monitor: (pc: RTCPeerConnection) => void
  /** Stop monitoring */
  stopMonitoring: () => void
}
