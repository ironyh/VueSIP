
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'

// Mock dependencies
vi.mock('jssip', () => ({
  default: {
    UA: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
      on: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
      isRegistered: vi.fn().mockReturnValue(true),
    })),
    WebSocketInterface: vi.fn(),
    debug: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
  },
}))

vi.mock('@/core/MediaManager', () => ({
  MediaManager: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
  })),
}))

describe('SipClient Delegation', () => {
  let sipClient: any
  let mockEventBus: any
  let config: SipClientConfig

  beforeEach(() => {
    config = {
      sipUri: 'sip:user@domain.com',
      password: 'password',
      wsUrl: 'wss://sip.domain.com',
    }
    mockEventBus = createEventBus()
    sipClient = createSipClient(config, mockEventBus)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should delegate transfer to active call session', async () => {
    const mockSession = {
      transfer: vi.fn().mockResolvedValue(undefined),
    }
    sipClient.activeCalls.set('call-1', mockSession)

    await sipClient.transfer('sip:target@domain.com', ['X-Header: value'])

    expect(mockSession.transfer).toHaveBeenCalledWith('sip:target@domain.com', ['X-Header: value'])
  })

  it('should throw error if no active call for transfer', async () => {
    await expect(sipClient.transfer('sip:target@domain.com')).rejects.toThrow('No active call to transfer')
  })

  it('should delegate hold to active call session', async () => {
    const mockSession = {
      hold: vi.fn().mockResolvedValue(undefined),
    }
    sipClient.activeCalls.set('call-1', mockSession)

    await sipClient.hold()

    expect(mockSession.hold).toHaveBeenCalled()
  })

  it('should throw error if no active call for hold', async () => {
    await expect(sipClient.hold()).rejects.toThrow('No active call to hold')
  })

  it('should delegate unhold to active call session', async () => {
    const mockSession = {
      unhold: vi.fn().mockResolvedValue(undefined),
    }
    sipClient.activeCalls.set('call-1', mockSession)

    await sipClient.unhold()

    expect(mockSession.unhold).toHaveBeenCalled()
  })

  it('should delegate hangup to active call session', async () => {
    const mockSession = {
      hangup: vi.fn().mockResolvedValue(undefined),
    }
    sipClient.activeCalls.set('call-1', mockSession)

    await sipClient.hangup()

    expect(mockSession.hangup).toHaveBeenCalled()
  })

  it('should handle hangup when no active call gracefully (warn only)', async () => {
    // Current implementation warns and returns
    vi.spyOn(console, 'warn').mockImplementation(() => {}) // or use logger mock if possible, but logger is internal
    // Actually we can't easily spy on internal logger.
    // But we expect it NOT to throw.
    await expect(sipClient.hangup()).resolves.toBeUndefined()
  })
})
