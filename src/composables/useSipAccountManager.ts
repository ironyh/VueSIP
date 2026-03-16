/**
 * useSipAccountManager - Multi-account SIP client manager wired to settingsStore
 *
 * This composes `useMultiSipClient()` with the persisted `useSettingsStore()` schema.
 * It keeps one SipClient instance per enabled account and mirrors `activeAccountId`
 * as the outbound account.
 *
 * @module composables/useSipAccountManager
 */

import { computed, watch } from 'vue'
import type { SipClientConfig } from '../types/config.types'
import { useSettingsStore, type SipAccount } from '../stores/settingsStore'
import { useMultiSipClient, type MultiSipAccountConfig } from './useMultiSipClient'
import { createLogger } from '../utils/logger'

const logger = createLogger('composables:useSipAccountManager')

/**
 * Convert a SipAccount from settings store to SipClientConfig for useMultiSipClient.
 *
 * @param account - The SIP account configuration from settings store
 * @returns SipClientConfig compatible with useMultiSipClient
 */
function toSipClientConfig(account: SipAccount): SipClientConfig {
  return {
    uri: account.serverUri,
    sipUri: account.sipUri,
    password: account.password,
    displayName: account.displayName,
    authorizationUsername: account.authorizationUsername,
    realm: account.realm,
    wsOptions: {
      protocols: account.wsProtocols,
      connectionTimeout: account.connectionTimeout,
    },
    registrationOptions: {
      expires: account.registrationExpiry,
      autoRegister: account.autoRegister,
    },
  }
}

export function useSipAccountManager() {
  const store = useSettingsStore()
  const multi = useMultiSipClient()

  // Use enabledAccounts directly - it's already a computed in the store
  const enabledAccounts = store.enabledAccounts
  // Cast settings ref for proper TypeScript typing (Pinia setup stores)
  const settingsRef = store.settings as unknown as import('vue').Ref<
    import('../stores/settingsStore').SettingsSchema
  >
  const activeAccountId = computed(() => settingsRef.value.activeAccountId)

  // Mirror active account selection to outbound account.
  watch(
    activeAccountId,
    (id) => {
      if (!id) return
      try {
        if (multi.accounts.value.has(id)) {
          multi.setOutboundAccount(id)
        }
      } catch {
        // ignore
      }
    },
    { immediate: true }
  )

  // Keep multi-sip accounts in sync with enabled accounts.
  watch(
    enabledAccounts,
    async (accounts) => {
      const enabledIds = new Set(accounts.map((a) => a.id))

      // Remove disabled
      for (const [id] of multi.accounts.value) {
        if (!enabledIds.has(id)) {
          await multi.removeAccount(id)
        }
      }

      // Add new enabled
      for (const acc of accounts) {
        if (multi.accounts.value.has(acc.id)) continue
        const cfg: MultiSipAccountConfig = {
          id: acc.id,
          name: acc.name,
          sip: toSipClientConfig(acc),
          outboundCapable: true,
        }
        await multi.addAccount(cfg)
      }

      // Ensure outbound selection
      if (
        settingsRef.value.activeAccountId &&
        multi.accounts.value.has(settingsRef.value.activeAccountId)
      ) {
        multi.setOutboundAccount(settingsRef.value.activeAccountId)
      }
    },
    { immediate: true, deep: true }
  )

  /**
   * Set the active SIP account.
   *
   * Updates both the settings store and the multi-SIP client to ensure
   * the selected account is used for outbound calls.
   *
   * @param id - Account ID to set as active, or null to clear
   */
  function setActiveAccount(id: string | null): void {
    // Update store first - this is the source of truth
    store.setActiveAccount(id)
    // Then sync to multi-sip client if account exists there
    if (id) {
      try {
        if (multi.accounts.value.has(id)) {
          multi.setOutboundAccount(id)
        }
      } catch (err) {
        logger.warn(`Failed to set outbound account ${id}:`, err)
      }
    }
  }

  return {
    settings: store,
    enabledAccounts,
    activeAccountId,
    setActiveAccount,
    ...multi,
  }
}
