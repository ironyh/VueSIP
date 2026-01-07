/**
 * Active speaker detection type definitions
 * @packageDocumentation
 */

import type { ComputedRef, Ref } from 'vue'
import type { Participant } from './conference.types'

/**
 * Active speaker detection options
 */
export interface ActiveSpeakerOptions {
  /** Audio level threshold to consider someone speaking (0-1). Default: 0.15 */
  threshold?: number
  /** Debounce time in ms to prevent rapid speaker switching. Default: 300 */
  debounceMs?: number
  /** Number of recent speakers to track in history. Default: 10 */
  historySize?: number
  /** Exclude muted participants from detection. Default: true */
  excludeMuted?: boolean
  /** Callback when active speaker changes */
  onSpeakerChange?: (speaker: Participant | null, previous: Participant | null) => void
}

/**
 * Speaker history entry
 */
export interface SpeakerHistoryEntry {
  /** Participant ID */
  participantId: string
  /** Display name at time of speaking */
  displayName: string
  /** When they started speaking */
  startedAt: number
  /** When they stopped speaking (null if still speaking) */
  endedAt: number | null
  /** Peak audio level during this speaking period */
  peakLevel: number
}

/**
 * Return type for useActiveSpeaker composable
 */
export interface UseActiveSpeakerReturn {
  /** Current dominant speaker (highest audio level above threshold) */
  activeSpeaker: ComputedRef<Participant | null>
  /** All participants currently speaking (above threshold) */
  activeSpeakers: ComputedRef<Participant[]>
  /** Is anyone currently speaking */
  isSomeoneSpeaking: ComputedRef<boolean>
  /** Recent speaker history */
  speakerHistory: Ref<SpeakerHistoryEntry[]>
  /** Clear speaker history */
  clearHistory: () => void
  /** Update threshold dynamically */
  setThreshold: (threshold: number) => void
}
