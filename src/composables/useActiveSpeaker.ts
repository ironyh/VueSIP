/**
 * Active Speaker Detection Composable
 *
 * Provides reactive active speaker detection based on participant audio levels.
 * Detects the dominant speaker (highest audio level above threshold) and tracks
 * speaker history for conference UI components.
 *
 * @module composables/useActiveSpeaker
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { Participant } from '../types/conference.types'
import type {
  ActiveSpeakerOptions,
  SpeakerHistoryEntry,
  UseActiveSpeakerReturn,
} from '../types/active-speaker.types'
import { createLogger } from '../utils/logger'

const log = createLogger('useActiveSpeaker')

/** Default threshold for considering someone as speaking (0-1 range) */
const DEFAULT_THRESHOLD = 0.15

/** Default debounce time in milliseconds */
const DEFAULT_DEBOUNCE_MS = 300

/** Default number of history entries to keep */
const DEFAULT_HISTORY_SIZE = 10

/**
 * Active Speaker Detection Composable
 *
 * Monitors participant audio levels and determines the dominant speaker
 * in a conference. Provides real-time detection with configurable threshold,
 * debouncing to prevent rapid speaker switching, and speaker history tracking.
 *
 * Features:
 * - Dominant speaker detection (highest audio level above threshold)
 * - Multiple active speakers tracking (all above threshold)
 * - Configurable audio level threshold
 * - Debounced speaker change callbacks
 * - Speaker history with peak levels
 * - Dynamic threshold adjustment
 * - Muted participant filtering
 *
 * @param participants - Reactive reference to conference participants array
 * @param options - Configuration options for active speaker detection
 * @returns Object containing active speaker state and control methods
 *
 * @since 1.0.0
 *
 * @example Basic usage
 * ```typescript
 * import { ref } from 'vue'
 * import { useActiveSpeaker } from './composables/useActiveSpeaker'
 *
 * const participants = ref<Participant[]>([])
 * const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants)
 *
 * // Watch for active speaker changes
 * watch(activeSpeaker, (speaker) => {
 *   if (speaker) {
 *     console.log(`${speaker.displayName} is speaking`)
 *   }
 * })
 * ```
 *
 * @example With custom options
 * ```typescript
 * const { activeSpeaker, activeSpeakers, speakerHistory } = useActiveSpeaker(
 *   participants,
 *   {
 *     threshold: 0.2,
 *     debounceMs: 500,
 *     historySize: 20,
 *     excludeMuted: true,
 *     onSpeakerChange: (current, previous) => {
 *       console.log(`Speaker changed from ${previous?.displayName} to ${current?.displayName}`)
 *     }
 *   }
 * )
 * ```
 */
