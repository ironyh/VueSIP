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
  // Helper to get account after addAccount - provides type safety without non-null assertion
  function getTestAccount(accounts: Map<string, unknown>) {
    const account = accounts.get('account-1')
    if (!account) {
      throw new Error('Test account account-1 not found')
    }
    return account as NonNullable<typeof account>
  }

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

  it('should throw when making call from unregistered account', async () => {
    const { makeCall, addAccount } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    // Account exists but is not registered - mock isRegistered to false
    await expect(makeCall('sip:2000@test.com', 'account-1')).rejects.toThrow(
      'Account Account 1 is not registered'
    )
  })

  it('should auto-select first outbound-capable account', async () => {
    const { addAccount, outboundAccountId } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: false, // Not outbound capable
    })

    // Should still be null since no outbound-capable account
    expect(outboundAccountId.value).toBeNull()

    await addAccount({
      id: 'account-2',
      name: 'Account 2',
      sip: { uri: 'sip:1002@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    // Now should auto-select account-2
    expect(outboundAccountId.value).toBe('account-2')
  })

  it('should auto-select next outbound account after removal', async () => {
    const { addAccount, removeAccount, outboundAccountId } = useMultiSipClient()

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

    expect(outboundAccountId.value).toBe('account-1')

    // Remove account-1, should auto-select account-2
    await removeAccount('account-1')
    expect(outboundAccountId.value).toBe('account-2')
  })

  it('should answer call on specified account', async () => {
    const { addAccount, answerCall, accounts } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    const account = getTestAccount(accounts.value)
    const answerSpy = vi.spyOn(account.callSession, 'answer')

    await answerCall('account-1')
    expect(answerSpy).toHaveBeenCalled()
  })

  it('should throw when answering call on non-existent account', async () => {
    const { answerCall } = useMultiSipClient()

    await expect(answerCall('non-existent')).rejects.toThrow('Account non-existent not found')
  })

  it('should reject call on specified account', async () => {
    const { addAccount, rejectCall, accounts } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    const account = getTestAccount(accounts.value)
    const rejectSpy = vi.spyOn(account.callSession, 'reject')

    await rejectCall('account-1')
    expect(rejectSpy).toHaveBeenCalled()
  })

  it('should throw when rejecting call on non-existent account', async () => {
    const { rejectCall } = useMultiSipClient()

    await expect(rejectCall('non-existent')).rejects.toThrow('Account non-existent not found')
  })

  it('should hangup active call', async () => {
    const { addAccount, makeCall, hangup, accounts, activeCallAccountId } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'wss://test.com/ws', sipUri: 'sip:1001@test.com', password: 'secret' },
      outboundCapable: true,
    })

    const account = getTestAccount(accounts.value)
    // Mock isRegistered to return true so makeCall works
    vi.spyOn(account.isRegistered, 'value', 'get').mockReturnValue(true)
    vi.spyOn(account.callSession, 'makeCall').mockResolvedValue()
    vi.spyOn(account.callSession.state, 'value', 'get').mockReturnValue('active')

    await makeCall('sip:2000@test.com')
    expect(activeCallAccountId.value).toBe('account-1')

    const hangupSpy = vi.spyOn(account.callSession, 'hangup')
    await hangup()
    expect(hangupSpy).toHaveBeenCalled()
  })

  it('should not throw when hanging up with no active call', async () => {
    const { hangup } = useMultiSipClient()

    await expect(hangup()).resolves.not.toThrow()
  })

  it('should compute activeAccount correctly', async () => {
    const { addAccount, makeCall, activeAccount, accounts, activeCallAccountId } =
      useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'wss://test.com/ws', sipUri: 'sip:1001@test.com', password: 'secret' },
      outboundCapable: true,
    })

    const account = getTestAccount(accounts.value)
    // Mock isRegistered to return true so makeCall works
    vi.spyOn(account.isRegistered, 'value', 'get').mockReturnValue(true)
    vi.spyOn(account.callSession, 'makeCall').mockResolvedValue()
    vi.spyOn(account.callSession.state, 'value', 'get').mockReturnValue('active')

    expect(activeAccount.value).toBeNull()
    expect(activeCallAccountId.value).toBeNull()

    await makeCall('sip:2000@test.com')
    expect(activeCallAccountId.value).toBe('account-1')
    expect(activeAccount.value).not.toBeNull()
    expect(activeAccount.value?.id).toBe('account-1')
  })

  it('should compute incomingCalls correctly', async () => {
    const { addAccount, incomingCalls, accounts } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    const account = getTestAccount(accounts.value)
    // Mock incoming ringing call
    vi.spyOn(account.callSession.state, 'value', 'get').mockReturnValue('ringing')
    vi.spyOn(account.callSession.direction, 'value', 'get').mockReturnValue('incoming')
    vi.spyOn(account.callSession.remoteUri, 'value', 'get').mockReturnValue('sip:caller@test.com')
    vi.spyOn(account.callSession.remoteDisplayName, 'value', 'get').mockReturnValue('Test Caller')

    const calls = incomingCalls.value
    expect(calls).toHaveLength(1)
    expect(calls[0].accountId).toBe('account-1')
    expect(calls[0].accountName).toBe('Account 1')
    expect(calls[0].remoteUri).toBe('sip:caller@test.com')
    expect(calls[0].remoteDisplayName).toBe('Test Caller')
  })

  it('should compute stats with multiple accounts', async () => {
    const { addAccount, stats, accounts } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { uri: 'sip:1001@test.com', password: 'secret', server: 'wss://test.com/ws' },
      outboundCapable: true,
    })

    const account = getTestAccount(accounts.value)
    vi.spyOn(account.isConnected, 'value', 'get').mockReturnValue(true)
    vi.spyOn(account.isRegistered, 'value', 'get').mockReturnValue(true)

    const s = stats.value
    expect(s.totalAccounts).toBe(1)
    expect(s.connectedAccounts).toBe(1)
    expect(s.registeredAccounts).toBe(1)
    expect(s.hasOutboundAccount).toBe(true)
    expect(s.hasActiveCall).toBe(false)
  })
})
