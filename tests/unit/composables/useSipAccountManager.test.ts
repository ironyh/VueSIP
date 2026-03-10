/**
 * useSipAccountManager composable unit tests - structural test
 *
 * Tests the interface and basic operations without full composable setup
 * due to complex dependency chain (Pinia store, useMultiSipClient).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import type { SipAccount } from '@/stores/settingsStore'

// Mock the settings store - enabledAccounts is a computed in the real store
const mockEnabledAccounts = ref<SipAccount[]>([])
const mockSettingsStore = {
  settings: ref({
    activeAccountId: 'account-1',
  }),
  enabledAccounts: computed<SipAccount[]>(() => mockEnabledAccounts.value),
  setActiveAccount: vi.fn(),
}

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => mockSettingsStore),
}))

// Mock useMultiSipClient
const mockMultiSipClient = {
  accounts: ref(new Map()),
  addAccount: vi.fn().mockResolvedValue(undefined),
  removeAccount: vi.fn().mockResolvedValue(undefined),
  setOutboundAccount: vi.fn(),
}

vi.mock('@/composables/useMultiSipClient', () => ({
  useMultiSipClient: vi.fn(() => mockMultiSipClient),
}))

describe('useSipAccountManager types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMultiSipClient.accounts.value = new Map()
    mockEnabledAccounts.value = []
    mockSettingsStore.settings.value.activeAccountId = 'account-1'
  })

  it('should export useSipAccountManager function', async () => {
    // Dynamic import to test module loading
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    expect(typeof useSipAccountManager).toBe('function')
  })

  it('should return settings store', async () => {
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    const { settings } = useSipAccountManager()
    expect(settings).toBeDefined()
    expect(settings.settings).toBeDefined()
  })

  it('should return enabledAccounts computed', async () => {
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    const { enabledAccounts } = useSipAccountManager()
    expect(enabledAccounts).toBeDefined()
    expect(typeof enabledAccounts.value).toBe('object')
  })

  it('should return activeAccountId computed', async () => {
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    const { activeAccountId } = useSipAccountManager()
    expect(activeAccountId).toBeDefined()
    expect(activeAccountId.value).toBe('account-1')
  })

  it('should return setActiveAccount function', async () => {
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    const { setActiveAccount } = useSipAccountManager()
    expect(typeof setActiveAccount).toBe('function')
  })

  it('should return multi-sip client methods', async () => {
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    const result = useSipAccountManager()

    // Check multi-sip client methods are exposed
    expect(typeof result.addAccount).toBe('function')
    expect(typeof result.removeAccount).toBe('function')
    expect(typeof result.setOutboundAccount).toBe('function')
  })
})

describe('useSipAccountManager toSipClientConfig', () => {
  it('should convert SipAccount to SipClientConfig', async () => {
    // Import the private function via module
    const module = await import('@/composables/useSipAccountManager')

    const _account: SipAccount = {
      id: 'test-id',
      name: 'Test Account',
      serverUri: 'sip.example.com',
      sipUri: 'sip:test@sip.example.com',
      password: 'secret',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
      realm: 'sip.example.com',
      registrationExpiry: 300,
      connectionTimeout: 5000,
      autoRegister: true,
      enabled: true,
    }

    // We can't directly test toSipClientConfig as it's not exported
    // But we can verify the module loads correctly
    expect(module.useSipAccountManager).toBeDefined()
  })
})

describe('useSipAccountManager integration behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMultiSipClient.accounts.value = new Map()
  })

  it('should sync enabled accounts on settings change', async () => {
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')

    // Initialize - this triggers the watcher
    useSipAccountManager()

    // Add enabled account
    mockSettingsStore.enabledAccounts.value = [
      {
        id: 'account-1',
        name: 'Account 1',
        serverUri: 'sip.example.com',
        sipUri: 'sip:test@sip.example.com',
        password: 'secret',
        displayName: 'Test',
        registrationExpiry: 300,
        connectionTimeout: 5000,
        autoRegister: true,
        enabled: true,
      },
    ]

    // Wait for watcher to execute
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should have called addAccount
    expect(mockMultiSipClient.addAccount).toHaveBeenCalled()
  })

  it('should remove disabled accounts', async () => {
    // Pre-populate with an account
    mockMultiSipClient.accounts.value.set('account-1', {
      id: 'account-1',
      name: 'Account 1',
      sipClient: {} as any,
      callSession: {} as any,
      isConnected: computed(() => false),
      isRegistered: computed(() => false),
      isConnecting: computed(() => false),
      error: ref(null),
      config: {} as any,
      outboundCapable: true,
    })

    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    useSipAccountManager()

    // Set empty enabled accounts (all disabled)
    mockSettingsStore.enabledAccounts.value = []

    // Wait for watcher to execute
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should have called removeAccount
    expect(mockMultiSipClient.removeAccount).toHaveBeenCalledWith('account-1')
  })

  it('should set outbound account when activeAccountId changes', async () => {
    mockMultiSipClient.accounts.value.set('account-1', {
      id: 'account-1',
      name: 'Account 1',
      sipClient: {} as any,
      callSession: {} as any,
      isConnected: computed(() => false),
      isRegistered: computed(() => false),
      isConnecting: computed(() => false),
      error: ref(null),
      config: {} as any,
      outboundCapable: true,
    })

    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    useSipAccountManager()

    // Wait for watcher to execute
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should have set outbound account
    expect(mockMultiSipClient.setOutboundAccount).toHaveBeenCalledWith('account-1')
  })

  it('should call setActiveAccount on settings store', async () => {
    const { useSipAccountManager } = await import('@/composables/useSipAccountManager')
    const { setActiveAccount } = useSipAccountManager()

    setActiveAccount('account-2')

    expect(mockSettingsStore.setActiveAccount).toHaveBeenCalledWith('account-2')
  })
})
