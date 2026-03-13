import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMultiSipClient, type MultiSipAccountConfig } from '../useMultiSipClient'

// Mock dependencies
vi.mock('../useCallHistory', () => ({
  useCallHistory: () => ({
    history: { value: [] },
    clearHistory: vi.fn(),
    getRecentCalls: vi.fn(() => []),
  }),
}))

vi.mock('../useCallSession', () => ({
  useCallSession: vi.fn(() => ({
    state: { value: 'idle' },
    direction: { value: 'outgoing' },
    remoteUri: { value: null },
    remoteDisplayName: { value: null },
    session: { value: null },
    makeCall: vi.fn(),
    answer: vi.fn(),
    reject: vi.fn(),
    hangup: vi.fn(),
  })),
}))

vi.mock('../useMediaDevices', () => ({
  useMediaDevices: vi.fn(() => ({})),
}))

vi.mock('../useSipClient', () => ({
  useSipClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: { value: false },
    isRegistered: { value: false },
    isConnecting: { value: false },
    error: { value: null },
    updateConfig: vi.fn(),
    getClient: vi.fn(),
  })),
}))

vi.mock('../core/EventBus', () => ({
  EventBus: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}))

vi.mock('../core/MediaManager', () => ({
  MediaManager: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('../utils/formatters', () => ({
  buildSipUri: vi.fn((target: string, domain: string) => `sip:${target}@${domain}`),
  extractSipDomain: vi.fn((uri: string) => {
    const match = uri.match(/@([^;]+)/)
    return match ? match[1] : null
  }),
}))

describe('useMultiSipClient', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with empty accounts', () => {
    const { accounts, outboundAccountId, stats } = useMultiSipClient()
    expect(accounts.value.size).toBe(0)
    expect(outboundAccountId.value).toBeNull()
    expect(stats.value.totalAccounts).toBe(0)
  })

  it('should add an account successfully', async () => {
    const { addAccount, accounts, outboundAccountId } = useMultiSipClient()

    const config: MultiSipAccountConfig = {
      id: 'account-1',
      name: 'Test Account',
      sip: {
        uri: 'sip:1001@test.example.com',
        password: 'secret',
        server: 'wss://test.example.com/ws',
      },
      outboundCapable: true,
    }

    const account = await addAccount(config)

    expect(account.id).toBe('account-1')
    expect(account.name).toBe('Test Account')
    expect(accounts.value.size).toBe(1)
    expect(outboundAccountId.value).toBe('account-1') // First outbound-capable account auto-selected
  })

  it('should throw when adding duplicate account', async () => {
    const { addAccount } = useMultiSipClient()

    const config: MultiSipAccountConfig = {
      id: 'account-1',
      name: 'Test Account',
      sip: {
        uri: 'sip:1001@test.example.com',
        password: 'secret',
        server: 'wss://test.example.com/ws',
      },
    }

    await addAccount(config)

    await expect(addAccount(config)).rejects.toThrow('Account with ID account-1 already exists')
  })

  it('should remove an account successfully', async () => {
    const { addAccount, removeAccount, accounts } = useMultiSipClient()

    const config: MultiSipAccountConfig = {
      id: 'account-1',
      name: 'Test Account',
      sip: {
        uri: 'sip:1001@test.example.com',
        password: 'secret',
        server: 'wss://test.example.com/ws',
      },
      outboundCapable: true,
    }

    await addAccount(config)
    expect(accounts.value.size).toBe(1)

    await removeAccount('account-1')
    expect(accounts.value.size).toBe(0)
  })

  it('should set outbound account', async () => {
    const { addAccount, setOutboundAccount, outboundAccountId } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    await addAccount({
      id: 'account-2',
      name: 'Account 2',
      sip: { uri: 'sip:1002@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    setOutboundAccount('account-2')
    expect(outboundAccountId.value).toBe('account-2')
  })

  it('should throw when setting invalid outbound account', () => {
    const { setOutboundAccount } = useMultiSipClient()

    expect(() => setOutboundAccount('non-existent')).toThrow('Account non-existent not found')
  })

  it('should compute account list correctly', async () => {
    const { addAccount, accountList } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    await addAccount({
      id: 'account-2',
      name: 'Account 2',
      sip: { uri: 'sip:1002@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: false,
    })

    const list = accountList.value
    expect(list).toHaveLength(2)
    expect(list[0].isOutbound).toBe(true)
    expect(list[1].isOutbound).toBe(false)
  })

  it('should compute stats correctly', async () => {
    const { addAccount, stats } = useMultiSipClient()

    expect(stats.value.totalAccounts).toBe(0)
    expect(stats.value.hasOutboundAccount).toBe(false)

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    expect(stats.value.totalAccounts).toBe(1)
    expect(stats.value.hasOutboundAccount).toBe(true)
  })

  it('should throw when making call without outbound account', async () => {
    const { makeCall } = useMultiSipClient()

    await expect(makeCall('sip:2000@test.com')).rejects.toThrow('No outbound account selected')
  })

  it('should throw when making call to non-existent account', async () => {
    const { makeCall, addAccount } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    await expect(makeCall('sip:2000@test.com', 'non-existent')).rejects.toThrow(
      'Account non-existent not found'
    )
  })
})
