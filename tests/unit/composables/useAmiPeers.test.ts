/**
 * useAmiPeers composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiPeers } from '@/composables/useAmiPeers'
import type { AmiClient } from '@/core/AmiClient'
import type { PeerInfo, AmiMessage, AmiPeerStatusEvent } from '@/types/ami.types'

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

// Create mock AMI client
const createMockClient = (): AmiClient => {
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
  } as unknown as AmiClient
}

// Helper to trigger client events
function triggerClientEvent(event: string, ...args: unknown[]) {
  eventHandlers[event]?.forEach(handler => handler(...args))
}

// Helper to create mock peer
function createMockPeer(objectName: string, overrides?: Partial<PeerInfo>): PeerInfo {
  return {
    objectName,
    channelType: 'SIP',
    ipAddress: '192.168.1.100',
    port: 5060,
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

  describe('initial state', () => {
    it('should have empty peers initially', () => {
      const { peers, peerList } = useAmiPeers(mockClient)

      expect(peers.value.size).toBe(0)
      expect(peerList.value).toEqual([])
    })

    it('should have loading as false initially', () => {
      const { loading } = useAmiPeers(mockClient)

      expect(loading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiPeers(mockClient)

      expect(error.value).toBeNull()
    })

    it('should handle null client gracefully', () => {
      const { peers, error } = useAmiPeers(null)

      expect(peers.value.size).toBe(0)
      expect(error.value).toBeNull()
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

  describe('isOnline', () => {
    it('should return true for online peer', async () => {
      const mockPeers: PeerInfo[] = [createMockPeer('1000', { status: 'OK' })]
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, isOnline } = useAmiPeers(mockClient)

      await refresh()

      expect(isOnline('1000')).toBe(true)
    })

    it('should return false for offline peer', async () => {
      const mockPeers: PeerInfo[] = [createMockPeer('1000', { status: 'UNREACHABLE' })]
      ;(mockClient.getSipPeers as ReturnType<typeof vi.fn>).mockResolvedValue(mockPeers)
      ;(mockClient.getPjsipEndpoints as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { refresh, isOnline } = useAmiPeers(mockClient)

      await refresh()

      expect(isOnline('1000')).toBe(false)
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

  describe('event handling', () => {
    it('should handle peer status events for existing peer', async () => {
      const onPeerUpdate = vi.fn()
      const { peers } = useAmiPeers(mockClient, { onPeerUpdate })

      // Add existing peer
      peers.value.set('1000', createMockPeer('1000', { status: 'UNREACHABLE' }))

      const event: AmiMessage<AmiPeerStatusEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerStatus',
          Peer: 'SIP/1000',
          PeerStatus: 'OK',
          Address: '192.168.1.101:5060',
        },
      }

      triggerClientEvent('peerStatus', event)
      await nextTick()

      const peer = peers.value.get('1000')
      expect(peer?.status).toBe('OK')
      expect(peer?.ipAddress).toBe('192.168.1.101')
      expect(peer?.port).toBe(5060)
      expect(onPeerUpdate).toHaveBeenCalled()
    })

    it('should handle peer status events for new peer', async () => {
      const onPeerUpdate = vi.fn()
      const { peers } = useAmiPeers(mockClient, { onPeerUpdate })

      const event: AmiMessage<AmiPeerStatusEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerStatus',
          Peer: 'SIP/1000',
          PeerStatus: 'Registered',
          Address: '192.168.1.100:5060',
        },
      }

      triggerClientEvent('peerStatus', event)
      await nextTick()

      expect(peers.value.has('1000')).toBe(true)
      const peer = peers.value.get('1000')
      expect(peer?.channelType).toBe('SIP')
      expect(peer?.status).toBe('UNKNOWN') // Registered is not in default status map
      expect(onPeerUpdate).toHaveBeenCalled()
    })

    it('should handle PJSIP peer status events', async () => {
      const { peers } = useAmiPeers(mockClient)

      const event: AmiMessage<AmiPeerStatusEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerStatus',
          Peer: 'PJSIP/2000',
          PeerStatus: 'OK',
          Address: '192.168.1.200:5061',
        },
      }

      triggerClientEvent('peerStatus', event)
      await nextTick()

      expect(peers.value.has('2000')).toBe(true)
      expect(peers.value.get('2000')?.channelType).toBe('PJSIP')
    })

    it('should apply filter to event-based peers', async () => {
      const { peers } = useAmiPeers(mockClient, {
        peerFilter: (p) => !p.objectName.startsWith('trunk-'),
      })

      const event: AmiMessage<AmiPeerStatusEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'PeerStatus',
          Peer: 'SIP/trunk-provider1',
          PeerStatus: 'OK',
          Address: '10.0.0.1:5060',
        },
      }

      triggerClientEvent('peerStatus', event)
      await nextTick()

      expect(peers.value.has('trunk-provider1')).toBe(false)
    })
  })
})
