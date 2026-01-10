/**
 * AMI PJSIP Composable
 *
 * Vue composable for Asterisk PJSIP endpoint and transport management via AMI.
 * Provides endpoint listing, contact tracking, registration status, and qualify operations.
 *
 * @module composables/useAmiPjsip
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction } from '@/types/ami.types'
import type {
  PjsipEndpoint,
  PjsipEndpointStatus,
  PjsipContact,
  PjsipAor,
  PjsipTransport,
  PjsipRegistration,
  PjsipEndpointStats,
  UseAmiPjsipOptions,
  AmiPjsipContactStatusEvent,
  AmiPjsipEndpointListEvent,
  AmiPjsipAorListEvent,
  AmiPjsipContactListEvent,
  AmiPjsipTransportListEvent,
  AmiPjsipDeviceStateEvent,
} from '@/types/pjsip.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiPjsip')

/**
 * Return type for useAmiPjsip composable
 */
export interface UseAmiPjsipReturn {
  // State
  /** Map of endpoints by name */
  endpoints: Ref<Map<string, PjsipEndpoint>>
  /** Map of contacts by URI */
  contacts: Ref<Map<string, PjsipContact>>
  /** Map of AORs by name */
  aors: Ref<Map<string, PjsipAor>>
  /** Map of transports by name */
  transports: Ref<Map<string, PjsipTransport>>
  /** Map of registrations by name */
  registrations: Ref<Map<string, PjsipRegistration>>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message */
  error: Ref<string | null>

  // Computed
  /** All endpoints as array */
  endpointList: ComputedRef<PjsipEndpoint[]>
  /** All contacts as array */
  contactList: ComputedRef<PjsipContact[]>
  /** All AORs as array */
  aorList: ComputedRef<PjsipAor[]>
  /** All transports as array */
  transportList: ComputedRef<PjsipTransport[]>
  /** All registrations as array */
  registrationList: ComputedRef<PjsipRegistration[]>
  /** Endpoint statistics */
  stats: ComputedRef<PjsipEndpointStats>
  /** Total online endpoints */
  totalOnline: ComputedRef<number>
  /** Total offline endpoints */
  totalOffline: ComputedRef<number>

  // Actions
  /** List all endpoints */
  listEndpoints: () => Promise<PjsipEndpoint[]>
  /** List contacts for endpoint */
  listContacts: (endpoint?: string) => Promise<PjsipContact[]>
  /** List all AORs */
  listAors: () => Promise<PjsipAor[]>
  /** List all transports */
  listTransports: () => Promise<PjsipTransport[]>
  /** List all registrations */
  listRegistrations: () => Promise<PjsipRegistration[]>
  /** Get endpoint details */
  getEndpointDetail: (endpoint: string) => Promise<PjsipEndpoint | null>
  /** Qualify endpoint (check reachability) */
  qualifyEndpoint: (endpoint: string) => Promise<boolean>
  /** Qualify all endpoints */
  qualifyAll: () => Promise<void>
  /** Refresh all data */
  refresh: () => Promise<void>

  // Utilities
  /** Get contacts for specific endpoint */
  getEndpointContacts: (endpoint: string) => PjsipContact[]
  /** Check if endpoint is registered */
  isEndpointRegistered: (endpoint: string) => boolean
  /** Check if endpoint is available */
  isEndpointAvailable: (endpoint: string) => boolean
}

/**
 * AMI PJSIP Composable
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const {
 *   endpointList,
 *   contactList,
 *   stats,
 *   listEndpoints,
 *   qualifyEndpoint,
 *   isEndpointAvailable
 * } = useAmiPjsip(computed(() => ami.getClient()))
 *
 * // List all PJSIP endpoints
 * await listEndpoints()
 *
 * // Check if endpoint is available
 * if (isEndpointAvailable('1001')) {
 *   console.log('Extension 1001 is online')
 * }
 *
 * // Qualify (ping) an endpoint
 * const reachable = await qualifyEndpoint('1001')
 * ```
 */
