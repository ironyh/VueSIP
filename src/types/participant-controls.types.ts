/**
 * Participant controls type definitions
 * @packageDocumentation
 */

import type { ComputedRef, Ref } from 'vue'
import type { Participant } from './conference.types'

/**
 * Participant controls options
 */
export interface ParticipantControlsOptions {
  /** Whether the current user is a moderator */
  isModerator?: Ref<boolean>
  /** Whether this participant is currently pinned */
  isPinned?: Ref<boolean>
  /** Initial volume level (0-1). Default: 1 */
  initialVolume?: number
  /** Callback when participant is muted */
  onMute?: (participant: Participant) => void
  /** Callback when participant is unmuted */
  onUnmute?: (participant: Participant) => void
  /** Callback when participant is kicked */
  onKick?: (participant: Participant) => void
  /** Callback when participant is pinned */
  onPin?: (participant: Participant) => void
  /** Callback when participant is unpinned */
  onUnpin?: (participant: Participant) => void
  /** Callback when volume changes */
  onVolumeChange?: (participant: Participant, volume: number) => void
}

/**
 * Return type for useParticipantControls composable
 */
export interface UseParticipantControlsReturn {
  /** Can mute/unmute this participant */
  canMute: ComputedRef<boolean>
  /** Can kick this participant */
  canKick: ComputedRef<boolean>
  /** Can pin this participant */
  canPin: ComputedRef<boolean>
  /** Current volume level */
  volume: Ref<number>
  /** Toggle mute state */
  toggleMute: () => void
  /** Kick participant from conference */
  kickParticipant: () => void
  /** Toggle pin state */
  togglePin: () => void
  /** Set volume level */
  setVolume: (level: number) => void
}
