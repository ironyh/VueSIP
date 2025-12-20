/**
 * useAmiPeers composable unit tests
 *
 * Tests for AMI peer management:
 * - SIP and PJSIP peer discovery and tracking
 * - Real-time peer status updates via events
 * - Peer filtering and categorization
 * - Online/offline status detection
 * - Configuration options (includeSip, includePjsip, onlineStatusPatterns)
 * - Selective refresh capabilities
 *
 * @see src/composables/useAmiPeers.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiPeers } from '@/composables/useAmiPeers'
import type { AmiClient } from '@/core/AmiClient'
import type { PeerInfo, AmiMessage, AmiPeerStatusEvent } from '@/types/ami.types'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  peers: {
    sip: {
      basic: { objectName: '1000', channelType: 'SIP' as const },
      alternate: { objectName: '1001', channelType: 'SIP' as const },
      trunk: { objectName: 'trunk-provider1', channelType: 'SIP' as const },
    },
    pjsip: {
      basic: { objectName: '2000', channelType: 'PJSIP' as const },
      alternate: { objectName: '2001', channelType: 'PJSIP' as const },
    },
  },
  status: {
    online: ['OK', 'Registered', 'Connected', 'Available'],
    offline: ['UNREACHABLE', 'LAGGED', 'Unknown'],
    unknown: ['UNKNOWN', 'Pending'],
  },
  ipAddresses: {
    local: '192.168.1.100',
    alternate: '192.168.1.101',
    trunk: '10.0.0.1',
    remote: '192.168.1.200',
  },
  ports: {
    sip: 5060,
    pjsip: 5061,
  },
} as const

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

/**
 * Factory function: Create mock AMI client with peer fetch capabilities
 *
 * @param overrides - Optional method overrides
 * @returns Mock AmiClient instance
 */
const createMockClient = (overrides?: any): AmiClient => {
  Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])

  return {
    getSipPeers: vi.fn().mockResolvedValue([]),
    getPjsipEndpoints: vi.fn().mockResolvedValue([]),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
      }
    }),
    ...overrides,
  } as unknown as AmiClient
}

/**
 * Helper to trigger client events
 *
 * @param event - Event name
 * @param args - Event arguments
 */
function triggerClientEvent(event: string, ...args: unknown[]) {
  eventHandlers[event]?.forEach(handler => handler(...args))
}

/**
 * Factory function: Create mock peer with sensible defaults
 *
 * @param objectName - Peer identifier
 * @param overrides - Optional property overrides
 * @returns Mock PeerInfo object
 */
function createMockPeer(objectName: string, overrides?: Partial<PeerInfo>): PeerInfo {
  return {
    objectName,
    channelType: 'SIP',
    ipAddress: TEST_FIXTURES.ipAddresses.local,
    port: TEST_FIXTURES.ports.sip,
    status: 'OK',
    dynamic: true,
    forceRPort: false,
    comedia: false,
    acl: false,
    autoForcerPort: false,
    autoComedia: false,
    videoSupport: true,
    textSupport: false,
    realtimeDevice: false,
    serverId: 1,
    ...overrides,
  }
}

/**
 * Factory function: Create mock AMI peer status event
 *
 * @param peerName - Peer name (without channel type prefix)
 * @param overrides - Optional property overrides
 * @returns Mock AmiMessage with PeerStatus event
 */
function createMockPeerStatusEvent(
  peerName: string,
  overrides?: Partial<AmiPeerStatusEvent & { channelType?: 'SIP' | 'PJSIP' }>
): AmiMessage<AmiPeerStatusEvent> {
  const channelType = overrides?.channelType ?? 'SIP'
  const ipAddress = overrides?.Address?.split(':')[0] ?? TEST_FIXTURES.ipAddresses.local
  const port = overrides?.Address?.split(':')[1] ?? TEST_FIXTURES.ports.sip.toString()

  return {
    type: 1,
    server_id: 1,
    server_name: 'test',
    ssl: false,
    data: {
      Event: 'PeerStatus',
      Peer: `${channelType}/${peerName}`,
      PeerStatus: 'OK',
      Address: `${ipAddress}:${port}`,
      ...overrides,
    },
  }
}

