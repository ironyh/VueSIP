/**
 * PBX Recordings Composable
 *
 * Delegates list and playback URL retrieval to any PbxRecordingProvider.
 * Exposes normalized state (recordings, loading, error) and stable error
 * states for unauthorized/expired playback URL failures.
 *
 * @module composables/usePbxRecordings
 */

import { ref, watch, type Ref, type ShallowRef } from 'vue'
import type {
  PbxRecordingProvider,
  PbxRecordingListQuery,
  PbxRecordingListResult,
  RecordingSummary,
  RecordingPlaybackInfo,
  PbxPlaybackError,
  PbxPlaybackErrorCode,
} from '@/types/pbx-recording.types'
import { createLogger } from '@/utils/logger'

const log = createLogger('usePbxRecordings')

/** Classify thrown error into a stable playback error code. */
function classifyPlaybackError(recordingId: string, err: unknown): PbxPlaybackError {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  let code: PbxPlaybackErrorCode = 'unknown'
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  ) {
    code = 'unauthorized'
  } else if (lower.includes('expir') || lower.includes('expired')) {
    code = 'expired'
  } else if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('econnrefused') ||
    lower.includes('timeout')
  ) {
    code = 'network'
  }

  return { recordingId, code, message: message || undefined }
}

/**
 * Return type for usePbxRecordings composable
 */
export interface UsePbxRecordingsReturn {
  /** Current page of recording summaries. */
  recordings: Ref<RecordingSummary[]>
  /** Total count matching the last query (before limit/offset). */
  totalCount: Ref<number>
  /** Whether more items exist after the current page. */
  hasMore: Ref<boolean>
  /** True while a list or playback request is in progress. */
  loading: Ref<boolean>
  /** List fetch error message, or null. */
  error: Ref<string | null>
  /** Last playback error (unauthorized, expired, etc.) for UI. Cleared on successful getPlaybackUrl. */
  playbackError: Ref<PbxPlaybackError | null>
  /** Fetch recordings list from the provider. */
  fetchRecordings: (query?: PbxRecordingListQuery) => Promise<void>
  /** Get playback URL for a recording; sets playbackError and throws on failure. */
  getPlaybackUrl: (recordingId: string) => Promise<string>
}

/**
 * PBX recordings composable: list and get playback URLs via any provider.
 *
 * @param providerRef - Ref to the PbxRecordingProvider instance (e.g. from a FreePBX adapter)
 * @returns Recordings state, loading/error refs, fetchRecordings and getPlaybackUrl
 *
 * @example
 * ```typescript
 * const provider = shallowRef<PbxRecordingProvider | null>(null)
 * const {
 *   recordings,
 *   loading,
 *   error,
 *   playbackError,
 *   fetchRecordings,
 *   getPlaybackUrl,
 * } = usePbxRecordings(provider)
 *
 * await fetchRecordings({ limit: 20 })
 * const url = await getPlaybackUrl(recordings.value[0].id)
 * ```
 */
export function usePbxRecordings(
  providerRef: Ref<PbxRecordingProvider | null> | ShallowRef<PbxRecordingProvider | null>
): UsePbxRecordingsReturn {
  const recordings = ref<RecordingSummary[]>([])
  const totalCount = ref(0)
  const hasMore = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const playbackError = ref<PbxPlaybackError | null>(null)

  function resetListState(): void {
    recordings.value = []
    totalCount.value = 0
    hasMore.value = false
    error.value = null
  }

  function resetPlaybackError(): void {
    playbackError.value = null
  }

  watch(
    providerRef,
    (newProvider, oldProvider) => {
      if (oldProvider !== newProvider) {
        resetListState()
        resetPlaybackError()
        log.debug('Provider swapped, state reset')
      }
    },
    { immediate: false }
  )

  async function fetchRecordings(query?: PbxRecordingListQuery): Promise<void> {
    const provider = providerRef.value
    if (!provider) {
      error.value = 'Provider not initialized'
      return
    }

    if (!provider.capabilities.listRecordings) {
      error.value = 'Provider does not support listing recordings'
      return
    }

    loading.value = true
    error.value = null

    try {
      const result: PbxRecordingListResult = await provider.listRecordings(query ?? {})
      recordings.value = result.items
      totalCount.value = result.totalCount
      hasMore.value = result.hasMore
      log.debug('Fetched recordings', result.items.length, result.totalCount)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      log.error('Failed to fetch recordings', err)
    } finally {
      loading.value = false
    }
  }

  async function getPlaybackUrl(recordingId: string): Promise<string> {
    const provider = providerRef.value
    playbackError.value = null

    if (!provider) {
      const e: PbxPlaybackError = {
        recordingId,
        code: 'unknown',
        message: 'Provider not initialized',
      }
      playbackError.value = e
      throw new Error(e.message)
    }

    if (!provider.capabilities.getPlaybackInfo) {
      const e: PbxPlaybackError = {
        recordingId,
        code: 'unknown',
        message: 'Provider does not support playback info',
      }
      playbackError.value = e
      throw new Error(e.message)
    }

    try {
      const info: RecordingPlaybackInfo | null = await provider.getPlaybackInfo(recordingId)

      if (info === null) {
        const e: PbxPlaybackError = { recordingId, code: 'not_found' }
        playbackError.value = e
        throw new Error('Recording not found')
      }

      if (info.expiresAt && new Date() > new Date(info.expiresAt)) {
        const e: PbxPlaybackError = { recordingId, code: 'expired' }
        playbackError.value = e
        throw new Error('Playback URL has expired')
      }

      const url = info.playbackUrl ?? info.streamUrl
      if (!url) {
        const e: PbxPlaybackError = {
          recordingId,
          code: 'unknown',
          message: 'No playback URL in response',
        }
        playbackError.value = e
        throw new Error(e.message)
      }

      return url
    } catch (err) {
      if (playbackError.value?.recordingId === recordingId) {
        // Already set above (not_found, expired, no URL)
        throw err
      }
      const e = classifyPlaybackError(recordingId, err)
      playbackError.value = e
      throw err
    }
  }

  return {
    recordings,
    totalCount,
    hasMore,
    loading,
    error,
    playbackError,
    fetchRecordings,
    getPlaybackUrl,
  }
}
