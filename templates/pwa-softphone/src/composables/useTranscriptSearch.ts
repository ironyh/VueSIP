import { ref, watch, type Ref, computed } from 'vue'

export interface HistoryEntry {
  id: string
  remoteUri?: string
  remoteDisplayName?: string
  localUri?: string
  direction?: string
  startTime: number
  duration: number
}

export interface TranscriptSegment {
  text: string
  speaker?: string
  timestamp?: number
}

export interface UseTranscriptSearchOptions {
  /**
   * Debounce delay in milliseconds before starting transcript search
   */
  debounceMs?: number
}

/**
 * Composable for async transcript search functionality.
 * Searches saved transcripts for matching entries based on a search query.
 *
 * @param historyEntries - Ref containing history entries to search
 * @param persistenceEnabled - Ref indicating if transcript persistence is enabled
 * @param getTranscriptFn - Function to retrieve transcript for a given entry ID
 * @param options - Optional configuration
 */
export function useTranscriptSearch(
  historyEntries: Ref<HistoryEntry[]>,
  persistenceEnabled: Ref<boolean>,
  getTranscriptFn: (entryId: string) => Promise<TranscriptSegment[] | null>,
  options: UseTranscriptSearchOptions = {}
) {
  const { debounceMs = 300 } = options

  // State
  const transcriptSearchResults = ref<Set<string>>(new Set())
  const isSearchingTranscripts = ref(false)
  let transcriptSearchTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Clear all transcript search results
   */
  function clearTranscriptSearch() {
    transcriptSearchResults.value.clear()
    isSearchingTranscripts.value = false
    if (transcriptSearchTimeout) {
      clearTimeout(transcriptSearchTimeout)
      transcriptSearchTimeout = null
    }
  }

  /**
   * Search transcripts for matching entries
   * @param query - Search query string
   */
  async function searchTranscripts(query: string) {
    if (!query.trim() || !persistenceEnabled.value) {
      clearTranscriptSearch()
      return
    }

    isSearchingTranscripts.value = true
    const results = new Set<string>()
    const queryLower = query.toLowerCase()

    try {
      // Check all history entries for matching transcripts
      for (const entry of historyEntries.value) {
        const transcript = await getTranscriptFn(entry.id)
        if (transcript) {
          const transcriptText = transcript
            .map((e) => e.text)
            .join(' ')
            .toLowerCase()
          if (transcriptText.includes(queryLower)) {
            results.add(entry.id)
          }
        }
      }
    } catch (error) {
      console.error('Error searching transcripts:', error)
    } finally {
      transcriptSearchResults.value = results
      isSearchingTranscripts.value = false
    }
  }

  /**
   * Watch search query and debounce transcript search
   * @param queryRef - Ref containing the search query
   */
  function watchSearchQuery(queryRef: Ref<string>) {
    watch(queryRef, async (query) => {
      // Clear previous timeout
      if (transcriptSearchTimeout) {
        clearTimeout(transcriptSearchTimeout)
      }

      if (!query.trim() || !persistenceEnabled.value) {
        transcriptSearchResults.value.clear()
        isSearchingTranscripts.value = false
        return
      }

      // Debounce transcript search
      transcriptSearchTimeout = setTimeout(async () => {
        await searchTranscripts(query)
      }, debounceMs)
    })
  }

  /**
   * Get entries that match the transcript search
   */
  const transcriptMatchedEntries = computed(() => {
    if (transcriptSearchResults.value.size === 0) return []
    return historyEntries.value.filter((entry) => transcriptSearchResults.value.has(entry.id))
  })

  return {
    // State
    transcriptSearchResults: transcriptSearchResults as Ref<Set<string>>,
    isSearchingTranscripts: isSearchingTranscripts as Ref<boolean>,

    // Computed
    transcriptMatchedEntries,

    // Methods
    clearTranscriptSearch,
    searchTranscripts,
    watchSearchQuery,
  }
}
