/**
 * Phone Composable - Wraps VueSip APIs for softphone functionality
 */
import { ref, computed } from 'vue'
import {
  useSipClient,
  useCallSession,
  useMediaDevices,
  useCallHistory,
} from 'vuesip'

export interface PhoneConfig {
  uri: string
  sipUri: string
  password: string
  displayName?: string
}

export function usePhone() {
  // Connection state
  const isConfigured = ref(false)
  const currentConfig = ref<PhoneConfig | null>(null)

  // SIP Client
  const sipClient = useSipClient()
  const {
    connect,
    disconnect,
    isConnected,
    isRegistered,
    isConnecting,
    error: sipError,
    updateConfig,
    getClient,
  } = sipClient

  // Get client ref for call session
  const clientRef = computed(() => getClient())

  // Call Session
  const callSession = useCallSession(clientRef)
  const {
    makeCall,
    hangup,
    answer,
    reject,
    hold,
    unhold,
    mute,
    unmute,
    toggleHold,
    toggleMute,
    sendDTMF,
    state: callState,
    isActive,
    isOnHold,
    isMuted,
    remoteUri,
    remoteDisplayName,
    duration,
    direction,
  } = callSession

  // Media Devices
  const mediaDevices = useMediaDevices()
  const {
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    enumerateDevices,
    selectAudioInput,
    selectAudioOutput,
  } = mediaDevices

  // Call History - history is automatically updated by the call store
  const callHistory = useCallHistory()
  const { history, clearHistory, getRecentCalls } = callHistory

  // Phone methods
  async function configure(config: PhoneConfig) {
    currentConfig.value = config
    updateConfig({
      uri: config.uri,
      sipUri: config.sipUri,
      password: config.password,
      displayName: config.displayName || 'VueSip User',
    })
    isConfigured.value = true
  }

  async function connectPhone() {
    if (!isConfigured.value) {
      throw new Error('Phone not configured. Call configure() first.')
    }
    await connect()
    await enumerateDevices()
  }

  async function disconnectPhone() {
    await disconnect()
    isConfigured.value = false
    currentConfig.value = null
  }

  async function call(target: string) {
    await makeCall(target)
  }

  async function endCall() {
    await hangup()
  }

  async function answerCall() {
    await answer()
  }

  async function rejectCall() {
    await reject()
  }

  // Get recent calls for display
  const historyEntries = computed(() => getRecentCalls(50))

  return {
    // Configuration
    configure,
    isConfigured,
    currentConfig,

    // Connection
    connectPhone,
    disconnectPhone,
    isConnected,
    isRegistered,
    isConnecting,
    sipError,

    // Call controls
    call,
    endCall,
    answerCall,
    rejectCall,
    hold,
    unhold,
    toggleHold,
    mute,
    unmute,
    toggleMute,
    sendDTMF,

    // Call state
    callState,
    isActive,
    isOnHold,
    isMuted,
    remoteUri,
    remoteDisplayName,
    duration,
    direction,

    // Media devices
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectAudioInput,
    selectAudioOutput,

    // Call history
    historyEntries,
    history,
    clearHistory,
  }
}
