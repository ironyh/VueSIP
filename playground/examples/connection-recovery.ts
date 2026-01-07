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
  IceHealthStatus,
  RecoveryAttempt,
  ConnectionRecoveryOptions,
  UseConnectionRecoveryReturn
} from 'vuesip'

// Recovery state
type RecoveryState = 'stable' | 'monitoring' | 'recovering' | 'failed'

// Recovery strategy
type RecoveryStrategy = 'ice-restart' | 'reconnect' | 'none'

// Full options interface
interface ConnectionRecoveryOptions {
  autoRecover?: boolean       // Default: true
  maxAttempts?: number        // Default: 3
  attemptDelay?: number       // Default: 2000ms
  iceRestartTimeout?: number  // Default: 10000ms
  strategy?: RecoveryStrategy // Default: 'ice-restart'

  // Callbacks
  onRecoveryStart?: () => void
  onRecoverySuccess?: (attempt: RecoveryAttempt) => void
  onRecoveryFailed?: (attempts: RecoveryAttempt[]) => void
}

// Return type from composable
interface UseConnectionRecoveryReturn {
  state: ComputedRef<RecoveryState>
  iceHealth: ComputedRef<IceHealthStatus>
  attempts: ComputedRef<RecoveryAttempt[]>
  isRecovering: ComputedRef<boolean>
  isHealthy: ComputedRef<boolean>
  error: ComputedRef<string | null>
  recover: () => Promise<boolean>
  reset: () => void
  monitor: (pc: RTCPeerConnection) => void
  stopMonitoring: () => void
}`,
    },
  ],
}