describe('useAmiPeers', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])
    mockClient = createMockClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Initial State Tests
   * Verify composable starts with correct default values
   */
  describe('Initial State', () => {
    describe.each([
      {
        description: 'valid client',
        client: () => createMockClient(),
        expectedPeers: 0,
        expectedLoading: false,
        expectedError: null,
      },
      {
        description: 'null client',
        client: null,
        expectedPeers: 0,
        expectedLoading: false,
        expectedError: null,
      },
    ])('with $description', ({ client, expectedPeers, expectedLoading, expectedError }) => {
      it(`should initialize with ${expectedPeers} peers, loading=${expectedLoading}, error=${expectedError}`, () => {
        const actualClient = typeof client === 'function' ? client() : client
        const { peers, peerList, loading, error } = useAmiPeers(actualClient)

        expect(peers.value.size).toBe(expectedPeers)
        expect(peerList.value).toEqual([])
        expect(loading.value).toBe(expectedLoading)
        expect(error.value).toBe(expectedError)
      })
    })
  })

  describe('refresh', () => {
    it('should refresh all peers', async () => {
      const mockSipPeers: PeerInfo[] = [
        createMockPeer('1000', { channelType: 'SIP' }),
        createMockPeer('1001', { channelType: 'SIP' }),
      ]
      const mockPjsipPeers: PeerInfo[] = [
        createMockPeer('2000', { channelType: 'PJSIP' }),
      ]

      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockSipPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue(mockPjsipPeers)

      const { refresh, peers, peerList, loading, lastRefresh } = useAmiPeers(mockClient)

      expect(loading.value).toBe(false)

      const refreshPromise = refresh()
      expect(loading.value).toBe(true)

      await refreshPromise

      expect(loading.value).toBe(false)
      expect(peers.value.size).toBe(3)
      expect(peerList.value.length).toBe(3)
      expect(lastRefresh.value).toBeInstanceOf(Date)
    })

    it('should set error when client is null', async () => {
      const { refresh, error } = useAmiPeers(null)

      await refresh()

      expect(error.value).toBe('AMI client not connected')
    })

    it('should handle refresh errors gracefully with Promise.allSettled', async () => {
      // Note: The implementation uses Promise.allSettled which captures rejections
      // without throwing, so error.value remains null but peers remain empty
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { refresh, peers, loading } = useAmiPeers(mockClient)

      await refresh()

      // With Promise.allSettled, failed fetches are silently ignored
      expect(peers.value.size).toBe(0)
      expect(loading.value).toBe(false)
    })

    it('should apply peer filter', async () => {
      const mockPeers: PeerInfo[] = [
        createMockPeer('1000'),
        createMockPeer('trunk-provider1'),
        createMockPeer('1001'),
      ]

      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, peers, peerList } = useAmiPeers(mockClient, {
        peerFilter: (p) => !p.objectName.startsWith('trunk-'),
      })

      await refresh()

      expect(peers.value.size).toBe(2)
      expect(peerList.value.map(p => p.objectName)).not.toContain('trunk-provider1')
    })

    it('should only fetch SIP peers when includePjsip is false', async () => {
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue([createMockPeer('1000')])

      const { refresh } = useAmiPeers(mockClient, { includePjsip: false })

      await refresh()

      expect(mockClient.getSipPeers).toHaveBeenCalled()
      expect(mockClient.getPjsipEndpoints).not.toHaveBeenCalled()
    })

    it('should only fetch PJSIP peers when includeSip is false', async () => {
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([createMockPeer('2000', { channelType: 'PJSIP' })])

      const { refresh } = useAmiPeers(mockClient, { includeSip: false })

      await refresh()

      expect(mockClient.getSipPeers).not.toHaveBeenCalled()
      expect(mockClient.getPjsipEndpoints).toHaveBeenCalled()
    })
  })

  describe('refreshSipPeers', () => {
    it('should refresh SIP peers only', async () => {
      const mockPeers: PeerInfo[] = [createMockPeer('1000')]
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)

      const { refreshSipPeers, peers } = useAmiPeers(mockClient)

      await refreshSipPeers()

      expect(mockClient.getSipPeers).toHaveBeenCalled()
      expect(peers.value.get('1000')).toBeDefined()
    })

    it('should set error when client is null', async () => {
      const { refreshSipPeers, error } = useAmiPeers(null)

      await refreshSipPeers()

      expect(error.value).toBe('AMI client not connected')
    })
  })

  describe('refreshPjsipPeers', () => {
    it('should refresh PJSIP peers only', async () => {
      const mockPeers: PeerInfo[] = [createMockPeer('2000', { channelType: 'PJSIP' })]
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)

      const { refreshPjsipPeers, peers } = useAmiPeers(mockClient)

      await refreshPjsipPeers()

      expect(mockClient.getPjsipEndpoints).toHaveBeenCalled()
      expect(peers.value.get('2000')).toBeDefined()
    })

    it('should set error when client is null', async () => {
      const { refreshPjsipPeers, error } = useAmiPeers(null)

      await refreshPjsipPeers()

      expect(error.value).toBe('AMI client not connected')
    })
  })

  describe('getPeer', () => {
    it('should return peer by name', async () => {
      const mockPeers: PeerInfo[] = [createMockPeer('1000')]
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, getPeer } = useAmiPeers(mockClient)

      await refresh()

      const peer = getPeer('1000')
      expect(peer?.objectName).toBe('1000')
    })

    it('should return undefined for unknown peer', () => {
      const { getPeer } = useAmiPeers(mockClient)

      expect(getPeer('unknown')).toBeUndefined()
    })
  })

  /**
   * Online Status Detection Tests
   * Verify accurate peer online/offline status detection
   *
   * Status detection:
   * - Default online patterns: OK, Registered
   * - Custom online patterns via options
   * - Handles unknown peers gracefully
   * - Accepts both peer name string and peer object
   */
  describe('isOnline', () => {
    describe.each([
      {
        description: 'online peer with OK status',
        status: 'OK',
        expectedOnline: true,
      },
      {
        description: 'offline peer with UNREACHABLE status',
        status: 'UNREACHABLE',
        expectedOnline: false,
      },
      {
        description: 'offline peer with LAGGED status',
        status: 'LAGGED',
        expectedOnline: false,
      },
    ])('$description', ({ status, expectedOnline }) => {
      it(`should return ${expectedOnline}`, async () => {
        const mockPeers: PeerInfo[] = [createMockPeer('1000', { status: status as any })]
        ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
        ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

        const { refresh, isOnline } = useAmiPeers(mockClient)

        await refresh()

        expect(isOnline('1000')).toBe(expectedOnline)
      })
    })

    it('should return false for unknown peer', () => {
      const { isOnline } = useAmiPeers(mockClient)

      expect(isOnline('unknown')).toBe(false)
    })

    it('should accept peer object', async () => {
      const mockPeers: PeerInfo[] = [createMockPeer('1000', { status: 'OK' })]
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, isOnline, getPeer } = useAmiPeers(mockClient)

      await refresh()

      const peer = getPeer('1000')!
      expect(isOnline(peer)).toBe(true)
    })

    it('should use custom online patterns', async () => {
      const mockPeers: PeerInfo[] = [createMockPeer('1000', { status: 'Connected' })]
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, isOnline } = useAmiPeers(mockClient, {
        onlineStatusPatterns: ['Connected', 'Available'],
      })

      await refresh()

      expect(isOnline('1000')).toBe(true)
    })
  })

  describe('computed properties', () => {
    it('should compute sipPeers', async () => {
      const mockSipPeers: PeerInfo[] = [
        createMockPeer('1000', { channelType: 'SIP' }),
        createMockPeer('1001', { channelType: 'SIP' }),
      ]
      const mockPjsipPeers: PeerInfo[] = [
        createMockPeer('2000', { channelType: 'PJSIP' }),
      ]

      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockSipPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue(mockPjsipPeers)

      const { refresh, sipPeers } = useAmiPeers(mockClient)

      await refresh()
      await nextTick()

      expect(sipPeers.value.length).toBe(2)
      expect(sipPeers.value.every(p => p.channelType === 'SIP')).toBe(true)
    })

    it('should compute pjsipPeers', async () => {
      const mockSipPeers: PeerInfo[] = [
        createMockPeer('1000', { channelType: 'SIP' }),
      ]
      const mockPjsipPeers: PeerInfo[] = [
        createMockPeer('2000', { channelType: 'PJSIP' }),
        createMockPeer('2001', { channelType: 'PJSIP' }),
      ]

      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockSipPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue(mockPjsipPeers)

      const { refresh, pjsipPeers } = useAmiPeers(mockClient)

      await refresh()
      await nextTick()

      expect(pjsipPeers.value.length).toBe(2)
      expect(pjsipPeers.value.every(p => p.channelType === 'PJSIP')).toBe(true)
    })

    it('should compute onlinePeers', async () => {
      const mockPeers: PeerInfo[] = [
        createMockPeer('1000', { status: 'OK' }),
        createMockPeer('1001', { status: 'UNREACHABLE' }),
        createMockPeer('1002', { status: 'OK' }),
      ]

      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, onlinePeers } = useAmiPeers(mockClient)

      await refresh()
      await nextTick()

      expect(onlinePeers.value.length).toBe(2)
    })

    it('should compute offlinePeers', async () => {
      const mockPeers: PeerInfo[] = [
        createMockPeer('1000', { status: 'OK' }),
        createMockPeer('1001', { status: 'UNREACHABLE' }),
        createMockPeer('1002', { status: 'LAGGED' }),
      ]

      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, offlinePeers } = useAmiPeers(mockClient)

      await refresh()
      await nextTick()

      expect(offlinePeers.value.length).toBe(2)
    })

    it('should compute statusSummary', async () => {
      const mockPeers: PeerInfo[] = [
        createMockPeer('1000', { status: 'OK' }),
        createMockPeer('1001', { status: 'OK' }),
        createMockPeer('1002', { status: 'UNREACHABLE' }),
        createMockPeer('1003', { status: 'UNKNOWN' }),
      ]

      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, statusSummary } = useAmiPeers(mockClient)

      await refresh()
      await nextTick()

      expect(statusSummary.value.total).toBe(4)
      expect(statusSummary.value.online).toBe(2)
      expect(statusSummary.value.offline).toBe(1)
      expect(statusSummary.value.unknown).toBe(1)
    })
  })

  /**
   * Event Handling Tests
   * Verify real-time peer status event processing
   *
   * Event flow:
   * 1. AMI sends PeerStatus events for peer state changes
   * 2. Parser extracts peer name, status, and address
   * 3. Peer Map updated with new/changed peer info
   * 4. Optional onPeerUpdate callback invoked
   * 5. Peer filter applied to event-based peers
   */
  describe('Event Handling', () => {
    describe.each([
      {
        description: 'existing peer status update',
        setupPeer: true,
        peerName: '1000',
        channelType: 'SIP' as const,
        peerStatus: 'OK',
        address: TEST_FIXTURES.ipAddresses.alternate,
        expectedStatus: 'OK',
        expectedIp: TEST_FIXTURES.ipAddresses.alternate,
      },
      {
        description: 'new SIP peer registration',
        setupPeer: false,
        peerName: '1000',
        channelType: 'SIP' as const,
        peerStatus: 'Registered',
        address: TEST_FIXTURES.ipAddresses.local,
        expectedStatus: 'UNKNOWN', // Registered not in default status map
        expectedIp: TEST_FIXTURES.ipAddresses.local,
      },
      {
        description: 'new PJSIP peer registration',
        setupPeer: false,
        peerName: '2000',
        channelType: 'PJSIP' as const,
        peerStatus: 'OK',
        address: TEST_FIXTURES.ipAddresses.remote,
        expectedStatus: 'OK',
        expectedIp: TEST_FIXTURES.ipAddresses.remote,
      },
    ])('$description', ({ setupPeer, peerName, channelType, peerStatus, address, expectedStatus, expectedIp }) => {
      it('should update peer state correctly', async () => {
        const onPeerUpdate = vi.fn()
        const { peers } = useAmiPeers(mockClient, { onPeerUpdate })

        if (setupPeer) {
          peers.value.set(peerName, createMockPeer(peerName, { status: 'UNREACHABLE' }))
        }

        const event = createMockPeerStatusEvent(peerName, {
          channelType,
          PeerStatus: peerStatus,
          Address: `${address}:${channelType === 'PJSIP' ? TEST_FIXTURES.ports.pjsip : TEST_FIXTURES.ports.sip}`,
        })

        triggerClientEvent('peerStatus', event)
        await nextTick()

        expect(peers.value.has(peerName)).toBe(true)
        const peer = peers.value.get(peerName)
        expect(peer?.channelType).toBe(channelType)
        expect(peer?.status).toBe(expectedStatus)
        expect(peer?.ipAddress).toBe(expectedIp)
        expect(onPeerUpdate).toHaveBeenCalled()
      })
    })

    it('should apply filter to event-based peers', async () => {
      const { peers } = useAmiPeers(mockClient, {
        peerFilter: (p) => !p.objectName.startsWith('trunk-'),
      })

      const event = createMockPeerStatusEvent('trunk-provider1', {
        Address: `${TEST_FIXTURES.ipAddresses.trunk}:${TEST_FIXTURES.ports.sip}`,
      })

      triggerClientEvent('peerStatus', event)
      await nextTick()

      expect(peers.value.has('trunk-provider1')).toBe(false)
    })
  })
})
