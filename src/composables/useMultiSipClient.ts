/**
 * useMultiSipClient - Manage multiple simultaneous SIP registrations
 *
 * This is a building block for advanced multi-account UIs: it creates one SipClient
 * instance per account and provides helpers for selecting an outbound account and
 * handling incoming calls across accounts.
 *
 * @module composables/useMultiSipClient
 */

import { ref, computed, shallowRef, type ComputedRef, type Ref } from 'vue'
import type { SipClientConfig } from '../types/config.types'
import { CallDirection } from '../types/call.types'
import { EventBus } from '../core/EventBus'
import { MediaManager } from '../core/MediaManager'
import { buildSipUri, extractSipDomain } from '../utils/formatters'
import { useCallHistory } from './useCallHistory'
import { useCallSession, type UseCallSessionReturn } from './useCallSession'
import { useMediaDevices } from './useMediaDevices'
import { useSipClient, type UseSipClientReturn } from './useSipClient'

export interface MultiSipAccountConfig {
  id: string
  name: string
  sip: SipClientConfig
  /** Optional hint for default outbound selection */
  outboundCapable?: boolean
}

export interface MultiSipAccountInstance {
  id: string
  name: string
  config: MultiSipAccountConfig
  sipClient: UseSipClientReturn
  callSession: UseCallSessionReturn
  isConnected: ComputedRef<boolean>
  isRegistered: ComputedRef<boolean>
  isConnecting: ComputedRef<boolean>
  error: Ref<Error | null>
}

