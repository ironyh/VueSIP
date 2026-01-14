/**
 * Phone Composable - Wraps VueSip APIs for softphone functionality
 */
import { ref, computed } from 'vue'
import {
  useSipClient,
  useCallSession,
  useMediaDevices,
  useCallHistory,
  buildSipUri,
  extractSipDomain,
  MediaManager,
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

  // SIP Client - must be initialized first to get eventBus
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
    getEventBus,
  } = sipClient

  // Media Manager - shared between call session and media devices
  // Use the same eventBus as the SIP client for consistent event handling
  const mediaManager = ref<MediaManager | null>(new MediaManager({ eventBus: getEventBus() }))

  // Get client ref for call session
  const clientRef = computed(() => getClient())

  // Call Session - pass mediaManager to acquire media before calls
  const callSession = useCallSession(clientRef, mediaManager)
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
    localStream,
    remoteStream,
  } = callSession

  // Media Devices - share the same mediaManager for consistent media handling
  const mediaDevices = useMediaDevices(mediaManager)
  const {
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    enumerateDevices,
    selectAudioInput,
    selectAudioOutput,
    requestPermissions,
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
    // Request microphone permission to get real device names
    // (browsers hide device labels until permission is granted)
    await requestPermissions(true, false)
  }

  async function disconnectPhone() {
    await disconnect()
    isConfigured.value = false
    currentConfig.value = null
  }

  async function call(target: string) {
    // Extract domain from current config to build proper SIP URI
    const sipUri = currentConfig.value?.sipUri
    if (!sipUri) {
      throw new Error('Cannot make call: Phone not configured. Call configure() first.')
    }

    const domain = extractSipDomain(sipUri)
    if (!domain) {
      throw new Error(
        `Cannot make call: Invalid SIP URI configuration. Expected sip:user@domain, got: ${sipUri}`
      )
    }

    // Build SIP URI from target (handles phone numbers, usernames, or existing SIP URIs)
    const sipTarget = buildSipUri(target, domain)
    await makeCall(sipTarget)
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

    // Media streams (for recording)
    localStream,
    remoteStream,
  }
}
