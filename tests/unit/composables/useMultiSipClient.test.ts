/**
 * useMultiSipClient composable unit tests - structural test
 *
 * Tests the interface and basic operations without full composable setup
 * due to complex dependency chain.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import type { SipClientConfig } from '@/types/config.types'
import type { CallState } from '@/types/call.types'

// Test the types and basic structure without full composable
describe('useMultiSipClient types', () => {
  it('should export MultiSipAccountConfig interface', () => {
    // This just verifies the module can be imported and has expected exports
    const config: import('@/composables/useMultiSipClient').MultiSipAccountConfig = {
      id: 'test',
      name: 'Test',
      sip: {
        sipUri: 'sip:test@example.com',
        password: 'test',
      } as SipClientConfig,
    }
    expect(config.id).toBe('test')
  })

  it('should export MultiSipAccountInstance interface', () => {
    const instance: import('@/composables/useMultiSipClient').MultiSipAccountInstance = {
      id: 'test',
      name: 'Test',
      config: {
        id: 'test',
        name: 'Test',
        sip: {
          sipUri: 'sip:test@example.com',
          password: 'test',
        } as SipClientConfig,
      },
      // These would normally be composable returns
      sipClient: {} as any,
      callSession: {} as any,
      isConnected: computed(() => false),
      isRegistered: computed(() => false),
      isConnecting: computed(() => false),
      error: ref(null),
    }
    expect(instance.id).toBe('test')
  })

  it('should export MultiSipAccountListItem interface', () => {
    const item: import('@/composables/useMultiSipClient').MultiSipAccountListItem = {
      id: 'test',
      name: 'Test',
      isConnected: false,
      isRegistered: false,
      isConnecting: false,
      isOutbound: false,
      callState: 'idle' as CallState,
      error: null,
    }
    expect(item.callState).toBe('idle')
  })
})

// Now test the composable with full mocking
vi.mock('@/composables/useCallHistory', () => ({
  useCallHistory: () => ({
    history: ref([]),
    clearHistory: vi.fn(),
    getRecentCalls: vi.fn().mockReturnValue([]),
  }),
}))

vi.mock('@/composables/useCallSession', () => ({
  useCallSession: vi.fn(() => ({
    state: ref('idle'),
    direction: ref('incoming'),
    remoteUri: ref(null),
    remoteDisplayName: ref(null),
    session: ref(null),
    makeCall: vi.fn(),
    answer: vi.fn(),
    reject: vi.fn(),
    hangup: vi.fn(),
  })),
}))

vi.mock('@/composables/useMediaDevices', () => ({
  useMediaDevices: vi.fn(() => ({
    devices: ref([]),
    selectedInputDevice: ref(null),
    selectedOutputDevice: ref(null),
  })),
}))

vi.mock('@/composables/useSipClient', () => ({
  useSipClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: ref(false),
    isRegistered: ref(false),
    isConnecting: ref(false),
    error: ref(null),
    updateConfig: vi.fn(),
    getClient: vi.fn().mockReturnValue(null),
  })),
}))

vi.mock('@/utils/formatters', () => ({
  buildSipUri: vi.fn((target: string, domain: string) => `sip:${target}@${domain}`),
  extractSipDomain: vi.fn((uri: string) => {
    const match = uri.match(/@([^;]+)/)
    return match ? match[1] : null
  }),
}))

import { useMultiSipClient, type MultiSipAccountConfig } from '@/composables/useMultiSipClient'

describe('useMultiSipClient composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { accounts, outboundAccountId, activeCallAccountId, stats, accountList, incomingCalls } =
      useMultiSipClient()

    expect(accounts.value.size).toBe(0)
    expect(outboundAccountId.value).toBeNull()
    expect(activeCallAccountId.value).toBeNull()
    expect(stats.value.totalAccounts).toBe(0)
    expect(accountList.value).toEqual([])
    expect(incomingCalls.value).toEqual([])
  })

  it('should provide correct initial stats', () => {
    const { stats } = useMultiSipClient()

    expect(stats.value).toEqual({
      totalAccounts: 0,
      connectedAccounts: 0,
      registeredAccounts: 0,
      hasOutboundAccount: false,
      hasIncomingCall: false,
      hasActiveCall: false,
    })
  })

  it('should add account and auto-select as outbound', async () => {
    const { addAccount, accounts, outboundAccountId, outboundAccount } = useMultiSipClient()

    const config: MultiSipAccountConfig = {
      id: 'account-1',
      name: 'Test Account',
      sip: {
        sipUri: 'sip:test@example.com',
        password: 'password',
      } as SipClientConfig,
      outboundCapable: true,
    }

    const account = await addAccount(config)

    expect(account.id).toBe('account-1')
    expect(account.name).toBe('Test Account')
    expect(accounts.value.size).toBe(1)
    expect(outboundAccountId.value).toBe('account-1')
    expect(outboundAccount.value?.id).toBe('account-1')
  })

  it('should throw on duplicate account', async () => {
    const { addAccount } = useMultiSipClient()

    const config: MultiSipAccountConfig = {
      id: 'account-1',
      name: 'Test Account',
      sip: {
        sipUri: 'sip:test@example.com',
        password: 'password',
      } as SipClientConfig,
    }

    await addAccount(config)
    await expect(addAccount(config)).rejects.toThrow('Account with ID account-1 already exists')
  })

  it('should select next outbound account when one is removed', async () => {
    const { addAccount, removeAccount, outboundAccountId } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { sipUri: 'sip:test1@example.com', password: 'pass' } as SipClientConfig,
      outboundCapable: true,
    })
    await addAccount({
      id: 'account-2',
      name: 'Account 2',
      sip: { sipUri: 'sip:test2@example.com', password: 'pass' } as SipClientConfig,
      outboundCapable: true,
    })

    expect(outboundAccountId.value).toBe('account-1')

    await removeAccount('account-1')

    expect(outboundAccountId.value).toBe('account-2')
  })

  it('should clear outbound when last account removed', async () => {
    const { addAccount, removeAccount, outboundAccountId } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { sipUri: 'sip:test1@example.com', password: 'pass' } as SipClientConfig,
    })

    expect(outboundAccountId.value).toBe('account-1')

    await removeAccount('account-1')

    expect(outboundAccountId.value).toBeNull()
  })

  it('should set outbound account manually', async () => {
    const { addAccount, setOutboundAccount, outboundAccountId } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { sipUri: 'sip:test1@example.com', password: 'pass' } as SipClientConfig,
    })
    await addAccount({
      id: 'account-2',
      name: 'Account 2',
      sip: { sipUri: 'sip:test2@example.com', password: 'pass' } as SipClientConfig,
    })

    setOutboundAccount('account-2')

    expect(outboundAccountId.value).toBe('account-2')
  })

  it('should throw for invalid outbound account', async () => {
    const { setOutboundAccount } = useMultiSipClient()

    expect(() => setOutboundAccount('non-existent')).toThrow('Account non-existent not found')
  })

  it('should return account list with correct structure', async () => {
    const { addAccount, accountList } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Test Account',
      sip: { sipUri: 'sip:test@example.com', password: 'pass' } as SipClientConfig,
    })

    const list = accountList.value
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      id: 'account-1',
      name: 'Test Account',
      isConnected: false,
      isRegistered: false,
      isConnecting: false,
      isOutbound: true,
      callState: 'idle',
      error: null,
    })
  })

  it('should handle hangup with no active call', async () => {
    const { hangup } = useMultiSipClient()

    await expect(hangup()).resolves.not.toThrow()
  })

  it('should allow multiple accounts', async () => {
    const { addAccount, accounts, stats } = useMultiSipClient()

    await addAccount({
      id: 'account-1',
      name: 'Account 1',
      sip: { sipUri: 'sip:test1@example.com', password: 'pass' } as SipClientConfig,
    })
    await addAccount({
      id: 'account-2',
      name: 'Account 2',
      sip: { sipUri: 'sip:test2@example.com', password: 'pass' } as SipClientConfig,
    })
    await addAccount({
      id: 'account-3',
      name: 'Account 3',
      sip: { sipUri: 'sip:test3@example.com', password: 'pass' } as SipClientConfig,
    })

    expect(accounts.value.size).toBe(3)
    expect(stats.value.totalAccounts).toBe(3)
  })
})
