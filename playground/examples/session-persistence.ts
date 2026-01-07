import type { ExampleDefinition } from './types'
import SessionPersistenceDemo from '../demos/SessionPersistenceDemo.vue'

export const sessionPersistenceExample: ExampleDefinition = {
  id: 'session-persistence',
  icon: '💾',
  title: 'Session Persistence',
  description: 'Save and restore call session state across page refreshes',
  category: 'sip',
  tags: ['Advanced', 'WebRTC', 'Reliability', 'Storage'],
  component: SessionPersistenceDemo,
  setupGuide:
    '<p>Persist call session state to IndexedDB for recovery after page refresh or network reconnection. Essential for maintaining call continuity during browser navigation events.</p>',
  codeSnippets: [
    {
      title: 'Basic Session Persistence',
      description: 'Initialize session persistence with default options',
      code: `import { useSessionPersistence } from 'vuesip'

const {
  saveSession,       // Save current session state
  loadSession,       // Load saved session state
  clearSession,      // Clear saved session
  hasSavedSession,   // Whether a session is saved
  isLoading,         // Loading state
  error,             // Current error
  savedSessionInfo   // Info about saved session
} = useSessionPersistence({
  maxAge: 300000,           // Session expires after 5 minutes (default)
  autoClearOnRestore: true  // Clear after loading (default)
})

// Check for saved session on page load
const savedSession = await loadSession()
if (savedSession) {
  console.log('Found saved session:', savedSession.callId)
  // Attempt to reconnect to the call
}`,
    },
    {
      title: 'Save Session State',
      description: 'Save call session state during an active call',
      code: `import { useSessionPersistence, useCallSession } from 'vuesip'

const { session, state } = useCallSession(sipClient)
const { saveSession, hasSavedSession } = useSessionPersistence()

// Save session when call becomes active
watch(state, async (newState) => {
  if (newState === 'active' && session.value) {
    await saveSession({
      callId: session.value.id,
      remoteUri: session.value.remote_identity.uri.toString(),
      remoteName: session.value.remote_identity.display_name,
      direction: session.value.direction,
      startTime: Date.now(),
      mediaOptions: {
        audio: true,
        video: session.value.sessionDescriptionHandler?.hasVideo ?? false
      }
    })
    console.log('Session saved')
  }
})

// Clear when call ends
watch(state, async (newState) => {
  if (newState === 'terminated' && hasSavedSession.value) {
    await clearSession()
  }
})`,
    },
    {
      title: 'Session Recovery on Page Load',
      description: 'Restore session state after page refresh',
      code: `import { useSessionPersistence } from 'vuesip'

const { loadSession, savedSessionInfo, error } = useSessionPersistence({
  maxAge: 300000, // 5 minutes
  autoClearOnRestore: false // Keep session for retry
})

// On component mount
onMounted(async () => {
  const savedSession = await loadSession()

  if (!savedSession) {
    console.log('No saved session found')
    return
  }

  // Check if session is still valid
  const sessionAge = Date.now() - savedSession.startTime
  console.log(\`Found session from \${sessionAge / 1000}s ago\`)

  // Prompt user to reconnect
  const shouldReconnect = await showReconnectDialog({
    remoteName: savedSession.remoteName,
    remoteUri: savedSession.remoteUri,
    direction: savedSession.direction
  })

  if (shouldReconnect) {
    // Attempt to reconnect
    await reconnectCall(savedSession)
  }

  // Clear the saved session
  await clearSession()
})`,
    },
    {
      title: 'Custom Storage Configuration',
      description: 'Configure IndexedDB storage options',
      code: `import { useSessionPersistence } from 'vuesip'

// Custom database and store names
const { saveSession, loadSession } = useSessionPersistence({
  dbName: 'my_app_sessions',    // Custom database name
  storeName: 'call_sessions',   // Custom object store name
  maxAge: 600000,               // 10 minutes expiry
  autoClearOnRestore: false     // Keep session after loading
})

// Save with custom metadata
await saveSession({
  callId: 'call-123',
  remoteUri: 'sip:user@domain.com',
  remoteName: 'John Doe',
  direction: 'outbound',
  startTime: Date.now(),
  mediaOptions: {
    audio: true,
    video: true
  },
  metadata: {
    department: 'Sales',
    ticketId: 'TICKET-456',
    customField: 'any additional data'
  }
})`,
    },
    {
      title: 'Session Expiry Handling',
      description: 'Handle expired sessions gracefully',
      code: `import { useSessionPersistence } from 'vuesip'

const {
  loadSession,
  savedSessionInfo,
  error
} = useSessionPersistence({
  maxAge: 60000 // 1 minute expiry for testing
})

// Load session - expired sessions return null automatically
const session = await loadSession()

if (!session) {
  // Could be no session or expired session
  if (error.value) {
    console.error('Error loading session:', error.value.message)
  } else {
    console.log('No valid session found (may have expired)')
  }
}

// Check session age manually
if (session && savedSessionInfo.value) {
  const age = Date.now() - savedSessionInfo.value.savedAt
  const maxAge = 300000 // 5 minutes

  if (age > maxAge * 0.8) {
    console.warn('Session will expire soon!')
  }
}`,
    },
    {
      title: 'Integration with Connection Recovery',
      description: 'Combine session persistence with connection recovery',
      code: `import {
  useSessionPersistence,
  useConnectionRecovery,
  useCallSession
} from 'vuesip'

const { session, state: callState } = useCallSession(sipClient)
const { saveSession, loadSession, clearSession } = useSessionPersistence()
const {
  monitor,
  stopMonitoring,
  state: recoveryState,
  isHealthy,
  onRecoveryFailed
} = useConnectionRecovery({
  autoRecover: true,
  maxAttempts: 3
})

// Save session before page unload
window.addEventListener('beforeunload', async () => {
  if (callState.value === 'active' && session.value) {
    await saveSession({
      callId: session.value.id,
      remoteUri: session.value.remote_identity.uri.toString(),
      remoteName: session.value.remote_identity.display_name,
      direction: session.value.direction,
      startTime: Date.now()
    })
  }
})

// On page load, check for saved session
onMounted(async () => {
  const saved = await loadSession()
  if (saved) {
    // Attempt to reconnect using saved info
    await attemptReconnect(saved)
  }
})

// Monitor connection health during calls
watch(callState, (newState) => {
  if (newState === 'active' && session.value?.connection) {
    monitor(session.value.connection)
  } else if (newState === 'terminated') {
    stopMonitoring()
    clearSession()
  }
})`,
    },
    {
      title: 'TypeScript Types',
      description: 'Type definitions for session persistence',
      code: `import type {
  PersistedSessionState,
  SessionPersistenceOptions,
  SavedSessionInfo,
  UseSessionPersistenceReturn
} from 'vuesip'

// Session state to persist
interface PersistedSessionState {
  sessionId: string           // Unique session identifier
  remoteUri: string           // Remote party SIP URI
  callDirection: 'inbound' | 'outbound'
  holdState: boolean          // Whether call is on hold
  muteState: {
    audio: boolean            // Whether audio is muted
    video: boolean            // Whether video is muted
  }
  timestamp: number           // When session was saved
  customData?: Record<string, unknown>  // Custom app data
}

// Configuration options
interface SessionPersistenceOptions {
  storageKey?: string          // Default: 'vuesip_session'
  maxAge?: number              // Default: 300000 (5 min)
  autoRestore?: boolean        // Default: false
  onRestoreSuccess?: (state: PersistedSessionState) => void
  onRestoreError?: (error: Error) => void
}

// Info about saved session
interface SavedSessionInfo {
  exists: boolean
  sessionId?: string
  timestamp?: number
  age?: number                // Age in milliseconds
}

// Composable return type
interface UseSessionPersistenceReturn {
  saveSession: (state: PersistedSessionState) => Promise<void>
  loadSession: () => Promise<PersistedSessionState | null>
  clearSession: () => Promise<void>
  hasSavedSession: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  savedSessionInfo: ComputedRef<SavedSessionInfo | null>
}`,
    },
  ],
}
