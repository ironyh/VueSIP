import type { ExampleDefinition } from './types'
import BasicCallDemo from '../demos/BasicCallDemo.vue'

export const basicCallExample: ExampleDefinition = {
  id: 'basic-call',
  icon: '📞',
  title: 'Basic Audio Call',
  description: 'Simple one-to-one audio calling',
  category: 'sip',
  tags: ['Beginner', 'Audio', 'Core'],
  component: BasicCallDemo,
  setupGuide: '<p>This example demonstrates basic SIP calling functionality. Configure your SIP server details in the connection panel to get started.</p>',
  codeSnippets: [
    {
      title: 'Basic Call Setup',
      description: 'Initialize SIP client and make a call',
      code: `import { useSipClient, useCallSession } from 'vuesip'

const { connect, isConnected } = useSipClient()
const { makeCall, hangup, callState } = useCallSession()

// Connect to SIP server
await connect()

// Make a call
await makeCall('sip:user@example.com')

// End the call
await hangup()`,
    },
    {
      title: 'Handling Incoming Calls',
      description: 'Answer or reject incoming calls',
      code: `const { answer, reject, callState, remoteUri } = useCallSession()

// Watch for incoming calls
watch(callState, (state) => {
  if (state === 'incoming') {
    console.log('Incoming call from:', remoteUri.value)
  }
})

// Answer the call
await answer({ audio: true, video: false })

// Or reject it
await reject(486) // Busy Here`,
    },
    {
      title: 'SIP Configuration Options',
      description: 'Configure SIP client with all available options',
      code: `import { useSipClient } from 'vuesip'

const sipClient = useSipClient({
  // Server configuration
  server: 'wss://sip.example.com:7443/ws',
  realm: 'example.com',

  // Authentication
  username: 'alice',
  password: 'secret123',

  // Registration
  register: true,
  registerExpires: 600, // 10 minutes

  // Session timers
  sessionTimersExpires: 120,

  // Media options
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:turn.example.com', username: 'user', credential: 'pass' }
  ],

  // Event callbacks
  onRegistered: () => console.log('Registered successfully'),
  onUnregistered: () => console.log('Unregistered'),
  onRegistrationFailed: (error) => console.error('Registration failed:', error),
})`,
    },
    {
      title: 'Call State Management',
      description: 'Track and react to call state changes',
      code: `import { useCallSession } from 'vuesip'
import { watch, computed } from 'vue'

const { callState, isOnHold, isMuted, duration, remoteUri } = useCallSession()

// All possible call states
type CallState =
  | 'idle'        // No active call
  | 'connecting'  // Outgoing call in progress
  | 'incoming'    // Incoming call ringing
  | 'ringing'     // Remote party ringing
  | 'answered'    // Call connected
  | 'on-hold'     // Call on hold
  | 'ended'       // Call terminated

// Reactive state tracking
const isActive = computed(() =>
  ['connecting', 'ringing', 'answered', 'on-hold'].includes(callState.value)
)

// Watch for state transitions
watch(callState, (newState, oldState) => {
  console.log(\`Call state: \${oldState} → \${newState}\`)

  switch (newState) {
    case 'answered':
      console.log('Call connected to:', remoteUri.value)
      break
    case 'ended':
      console.log('Call ended after', duration.value, 'seconds')
      break
  }
})`,
    },
    {
      title: 'Hold and Mute Controls',
      description: 'Control call audio and hold state',
      code: `const {
  hold,
  unhold,
  mute,
  unmute,
  isOnHold,
  isMuted
} = useCallSession()

// Toggle hold
const toggleHold = async () => {
  if (isOnHold.value) {
    await unhold()
  } else {
    await hold()
  }
}

// Toggle mute
const toggleMute = async () => {
  if (isMuted.value) {
    await unmute()
  } else {
    await mute()
  }
}

// Mute with specific options
await mute({ audio: true, video: false })`,
    },
    {
      title: 'Error Handling',
      description: 'Handle connection and call errors gracefully',
      code: `import { useSipClient, useCallSession } from 'vuesip'

const { connect, disconnect, error: connectionError } = useSipClient()
const { makeCall, error: callError } = useCallSession()

// Watch for errors
watch(connectionError, (err) => {
  if (err) {
    console.error('Connection error:', err.message)
    // Attempt reconnection
    setTimeout(() => connect(), 5000)
  }
})

// Handle call errors
const safeCall = async (uri: string) => {
  try {
    await makeCall(uri)
  } catch (error) {
    if (error.code === 'ENOTREGISTERED') {
      console.log('Not registered, reconnecting...')
      await connect()
      await makeCall(uri)
    } else if (error.code === 'EBUSY') {
      console.log('User is busy')
    } else if (error.code === 'ENOANSWER') {
      console.log('No answer')
    } else {
      console.error('Call failed:', error)
    }
  }
}`,
    },
    {
      title: 'Credential Persistence',
      description: 'Remember user credentials across sessions',
      code: `import { ref, onMounted } from 'vue'

const credentials = ref({
  server: '',
  username: '',
  password: '',
  rememberMe: false,
})

// Load saved credentials on mount
onMounted(() => {
  const saved = localStorage.getItem('sip-credentials')
  if (saved) {
    const parsed = JSON.parse(saved)
    credentials.value = {
      ...parsed,
      // Only restore password if "remember me" was checked
      password: parsed.rememberMe ? parsed.password : '',
    }
  }
})

// Save credentials when connecting
const saveCredentials = () => {
  if (credentials.value.rememberMe) {
    localStorage.setItem('sip-credentials', JSON.stringify(credentials.value))
  } else {
    // Save everything except password
    const { password, ...rest } = credentials.value
    localStorage.setItem('sip-credentials', JSON.stringify(rest))
  }
}`,
    },
  ],
}
