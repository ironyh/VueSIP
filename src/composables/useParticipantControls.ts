/**
 * Participant Controls Composable
 *
 * Provides control actions for conference participants including
 * mute, kick, pin, and volume controls with permission checking.
 *
 * @module composables/useParticipantControls
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { ParticipantState, type Participant } from '../types/conference.types'
import type {
  ParticipantControlsOptions,
  UseParticipantControlsReturn,
} from '../types/participant-controls.types'

/**
 * Participant controls composable
 *
 * Provides control actions for a conference participant including
 * mute, kick, pin, and volume controls with permission checking.
 *
 * @param participant - The participant to control (ref or computed ref)
 * @param options - Control options and callbacks
 * @returns Control state and methods
 *
 * @example
 * ```typescript
 * const { toggleMute, canKick, kickParticipant } = useParticipantControls(
 *   participant,
 *   {
 *     isModerator: ref(true),
 *     onMute: (p) => conference.muteParticipant(p.id),
 *     onKick: (p) => conference.removeParticipant(p.id),
 *   }
 * )
 *
 * // Toggle mute state
 * if (canMute.value) {
 *   toggleMute()
 * }
 *
 * // Kick participant (only works if moderator)
 * if (canKick.value) {
 *   kickParticipant()
 * }
 * ```
 */
export function useParticipantControls(
  participant: Ref<Participant> | ComputedRef<Participant>,
  options: ParticipantControlsOptions = {}
): UseParticipantControlsReturn {
  const {
    isModerator = ref(false),
    isPinned = ref(false),
    initialVolume = 1,
    onMute,
    onUnmute,
    onKick,
    onPin,
    onUnpin,
    onVolumeChange,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const volume = ref(initialVolume)

  // ============================================================================
  // Computed Permissions
  // ============================================================================

  /**
   * Whether the participant can be muted/unmuted
   * Only connected participants can be muted
   */
  const canMute = computed(() => {
    return participant.value.state === ParticipantState.Connected
  })

  /**
   * Whether the participant can be kicked
   * - Cannot kick yourself
   * - Must be a moderator to kick others
   */
  const canKick = computed(() => {
    // Can't kick yourself
    if (participant.value.isSelf) return false
    // Must be moderator to kick
    return isModerator.value
  })

  /**
   * Whether the participant can be pinned
   * Only connected participants can be pinned
   */
  const canPin = computed(() => {
    return participant.value.state === ParticipantState.Connected
  })

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Toggle the mute state of the participant
   *
   * If the participant is currently muted, calls onUnmute callback.
   * If the participant is currently unmuted, calls onMute callback.
   * Does nothing if canMute is false.
   */
  function toggleMute(): void {
    if (!canMute.value) return

    if (participant.value.isMuted) {
      onUnmute?.(participant.value)
    } else {
      onMute?.(participant.value)
    }
  }

  /**
   * Kick the participant from the conference
   *
   * Calls the onKick callback if canKick is true.
   * Does nothing if the current user is not a moderator or
   * if trying to kick themselves.
   */
  function kickParticipant(): void {
    if (!canKick.value) return
    onKick?.(participant.value)
  }

  /**
   * Toggle the pin state of the participant
   *
   * If the participant is currently pinned, calls onUnpin callback.
   * If the participant is currently unpinned, calls onPin callback.
   * Does nothing if canPin is false.
   */
  function togglePin(): void {
    if (!canPin.value) return

    if (isPinned.value) {
      onUnpin?.(participant.value)
    } else {
      onPin?.(participant.value)
    }
  }

  /**
   * Set the volume level for the participant
   *
   * Volume is clamped to the range [0, 1].
   * Calls onVolumeChange callback if the volume actually changes.
   *
   * @param level - Volume level between 0 and 1
   */
  function setVolume(level: number): void {
    const clampedLevel = Math.max(0, Math.min(1, level))
    if (clampedLevel === volume.value) return

    volume.value = clampedLevel
    onVolumeChange?.(participant.value, clampedLevel)
  }

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // Computed permissions
    canMute,
    canKick,
    canPin,

    // State
    volume,

    // Methods
    toggleMute,
    kickParticipant,
    togglePin,
    setVolume,
  }
}