export function useActiveSpeaker(
  participants: Ref<Participant[]>,
  options: ActiveSpeakerOptions = {}
): UseActiveSpeakerReturn {
  // ============================================================================
  // Configuration
  // ============================================================================

  const threshold = ref(options.threshold ?? DEFAULT_THRESHOLD)
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const historySize = options.historySize ?? DEFAULT_HISTORY_SIZE
  const excludeMuted = options.excludeMuted ?? true
  const onSpeakerChange = options.onSpeakerChange

  // ============================================================================
  // Internal State
  // ============================================================================

  const speakerHistory = ref<SpeakerHistoryEntry[]>([])
  const debouncedSpeakerId = ref<string | null>(null)
  const previousSpeakerId = ref<string | null>(null)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Filter participants that are eligible for speaker detection
   */
  const eligibleParticipants = computed(() => {
    return participants.value.filter((p) => {
      // Must have a valid audio level
      if (p.audioLevel === undefined || p.audioLevel === null) {
        return false
      }
      // Exclude muted participants if configured
      if (excludeMuted && p.isMuted) {
        return false
      }
      return true
    })
  })

  /**
   * All participants currently speaking (above threshold)
   * Sorted by audio level descending
   */
  const activeSpeakers: ComputedRef<Participant[]> = computed(() => {
    return eligibleParticipants.value
      .filter((p) => (p.audioLevel ?? 0) >= threshold.value)
      .sort((a, b) => (b.audioLevel ?? 0) - (a.audioLevel ?? 0))
  })

  /**
   * Current dominant speaker (highest audio level above threshold)
   */
  const activeSpeaker: ComputedRef<Participant | null> = computed(() => {
    const speakers = activeSpeakers.value
    return speakers.length > 0 ? speakers[0] ?? null : null
  })

  /**
   * Whether anyone is currently speaking
   */
  const isSomeoneSpeaking: ComputedRef<boolean> = computed(() => {
    return activeSpeakers.value.length > 0
  })

  // ============================================================================
  // History Management
  // ============================================================================

  /**
   * Add a new entry to speaker history
   */
  const addHistoryEntry = (participant: Participant): void => {
    const entry: SpeakerHistoryEntry = {
      participantId: participant.id,
      displayName: participant.displayName || participant.id,
      startedAt: Date.now(),
      endedAt: null,
      peakLevel: participant.audioLevel ?? 0,
    }

    speakerHistory.value.push(entry)

    // Trim history to max size
    while (speakerHistory.value.length > historySize) {
      speakerHistory.value.shift()
    }
  }

  /**
   * End the current speaker's history entry
   */
  const endCurrentHistoryEntry = (): void => {
    const currentEntry = speakerHistory.value.find(
      (entry) => entry.endedAt === null && entry.participantId === debouncedSpeakerId.value
    )
    if (currentEntry) {
      currentEntry.endedAt = Date.now()
    }
  }

  /**
   * Update peak level for current speaker
   */
  const updatePeakLevel = (participantId: string, level: number): void => {
    const currentEntry = speakerHistory.value.find(
      (entry) => entry.endedAt === null && entry.participantId === participantId
    )
    if (currentEntry && level > currentEntry.peakLevel) {
      currentEntry.peakLevel = level
    }
  }

  // ============================================================================
  // Debounced Speaker Change
  // ============================================================================

  /**
   * Handle speaker change with debouncing
   */
  const handleSpeakerChange = (newSpeaker: Participant | null): void => {
    const newSpeakerId = newSpeaker?.id ?? null

    // Skip if same speaker
    if (newSpeakerId === debouncedSpeakerId.value) {
      // Update peak level if still the same speaker
      if (newSpeaker && newSpeakerId) {
        updatePeakLevel(newSpeakerId, newSpeaker.audioLevel ?? 0)
      }
      return
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // Set new debounce timer
    debounceTimer = setTimeout(() => {
      const previousSpeaker = debouncedSpeakerId.value
        ? participants.value.find((p) => p.id === debouncedSpeakerId.value) ?? null
        : null

      // End previous speaker's history entry
      if (debouncedSpeakerId.value) {
        endCurrentHistoryEntry()
      }

      // Update current speaker
      previousSpeakerId.value = debouncedSpeakerId.value
      debouncedSpeakerId.value = newSpeakerId

      // Add new history entry
      if (newSpeaker) {
        addHistoryEntry(newSpeaker)
      }

      // Call callback if provided
      if (onSpeakerChange) {
        onSpeakerChange(newSpeaker, previousSpeaker)
      }

      log.debug('Speaker changed', {
        previous: previousSpeaker?.displayName,
        current: newSpeaker?.displayName,
      })

      debounceTimer = null
    }, debounceMs)
  }

  // ============================================================================
  // Watch for Changes
  // ============================================================================

  /**
   * Watch participants for audio level changes
   */
  watch(
    () => activeSpeaker.value,
    (newSpeaker) => {
      handleSpeakerChange(newSpeaker)
    },
    { immediate: true }
  )

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Clear speaker history
   */
  const clearHistory = (): void => {
    speakerHistory.value = []
    log.debug('Speaker history cleared')
  }

  /**
   * Update threshold dynamically
   * @param newThreshold - New threshold value (clamped to 0-1 range)
   */
  const setThreshold = (newThreshold: number): void => {
    // Clamp to valid range
    const clampedThreshold = Math.max(0, Math.min(1, newThreshold))
    threshold.value = clampedThreshold
    log.debug('Threshold updated', { threshold: clampedThreshold })
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    log.debug('Active speaker composable unmounted')
  })

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    activeSpeaker,
    activeSpeakers,
    isSomeoneSpeaking,
    speakerHistory,
    clearHistory,
    setThreshold,
  }
}
