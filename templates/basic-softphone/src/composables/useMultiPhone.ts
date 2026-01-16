/**
 * Multi-Phone Composable - Manages multiple SIP registrations
 *
 * Supports:
 * - Multiple simultaneous SIP connections
 * - Unified incoming call handling across all phones
 * - Designated outbound phone (WebRTC capable)
 */
import { ref, computed, shallowRef, type Ref, type ComputedRef } from 'vue'
import {
  useSipClient,
  useCallSession,
  useMediaDevices,
  useCallHistory,
  buildSipUri,
  extractSipDomain,
  MediaManager,
  EventBus,
  CallDirection,
  type UseSipClientReturn,
  type UseCallSessionReturn,
} from 'vuesip'

export interface PhoneConfig {
  id: string
  name: string
  uri: string
  sipUri: string
  password: string
  displayName?: string
  /** Whether this phone can make outbound WebRTC calls */
  webrtcCapable?: boolean
}

export interface PhoneInstance {
  id: string
  name: string
  config: PhoneConfig
  sipClient: UseSipClientReturn
  callSession: UseCallSessionReturn
  isConnected: ComputedRef<boolean>
  isRegistered: ComputedRef<boolean>
  isConnecting: ComputedRef<boolean>
  error: Ref<Error | null>
}

export function useMultiPhone() {
  // All registered phones
  const phones = shallowRef<Map<string, PhoneInstance>>(new Map())

  // ID of the phone designated for outbound calls
  const outboundPhoneId = ref<string | null>(null)

  // Shared MediaManager for all phones (for audio device consistency)
  const sharedEventBus = ref<EventBus | null>(null)
  const sharedMediaManager = ref<MediaManager | null>(null)

  // Currently active call (across all phones)
  const activeCallPhoneId = ref<string | null>(null)

  // Call history (shared across all phones)
  const callHistory = useCallHistory()
  const { history, clearHistory, getRecentCalls } = callHistory

  // Media devices (shared)
  const mediaDevicesComposable = ref<ReturnType<typeof useMediaDevices> | null>(null)

  /**
   * Initialize shared resources (call once before adding phones)
   */
  function initSharedResources() {
    if (!sharedMediaManager.value) {
      // Create EventBus for shared media management
      const eventBus = new EventBus()
      sharedEventBus.value = eventBus
      sharedMediaManager.value = new MediaManager({ eventBus })
      mediaDevicesComposable.value = useMediaDevices(sharedMediaManager as Ref<MediaManager | null>)
    }
  }

  /**
   * Add and connect a new phone
   */
  async function addPhone(config: PhoneConfig): Promise<PhoneInstance> {
    // Initialize shared resources if needed
    initSharedResources()

    // Check if phone already exists
    if (phones.value.has(config.id)) {
      throw new Error(`Phone with ID ${config.id} already exists`)
    }

    // Create SIP client for this phone
    const sipClient = useSipClient()
    const { connect, isConnected, isRegistered, isConnecting, error, updateConfig, getClient } =
      sipClient

    // Configure the SIP client
    updateConfig({
      uri: config.uri,
      sipUri: config.sipUri,
      password: config.password,
      displayName: config.displayName || config.name,
    })

    // Create call session for this phone using shared media manager
    const clientRef = computed(() => getClient())
    const callSession = useCallSession(clientRef, sharedMediaManager as Ref<MediaManager | null>)

    // Create phone instance
    const phoneInstance: PhoneInstance = {
      id: config.id,
      name: config.name,
      config,
      sipClient,
      callSession,
      isConnected,
      isRegistered,
      isConnecting,
      error,
    }

    // Add to phones map
    const newPhones = new Map(phones.value)
    newPhones.set(config.id, phoneInstance)
    phones.value = newPhones

    // If this is the first WebRTC-capable phone, set as outbound
    if (config.webrtcCapable && !outboundPhoneId.value) {
      outboundPhoneId.value = config.id
    }

    // Connect the phone
    try {
      await connect()
    } catch (err) {
      console.error(`Failed to connect phone ${config.id}:`, err)
    }

    return phoneInstance
  }

  /**
   * Remove and disconnect a phone
   */
  async function removePhone(phoneId: string): Promise<void> {
    const phone = phones.value.get(phoneId)
    if (!phone) return

    try {
      await phone.sipClient.disconnect()
    } catch (err) {
      console.error(`Error disconnecting phone ${phoneId}:`, err)
    }

    const newPhones = new Map(phones.value)
    newPhones.delete(phoneId)
    phones.value = newPhones

    // If this was the outbound phone, clear it
    if (outboundPhoneId.value === phoneId) {
      outboundPhoneId.value = null
      // Try to find another WebRTC-capable phone
      for (const [id, p] of phones.value) {
        if (p.config.webrtcCapable) {
          outboundPhoneId.value = id
          break
        }
      }
    }
  }

  /**
   * Set which phone should handle outbound calls
   */
  function setOutboundPhone(phoneId: string): void {
    if (!phones.value.has(phoneId)) {
      throw new Error(`Phone ${phoneId} not found`)
    }
    outboundPhoneId.value = phoneId
  }

  /**
   * Get the current outbound phone instance
   */
  const outboundPhone = computed<PhoneInstance | null>(() => {
    if (!outboundPhoneId.value) return null
    return phones.value.get(outboundPhoneId.value) || null
  })

  /**
   * Make an outbound call using the designated outbound phone
   */
  async function makeCall(target: string): Promise<void> {
    const phone = outboundPhone.value
    if (!phone) {
      throw new Error('No outbound phone configured')
    }

    if (!phone.isRegistered.value) {
      throw new Error(`Outbound phone ${phone.name} is not registered`)
    }

    // Build SIP URI
    const domain = extractSipDomain(phone.config.sipUri)
    if (!domain) {
      throw new Error('Invalid SIP URI configuration')
    }

    const sipTarget = buildSipUri(target, domain)
    activeCallPhoneId.value = phone.id
    await phone.callSession.makeCall(sipTarget)
  }

  /**
   * Answer an incoming call on a specific phone
   */
  async function answerCall(phoneId: string): Promise<void> {
    const phone = phones.value.get(phoneId)
    if (!phone) {
      throw new Error(`Phone ${phoneId} not found`)
    }

    activeCallPhoneId.value = phoneId
    await phone.callSession.answer()
  }

  /**
   * Reject an incoming call on a specific phone
   */
  async function rejectCall(phoneId: string): Promise<void> {
    const phone = phones.value.get(phoneId)
    if (!phone) {
      throw new Error(`Phone ${phoneId} not found`)
    }

    await phone.callSession.reject()
  }

  /**
   * End the current active call
   */
  async function hangup(): Promise<void> {
    if (!activeCallPhoneId.value) return

    const phone = phones.value.get(activeCallPhoneId.value)
    if (phone) {
      await phone.callSession.hangup()
    }
    activeCallPhoneId.value = null
  }

  /**
   * Get the phone instance with an active/incoming call
   */
  const activePhone = computed<PhoneInstance | null>(() => {
    if (!activeCallPhoneId.value) return null
    return phones.value.get(activeCallPhoneId.value) || null
  })

  /**
   * Check all phones for incoming calls
   */
  const incomingCalls = computed(() => {
    const calls: Array<{
      phoneId: string
      phoneName: string
      remoteUri: string | null
      remoteDisplayName: string | null
    }> = []

    for (const [id, phone] of phones.value) {
      if (
        phone.callSession.state.value === 'ringing' &&
        phone.callSession.direction.value === CallDirection.Incoming
      ) {
        calls.push({
          phoneId: id,
          phoneName: phone.name,
          remoteUri: phone.callSession.remoteUri.value,
          remoteDisplayName: phone.callSession.remoteDisplayName.value,
        })
      }
    }

    return calls
  })

  /**
   * Get list of all phones with their status
   */
  const phoneList = computed(() => {
    return Array.from(phones.value.values()).map((phone) => ({
      id: phone.id,
      name: phone.name,
      isConnected: phone.isConnected.value,
      isRegistered: phone.isRegistered.value,
      isConnecting: phone.isConnecting.value,
      isOutbound: phone.id === outboundPhoneId.value,
      webrtcCapable: phone.config.webrtcCapable || false,
      callState: phone.callSession.state.value,
      error: phone.error.value?.message || null,
    }))
  })

  /**
   * Connect all phones
   */
  async function connectAll(): Promise<void> {
    const promises = Array.from(phones.value.values()).map((phone) =>
      phone.sipClient.connect().catch((err: unknown) => {
        console.error(`Failed to connect ${phone.name}:`, err)
      })
    )
    await Promise.all(promises)
  }

  /**
   * Disconnect all phones
   */
  async function disconnectAll(): Promise<void> {
    const promises = Array.from(phones.value.values()).map((phone) =>
      phone.sipClient.disconnect().catch((err: unknown) => {
        console.error(`Failed to disconnect ${phone.name}:`, err)
      })
    )
    await Promise.all(promises)
  }

  /**
   * Get statistics about all phones
   */
  const stats = computed(() => ({
    totalPhones: phones.value.size,
    connectedPhones: Array.from(phones.value.values()).filter((p) => p.isConnected.value).length,
    registeredPhones: Array.from(phones.value.values()).filter((p) => p.isRegistered.value).length,
    hasOutboundPhone: !!outboundPhoneId.value,
    hasIncomingCall: incomingCalls.value.length > 0,
    hasActiveCall: !!activeCallPhoneId.value,
  }))

  return {
    // Phone management
    phones,
    phoneList,
    addPhone,
    removePhone,
    connectAll,
    disconnectAll,

    // Outbound phone selection
    outboundPhoneId,
    outboundPhone,
    setOutboundPhone,

    // Call handling
    makeCall,
    answerCall,
    rejectCall,
    hangup,
    activePhone,
    activeCallPhoneId,
    incomingCalls,

    // Shared media devices
    mediaDevices: mediaDevicesComposable,

    // Call history
    history,
    clearHistory,
    getRecentCalls,

    // Stats
    stats,
  }
}
