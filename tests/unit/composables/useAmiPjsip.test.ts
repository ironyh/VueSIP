/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiPjsip } from '@/composables/useAmiPjsip'
import type { AmiClient } from '@/core/AmiClient'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useAmiPjsip', () => {
  let mockClient: AmiClient
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    vi.useFakeTimers()
    mockClient = {
      send: vi.fn(),
      sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success', events: [] } }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as AmiClient
    clientRef = ref<AmiClient | null>(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { endpoints, contacts, aors, transports, registrations, isLoading, error } =
        useAmiPjsip(clientRef, { autoRefresh: false })

      expect(endpoints.value.size).toBe(0)
      expect(contacts.value.size).toBe(0)
      expect(aors.value.size).toBe(0)
      expect(transports.value.size).toBe(0)
      expect(registrations.value.size).toBe(0)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
    })

    it('should compute correct statistics for empty state', () => {
      const { stats, totalOnline, totalOffline } = useAmiPjsip(clientRef, { autoRefresh: false })

      expect(stats.value).toEqual({
        total: 0,
        available: 0,
        unavailable: 0,
        busy: 0,
        ringing: 0,
        registrationRate: 0,
      })
      expect(totalOnline.value).toBe(0)
      expect(totalOffline.value).toBe(0)
    })
  })

  describe('listEndpoints', () => {
    it('should list all PJSIP endpoints', async () => {
      const mockEvents = [
        {
          Event: 'EndpointList',
          ObjectType: 'endpoint',
          ObjectName: '1001',
          DeviceState: 'NOT_INUSE',
          Aor: '1001',
          ActiveChannels: '0',
        },
        {
          Event: 'EndpointList',
          ObjectType: 'endpoint',
          ObjectName: '1002',
          DeviceState: 'INUSE',
          Aor: '1002',
          ActiveChannels: '1',
        },
        {
          Event: 'EndpointList',
          ObjectType: 'endpoint',
          ObjectName: '1003',
          DeviceState: 'UNAVAILABLE',
          Aor: '1003',
          ActiveChannels: '0',
        },
      ]

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: mockEvents,
        },
      })

      const { listEndpoints, endpointList, stats } = useAmiPjsip(clientRef, { autoRefresh: false })
      clientRef.value = mockClient

      const result = await listEndpoints()

      expect(result).toHaveLength(3)
      expect(endpointList.value).toHaveLength(3)
      expect(stats.value.total).toBe(3)
      expect(stats.value.available).toBe(1)
      expect(stats.value.busy).toBe(1)
      expect(stats.value.unavailable).toBe(1)
    })

    it('should parse device states correctly', async () => {
      const testCases = [
        { deviceState: 'NOT_INUSE', expected: 'Available' },
        { deviceState: 'INUSE', expected: 'Busy' },
        { deviceState: 'BUSY', expected: 'Busy' },
        { deviceState: 'RINGING', expected: 'Ringing' },
        { deviceState: 'UNAVAILABLE', expected: 'Unavailable' },
        { deviceState: 'UNKNOWN', expected: 'Unavailable' },
      ]

      for (const { deviceState, expected } of testCases) {
        mockClient.sendAction = vi.fn().mockResolvedValue({
          data: {
            Response: 'Success',
            events: [
              {
                Event: 'EndpointList',
                ObjectName: 'test',
                DeviceState: deviceState,
              },
            ],
          },
        })

        const { listEndpoints, endpointList } = useAmiPjsip(ref(mockClient), { autoRefresh: false })
        await listEndpoints()

        expect(endpointList.value[0]?.status).toBe(expected)
      }
    })

    it('should apply endpoint filter', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            { Event: 'EndpointList', ObjectName: '1001', DeviceState: 'NOT_INUSE' },
            { Event: 'EndpointList', ObjectName: '1002', DeviceState: 'NOT_INUSE' },
            { Event: 'EndpointList', ObjectName: '2001', DeviceState: 'NOT_INUSE' },
          ],
        },
      })

      const { listEndpoints, endpointList } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
        endpointFilter: (ep) => ep.endpoint.startsWith('100'),
      })

      await listEndpoints()

      expect(endpointList.value).toHaveLength(2)
      expect(endpointList.value.every((ep) => ep.endpoint.startsWith('100'))).toBe(true)
    })

    it('should apply endpoint transformer', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [{ Event: 'EndpointList', ObjectName: '1001', DeviceState: 'NOT_INUSE' }],
        },
      })

      const { listEndpoints, endpointList } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
        transformEndpoint: (ep) => ({
          ...ep,
          displayName: `Extension ${ep.endpoint}`,
        }),
      })

      await listEndpoints()

      expect(endpointList.value[0]?.displayName).toBe('Extension 1001')
    })
  })

  describe('listContacts', () => {
    it('should list all contacts', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'ContactList',
              ObjectName: '1001/sip:1001@192.168.1.100',
              Uri: 'sip:1001@192.168.1.100:5060',
              EndpointName: '1001',
              Status: 'Reachable',
              UserAgent: 'Odie/1.0',
              RoundtripUsec: '15000',
            },
            {
              Event: 'ContactList',
              ObjectName: '1002/sip:1002@192.168.1.101',
              Uri: 'sip:1002@192.168.1.101:5060',
              EndpointName: '1002',
              Status: 'Unreachable',
            },
          ],
        },
      })

      const { listContacts, contactList } = useAmiPjsip(ref(mockClient), { autoRefresh: false })

      const result = await listContacts()

      expect(result).toHaveLength(2)
      expect(contactList.value).toHaveLength(2)
      expect(contactList.value[0]?.status).toBe('Reachable')
      expect(contactList.value[0]?.rtt).toBe(15) // 15000 usec = 15ms
      expect(contactList.value[1]?.status).toBe('Unreachable')
    })

    it('should list contacts for specific endpoint', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'ContactList',
              ObjectName: '1001/sip:1001@192.168.1.100',
              Uri: 'sip:1001@192.168.1.100:5060',
              EndpointName: '1001',
              Status: 'Reachable',
            },
          ],
        },
      })

      const { listContacts, getEndpointContacts } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
      })

      await listContacts('1001')

      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'PJSIPShowContacts',
        Endpoint: '1001',
      })

      expect(getEndpointContacts('1001')).toHaveLength(1)
    })
  })

  describe('listAors', () => {
    it('should list all AORs', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'AorList',
              ObjectName: '1001',
              EndpointName: '1001',
              MaxContacts: '5',
              TotalContacts: '1',
              DefaultExpiration: '3600',
              MinimumExpiration: '60',
              MaximumExpiration: '7200',
              RemoveExisting: 'yes',
              SupportPath: 'yes',
            },
          ],
        },
      })

      const { listAors, aorList } = useAmiPjsip(ref(mockClient), { autoRefresh: false })

      const result = await listAors()

      expect(result).toHaveLength(1)
      expect(aorList.value[0]).toEqual(
        expect.objectContaining({
          aor: '1001',
          maxContacts: 5,
          contactCount: 1,
          defaultExpiration: 3600,
          removeExisting: true,
          supportPath: true,
        })
      )
    })
  })

  describe('listTransports', () => {
    it('should list all transports', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'TransportDetail',
              ObjectName: 'transport-udp',
              Protocol: 'udp',
              Bind: '0.0.0.0:5060',
              VerifyServer: 'no',
              VerifyClient: 'no',
              Websocket: 'no',
            },
            {
              Event: 'TransportDetail',
              ObjectName: 'transport-wss',
              Protocol: 'wss',
              Bind: '0.0.0.0:8089',
              VerifyServer: 'yes',
              VerifyClient: 'no',
              Websocket: 'yes',
            },
          ],
        },
      })

      const { listTransports, transportList } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
        includeTransports: true,
      })

      const result = await listTransports()

      expect(result).toHaveLength(2)
      expect(transportList.value[0]).toEqual(
        expect.objectContaining({
          transport: 'transport-udp',
          type: 'udp',
          bindAddress: '0.0.0.0',
          bindPort: 5060,
          websocketEnabled: false,
        })
      )
      expect(transportList.value[1]).toEqual(
        expect.objectContaining({
          transport: 'transport-wss',
          type: 'wss',
          bindPort: 8089,
          websocketEnabled: true,
        })
      )
    })
  })

  describe('qualifyEndpoint', () => {
    it('should send qualify action and return success', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { qualifyEndpoint } = useAmiPjsip(ref(mockClient), { autoRefresh: false })

      const result = await qualifyEndpoint('1001')

      expect(result).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'PJSIPQualify',
        Endpoint: '1001',
      })
    })

    it('should return false on qualify failure', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Qualify failed'))

      const { qualifyEndpoint } = useAmiPjsip(ref(mockClient), { autoRefresh: false })

      const result = await qualifyEndpoint('1001')

      expect(result).toBe(false)
    })
  })

  describe('qualifyAll', () => {
    it('should qualify all endpoints', async () => {
      mockClient.sendAction = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            Response: 'Success',
            events: [
              { Event: 'EndpointList', ObjectName: '1001', DeviceState: 'NOT_INUSE' },
              { Event: 'EndpointList', ObjectName: '1002', DeviceState: 'NOT_INUSE' },
            ],
          },
        })
        .mockResolvedValue({ data: { Response: 'Success' } })

      const { listEndpoints, qualifyAll } = useAmiPjsip(ref(mockClient), { autoRefresh: false })

      await listEndpoints()
      await qualifyAll()

      // First call is listEndpoints, then 2 qualify calls
      expect(mockClient.sendAction).toHaveBeenCalledTimes(3)
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'PJSIPQualify',
        Endpoint: '1001',
      })
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'PJSIPQualify',
        Endpoint: '1002',
      })
    })
  })

  describe('utility methods', () => {
    it('should check if endpoint is registered', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            {
              Event: 'ContactList',
              ObjectName: '1001/sip:1001@192.168.1.100',
              Uri: 'sip:1001@192.168.1.100:5060',
              EndpointName: '1001',
              Status: 'Reachable',
            },
          ],
        },
      })

      const { listContacts, isEndpointRegistered } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
      })

      await listContacts()

      expect(isEndpointRegistered('1001')).toBe(true)
      expect(isEndpointRegistered('9999')).toBe(false)
    })

    it('should check if endpoint is available', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [
            { Event: 'EndpointList', ObjectName: '1001', DeviceState: 'NOT_INUSE' },
            { Event: 'EndpointList', ObjectName: '1002', DeviceState: 'UNAVAILABLE' },
          ],
        },
      })

      const { listEndpoints, isEndpointAvailable } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
      })

      await listEndpoints()

      expect(isEndpointAvailable('1001')).toBe(true)
      expect(isEndpointAvailable('1002')).toBe(false)
      expect(isEndpointAvailable('9999')).toBe(false)
    })
  })

  describe('event handling', () => {
    it('should setup event listeners when client is connected', async () => {
      useAmiPjsip(clientRef, { autoRefresh: false, useEvents: true })

      clientRef.value = mockClient
      await nextTick()

      // Composable listens to generic 'event' and filters by Event property
      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should handle ContactStatus events', async () => {
      let eventHandler: (event: { data: Record<string, string> }) => void = () => {}
      mockClient.on = vi.fn().mockImplementation((eventName, handler) => {
        if (eventName === 'event') {
          eventHandler = handler
        }
      })

      const { contacts } = useAmiPjsip(clientRef, { autoRefresh: false, useEvents: true })
      clientRef.value = mockClient
      await nextTick()

      // Simulate contact becoming reachable
      eventHandler({
        data: {
          Event: 'ContactStatus',
          URI: 'sip:1001@192.168.1.100:5060',
          ContactStatus: 'Reachable',
          AOR: '1001',
          EndpointName: '1001',
          UserAgent: 'Test/1.0',
        },
      })

      expect(contacts.value.get('sip:1001@192.168.1.100:5060')).toEqual(
        expect.objectContaining({
          endpoint: '1001',
          aor: '1001',
          uri: 'sip:1001@192.168.1.100:5060',
          status: 'Reachable',
        })
      )

      // Simulate contact removal
      eventHandler({
        data: {
          Event: 'ContactStatus',
          URI: 'sip:1001@192.168.1.100:5060',
          ContactStatus: 'Removed',
          AOR: '1001',
          EndpointName: '1001',
        },
      })

      expect(contacts.value.has('sip:1001@192.168.1.100:5060')).toBe(false)
    })

    it('should handle DeviceStateChange events', async () => {
      let eventHandler: (event: { data: Record<string, string> }) => void = () => {}
      mockClient.on = vi.fn().mockImplementation((eventName, handler) => {
        if (eventName === 'event') {
          eventHandler = handler
        }
      })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [{ Event: 'EndpointList', ObjectName: '1001', DeviceState: 'NOT_INUSE' }],
        },
      })

      const { endpoints, listEndpoints } = useAmiPjsip(clientRef, {
        autoRefresh: false,
        useEvents: true,
      })
      clientRef.value = mockClient
      await nextTick()
      await listEndpoints()

      expect(endpoints.value.get('1001')?.status).toBe('Available')

      // Simulate device going busy
      eventHandler({
        data: {
          Event: 'DeviceStateChange',
          Device: 'PJSIP/1001',
          State: 'INUSE',
        },
      })

      expect(endpoints.value.get('1001')?.status).toBe('Busy')
    })

    it('should call onEndpointChange callback when status changes', async () => {
      const onEndpointChange = vi.fn()
      let eventHandler: (event: { data: Record<string, string> }) => void = () => {}
      mockClient.on = vi.fn().mockImplementation((eventName, handler) => {
        if (eventName === 'event') {
          eventHandler = handler
        }
      })

      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Success',
          events: [{ Event: 'EndpointList', ObjectName: '1001', DeviceState: 'NOT_INUSE' }],
        },
      })

      const { listEndpoints } = useAmiPjsip(clientRef, {
        autoRefresh: false,
        useEvents: true,
        onEndpointChange,
      })
      clientRef.value = mockClient
      await nextTick()
      await listEndpoints()

      eventHandler({
        data: {
          Event: 'DeviceStateChange',
          Device: 'PJSIP/1001',
          State: 'INUSE',
        },
      })

      expect(onEndpointChange).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: '1001', status: 'Busy' }),
        'Available'
      )
    })

    it('should cleanup event listeners on client disconnect', async () => {
      useAmiPjsip(clientRef, { autoRefresh: false, useEvents: true })

      clientRef.value = mockClient
      await nextTick()

      expect(mockClient.on).toHaveBeenCalled()

      clientRef.value = null
      await nextTick()

      expect(mockClient.off).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle AMI client not connected', async () => {
      const { listEndpoints, error } = useAmiPjsip(clientRef, { autoRefresh: false })

      await expect(listEndpoints()).rejects.toThrow('AMI client not connected')
      expect(error.value).toBe('AMI client not connected')
    })

    it('should handle API errors gracefully', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Network error'))

      const { listEndpoints, error, isLoading } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
      })

      await expect(listEndpoints()).rejects.toThrow('Network error')
      expect(error.value).toBe('Network error')
      expect(isLoading.value).toBe(false)
    })
  })

  describe('refresh', () => {
    it('should refresh all data', async () => {
      mockClient.sendAction = vi
        .fn()
        .mockResolvedValue({ data: { Response: 'Success', events: [] } })

      const { refresh } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
        includeTransports: true,
        includeRegistrations: true,
      })

      await refresh()

      // Should call: listEndpoints, listContacts, listAors, listTransports, listRegistrations
      expect(mockClient.sendAction).toHaveBeenCalledTimes(5)
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'PJSIPShowEndpoints' })
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'PJSIPShowContacts' })
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'PJSIPShowAors' })
      expect(mockClient.sendAction).toHaveBeenCalledWith({ Action: 'PJSIPShowTransports' })
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'PJSIPShowRegistrationsOutbound',
      })
    })

    it('should skip transports and registrations when not included', async () => {
      mockClient.sendAction = vi
        .fn()
        .mockResolvedValue({ data: { Response: 'Success', events: [] } })

      const { refresh } = useAmiPjsip(ref(mockClient), {
        autoRefresh: false,
        includeTransports: false,
        includeRegistrations: false,
      })

      await refresh()

      // Should call: listEndpoints, listContacts, listAors
      expect(mockClient.sendAction).toHaveBeenCalledTimes(3)
    })
  })
})
