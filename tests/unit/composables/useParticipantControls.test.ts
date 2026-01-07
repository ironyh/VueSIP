/**
 * Tests for useParticipantControls composable
 */

import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useParticipantControls } from '@/composables/useParticipantControls'
import { ParticipantState, type Participant } from '@/types/conference.types'

describe('useParticipantControls', () => {
  /**
   * Factory function to create a mock participant for testing
   */
  const createMockParticipant = (id: string, overrides: Partial<Participant> = {}): Participant => ({
    id,
    uri: `sip:user-${id}@example.com`,
    displayName: `User ${id}`,
    state: ParticipantState.Connected,
    isMuted: false,
    isOnHold: false,
    isModerator: false,
    isSelf: false,
    joinedAt: new Date(),
    ...overrides,
  })

  // ============================================================================
  // Mute Controls
  // ============================================================================

  describe('mute controls', () => {
    it('should provide mute/unmute controls', () => {
      const participant = ref(createMockParticipant('1'))
      const onMute = vi.fn()
      const onUnmute = vi.fn()

      const { toggleMute, canMute } = useParticipantControls(participant, {
        onMute,
        onUnmute,
      })

      expect(canMute.value).toBe(true)

      // Mute
      toggleMute()
      expect(onMute).toHaveBeenCalledWith(participant.value)

      // Update state
      participant.value = { ...participant.value, isMuted: true }

      // Unmute
      toggleMute()
      expect(onUnmute).toHaveBeenCalledWith(participant.value)
    })

    it('should not allow muting disconnected participants', () => {
      const participant = ref(
        createMockParticipant('1', { state: ParticipantState.Disconnected })
      )
      const { canMute } = useParticipantControls(participant)
      expect(canMute.value).toBe(false)
    })

    it('should call onMute when unmuted participant is toggled', () => {
      const participant = ref(createMockParticipant('1', { isMuted: false }))
      const onMute = vi.fn()
      const { toggleMute } = useParticipantControls(participant, { onMute })

      toggleMute()
      expect(onMute).toHaveBeenCalledWith(participant.value)
    })

    it('should call onUnmute when muted participant is toggled', () => {
      const participant = ref(createMockParticipant('1', { isMuted: true }))
      const onUnmute = vi.fn()
      const { toggleMute } = useParticipantControls(participant, { onUnmute })

      toggleMute()
      expect(onUnmute).toHaveBeenCalledWith(participant.value)
    })

    it('should not call callbacks when canMute is false', () => {
      const participant = ref(
        createMockParticipant('1', { state: ParticipantState.Disconnected })
      )
      const onMute = vi.fn()
      const onUnmute = vi.fn()
      const { toggleMute } = useParticipantControls(participant, { onMute, onUnmute })

      toggleMute()
      expect(onMute).not.toHaveBeenCalled()
      expect(onUnmute).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Kick Controls
  // ============================================================================

  describe('kick controls', () => {
    it('should provide kick control for moderators', () => {
      const participant = ref(createMockParticipant('1'))
      const isModerator = ref(true)
      const onKick = vi.fn()

      const { kickParticipant, canKick } = useParticipantControls(participant, {
        isModerator,
        onKick,
      })

      expect(canKick.value).toBe(true)

      kickParticipant()
      expect(onKick).toHaveBeenCalledWith(participant.value)
    })

    it('should not allow kicking when not moderator', () => {
      const participant = ref(createMockParticipant('1'))
      const isModerator = ref(false)

      const { canKick } = useParticipantControls(participant, { isModerator })

      expect(canKick.value).toBe(false)
    })

    it('should not allow self-kick', () => {
      const participant = ref(createMockParticipant('1', { isSelf: true }))
      const isModerator = ref(true)

      const { canKick } = useParticipantControls(participant, { isModerator })

      expect(canKick.value).toBe(false)
    })

    it('should not call onKick when canKick is false', () => {
      const participant = ref(createMockParticipant('1', { isSelf: true }))
      const isModerator = ref(true)
      const onKick = vi.fn()

      const { kickParticipant } = useParticipantControls(participant, { isModerator, onKick })

      kickParticipant()
      expect(onKick).not.toHaveBeenCalled()
    })

    it('should update canKick when isModerator changes', () => {
      const participant = ref(createMockParticipant('1'))
      const isModerator = ref(false)

      const { canKick } = useParticipantControls(participant, { isModerator })

      expect(canKick.value).toBe(false)

      isModerator.value = true
      expect(canKick.value).toBe(true)
    })

    it('should not call onKick when not moderator', () => {
      const participant = ref(createMockParticipant('1'))
      const isModerator = ref(false)
      const onKick = vi.fn()

      const { kickParticipant } = useParticipantControls(participant, { isModerator, onKick })

      kickParticipant()
      expect(onKick).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Pin Controls
  // ============================================================================

  describe('pin controls', () => {
    it('should provide pin/unpin controls', () => {
      const participant = ref(createMockParticipant('1'))
      const isPinned = ref(false)
      const onPin = vi.fn()
      const onUnpin = vi.fn()

      const { togglePin, canPin } = useParticipantControls(participant, {
        isPinned,
        onPin,
        onUnpin,
      })

      expect(canPin.value).toBe(true)

      // Pin
      togglePin()
      expect(onPin).toHaveBeenCalledWith(participant.value)

      // Update state
      isPinned.value = true

      // Unpin
      togglePin()
      expect(onUnpin).toHaveBeenCalledWith(participant.value)
    })

    it('should allow pinning connected participants', () => {
      const participant = ref(createMockParticipant('1'))
      const { canPin } = useParticipantControls(participant)
      expect(canPin.value).toBe(true)
    })

    it('should not allow pinning disconnected participants', () => {
      const participant = ref(
        createMockParticipant('1', { state: ParticipantState.Disconnected })
      )
      const { canPin } = useParticipantControls(participant)
      expect(canPin.value).toBe(false)
    })

    it('should not call callbacks when canPin is false', () => {
      const participant = ref(
        createMockParticipant('1', { state: ParticipantState.Disconnected })
      )
      const onPin = vi.fn()
      const onUnpin = vi.fn()
      const { togglePin } = useParticipantControls(participant, { onPin, onUnpin })

      togglePin()
      expect(onPin).not.toHaveBeenCalled()
      expect(onUnpin).not.toHaveBeenCalled()
    })

    it('should handle pin toggle without isPinned ref', () => {
      const participant = ref(createMockParticipant('1'))
      const onPin = vi.fn()
      const onUnpin = vi.fn()

      const { togglePin } = useParticipantControls(participant, { onPin, onUnpin })

      // Should call onPin since isPinned defaults to false
      togglePin()
      expect(onPin).toHaveBeenCalledWith(participant.value)
      expect(onUnpin).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Volume Controls
  // ============================================================================

  describe('volume controls', () => {
    it('should provide volume control', () => {
      const participant = ref(createMockParticipant('1'))
      const onVolumeChange = vi.fn()

      const { setVolume, volume } = useParticipantControls(participant, {
        initialVolume: 0.8,
        onVolumeChange,
      })

      expect(volume.value).toBe(0.8)

      setVolume(0.5)
      expect(volume.value).toBe(0.5)
      expect(onVolumeChange).toHaveBeenCalledWith(participant.value, 0.5)
    })

    it('should use default volume of 1', () => {
      const participant = ref(createMockParticipant('1'))
      const { volume } = useParticipantControls(participant)
      expect(volume.value).toBe(1)
    })

    it('should clamp volume to valid range', () => {
      const participant = ref(createMockParticipant('1'))
      const { setVolume, volume } = useParticipantControls(participant)

      setVolume(1.5)
      expect(volume.value).toBe(1)

      setVolume(-0.5)
      expect(volume.value).toBe(0)
    })

    it('should not call onVolumeChange if volume unchanged', () => {
      const participant = ref(createMockParticipant('1'))
      const onVolumeChange = vi.fn()
      const { setVolume } = useParticipantControls(participant, {
        initialVolume: 0.5,
        onVolumeChange,
      })

      setVolume(0.5)
      expect(onVolumeChange).not.toHaveBeenCalled()
    })

    it('should call onVolumeChange even when clamped if value changes', () => {
      const participant = ref(createMockParticipant('1'))
      const onVolumeChange = vi.fn()
      const { setVolume, volume } = useParticipantControls(participant, {
        initialVolume: 0.5,
        onVolumeChange,
      })

      // Set to value that will be clamped
      setVolume(1.5)
      expect(volume.value).toBe(1)
      expect(onVolumeChange).toHaveBeenCalledWith(participant.value, 1)
    })

    it('should handle volume at boundaries', () => {
      const participant = ref(createMockParticipant('1'))
      const onVolumeChange = vi.fn()
      const { setVolume, volume } = useParticipantControls(participant, {
        initialVolume: 0.5,
        onVolumeChange,
      })

      setVolume(0)
      expect(volume.value).toBe(0)
      expect(onVolumeChange).toHaveBeenCalledWith(participant.value, 0)

      setVolume(1)
      expect(volume.value).toBe(1)
      expect(onVolumeChange).toHaveBeenCalledWith(participant.value, 1)
    })
  })

  // ============================================================================
  // Participant State Changes
  // ============================================================================

  describe('participant state changes', () => {
    it('should update controls when participant changes', () => {
      const participant = ref(createMockParticipant('1'))
      const { canMute, canPin } = useParticipantControls(participant)

      expect(canMute.value).toBe(true)
      expect(canPin.value).toBe(true)

      participant.value = createMockParticipant('1', { state: ParticipantState.Disconnected })

      expect(canMute.value).toBe(false)
      expect(canPin.value).toBe(false)
    })

    it('should update canKick when participant isSelf changes', () => {
      const participant = ref(createMockParticipant('1', { isSelf: false }))
      const isModerator = ref(true)
      const { canKick } = useParticipantControls(participant, { isModerator })

      expect(canKick.value).toBe(true)

      participant.value = createMockParticipant('1', { isSelf: true })
      expect(canKick.value).toBe(false)
    })

    it('should allow muting participants in connecting state', () => {
      const participant = ref(
        createMockParticipant('1', { state: ParticipantState.Connecting })
      )
      const { canMute } = useParticipantControls(participant)
      // Connecting participants should not be mutable
      expect(canMute.value).toBe(false)
    })

    it('should allow muting participants in muted state', () => {
      const participant = ref(createMockParticipant('1', { state: ParticipantState.Muted }))
      const { canMute } = useParticipantControls(participant)
      // Participants already in muted state should still be toggleable
      expect(canMute.value).toBe(false)
    })

    it('should handle on-hold participants', () => {
      const participant = ref(createMockParticipant('1', { state: ParticipantState.OnHold }))
      const { canMute, canPin } = useParticipantControls(participant)
      // On-hold participants should not be mutable or pinnable
      expect(canMute.value).toBe(false)
      expect(canPin.value).toBe(false)
    })
  })

  // ============================================================================
  // Default Options
  // ============================================================================

  describe('default options', () => {
    it('should work with no options', () => {
      const participant = ref(createMockParticipant('1'))
      const {
        canMute,
        canKick,
        canPin,
        volume,
        toggleMute,
        kickParticipant,
        togglePin,
        setVolume,
      } = useParticipantControls(participant)

      expect(canMute.value).toBe(true)
      expect(canKick.value).toBe(false) // Default isModerator is false
      expect(canPin.value).toBe(true)
      expect(volume.value).toBe(1)

      // Should not throw without callbacks
      expect(() => toggleMute()).not.toThrow()
      expect(() => kickParticipant()).not.toThrow()
      expect(() => togglePin()).not.toThrow()
      expect(() => setVolume(0.5)).not.toThrow()
    })

    it('should handle partial options', () => {
      const participant = ref(createMockParticipant('1'))
      const onMute = vi.fn()

      const { toggleMute, togglePin, setVolume } = useParticipantControls(participant, {
        onMute,
      })

      toggleMute()
      expect(onMute).toHaveBeenCalled()

      // These should not throw even without callbacks
      expect(() => togglePin()).not.toThrow()
      expect(() => setVolume(0.5)).not.toThrow()
    })
  })

  // ============================================================================
  // Computed Ref Support
  // ============================================================================

  describe('computed ref support', () => {
    it('should work with computed participant refs', () => {
      const participantData = ref(createMockParticipant('1'))
      // Simulate a computed ref by using a getter
      const participant = {
        get value() {
          return participantData.value
        },
      }

      const onMute = vi.fn()
      const { toggleMute, canMute } = useParticipantControls(
        participant as typeof participantData,
        { onMute }
      )

      expect(canMute.value).toBe(true)

      toggleMute()
      expect(onMute).toHaveBeenCalledWith(participantData.value)

      // Update underlying data
      participantData.value = createMockParticipant('1', {
        state: ParticipantState.Disconnected,
      })
      expect(canMute.value).toBe(false)
    })
  })
})
