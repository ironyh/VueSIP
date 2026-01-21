/**
 * Phone Composable - Wraps VueSip APIs for PWA softphone functionality
 */
import { ref, computed, watch } from 'vue'
import {
  useSipClient,
  useCallSession,
  useMediaDevices,
  useCallHistory,
  buildSipUri,
  extractSipDomain,
} from 'vuesip'

export interface PhoneConfig {
  providerId: '46elks' | 'telnyx' | 'custom'
  uri: string
  sipUri: string
  password: string
  displayName?: string
  providerMeta?: {
    apiUsername: string
    apiPassword: string
    callerIdNumber: string
    webrtcNumber: string
  }
}

export function usePhone() {
  // Connection state
  const isConfigured = ref(false)
  const currentConfig = ref<PhoneConfig | null>(null)
  const isSpeakerOn = ref(false)

  type OutboundBridgeStage = 'requesting' | 'ringing-webrtc' | 'bridging' | 'connected'
  const outboundBridge = ref<null | {
    providerId: '46elks'
    destinationNumber: string
    stage: OutboundBridgeStage
  }>(null)

  // 46elks REST-originate flow: after triggering the call via API, 46elks will place an
  // incoming call to our WebRTC client, which we should auto-answer.
  const autoAnswerIncomingUntil = ref(0)
  const shouldAutoAnswerIncoming = computed(() => Date.now() < autoAnswerIncomingUntil.value)

  const callStatusLine1 = computed(() => {
    if (outboundBridge.value) {
      return `Calling ${outboundBridge.value.destinationNumber}`
    }

    if (callState.value === 'calling') return 'Calling'
    if (callState.value === 'held') return 'On Hold'
    return ''
  })

  const callStatusLine2 = computed(() => {
    const bridge = outboundBridge.value
    if (!bridge) return ''

    if (bridge.stage === 'requesting') return '46elks: initiating bridge call'
    if (bridge.stage === 'ringing-webrtc') return '46elks: calling your WebRTC line'
    if (bridge.stage === 'bridging') return '46elks: connecting destination'
    if (bridge.stage === 'connected') return '46elks: connected'
    return ''
  })

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
    session,
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

  const calledLine = computed(() => {
    const s = session.value as any
    if (!s) return ''
    return (
      s.calledNumberDialed?.raw ||
      s.calledNumberTarget?.raw ||
      s.calledIdentity?.dialed?.raw ||
      s.calledIdentity?.target?.raw ||
      s.data?.calledNumberDialed?.raw ||
      s.data?.calledNumberTarget?.raw ||
      s.data?.calledIdentity?.dialed?.raw ||
      s.data?.calledIdentity?.target?.raw ||
      ''
    )
  })

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

  function createBasicAuthHeader(username: string, password: string): string {
    const encoded = btoa(`${username}:${password}`)
    return `Basic ${encoded}`
  }

  function normalizePhoneNumberFor46Elks(input: string): string {
    let userPart = input.trim()
    if (!userPart) return userPart

    // Convert 00-prefixed E.164 to +
    if (/^\d+$/.test(userPart) && userPart.startsWith('00')) {
      userPart = `+${userPart.slice(2)}`
    }

    // Accept Swedish local numbers (leading 0) and convert to +46...
    if (/^\d+$/.test(userPart) && userPart.startsWith('0')) {
      userPart = `+46${userPart.slice(1)}`
    }

    // If it is now a plain number without +, treat it as invalid for PSTN.
    if (!userPart.startsWith('+')) {
      throw new Error('Enter a phone number in E.164 format (e.g. +46701234567)')
    }

    return userPart
  }

  async function start46ElksOutboundCall(phoneNumber: string): Promise<void> {
    const meta = currentConfig.value?.providerMeta
    if (!meta) {
      throw new Error('46elks API credentials are required for outgoing calls')
    }

    // This follows 46elks documentation:
    // 1) Use the REST API to initiate a call to the WebRTC number
    // 2) When the WebRTC number answers, connect the PSTN destination
    const voiceStart = {
      connect: phoneNumber,
      callerid: meta.callerIdNumber,
    }

    const body = new URLSearchParams({
      from: meta.callerIdNumber,
      to: meta.webrtcNumber,
      voice_start: JSON.stringify(voiceStart),
    })

    const res = await fetch('/api/46elks/a1/calls', {
      method: 'POST',
      headers: {
        Authorization: createBasicAuthHeader(meta.apiUsername, meta.apiPassword),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(
        `46elks call setup failed (${res.status} ${res.statusText})${text ? `: ${text}` : ''}`
      )
    }

    outboundBridge.value = {
      providerId: '46elks',
      destinationNumber: phoneNumber,
      stage: 'ringing-webrtc',
    }

    // Auto-answer the incoming bridge call from 46elks.
    autoAnswerIncomingUntil.value = Date.now() + 30_000
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

    return buildSipUri(trimmed, domain)
  }

  async function call(target: string) {
    const domain = extractSipDomain(currentConfig.value?.sipUri ?? '')
    const is46Elks = currentConfig.value?.providerId === '46elks' || domain?.includes('46elks.com')

    // For 46elks, follow the documented flow: use the REST API to originate the call and
    // bridge the PSTN destination after the WebRTC client answers.
    if (is46Elks && !(target.trim().startsWith('sip:') || target.trim().startsWith('sips:'))) {
      const phoneNumber = normalizePhoneNumberFor46Elks(target)

      outboundBridge.value = {
        providerId: '46elks',
        destinationNumber: phoneNumber,
        stage: 'requesting',
      }

      await start46ElksOutboundCall(phoneNumber)
      return
    }

    await makeCall(normalizeCallTarget(target))
  }

  async function endCall() {
    await hangup()
  }

  async function answerCall() {
    // If we auto-answered a 46elks bridge call, clear the window.
    autoAnswerIncomingUntil.value = 0

    if (outboundBridge.value) {
      outboundBridge.value = { ...outboundBridge.value, stage: 'bridging' }
    }

    await answer()
  }

  watch(
    [callState, direction],
    ([state, dir]) => {
      if (!outboundBridge.value) return

      if (state === 'ringing' && dir === 'incoming') {
        outboundBridge.value = { ...outboundBridge.value, stage: 'ringing-webrtc' }
      } else if (state === 'active') {
        outboundBridge.value = { ...outboundBridge.value, stage: 'connected' }
      } else if (state === 'idle') {
        outboundBridge.value = null
      }
    },
    { flush: 'sync' }
  )

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
    shouldAutoAnswerIncoming,
    callStatusLine1,
    callStatusLine2,
    calledLine,

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
