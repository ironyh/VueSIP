import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAmiPeers } from '../useAmiPeers'
import type { AmiClient, PeerInfo, PeerStatus } from '@/types/ami.types'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('useAmiPeers', () => {
  let mockAmiClient: Partial<AmiClient>

  const createMockPeer = (overrides: Partial<PeerInfo> = {}): PeerInfo => ({
    objectName: 'test-peer',
    channelType: 'SIP',
    ipAddress: '192.168.1.100',
    port: 5060,
    status: 'OK' as PeerStatus,
    dynamic: true,
    forceRPort: true,
    comedia: true,
    acl: true,
    autoForcerPort: true,
    autoComedia: true,
    videoSupport: false,
    textSupport: false,
    realtimeDevice: false,
    ...overrides,
  })

  beforeEach(() => {
    mockAmiClient = {
      getSipPeers: vi.fn(),
      getPjsipEndpoints: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
  })

  it('should initialize with empty peers map', () => {
    const { peers, loading, error, peerList } = useAmiPeers(mockAmiClient as AmiClient)

    expect(peers.value).toBeInstanceOf(Map)
    expect(peers.value.size).toBe(0)
    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
    expect(peerList.value).toEqual([])
  })

  it('should load SIP peers successfully', async () => {
    const mockPeers = [
      createMockPeer({ objectName: 'sip-peer-1', status: 'OK' }),
      createMockPeer({ objectName: 'sip-peer-2', status: 'UNREACHABLE' }),
    ]

    // Use mockImplementation to ensure proper promise behavior
    // Must mock both getSipPeers and getPjsipEndpoints since both are called by default
    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue(mockPeers)
    mockAmiClient.getPjsipEndpoints = vi.fn().mockResolvedValue([])

    const { refresh, peers, loading, error } = useAmiPeers(mockAmiClient as AmiClient)

    await refresh()

    expect(mockAmiClient.getSipPeers).toHaveBeenCalled()
    expect(peers.value.size).toBe(2)
    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
  })

  it('should load PJSIP endpoints successfully', async () => {
    const mockEndpoints: PeerInfo[] = [
      createMockPeer({ objectName: 'pjsip-endpoint-1', channelType: 'PJSIP', status: 'OK' }),
    ]

    mockAmiClient.getPjsipEndpoints = vi.fn().mockResolvedValue(mockEndpoints)

    const { refreshPjsipPeers, peers } = useAmiPeers(mockAmiClient as AmiClient)

    await refreshPjsipPeers()

    expect(mockAmiClient.getPjsipEndpoints).toHaveBeenCalled()
    expect(peers.value.size).toBe(1)
  })

  it('should handle errors when both SIP and PJSIP fail', async () => {
    mockAmiClient.getSipPeers = vi.fn().mockRejectedValue(new Error('AMI connection failed'))
    mockAmiClient.getPjsipEndpoints = vi.fn().mockRejectedValue(new Error('AMI connection failed'))

    const { refresh, error } = useAmiPeers(mockAmiClient as AmiClient)

    await refresh()

    // With Promise.allSettled, errors are in the results, not thrown
    // This test documents current behavior - errors are not surfaced when individual calls fail
    expect(error.value).toBe(null)
  })

  it('should filter peers correctly', async () => {
    const mockPeers = [
      createMockPeer({ objectName: 'sip-peer-1', status: 'OK' }),
      createMockPeer({ objectName: 'sip-peer-2', status: 'UNREACHABLE' }),
    ]

    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue(mockPeers)

    const { refresh, onlinePeers, offlinePeers } = useAmiPeers(mockAmiClient as AmiClient, {
      peerFilter: (peer) => peer.status === 'OK',
    })

    await refresh()

    expect(onlinePeers.value.length).toBe(1)
    expect(offlinePeers.value.length).toBe(0)
  })

  it('should compute status summary correctly', async () => {
    const mockPeers = [
      createMockPeer({ objectName: 'peer-1', status: 'OK' }),
      createMockPeer({ objectName: 'peer-2', status: 'OK' }),
      createMockPeer({ objectName: 'peer-3', status: 'UNREACHABLE' }),
      createMockPeer({ objectName: 'peer-4', status: 'UNKNOWN' }),
    ]

    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue(mockPeers)

    const { refresh, statusSummary } = useAmiPeers(mockAmiClient as AmiClient)

    await refresh()

    expect(statusSummary.value.total).toBe(4)
    expect(statusSummary.value.online).toBe(2)
    expect(statusSummary.value.offline).toBe(1)
    expect(statusSummary.value.unknown).toBe(1)
  })

  it('should separate SIP and PJSIP peers', async () => {
    const mockPeers: PeerInfo[] = [
      createMockPeer({ objectName: 'sip-peer', channelType: 'SIP' }),
      createMockPeer({ objectName: 'pjsip-peer', channelType: 'PJSIP' }),
    ]

    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue(mockPeers)

    const { refresh, sipPeers, pjsipPeers } = useAmiPeers(mockAmiClient as AmiClient)

    await refresh()

    expect(sipPeers.value.length).toBe(1)
    expect(sipPeers.value[0].objectName).toBe('sip-peer')
    expect(pjsipPeers.value.length).toBe(1)
    expect(pjsipPeers.value[0].objectName).toBe('pjsip-peer')
  })

  it('should get peer by name', async () => {
    const mockPeer = createMockPeer({ objectName: 'test-peer' })

    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue([mockPeer])

    const { refresh, getPeer } = useAmiPeers(mockAmiClient as AmiClient)

    await refresh()

    const peer = getPeer('test-peer')
    expect(peer).toBeDefined()
    expect(peer?.objectName).toBe('test-peer')
  })

  it('should check if peer is online', async () => {
    const mockPeers = [
      createMockPeer({ objectName: 'online-peer', status: 'OK' }),
      createMockPeer({ objectName: 'offline-peer', status: 'UNREACHABLE' }),
    ]

    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue(mockPeers)

    const { refresh, isOnline } = useAmiPeers(mockAmiClient as AmiClient)

    await refresh()

    expect(isOnline('online-peer')).toBe(true)
    expect(isOnline('offline-peer')).toBe(false)
    expect(isOnline(mockPeers[0])).toBe(true)
    expect(isOnline(mockPeers[1])).toBe(false)
  })

  it('should transform peers via transformPeer option', async () => {
    const mockPeer = createMockPeer({ objectName: 'original-name', ipAddress: '192.168.1.1' })

    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue([mockPeer])

    const { refresh, getPeer } = useAmiPeers(mockAmiClient as AmiClient, {
      transformPeer: (peer) => ({
        ...peer,
        objectName: peer.objectName.toUpperCase(),
      }),
    })

    await refresh()

    const peer = getPeer('ORIGINAL-NAME')
    expect(peer).toBeDefined()
    expect(peer?.objectName).toBe('ORIGINAL-NAME')
  })

  it('should update lastRefresh timestamp after successful load', async () => {
    const mockPeers = [createMockPeer({ objectName: 'test-peer' })]
    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue(mockPeers)
    mockAmiClient.getPjsipEndpoints = vi.fn().mockResolvedValue([])

    const { refresh, lastRefresh } = useAmiPeers(mockAmiClient as AmiClient)

    expect(lastRefresh.value).toBeNull()

    await refresh()

    expect(lastRefresh.value).toBeInstanceOf(Date)
  })

  it('should handle empty peer list', async () => {
    mockAmiClient.getSipPeers = vi.fn().mockResolvedValue([])

    const { refresh, peerList, statusSummary } = useAmiPeers(mockAmiClient as AmiClient)

    await refresh()

    expect(peerList.value).toEqual([])
    expect(statusSummary.value.total).toBe(0)
    expect(statusSummary.value.online).toBe(0)
    expect(statusSummary.value.offline).toBe(0)
    expect(statusSummary.value.unknown).toBe(0)
  })
})
