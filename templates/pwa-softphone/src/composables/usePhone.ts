/**
 * Phone Composable - Wraps VueSip APIs for PWA softphone functionality
 */
import { ref, computed, watch } from 'vue'
import {
  useSipClient,
  useMultiSipClient,
  useCallSession,
  useMediaDevices,
  useCallHistory,
  buildSipUri,
  extractSipDomain,
} from 'vuesip'

export interface PhoneConfig {
  providerId?: '46elks' | 'telnyx' | 'custom'
  uri?: string
  sipUri?: string
  password?: string
  displayName?: string
  providerMeta?: {
    apiUsername: string
    apiPassword: string
    callerIdNumber: string
    callerIdNumbers?: string[]
    callerIdNumberLabels?: Record<string, string>
    webrtcNumber: string
  }

  // Advanced multi-account mode
  mode?: 'multi'
  accounts?: Array<{
    id: string
    name: string
    uri: string
    sipUri: string
    password: string
    displayName?: string
    enabled: boolean
  }>
  outboundAccountId?: string | null
}

export function usePhone() {
  // Connection state
  const isConfigured = ref(false)
  const currentConfig = ref<PhoneConfig | null>(null)
  const connectionMode = ref<'single' | 'multi'>('single')
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

  // Outbound identity (46elks caller-id) selection
  const outboundCallerIds = ref<string[]>([])
  const selectedOutboundCallerId = ref<string>('')
  const OUTBOUND_NUMBER_KEY = 'vuesip_46elks_outbound_number'
  const ENABLED_NUMBERS_KEY = 'vuesip_46elks_enabled_numbers'
  const NUMBER_LABELS_KEY = 'vuesip_46elks_number_labels'
  const callerIdNumberLabels = ref<Record<string, string>>({})

  function setSelectedOutboundCallerId(next: string) {
    selectedOutboundCallerId.value = next
    try {
      localStorage.setItem(OUTBOUND_NUMBER_KEY, next)
    } catch {
      // ignore
    }
  }

  function cycleOutboundCallerId(direction: 'prev' | 'next') {
    const list = outboundCallerIds.value
    if (list.length <= 1) return

    const current = selectedOutboundCallerId.value
    const idx = list.indexOf(current)
    const start = idx >= 0 ? idx : 0
    const delta = direction === 'next' ? 1 : -1
    const nextIdx = (start + delta + list.length) % list.length
    setSelectedOutboundCallerId(list[nextIdx])
  }

  function cycleOutboundAccount(direction: 'prev' | 'next') {
    const list = (multiSipClient.accountList.value as any[]).map((a) => ({
      id: a.id as string,
      name: a.name as string,
    }))
    if (list.length <= 1) return

    const current = multiSipClient.outboundAccountId.value
    const idx = list.findIndex((a) => a.id === current)
    const start = idx >= 0 ? idx : 0
    const delta = direction === 'next' ? 1 : -1
    const nextIdx = (start + delta + list.length) % list.length
    multiSipClient.setOutboundAccount(list[nextIdx].id)
  }

  const is46Elks = computed(() => currentConfig.value?.providerId === '46elks')
  const canCycleOutbound = computed(() => {
    if (connectionMode.value === 'multi') {
      return (multiSipClient.accountList.value as any[]).length > 1
    }
    return is46Elks.value && outboundCallerIds.value.length > 1
  })

  const outboundLabel = computed(() => {
    if (connectionMode.value === 'multi') {
      const id = multiSipClient.outboundAccountId.value
      const account = (multiSipClient.accountList.value as any[]).find((a: any) => a.id === id)
      const name = account?.name || id
      return name ? `Account: ${name}` : ''
    }

    if (!is46Elks.value) return ''
    const num =
      selectedOutboundCallerId.value || currentConfig.value?.providerMeta?.callerIdNumber || ''
    if (!num) return ''
    const label = callerIdNumberLabels.value[num]
    return label ? `From: ${label} (${num})` : `From: ${num}`
  })

  function refresh46ElksOutboundPreferences(): void {
    if (currentConfig.value?.providerId !== '46elks') return

    const known = new Set<string>()

    // Seed from config
    const cfg = currentConfig.value.providerMeta
    if (cfg?.callerIdNumber) known.add(cfg.callerIdNumber)
    for (const n of cfg?.callerIdNumbers ?? []) known.add(n)

    // Seed from localStorage
    let enabledMap: Record<string, boolean> = {}
    let labelsMap: Record<string, string> = {}
    try {
      const raw = localStorage.getItem(ENABLED_NUMBERS_KEY)
      if (raw) enabledMap = JSON.parse(raw) as Record<string, boolean>
    } catch {
      // ignore
    }
    try {
      const raw = localStorage.getItem(NUMBER_LABELS_KEY)
      if (raw) labelsMap = JSON.parse(raw) as Record<string, string>
    } catch {
      // ignore
    }

    for (const n of Object.keys(enabledMap)) known.add(n)
    for (const n of Object.keys(labelsMap)) known.add(n)

    const all = Array.from(known)
    const enabled = all.filter((n) => enabledMap[n] !== false)

    outboundCallerIds.value = enabled

    // Keep labels trimmed
    const trimmed: Record<string, string> = {}
    for (const [num, label] of Object.entries(labelsMap)) {
      const v = String(label ?? '').trim()
      if (v) trimmed[num] = v
    }
    callerIdNumberLabels.value = trimmed

    // Ensure selection remains valid
    if (enabled.length > 0) {
      const current = selectedOutboundCallerId.value
      if (!current || !enabled.includes(current)) {
        setSelectedOutboundCallerId(enabled[0])
      }
    } else {
      selectedOutboundCallerId.value = ''
    }

    // Mirror into config for transparency
    if (currentConfig.value.providerMeta) {
      currentConfig.value.providerMeta.callerIdNumbers = enabled
      currentConfig.value.providerMeta.callerIdNumberLabels = trimmed
    }
  }

  function cycleOutbound(direction: 'prev' | 'next') {
    if (!canCycleOutbound.value) return
    if (connectionMode.value === 'multi') {
      cycleOutboundAccount(direction)
      return
    }
    if (is46Elks.value) {
      cycleOutboundCallerId(direction)
    }
  }

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

  // Multi-account support (advanced)
  const multiSipClient = useMultiSipClient()

  const multiIncomingAccountId = computed(
    () => multiSipClient.incomingCalls.value[0]?.accountId ?? null
  )

  const multiIncomingCallSession = computed(() => {
    const id = multiIncomingAccountId.value
    if (!id) return null
    return multiSipClient.accounts.value.get(id)?.callSession ?? null
  })

  const multiActiveCallSession = computed(
    () => multiSipClient.activeAccount.value?.callSession ?? null
  )

  const effectiveCallSession = computed(() => {
    if (connectionMode.value === 'single') return callSession
    return multiIncomingCallSession.value ?? multiActiveCallSession.value
  })

  const session = computed(() => effectiveCallSession.value?.session.value ?? null)
  const callState = computed(() => effectiveCallSession.value?.state.value ?? 'idle')
  const isActive = computed(() => effectiveCallSession.value?.isActive.value ?? false)
  const isOnHold = computed(() => effectiveCallSession.value?.isOnHold.value ?? false)
  const isMuted = computed(() => effectiveCallSession.value?.isMuted.value ?? false)
  const remoteUri = computed(() => effectiveCallSession.value?.remoteUri.value ?? null)
  const remoteDisplayName = computed(
    () => effectiveCallSession.value?.remoteDisplayName.value ?? null
  )
  const duration = computed(() => effectiveCallSession.value?.duration.value ?? 0)
  const direction = computed(() => effectiveCallSession.value?.direction.value ?? null)

  async function hold() {
    await effectiveCallSession.value?.hold?.()
  }

  async function unhold() {
    await effectiveCallSession.value?.unhold?.()
  }

  async function toggleHold() {
    await effectiveCallSession.value?.toggleHold?.()
  }

  function mute() {
    effectiveCallSession.value?.mute?.()
  }

  function unmute() {
    effectiveCallSession.value?.unmute?.()
  }

  function toggleMute() {
    effectiveCallSession.value?.toggleMute?.()
  }

  async function sendDTMF(tone: string) {
    await effectiveCallSession.value?.sendDTMF?.(tone)
  }

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

    // Setup 46elks outbound caller ID list for swipe switching
    if (config.providerId === '46elks' && config.providerMeta?.callerIdNumber) {
      callerIdNumberLabels.value = { ...(config.providerMeta.callerIdNumberLabels ?? {}) }

      outboundCallerIds.value =
        config.providerMeta.callerIdNumbers && config.providerMeta.callerIdNumbers.length > 0
          ? [...config.providerMeta.callerIdNumbers]
          : [config.providerMeta.callerIdNumber]

      const stored = (() => {
        try {
          return localStorage.getItem(OUTBOUND_NUMBER_KEY)
        } catch {
          return null
        }
      })()

      const initial =
        (stored && outboundCallerIds.value.includes(stored) && stored) ||
        (outboundCallerIds.value.includes(config.providerMeta.callerIdNumber) &&
          config.providerMeta.callerIdNumber) ||
        outboundCallerIds.value[0]

      setSelectedOutboundCallerId(initial)

      // Apply any edits made in settings since last login
      refresh46ElksOutboundPreferences()
    } else {
      outboundCallerIds.value = []
      selectedOutboundCallerId.value = ''
      callerIdNumberLabels.value = {}
    }

    if (config.mode === 'multi') {
      connectionMode.value = 'multi'
      outboundBridge.value = null
      autoAnswerIncomingUntil.value = 0

      const accounts = (config.accounts ?? []).filter((a) => a.enabled)
      if (accounts.length === 0) {
        throw new Error('Add at least one enabled SIP account')
      }

      // Clear any existing registered accounts
      for (const [id] of multiSipClient.accounts.value) {
        await multiSipClient.removeAccount(id)
      }

      for (const a of accounts) {
        await multiSipClient.addAccount({
          id: a.id,
          name: a.name,
          sip: {
            uri: a.uri,
            sipUri: a.sipUri,
            password: a.password,
            displayName: a.displayName || a.name,
            debug: debugEnabled,
            rtcConfiguration: {
              iceServers: [
                {
                  urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
                },
              ],
            },
          },
          outboundCapable: true,
        })
      }

      if (config.outboundAccountId && multiSipClient.accounts.value.has(config.outboundAccountId)) {
        multiSipClient.setOutboundAccount(config.outboundAccountId)
      }

      isConfigured.value = true
      return
    }

    connectionMode.value = 'single'
    if (!config.uri || !config.sipUri || !config.password) {
      throw new Error('Missing SIP configuration')
    }

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

    const callerIdNumber = selectedOutboundCallerId.value || meta.callerIdNumber

    // This follows 46elks documentation:
    // 1) Use the REST API to initiate a call to the WebRTC number
    // 2) When the WebRTC number answers, connect the PSTN destination
    const voiceStart = {
      connect: phoneNumber,
      callerid: callerIdNumber,
    }

    const body = new URLSearchParams({
      from: callerIdNumber,
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

    if (connectionMode.value === 'multi') {
      await multiSipClient.connectAll()
    } else {
      await connect()
    }
    await enumerateDevices()
  }

  async function disconnectPhone() {
    if (connectionMode.value === 'multi') {
      await multiSipClient.disconnectAll()
      for (const [id] of multiSipClient.accounts.value) {
        await multiSipClient.removeAccount(id)
      }
    } else {
      await disconnect()
    }
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

  async function makeCall(target: string) {
    if (connectionMode.value === 'multi') {
      await multiSipClient.makeCall(target)
      return
    }
    await callSession.makeCall(target)
  }

  async function hangup() {
    if (connectionMode.value === 'multi') {
      await multiSipClient.hangup()
      return
    }
    await callSession.hangup()
  }

  async function answer() {
    if (connectionMode.value === 'multi') {
      const incomingId = multiIncomingAccountId.value
      if (!incomingId) throw new Error('No incoming call to answer')
      await multiSipClient.answerCall(incomingId)
      return
    }
    await callSession.answer()
  }

  async function reject() {
    if (connectionMode.value === 'multi') {
      const incomingId = multiIncomingAccountId.value
      if (!incomingId) return
      await multiSipClient.rejectCall(incomingId)
      return
    }
    await callSession.reject()
  }

  async function call(target: string) {
    if (connectionMode.value === 'multi') {
      // useMultiSipClient will build proper SIP URIs per-account when needed.
      await makeCall(target.trim())
      return
    }

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

  const effectiveIsConnected = computed(() => {
    if (connectionMode.value === 'multi') {
      return multiSipClient.stats.value.connectedAccounts > 0
    }
    return isConnected.value
  })

  const effectiveIsRegistered = computed(() => {
    if (connectionMode.value === 'multi') {
      return multiSipClient.stats.value.registeredAccounts > 0
    }
    return isRegistered.value
  })

  const effectiveIsConnecting = computed(() => {
    if (connectionMode.value === 'multi') {
      return (multiSipClient.accountList.value as any[]).some((a: any) => a.isConnecting)
    }
    return isConnecting.value
  })

  const effectiveSipError = computed(() => {
    if (connectionMode.value === 'multi') {
      const first = (multiSipClient.accountList.value as any[]).find((a: any) => a.error)
      return first?.error ? new Error(first.error) : null
    }
    return sipError.value
  })

  const accounts = computed(() => multiSipClient.accountList.value)
  const outboundAccountId = computed(() => multiSipClient.outboundAccountId.value)
  function setOutboundAccount(id: string) {
    multiSipClient.setOutboundAccount(id)
  }

  return {
    // Configuration
    configure,
    isConfigured,
    currentConfig,

    // Connection
    connectPhone,
    disconnectPhone,
    isConnected: effectiveIsConnected,
    isRegistered: effectiveIsRegistered,
    isConnecting: effectiveIsConnecting,
    sipError: effectiveSipError,

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

    // Multi-account
    accounts,
    outboundAccountId,
    setOutboundAccount,

    // Outbound identity
    canCycleOutbound,
    outboundLabel,
    cycleOutbound,
    refresh46ElksOutboundPreferences,

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