export function useMultiSipClient() {
  // All registered accounts
  const accounts = shallowRef<Map<string, MultiSipAccountInstance>>(new Map())

  // Selected outbound account
  const outboundAccountId = ref<string | null>(null)

  // Shared MediaManager for consistent device selection
  const sharedEventBus = ref<EventBus | null>(null)
  const sharedMediaManager = ref<MediaManager | null>(null)

  // Currently active call owner (across all accounts)
  const activeCallAccountId = ref<string | null>(null)

  // Call history (shared)
  const callHistory = useCallHistory()
  const { history, clearHistory, getRecentCalls } = callHistory

  // Media devices (shared)
  const mediaDevicesComposable = ref<ReturnType<typeof useMediaDevices> | null>(null)

  function initSharedResources() {
    if (sharedMediaManager.value) return
    const eventBus = new EventBus()
    sharedEventBus.value = eventBus
    sharedMediaManager.value = new MediaManager({ eventBus })
    mediaDevicesComposable.value = useMediaDevices(sharedMediaManager as Ref<MediaManager | null>)
  }

  async function addAccount(config: MultiSipAccountConfig): Promise<MultiSipAccountInstance> {
    initSharedResources()

    if (accounts.value.has(config.id)) {
      throw new Error(`Account with ID ${config.id} already exists`)
    }

    const sipClient = useSipClient()
    const { connect, isConnected, isRegistered, isConnecting, error, updateConfig, getClient } =
      sipClient

    updateConfig(config.sip)

    const clientRef = computed(() => getClient())
    const callSession = useCallSession(clientRef, sharedMediaManager as Ref<MediaManager | null>)

    const instance: MultiSipAccountInstance = {
      id: config.id,
      name: config.name,
      config,
      sipClient,
      callSession,
      isConnected,
      isRegistered,
      isConnecting,
      error,
    }

    const next = new Map(accounts.value)
    next.set(config.id, instance)
    accounts.value = next

    // If this is the first outbound-capable account, set as outbound
    if ((config.outboundCapable ?? true) && !outboundAccountId.value) {
      outboundAccountId.value = config.id
    }

    try {
      await connect()
    } catch {
      // Keep instance, surface error via sipClient.error
    }

    return instance
  }

  async function removeAccount(accountId: string): Promise<void> {
    const account = accounts.value.get(accountId)
    if (!account) return

    try {
      await account.sipClient.disconnect()
    } catch {
      // ignore
    }

    const next = new Map(accounts.value)
    next.delete(accountId)
    accounts.value = next

    if (outboundAccountId.value === accountId) {
      outboundAccountId.value = null
      for (const [id, a] of accounts.value) {
        if (a.config.outboundCapable ?? true) {
          outboundAccountId.value = id
          break
        }
      }
    }

    if (activeCallAccountId.value === accountId) {
      activeCallAccountId.value = null
    }
  }

  function setOutboundAccount(accountId: string): void {
    if (!accounts.value.has(accountId)) {
      throw new Error(`Account ${accountId} not found`)
    }
    outboundAccountId.value = accountId
  }

  const outboundAccount = computed<MultiSipAccountInstance | null>(() => {
    if (!outboundAccountId.value) return null
    return accounts.value.get(outboundAccountId.value) || null
  })

  async function makeCall(target: string, accountId?: string): Promise<void> {
    const selectedId = accountId ?? outboundAccountId.value
    if (!selectedId) throw new Error('No outbound account selected')

    const account = accounts.value.get(selectedId)
    if (!account) throw new Error(`Account ${selectedId} not found`)
    if (!account.isRegistered.value) throw new Error(`Account ${account.name} is not registered`)

    const domain = extractSipDomain(account.config.sip.sipUri)
    if (!domain) throw new Error('Invalid SIP URI configuration')
    const sipTarget = buildSipUri(target, domain)

    activeCallAccountId.value = selectedId
    await account.callSession.makeCall(sipTarget)
  }

  async function answerCall(accountId: string): Promise<void> {
    const account = accounts.value.get(accountId)
    if (!account) throw new Error(`Account ${accountId} not found`)
    activeCallAccountId.value = accountId
    await account.callSession.answer()
  }

  async function rejectCall(accountId: string): Promise<void> {
    const account = accounts.value.get(accountId)
    if (!account) throw new Error(`Account ${accountId} not found`)
    await account.callSession.reject()
  }

  async function hangup(): Promise<void> {
    if (!activeCallAccountId.value) return
    const account = accounts.value.get(activeCallAccountId.value)
    if (account) {
      await account.callSession.hangup()
    }
    activeCallAccountId.value = null
  }

  const activeAccount = computed<MultiSipAccountInstance | null>(() => {
    if (!activeCallAccountId.value) return null
    return accounts.value.get(activeCallAccountId.value) || null
  })

  const incomingCalls = computed(() => {
    const calls: Array<{
      accountId: string
      accountName: string
      remoteUri: string | null
      remoteDisplayName: string | null
      calledLine?: string
    }> = []

    for (const [id, account] of accounts.value) {
      if (
        account.callSession.state.value === 'ringing' &&
        account.callSession.direction.value === CallDirection.Incoming
      ) {
        calls.push({
          accountId: id,
          accountName: account.name,
          remoteUri: account.callSession.remoteUri.value,
          remoteDisplayName: account.callSession.remoteDisplayName.value,
          calledLine: (account.callSession.session.value as any)?.data?.calledNumberDialed?.raw,
        })
      }
    }

    return calls
  })

  const accountList = computed(() => {
    return Array.from(accounts.value.values()).map((account) => ({
      id: account.id,
      name: account.name,
      isConnected: account.isConnected.value,
      isRegistered: account.isRegistered.value,
      isConnecting: account.isConnecting.value,
      isOutbound: account.id === outboundAccountId.value,
      callState: account.callSession.state.value,
      error: account.error.value?.message || null,
    }))
  })

  async function connectAll(): Promise<void> {
    await Promise.all(
      Array.from(accounts.value.values()).map((account) =>
        account.sipClient.connect().catch(() => {
          // ignore
        })
      )
    )
  }

  async function disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(accounts.value.values()).map((account) =>
        account.sipClient.disconnect().catch(() => {
          // ignore
        })
      )
    )
  }

  const stats = computed(() => ({
    totalAccounts: accounts.value.size,
    connectedAccounts: Array.from(accounts.value.values()).filter((a) => a.isConnected.value)
      .length,
    registeredAccounts: Array.from(accounts.value.values()).filter((a) => a.isRegistered.value)
      .length,
    hasOutboundAccount: !!outboundAccountId.value,
    hasIncomingCall: incomingCalls.value.length > 0,
    hasActiveCall: !!activeCallAccountId.value,
  }))

  return {
    accounts,
    accountList,
    addAccount,
    removeAccount,
    connectAll,
    disconnectAll,
    outboundAccountId,
    outboundAccount,
    setOutboundAccount,
    makeCall,
    answerCall,
    rejectCall,
    hangup,
    activeAccount,
    activeCallAccountId,
    incomingCalls,
    mediaDevices: mediaDevicesComposable,
    history,
    clearHistory,
    getRecentCalls,
    stats,
  }
}
