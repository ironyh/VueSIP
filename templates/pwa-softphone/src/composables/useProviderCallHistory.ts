/**
 * Provider-agnostic call history for the History tab.
 * Syncs account-level call history when supported by the current operator (46elks, Telnyx, etc.).
 */
import { computed, type Ref } from 'vue'
import { use46ElksApi, type Elks46CallReadonly } from 'vuesip'

export type ProviderId = '46elks' | 'telnyx' | 'custom'

/** Normalized history entry for display (same shape regardless of provider) */
export interface ProviderHistoryEntry {
  id: string
  direction: 'incoming' | 'outgoing'
  remote: string
  created: string
  duration: number
  state: string
}

export interface UseProviderCallHistoryReturn {
  /** Current provider from config */
  providerId: Ref<ProviderId | null>
  /** Whether this provider supports loading account history */
  canLoadHistory: Ref<boolean>
  /** Label for the load button (e.g. "Load from 46elks") */
  loadLabel: Ref<string>
  /** Load account history (no-op if not supported) */
  load: () => Promise<void>
  /** Normalized entries for display */
  entries: Ref<ProviderHistoryEntry[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  /** Short hint when no entries yet (provider-specific) */
  emptyHint: Ref<string>
}

/** DRY map: load button label by provider */
const loadLabelByProvider: Record<ProviderId, string> = {
  '46elks': 'Load from 46elks',
  'telnyx': 'Load from Telnyx',
  'custom': 'Load history',
}

/** DRY map: empty state hint by provider */
const emptyHintByProvider: Record<ProviderId, string> = {
  '46elks': 'Click "Load from 46elks" to fetch call history from your 46elks account.',
  'telnyx': 'Telnyx account history will be available in a future update.',
  'custom': 'Account history is not available for this connection.',
}

function normalize46ElksCall(call: Elks46CallReadonly): ProviderHistoryEntry {
  return {
    id: call.id,
    direction: call.direction,
    remote: call.direction === 'incoming' ? call.from : call.to,
    created: call.created,
    duration: call.duration ?? 0,
    state: call.state,
  }
}

export function useProviderCallHistory(
  currentProviderId: Ref<ProviderId | null | undefined>
): UseProviderCallHistoryReturn {
  const elksApi = use46ElksApi()

  const providerId = computed<ProviderId | null>(() => {
    const id = currentProviderId.value
    if (id === '46elks' || id === 'telnyx' || id === 'custom') return id
    return null
  })

  const canLoadHistory = computed(() => {
    const id = providerId.value
    return id === '46elks' || id === 'telnyx'
  })

  const loadLabel = computed(() => {
    const id = providerId.value ?? 'custom'
    return loadLabelByProvider[id]
  })

  const entries = computed<ProviderHistoryEntry[]>(() => {
    const id = providerId.value
    if (id === '46elks') {
      return elksApi.callHistory.value.map(normalize46ElksCall)
    }
    // Telnyx: not yet implemented
    return []
  })

  const isLoading = computed(() => elksApi.isLoadingCallHistory.value)
  const error = computed(() => elksApi.error.value)

  const emptyHint = computed(() => {
    const id = providerId.value ?? 'custom'
    return emptyHintByProvider[id]
  })

  async function load(): Promise<void> {
    const id = providerId.value
    if (id === '46elks') {
      await elksApi.loadCallHistory({ limit: 50 })
    }
    // Telnyx: no-op until we add Telnyx CDR/history API
  }

  return {
    providerId,
    canLoadHistory,
    loadLabel,
    load,
    entries,
    isLoading,
    error,
    emptyHint,
  }
}