export function useAmiPjsip(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiPjsipOptions = {}
): UseAmiPjsipReturn {
  const {
    useEvents = true,
    autoRefresh = true,
    endpointFilter,
    transformEndpoint,
    onEndpointChange,
    onContactChange,
    includeTransports = false,
    includeRegistrations = false,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const endpoints = ref<Map<string, PjsipEndpoint>>(new Map())
  const contacts = ref<Map<string, PjsipContact>>(new Map())
  const aors = ref<Map<string, PjsipAor>>(new Map())
  const transports = ref<Map<string, PjsipTransport>>(new Map())
  const registrations = ref<Map<string, PjsipRegistration>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const endpointList = computed(() => {
    const list = Array.from(endpoints.value.values())
    return endpointFilter ? list.filter(endpointFilter) : list
  })

  const contactList = computed(() => Array.from(contacts.value.values()))

  const aorList = computed(() => Array.from(aors.value.values()))

  const transportList = computed(() => Array.from(transports.value.values()))

  const registrationList = computed(() => Array.from(registrations.value.values()))

  const stats = computed<PjsipEndpointStats>(() => {
    const list = endpointList.value
    const total = list.length
    const available = list.filter((e) => e.status === 'Available').length
    const unavailable = list.filter((e) => e.status === 'Unavailable').length
    const busy = list.filter((e) => e.status === 'Busy').length
    const ringing = list.filter((e) => e.status === 'Ringing').length

    return {
      total,
      available,
      unavailable,
      busy,
      ringing,
      registrationRate: total > 0 ? available / total : 0,
    }
  })

  const totalOnline = computed(() => stats.value.available)

  const totalOffline = computed(() => stats.value.unavailable)

  // ============================================================================
  // Parsing Helpers
  // ============================================================================

  function parseEndpointStatus(deviceState: string): PjsipEndpointStatus {
    switch (deviceState.toUpperCase()) {
      case 'NOT_INUSE':
        return 'Available'
      case 'INUSE':
        return 'Busy'
      case 'BUSY':
        return 'Busy'
      case 'RINGING':
        return 'Ringing'
      case 'UNAVAILABLE':
        return 'Unavailable'
      case 'UNKNOWN':
      default:
        return 'Unavailable'
    }
  }

  function parseEndpoint(data: AmiPjsipEndpointListEvent): PjsipEndpoint {
    const endpoint: PjsipEndpoint = {
      endpoint: data.ObjectName,
      status: parseEndpointStatus(data.DeviceState),
      deviceState: data.DeviceState,
      aor: data.Aor,
      activeChannels: parseInt(data.ActiveChannels || '0', 10),
      maxContacts: 1,
      contactCount: 0,
      updatedAt: new Date(),
    }
    return transformEndpoint ? transformEndpoint(endpoint) : endpoint
  }

  function parseContact(data: AmiPjsipContactListEvent): PjsipContact {
    return {
      endpoint: data.EndpointName || '',
      aor: data.ObjectName.split('/')[0] || '',
      uri: data.Uri,
      userAgent: data.UserAgent,
      expiresAt: data.ExpirationTime
        ? new Date(parseInt(data.ExpirationTime, 10) * 1000)
        : undefined,
      rtt: data.RoundtripUsec ? parseInt(data.RoundtripUsec, 10) / 1000 : undefined,
      status:
        data.Status === 'Reachable'
          ? 'Reachable'
          : data.Status === 'Unreachable'
            ? 'Unreachable'
            : 'Unknown',
      viaAddress: data.ViaAddress,
      qualifyFrequency: data.QualifyFrequency ? parseInt(data.QualifyFrequency, 10) : undefined,
    }
  }

  function parseAor(data: AmiPjsipAorListEvent): PjsipAor {
    return {
      aor: data.ObjectName,
      endpoint: data.EndpointName || '',
      maxContacts: parseInt(data.MaxContacts || '1', 10),
      contactCount: parseInt(data.TotalContacts || '0', 10),
      removeExisting: data.RemoveExisting === 'yes',
      defaultExpiration: parseInt(data.DefaultExpiration || '3600', 10),
      minExpiration: parseInt(data.MinimumExpiration || '60', 10),
      maxExpiration: parseInt(data.MaximumExpiration || '7200', 10),
      qualifyFrequency: data.QualifyFrequency ? parseInt(data.QualifyFrequency, 10) : undefined,
      qualifyTimeout: data.QualifyTimeout ? parseFloat(data.QualifyTimeout) : undefined,
      authenticateQualify: data.AuthenticateQualify === 'yes',
      mailboxes: data.Mailboxes ? data.Mailboxes.split(',').map((m) => m.trim()) : undefined,
      voicemailExtension: data.VoicemailExtension,
      supportPath: data.SupportPath === 'yes',
    }
  }

  function parseTransport(data: AmiPjsipTransportListEvent): PjsipTransport {
    const [bindAddr, bindPortStr] = (data.Bind || '0.0.0.0:5060').split(':')
    return {
      transport: data.ObjectName,
      type: (data.Protocol?.toLowerCase() as PjsipTransport['type']) || 'udp',
      bindAddress: bindAddr,
      bindPort: parseInt(bindPortStr || '5060', 10),
      externalMediaAddress: data.ExternalMediaAddress,
      externalSignalingAddress: data.ExternalSignalingAddress,
      localNet: data.LocalNet ? data.LocalNet.split(',').map((n) => n.trim()) : undefined,
      certFile: data.CertFile,
      privKeyFile: data.PrivKeyFile,
      caFile: data.CaFile,
      cipher: data.Cipher,
      method: data.Method as PjsipTransport['method'],
      verifyServer: data.VerifyServer === 'yes',
      verifyClient: data.VerifyClient === 'yes',
      websocketEnabled: data.Websocket === 'yes',
    }
  }

  // ============================================================================
  // AMI Actions
  // ============================================================================

  async function sendAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    return client.send(action)
  }

  async function listEndpoints(): Promise<PjsipEndpoint[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({ Action: 'PJSIPShowEndpoints' })
      const events = (response.events || []) as AmiPjsipEndpointListEvent[]

      endpoints.value.clear()
      for (const event of events) {
        if (event.Event === 'EndpointList') {
          const endpoint = parseEndpoint(event)
          endpoints.value.set(endpoint.endpoint, endpoint)
        }
      }

      return endpointList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list endpoints'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function listContacts(endpoint?: string): Promise<PjsipContact[]> {
    isLoading.value = true
    error.value = null

    try {
      const action: AmiAction = { Action: 'PJSIPShowContacts' }
      if (endpoint) {
        action.Endpoint = endpoint
      }

      const response = await sendAction(action)
      const events = (response.events || []) as AmiPjsipContactListEvent[]

      if (!endpoint) {
        contacts.value.clear()
      } else {
        // Clear only contacts for this endpoint
        for (const [uri, contact] of contacts.value) {
          if (contact.endpoint === endpoint) {
            contacts.value.delete(uri)
          }
        }
      }

      for (const event of events) {
        if (event.Event === 'ContactList') {
          const contact = parseContact(event)
          contacts.value.set(contact.uri, contact)
        }
      }

      return endpoint ? getEndpointContacts(endpoint) : contactList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list contacts'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function listAors(): Promise<PjsipAor[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({ Action: 'PJSIPShowAors' })
      const events = (response.events || []) as AmiPjsipAorListEvent[]

      aors.value.clear()
      for (const event of events) {
        if (event.Event === 'AorList') {
          const aor = parseAor(event)
          aors.value.set(aor.aor, aor)
        }
      }

      return aorList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list AORs'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function listTransports(): Promise<PjsipTransport[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({ Action: 'PJSIPShowTransports' })
      const events = (response.events || []) as AmiPjsipTransportListEvent[]

      transports.value.clear()
      for (const event of events) {
        if (event.Event === 'TransportDetail') {
          const transport = parseTransport(event)
          transports.value.set(transport.transport, transport)
        }
      }

      return transportList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list transports'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function listRegistrations(): Promise<PjsipRegistration[]> {
    isLoading.value = true
    error.value = null

    try {
      const response = await sendAction({ Action: 'PJSIPShowRegistrationsOutbound' })
      const events = (response.events || []) as Array<Record<string, string>>

      registrations.value.clear()
      for (const event of events) {
        if (event.Event === 'OutboundRegistrationDetail') {
          const reg: PjsipRegistration = {
            registration: event.ObjectName || '',
            serverUri: event.ServerUri || '',
            clientUri: event.ClientUri || '',
            status: event.Status === 'Registered' ? 'Registered' : 'Unregistered',
            authUser: event.AuthUser,
            outboundProxy: event.OutboundProxy,
            transport: event.Transport,
            expiration: parseInt(event.Expiration || '3600', 10),
            retryInterval: parseInt(event.RetryInterval || '60', 10),
            maxRetries: parseInt(event.MaxRetries || '10', 10),
            retryCount: 0,
          }
          registrations.value.set(reg.registration, reg)
        }
      }

      return registrationList.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list registrations'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function getEndpointDetail(endpointName: string): Promise<PjsipEndpoint | null> {
    try {
      const response = await sendAction({
        Action: 'PJSIPShowEndpoint',
        Endpoint: endpointName,
      })

      const events = (response.events || []) as Array<Record<string, string>>
      const detailEvent = events.find((e) => e.Event === 'EndpointDetail')

      if (detailEvent) {
        const endpoint: PjsipEndpoint = {
          endpoint: detailEvent.ObjectName || endpointName,
          displayName: detailEvent.Callerid,
          status: parseEndpointStatus(detailEvent.DeviceState || 'UNKNOWN'),
          deviceState: detailEvent.DeviceState || 'UNKNOWN',
          aor: detailEvent.Aors,
          activeChannels: 0,
          maxContacts: 1,
          contactCount: 0,
          context: detailEvent.Context,
          updatedAt: new Date(),
        }

        const transformed = transformEndpoint ? transformEndpoint(endpoint) : endpoint
        endpoints.value.set(transformed.endpoint, transformed)
        return transformed
      }

      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get endpoint detail'
      return null
    }
  }

  async function qualifyEndpoint(endpointName: string): Promise<boolean> {
    try {
      await sendAction({
        Action: 'PJSIPQualify',
        Endpoint: endpointName,
      })
      return true
    } catch {
      return false
    }
  }

  async function qualifyAll(): Promise<void> {
    const promises = endpointList.value.map((ep) => qualifyEndpoint(ep.endpoint))
    await Promise.allSettled(promises)
  }

  async function refresh(): Promise<void> {
    await listEndpoints()
    await listContacts()
    await listAors()

    if (includeTransports) {
      await listTransports()
    }
    if (includeRegistrations) {
      await listRegistrations()
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  function getEndpointContacts(endpointName: string): PjsipContact[] {
    return contactList.value.filter((c) => c.endpoint === endpointName)
  }

  function isEndpointRegistered(endpointName: string): boolean {
    return getEndpointContacts(endpointName).length > 0
  }

  function isEndpointAvailable(endpointName: string): boolean {
    const endpoint = endpoints.value.get(endpointName)
    return endpoint?.status === 'Available'
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  function setupEvents(): void {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    const handleContactStatus = (event: AmiPjsipContactStatusEvent) => {
      const uri = event.URI
      const existingContact = contacts.value.get(uri)

      if (event.ContactStatus === 'Removed') {
        if (existingContact) {
          contacts.value.delete(uri)
          onContactChange?.(existingContact)
        }
      } else {
        const contact: PjsipContact = {
          endpoint: event.EndpointName,
          aor: event.AOR,
          uri: uri,
          userAgent: event.UserAgent,
          expiresAt: event.RegExpire ? new Date(parseInt(event.RegExpire, 10) * 1000) : undefined,
          rtt: event.RoundtripUsec ? parseInt(event.RoundtripUsec, 10) / 1000 : undefined,
          status: event.ContactStatus === 'Reachable' ? 'Reachable' : 'Unreachable',
          viaAddress: event.ViaAddress,
          callId: event.CallID,
          outboundProxy: event.OutboundProxy,
          path: event.Path,
          qualifyFrequency: event.QualifyFrequency
            ? parseInt(event.QualifyFrequency, 10)
            : undefined,
        }
        contacts.value.set(uri, contact)
        onContactChange?.(contact)
      }

      logger.debug('Contact status changed', uri, event.ContactStatus)
    }

    const handleDeviceState = (event: AmiPjsipDeviceStateEvent) => {
      // Device state format: "PJSIP/1001"
      const match = event.Device?.match(/^PJSIP\/(.+)$/)
      if (match) {
        const endpointName = match[1]
        const endpoint = endpoints.value.get(endpointName)
        if (endpoint) {
          const previousStatus = endpoint.status
          endpoint.status = parseEndpointStatus(event.State)
          endpoint.deviceState = event.State
          endpoint.updatedAt = new Date()

          if (previousStatus !== endpoint.status) {
            onEndpointChange?.(endpoint, previousStatus)
          }

          logger.debug('Endpoint status changed', endpointName, event.State)
        }
      }
    }

    // Subscribe to events
    client.on(
      'ContactStatus' as keyof import('@/types/ami.types').AmiClientEvents,
      handleContactStatus
    )
    client.on(
      'DeviceStateChange' as keyof import('@/types/ami.types').AmiClientEvents,
      handleDeviceState
    )

    eventCleanups.push(
      () =>
        client.off(
          'ContactStatus' as keyof import('@/types/ami.types').AmiClientEvents,
          handleContactStatus
        ),
      () =>
        client.off(
          'DeviceStateChange' as keyof import('@/types/ami.types').AmiClientEvents,
          handleDeviceState
        )
    )
  }

  function cleanupEvents(): void {
    eventCleanups.forEach((cleanup) => cleanup())
    eventCleanups.length = 0
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  watch(
    amiClientRef,
    (newClient, oldClient) => {
      if (oldClient) {
        cleanupEvents()
      }
      if (newClient) {
        setupEvents()
        if (autoRefresh) {
          refresh().catch((err) => logger.error('Initial refresh failed', err))
        }
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    cleanupEvents()
    endpoints.value.clear()
    contacts.value.clear()
    aors.value.clear()
    transports.value.clear()
    registrations.value.clear()
  })

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    endpoints,
    contacts,
    aors,
    transports,
    registrations,
    isLoading,
    error,

    // Computed
    endpointList,
    contactList,
    aorList,
    transportList,
    registrationList,
    stats,
    totalOnline,
    totalOffline,

    // Actions
    listEndpoints,
    listContacts,
    listAors,
    listTransports,
    listRegistrations,
    getEndpointDetail,
    qualifyEndpoint,
    qualifyAll,
    refresh,

    // Utilities
    getEndpointContacts,
    isEndpointRegistered,
    isEndpointAvailable,
  }
}
