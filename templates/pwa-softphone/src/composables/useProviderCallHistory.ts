/**
 * Provider-agnostic call history for the History tab.
 * Syncs account-level call history when supported by the current operator (46elks, Telnyx, etc.).
 */
import { computed, type Ref } from 'vue'
import { use46ElksApi } from 'vuesip'
import type { Elks46Call, Elks46CallLeg } from 'vuesip'

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

type ReadonlyElks46Call = Omit<Readonly<Elks46Call>, 'legs'> & {
  readonly legs?: ReadonlyArray<Readonly<Elks46CallLeg>>
}

function normalize46ElksCall(call: ReadonlyElks46Call): ProviderHistoryEntry {
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
    const id = providerId.value
    if (id === '46elks') return 'Load from 46elks'
    if (id === 'telnyx') return 'Load from Telnyx'
    return 'Load history'
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
    const id = providerId.value
    if (id === '46elks') {
      return 'Click "Load from 46elks" to fetch call history from your 46elks account.'
    }
    if (id === 'telnyx') {
      return 'Telnyx account history will be available in a future update.'
    }
    return 'Account history is not available for this connection.'
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
