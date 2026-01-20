/**
 * Phone Composable - Wraps VueSip APIs for PWA softphone functionality
 */
import { ref, computed } from 'vue'
import {
  useSipClient,
  useCallSession,
  useMediaDevices,
  useCallHistory,
  buildSipUri,
  extractSipDomain,
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
  const isSpeakerOn = ref(false)

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
    const debugEnabled = (() => {
      try {
        const params = new URLSearchParams(window.location.search)
        return params.get('debug') === '1'
      } catch {
        return false
      }
    })()

    currentConfig.value = config
    updateConfig({
      uri: config.uri,
      sipUri: config.sipUri,
      password: config.password,
      displayName: config.displayName || 'VueSIP User',
      debug: debugEnabled,

      // Without a STUN/TURN server, browsers typically only gather host candidates
      // (private LAN IPs), which makes WebRTC media fail for most users on the public
      // internet. The 46elks WebRTC demo uses STUN; mirror that here.
      rtcConfiguration: {
        iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
      },
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

  function normalizeCallTarget(target: string): string {
    const trimmed = target.trim()
    if (!trimmed) return trimmed

    // If already a SIP URI, just use it.
    if (trimmed.startsWith('sip:') || trimmed.startsWith('sips:')) {
      return trimmed
    }

    const domain = extractSipDomain(currentConfig.value?.sipUri ?? '')
    if (!domain) {
      // Let the underlying validator throw a clearer error if we can't infer the domain.
      return trimmed
    }

    let userPart = trimmed

    // Provider-friendly normalization:
    // - Convert 00-prefixed E.164 to +
    // - For 46elks destinations, accept Swedish local numbers (leading 0) and convert to +46...
    if (/^\d+$/.test(userPart)) {
      if (userPart.startsWith('00')) {
        userPart = `+${userPart.slice(2)}`
      } else if (domain.includes('46elks.com') && userPart.startsWith('0')) {
        userPart = `+46${userPart.slice(1)}`
      }
    }

    return buildSipUri(userPart, domain)
  }

  async function call(target: string) {
    await makeCall(normalizeCallTarget(target))
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

  // Speaker toggle (for mobile devices)
  function toggleSpeaker() {
    isSpeakerOn.value = !isSpeakerOn.value
    // In a real implementation, this would switch audio output
    // to the device's speaker vs earpiece
    // This could be done with audio routing APIs or by selecting
    // different output devices
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
    toggleSpeaker,
    isSpeakerOn,

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
