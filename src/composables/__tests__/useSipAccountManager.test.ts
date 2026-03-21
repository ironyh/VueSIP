/**
 * useSipAccountManager composable tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useSipAccountManager } from '../useSipAccountManager'
import type { SipAccount } from '../../stores/settingsStore'
import type { SettingsSchema } from '../../stores/settingsStore'

// Mock useMultiSipClient
interface MockAccountState {
  id: string
  name: string
  sip: unknown
  outboundCapable: boolean
  status: string
}
const mockAccounts = new Map<string, MockAccountState>()
const mockAddAccount = vi.fn().mockResolvedValue(undefined)
const mockRemoveAccount = vi.fn().mockResolvedValue(undefined)
const mockSetOutboundAccount = vi.fn()

vi.mock('../useMultiSipClient', () => ({
  useMultiSipClient: () => ({
    accounts: ref(mockAccounts),
    addAccount: mockAddAccount,
    removeAccount: mockRemoveAccount,
    setOutboundAccount: mockSetOutboundAccount,
  }),
}))

// Mock the settingsStore
const mockSettingsSchema = ref<SettingsSchema>({
  accounts: [],
  activeAccountId: null,
} as SettingsSchema)

const mockEnabledAccounts = ref<SipAccount[]>([])
const mockSetActiveAccount = vi.fn()

vi.mock('../../stores/settingsStore', async () => {
  const actual = await vi.importActual('../../stores/settingsStore')
  return {
    ...actual,
    useSettingsStore: () => ({
      settings: mockSettingsSchema as unknown as Ref<SettingsSchema>,
      enabledAccounts: mockEnabledAccounts,
      setActiveAccount: mockSetActiveAccount,
    }),
  }
})

describe('useSipAccountManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAccounts.clear()
    mockSettingsSchema.value = { accounts: [], activeAccountId: null } as SettingsSchema
    mockEnabledAccounts.value = []
  })

  const createAccount = (overrides: Partial<SipAccount> = {}): SipAccount => ({
    id: 'acc-1',
    name: 'Test Account',
    serverUri: 'sip:test.example.com',
    sipUri: 'sip:1000@test.example.com',
    password: 'secret',
    displayName: 'Test User',
    realm: 'test.example.com',
    authorizationUsername: '1000',
    wsProtocols: ['UDP', 'TCP'],
    connectionTimeout: 5,
    registrationExpiry: 300,
    autoRegister: true,
    enabled: true,
    ...overrides,
  })

  describe('initialization', () => {
    it('should initialize with empty accounts', () => {
      const { enabledAccounts, activeAccountId } = useSipAccountManager()

      expect(enabledAccounts.value).toEqual([])
      expect(activeAccountId.value).toBeNull()
    })

    it('should initialize with provided accounts', () => {
      const accounts = [createAccount({ id: 'acc-1' }), createAccount({ id: 'acc-2' })]
      mockEnabledAccounts.value = accounts
      mockSettingsSchema.value.activeAccountId = 'acc-1'

      const { enabledAccounts, activeAccountId } = useSipAccountManager()

      expect(enabledAccounts.value).toHaveLength(2)
      expect(activeAccountId.value).toBe('acc-1')
    })
  })

  describe('account sync', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockAccounts.clear()
    })

    it('should add new enabled accounts to multi-sip client', async () => {
      const accounts = [createAccount({ id: 'acc-1' })]
      mockEnabledAccounts.value = accounts
      mockSettingsSchema.value.activeAccountId = null

      useSipAccountManager()

      await nextTick()

      expect(mockAddAccount).toHaveBeenCalled()
      const call = mockAddAccount.mock.calls[0][0]
      expect(call.id).toBe('acc-1')
      expect(call.name).toBe('Test Account')
    })

    it('should remove disabled accounts from multi-sip client', async () => {
      // Pre-populate accounts map
      mockAccounts.set('acc-1', { id: 'acc-1' })
      mockEnabledAccounts.value = []
      mockSettingsSchema.value.activeAccountId = null

      useSipAccountManager()

      await nextTick()

      expect(mockRemoveAccount).toHaveBeenCalledWith('acc-1')
    })

    it('should not re-add existing accounts', async () => {
      mockAccounts.set('acc-1', { id: 'acc-1' })

      const accounts = [createAccount({ id: 'acc-1' })]
      mockEnabledAccounts.value = accounts
      mockSettingsSchema.value.activeAccountId = null

      useSipAccountManager()

      await nextTick()

      expect(mockAddAccount).not.toHaveBeenCalled()
    })
  })

  describe('outbound account selection', () => {
    it('should set outbound account when activeAccountId is set', async () => {
      mockAccounts.set('acc-1', { id: 'acc-1' })
      mockEnabledAccounts.value = [createAccount({ id: 'acc-1' })]
      mockSettingsSchema.value.activeAccountId = 'acc-1'

      useSipAccountManager()

      await nextTick()

      expect(mockSetOutboundAccount).toHaveBeenCalledWith('acc-1')
    })

    it('should update outbound account when activeAccountId changes', async () => {
      const accounts = [createAccount({ id: 'acc-1' }), createAccount({ id: 'acc-2' })]
      mockAccounts.set('acc-1', { id: 'acc-1' })
      mockAccounts.set('acc-2', { id: 'acc-2' })
      mockEnabledAccounts.value = accounts
      mockSettingsSchema.value.activeAccountId = 'acc-1'

      useSipAccountManager()

      await nextTick()
      expect(mockSetOutboundAccount).toHaveBeenCalledWith('acc-1')

      // Change active account
      mockSettingsSchema.value.activeAccountId = 'acc-2'
      await nextTick()

      expect(mockSetOutboundAccount).toHaveBeenCalledWith('acc-2')
    })
  })

  describe('setActiveAccount', () => {
    it('should update store and multi-sip client', () => {
      mockAccounts.set('acc-1', { id: 'acc-1' })
      mockEnabledAccounts.value = [createAccount({ id: 'acc-1' })]
      mockSettingsSchema.value.activeAccountId = null

      const { setActiveAccount } = useSipAccountManager()

      setActiveAccount('acc-1')

      expect(mockSetActiveAccount).toHaveBeenCalledWith('acc-1')
      expect(mockSetOutboundAccount).toHaveBeenCalledWith('acc-1')
    })

    it('should handle null account id', () => {
      mockAccounts.set('acc-1', { id: 'acc-1' })
      mockEnabledAccounts.value = [createAccount({ id: 'acc-1' })]
      mockSettingsSchema.value.activeAccountId = 'acc-1'

      const { setActiveAccount } = useSipAccountManager()

      setActiveAccount(null)

      expect(mockSetActiveAccount).toHaveBeenCalledWith(null)
    })
  })
})
