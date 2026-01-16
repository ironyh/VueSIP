/**
 * Agent Composable - Wraps VueSip APIs for call center agent functionality
 *
 * This composable provides a simplified interface for call center agents.
 * In production, connect the AMI methods to your actual queue system.
 */
import { ref, shallowRef, computed, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import { useSipClient, useCallSession, createAmiClient, type AmiClient } from 'vuesip'

export type AgentState = 'logged-out' | 'available' | 'on-call' | 'paused' | 'wrap-up'

export interface AgentConfig {
  sipUri: string
  wsUri: string
  password: string
  displayName?: string
  amiWsUrl: string
  agentId: string
  queues: string[]
}

export interface UseAgentReturn {
  // Configuration
  configure: (config: AgentConfig) => Promise<void>
  isConfigured: Ref<boolean>
  agentId: Ref<string>

  // Connection
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  isConnected: ComputedRef<boolean>
  isRegistered: ComputedRef<boolean>
  sipError: Ref<Error | null>

  // Agent state
  agentState: Ref<AgentState>
  login: () => Promise<void>
  logout: () => Promise<void>
  pause: (reason?: string) => Promise<void>
  unpause: () => Promise<void>
  setWrapUp: () => void
  clearWrapUp: () => void
  pauseReason: Ref<string>

  // Call handling
  makeCall: (target: string) => Promise<void>
  answer: () => Promise<void>
  hangup: () => Promise<void>
  hold: () => Promise<void>
  unhold: () => Promise<void>
  transfer: (target: string) => Promise<void>
  sendDTMF: (digit: string) => Promise<void>

  // Call state
  callState: Ref<string>
  isOnCall: ComputedRef<boolean>
  isOnHold: Ref<boolean>
  isMuted: Ref<boolean>
  remoteUri: Ref<string>
  remoteDisplayName: Ref<string>
  duration: Ref<number>

  // Agent stats
  callsHandled: Ref<number>
  callsAbandoned: Ref<number>
  avgTalkTime: Ref<number>
  avgWaitTime: Ref<number>

  // AMI client access
  amiClient: ShallowRef<AmiClient | null>
}

export function useAgent(): UseAgentReturn {
  // Configuration state
  const isConfigured = ref(false)
  const agentId = ref('')
  const assignedQueues = ref<string[]>([])
  const amiClient = shallowRef<AmiClient | null>(null)

  // SIP Client
  const sipClient = useSipClient()
  const {
    connect: sipConnect,
    disconnect: sipDisconnect,
    isConnected,
    isRegistered,
    error: sipError,
    updateConfig,
    getClient,
  } = sipClient

  // Call Session
  const clientRef = computed(() => getClient())
  const callSession = useCallSession(clientRef)
  const {
    makeCall: sessionMakeCall,
    hangup: sessionHangup,
    answer: sessionAnswer,
    hold: sessionHold,
    unhold: sessionUnhold,
    sendDTMF: sessionSendDTMF,
    state: callState,
    isActive,
    isOnHold,
    isMuted,
    remoteUri: rawRemoteUri,
    remoteDisplayName: rawRemoteDisplayName,
    duration,
  } = callSession

  // Wrap nullable values
  const remoteUri = computed(() => rawRemoteUri.value || '')
  const remoteDisplayName = computed(() => rawRemoteDisplayName.value || '')

  // Agent state
  const agentState = ref<AgentState>('logged-out')
  const pauseReason = ref('')

  // Agent stats (local tracking - in production these would come from AMI)
  const callsHandled = ref(0)
  const callsAbandoned = ref(0)
  const avgTalkTime = ref(0)
  const avgWaitTime = ref(0)

  // Computed
  const isOnCall = computed(() => isActive.value)

  // Configuration
  async function configure(config: AgentConfig) {
    updateConfig({
      uri: config.wsUri,
      sipUri: config.sipUri,
      password: config.password,
      displayName: config.displayName || 'Call Center Agent',
    })

    agentId.value = config.agentId
    assignedQueues.value = config.queues

    // Create AMI client
    amiClient.value = createAmiClient({ url: config.amiWsUrl })

    isConfigured.value = true
  }

  // Connection
  async function connect() {
    if (!isConfigured.value) {
      throw new Error('Agent not configured. Call configure() first.')
    }

    // Connect SIP
    await sipConnect()

    // Connect AMI
    if (amiClient.value) {
      try {
        await amiClient.value.connect()
      } catch (err) {
        console.warn('AMI connection failed, continuing with SIP only:', err)
      }
    }
  }

  async function disconnect() {
    if (agentState.value !== 'logged-out') {
      await logout()
    }

    await sipDisconnect()

    if (amiClient.value) {
      try {
        amiClient.value.disconnect()
      } catch {
        // Ignore disconnect errors
      }
    }

    isConfigured.value = false
  }

  // Agent lifecycle - simplified implementation
  // In production, integrate with useAmiAgentLogin
  async function login() {
    // In production: use useAmiAgentLogin to actually login to queues
    agentState.value = 'available'
  }

  async function logout() {
    // In production: use useAmiAgentLogin to logout from queues
    agentState.value = 'logged-out'
  }

  async function pause(reason?: string) {
    // In production: use AMI to pause agent in queues
    agentState.value = 'paused'
    pauseReason.value = reason || 'Break'
  }

  async function unpause() {
    // In production: use AMI to unpause agent
    agentState.value = 'available'
    pauseReason.value = ''
  }

  function setWrapUp() {
    agentState.value = 'wrap-up'
  }

  function clearWrapUp() {
    agentState.value = 'available'
  }

  // Call handling
  async function makeCall(target: string) {
    await sessionMakeCall(target)
    agentState.value = 'on-call'
  }

  async function answer() {
    await sessionAnswer()
    agentState.value = 'on-call'
  }

  async function hangup() {
    await sessionHangup()
    callsHandled.value++
    setWrapUp()
  }

  async function hold() {
    await sessionHold()
  }

  async function unhold() {
    await sessionUnhold()
  }

  async function transfer(target: string) {
    // In production: use useCallTransfer for attended/blind transfer
    console.log('Transferring to:', target)
  }

  async function sendDTMF(digit: string) {
    await sessionSendDTMF(digit)
  }

  return {
    // Configuration
    configure,
    isConfigured,
    agentId,

    // Connection
    connect,
    disconnect,
    isConnected: computed(() => isConnected.value),
    isRegistered: computed(() => isRegistered.value),
    sipError,

    // Agent state
    agentState,
    login,
    logout,
    pause,
    unpause,
    setWrapUp,
    clearWrapUp,
    pauseReason,

    // Call handling
    makeCall,
    answer,
    hangup,
    hold,
    unhold,
    transfer,
    sendDTMF,

    // Call state
    callState,
    isOnCall,
    isOnHold,
    isMuted,
    remoteUri: ref(remoteUri.value),
    remoteDisplayName: ref(remoteDisplayName.value),
    duration,

    // Agent stats
    callsHandled,
    callsAbandoned,
    avgTalkTime,
    avgWaitTime,

    // AMI client access
    amiClient,
  }
}
