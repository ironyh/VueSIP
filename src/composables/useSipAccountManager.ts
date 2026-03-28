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
  const settings = useSettingsStore()
  const multi = useMultiSipClient()

  const enabledAccounts = computed(() => settings.enabledAccounts)
  const activeAccountId = computed(() => settings.settings.activeAccountId)

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
        settings.settings.activeAccountId &&
        multi.accounts.value.has(settings.settings.activeAccountId)
      ) {
        multi.setOutboundAccount(settings.settings.activeAccountId)
      }
    },
    { immediate: true, deep: true }
  )

  function setActiveAccount(id: string | null): void {
    settings.setActiveAccount(id)
    if (id && multi.accounts.value.has(id)) {
      multi.setOutboundAccount(id)
    }
  }

  return {
    settings,
    enabledAccounts,
    activeAccountId,
    setActiveAccount,
    ...multi,
  }
}
