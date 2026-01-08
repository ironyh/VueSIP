import type { ExampleDefinition } from './types'
import ConnectionRecoveryDemo from '../demos/ConnectionRecoveryDemo.vue'

export const connectionRecoveryExample: ExampleDefinition = {
  id: 'connection-recovery',
  icon: '🔄',
  title: 'Connection Recovery',
  description: 'ICE restart and connection recovery handling',
  category: 'sip',
  tags: ['Advanced', 'WebRTC', 'Reliability'],
  component: ConnectionRecoveryDemo,
  setupGuide:
    '<p>Monitor and recover WebRTC connections with automatic ICE restart handling. Essential for maintaining call reliability during network issues.</p>',
  codeSnippets: [
    {
      title: 'Basic Connection Recovery',
      description: 'Initialize connection recovery with a peer connection',
      code: `import { useConnectionRecovery } from 'vuesip'

const {
  state,        // Recovery state: 'stable' | 'monitoring' | 'recovering' | 'failed'
  iceHealth,    // ICE connection health status
  isRecovering, // Currently attempting recovery
  isHealthy,    // Connection is healthy
  attempts,     // Recovery attempt history
  error,        // Current error message
  networkInfo,  // Current network connection info
  recover,      // Manually trigger recovery
  reset,        // Reset recovery state
  monitor,      // Start monitoring peer connection
  stopMonitoring // Stop monitoring
} = useConnectionRecovery({
  autoRecover: true,       // Auto-recover on ICE failure
  maxAttempts: 3,          // Max recovery attempts
  attemptDelay: 2000,      // Delay between attempts (ms)
  iceRestartTimeout: 10000 // ICE restart timeout (ms)
})

// Start monitoring a peer connection
monitor(peerConnection)`,
    },
    {
      title: 'Recovery Callbacks',
      description: 'Handle recovery events with callbacks',
      code: `const { monitor, recover } = useConnectionRecovery({
  autoRecover: true,
  maxAttempts: 3,

  onRecoveryStart: () => {
    console.log('Recovery started')
    showNotification('Reconnecting...')
  },

  onRecoverySuccess: (attempt) => {
    console.log('Recovery successful', attempt)
    showNotification('Connection restored!')
    // attempt contains: { attempt, strategy, success, duration, timestamp }
  },

  onRecoveryFailed: (attempts) => {
    console.error('Recovery failed after all attempts', attempts)
    showNotification('Connection lost. Please try again.')
    // attempts is array of all attempted recoveries
  }
})`,
    },
    {
      title: 'Manual Recovery Trigger',
      description: 'Trigger recovery manually when needed',
      code: `const { recover, isRecovering, state, error } = useConnectionRecovery({
  autoRecover: false, // Disable auto-recovery
  maxAttempts: 3
})

// Manual recovery function
const handleConnectionIssue = async () => {
  if (isRecovering.value) {
    console.log('Recovery already in progress')
    return
  }

  console.log('Starting manual recovery...')
  const success = await recover()

  if (success) {
    console.log('Connection recovered!')
  } else {
    console.error('Recovery failed:', error.value)
    // Handle failure - maybe prompt user to rejoin
  }
}

// Check state before recovering
const attemptRecovery = async () => {
  if (state.value === 'stable') {
    console.log('Connection is stable, no recovery needed')
    return
  }

  await handleConnectionIssue()
}`,
    },
    {
      title: 'Integration with Call Session',
      description: 'Monitor peer connection from call session',
      code: `import { watch } from 'vue'
import { useCallSession, useConnectionRecovery } from 'vuesip'

const { session, state: callState } = useCallSession(sipClient)

const {
  monitor,
  stopMonitoring,
  state: recoveryState,
  isHealthy
} = useConnectionRecovery({
  autoRecover: true,
  maxAttempts: 3,
  onRecoveryFailed: () => {
    // End call if recovery fails
    session.value?.terminate()
  }
})

// Watch for active calls and monitor their connections
watch([callState, () => session.value?.connection], ([newState, pc]) => {
  if (newState === 'active' && pc) {
    // Start monitoring when call becomes active
    monitor(pc)
  } else if (newState === 'terminated' || newState === 'idle') {
    // Stop monitoring when call ends
    stopMonitoring()
  }
}, { immediate: true })

// Display connection health in UI
const connectionStatus = computed(() => {
  if (!isHealthy.value) {
    return recoveryState.value === 'recovering'
      ? 'Reconnecting...'
      : 'Connection issues'
  }
  return 'Connected'
})`,
    },
    {
      title: 'ICE Health Monitoring',
      description: 'Track ICE connection health details',
      code: `const { iceHealth, isHealthy, state } = useConnectionRecovery()

// ICE health object structure
interface IceHealthStatus {
  iceState: RTCIceConnectionState  // 'new' | 'checking' | 'connected' | 'completed' | 'disconnected' | 'failed' | 'closed'
  stateAge: number                  // Time in current state (ms)
  recoveryAttempts: number          // Total recovery attempts
  isHealthy: boolean                // Quick health check
}

// Example: Display health status
const healthDisplay = computed(() => {
  const health = iceHealth.value

  return {
    state: health.iceState,
    duration: formatDuration(health.stateAge),
    attempts: health.recoveryAttempts,
    status: health.isHealthy ? 'Healthy' : 'Unhealthy',
    icon: getHealthIcon(health.iceState)
  }
})

const getHealthIcon = (state: string) => {
  switch (state) {
    case 'connected':
    case 'completed':
      return '✅'
    case 'checking':
    case 'disconnected':
      return '⚠️'
    case 'failed':
    case 'closed':
      return '❌'
    default:
      return '⏳'
  }
}`,
    },
    {
      title: 'Recovery Attempt History',
      description: 'Track and display recovery attempts',
      code: `const { attempts, reset } = useConnectionRecovery()

// Each attempt contains:
interface RecoveryAttempt {
  attempt: number            // Attempt number (1, 2, 3...)
  strategy: RecoveryStrategy // 'ice-restart' | 'reconnect' | 'none'
  success: boolean          // Whether this attempt succeeded
  duration: number          // Time taken (ms)
  error?: string           // Error message if failed
  timestamp: number        // When attempt started
}

// Display attempt history
const attemptHistory = computed(() =>
  attempts.value.map(a => ({
    number: a.attempt,
    result: a.success ? 'Success' : 'Failed',
    duration: \`\${a.duration}ms\`,
    strategy: a.strategy,
    error: a.error || '-',
    time: new Date(a.timestamp).toLocaleTimeString()
  }))
)

// Clear history and reset state
const clearHistory = () => {
  reset()
  // state is now 'stable'
  // attempts is now []
  // error is now null
}`,
    },
    {
      title: 'TypeScript Types',
      description: 'Type definitions for connection recovery',
      code: `import type {
  RecoveryState,
  RecoveryStrategy,
  NetworkInfo,
  IceHealthStatus,
  RecoveryAttempt,
  ConnectionRecoveryOptions,
  UseConnectionRecoveryReturn
} from 'vuesip'

// Recovery state
type RecoveryState = 'stable' | 'monitoring' | 'recovering' | 'failed'

// Recovery strategy
type RecoveryStrategy = 'ice-restart' | 'reconnect' | 'none'

// Network information
interface NetworkInfo {
  type: string          // Connection type (wifi, cellular, ethernet, etc.)
  effectiveType: string // Effective type (4g, 3g, 2g, slow-2g)
  downlink: number      // Downlink speed in Mbps
  rtt: number           // Round-trip time in ms
  isOnline: boolean     // Whether browser is online
}

// Full options interface
interface ConnectionRecoveryOptions {
  autoRecover?: boolean                    // Default: true
  maxAttempts?: number                     // Default: 3
  attemptDelay?: number                    // Default: 2000ms
  iceRestartTimeout?: number               // Default: 10000ms
  strategy?: RecoveryStrategy              // Default: 'ice-restart'
  exponentialBackoff?: boolean             // Default: false
  maxBackoffDelay?: number                 // Default: 30000ms
  autoReconnectOnNetworkChange?: boolean   // Default: false
  networkChangeDelay?: number              // Default: 500ms

  // Callbacks
  onReconnect?: () => Promise<boolean>
  onRecoveryStart?: () => void
  onRecoverySuccess?: (attempt: RecoveryAttempt) => void
  onRecoveryFailed?: (attempts: RecoveryAttempt[]) => void
  onNetworkChange?: (info: NetworkInfo) => void
}

// Return type from composable
interface UseConnectionRecoveryReturn {
  state: ComputedRef<RecoveryState>
  iceHealth: ComputedRef<IceHealthStatus>
  attempts: ComputedRef<RecoveryAttempt[]>
  isRecovering: ComputedRef<boolean>
  isHealthy: ComputedRef<boolean>
  error: ComputedRef<string | null>
  networkInfo: ComputedRef<NetworkInfo>
  recover: () => Promise<boolean>
  reset: () => void
  monitor: (pc: RTCPeerConnection) => void
  stopMonitoring: () => void
}`,
    },
    {
      title: 'Exponential Backoff',
      description: 'Progressive retry delays for better reliability',
      code: `import { useConnectionRecovery } from 'vuesip'

const { recover, attempts } = useConnectionRecovery({
  maxAttempts: 5,
  attemptDelay: 1000,        // Base delay: 1 second
  exponentialBackoff: true,  // Enable exponential backoff
  maxBackoffDelay: 30000,    // Cap at 30 seconds

  onRecoveryStart: () => {
    console.log('Starting recovery with exponential backoff')
  },
  onRecoverySuccess: (attempt) => {
    console.log(\`Recovered on attempt \${attempt.attempt}\`)
  }
})

// Retry delays will be:
// Attempt 1: 1000ms  (1s)
// Attempt 2: 2000ms  (2s)  - 1000 * 2^1
// Attempt 3: 4000ms  (4s)  - 1000 * 2^2
// Attempt 4: 8000ms  (8s)  - 1000 * 2^3
// Attempt 5: 16000ms (16s) - 1000 * 2^4`,
    },
    {
      title: 'Custom Reconnect Strategy',
      description: 'Full reconnection control with custom handler',
      code: `import { useConnectionRecovery } from 'vuesip'

const { monitor, state } = useConnectionRecovery({
  strategy: 'reconnect',
  maxAttempts: 3,

  // Custom reconnect handler - must return Promise<boolean>
  onReconnect: async () => {
    try {
      // Your custom reconnection logic
      console.log('Performing custom reconnection...')
      await sipClient.disconnect()
      await sipClient.connect()
      return true // Return true on success
    } catch (error) {
      console.error('Reconnect failed:', error)
      return false // Return false on failure
    }
  },

  onRecoveryStart: () => {
    showNotification('Reconnecting...')
  },
  onRecoverySuccess: () => {
    showNotification('Connection restored!')
  },
  onRecoveryFailed: () => {
    showNotification('Unable to reconnect. Please try again.')
  }
})`,
    },
    {
      title: 'Network Change Detection',
      description: 'Monitor and respond to network changes',
      code: `import { watch } from 'vue'
import { useConnectionRecovery } from 'vuesip'

const { networkInfo, monitor } = useConnectionRecovery({
  autoReconnectOnNetworkChange: true,  // Auto-restart ICE on network change
  networkChangeDelay: 500,             // Wait 500ms before triggering

  onNetworkChange: (info) => {
    console.log('Network changed:', {
      type: info.type,              // 'wifi', 'cellular', 'ethernet'
      effectiveType: info.effectiveType, // '4g', '3g', '2g', 'slow-2g'
      downlink: info.downlink,      // Mbps
      rtt: info.rtt,                // Round-trip time in ms
      isOnline: info.isOnline
    })
  }
})

// React to network info changes
watch(networkInfo, (info) => {
  if (!info.isOnline) {
    showNotification('You are offline')
  } else if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
    showNotification('Poor network connection - call quality may be affected')
  } else if (info.type === 'cellular') {
    showNotification('Switched to mobile data')
  }
})`,
    },
  ],
}
