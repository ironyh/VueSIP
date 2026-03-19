/**
 * useParticipantControls composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from 'vue'
import { useParticipantControls } from '@/composables/useParticipantControls'
import { ParticipantState } from '@/types/conference.types'
import type { Participant } from '@/types/conference.types'

describe('useParticipantControls', () => {
  // Create a mock participant
  const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
    id: 'participant-1',
    identity: 'user@example.com',
    name: 'Test User',
    state: ParticipantState.Connected,
    isMuted: false,
    isVideoEnabled: true,
    isSelf: false,
    isModerator: false,
    isPinned: false,
    isHandRaised: false,
    stream: null,
    audioStream: null,
    videoStream: null,
    screenShareStream: null,
    ...overrides,
  })

  describe('Initial state', () => {
    it('should initialize with default volume', () => {
      const participant = ref(createMockParticipant())
      const { volume } = useParticipantControls(participant)

      expect(volume.value).toBe(1)
    })

    it('should use custom initial volume', () => {
      const participant = ref(createMockParticipant())
      const { volume } = useParticipantControls(participant, { initialVolume: 0.5 })

      expect(volume.value).toBe(0.5)
    })
  })

  describe('canMute', () => {
    it('should allow mute when participant is connected', () => {
      const participant = ref(createMockParticipant({ state: ParticipantState.Connected }))
      const { canMute } = useParticipantControls(participant)

      expect(canMute.value).toBe(true)
    })

    it('should not allow mute when participant is not connected', () => {
      const participant = ref(createMockParticipant({ state: ParticipantState.Joining }))
      const { canMute } = useParticipantControls(participant)

      expect(canMute.value).toBe(false)
    })

    it('should not allow mute when participant is connecting', () => {
      const participant = ref(createMockParticipant({ state: ParticipantState.Connecting }))
      const { canMute } = useParticipantControls(participant)

      expect(canMute.value).toBe(false)
    })
  })

  describe('canKick', () => {
    it('should not allow kicking yourself', () => {
      const participant = ref(createMockParticipant({ isSelf: true }))
      const { canKick } = useParticipantControls(participant, { isModerator: ref(true) })

      expect(canKick.value).toBe(false)
    })

    it('should allow kicking others when moderator', () => {
      const participant = ref(createMockParticipant({ isSelf: false }))
      const { canKick } = useParticipantControls(participant, { isModerator: ref(true) })

      expect(canKick.value).toBe(true)
    })

    it('should not allow kicking when not moderator', () => {
      const participant = ref(createMockParticipant({ isSelf: false }))
      const { canKick } = useParticipantControls(participant, { isModerator: ref(false) })

      expect(canKick.value).toBe(false)
    })
  })

  describe('canPin', () => {
    it('should allow pin when participant is connected', () => {
      const participant = ref(createMockParticipant({ state: ParticipantState.Connected }))
      const { canPin } = useParticipantControls(participant)

      expect(canPin.value).toBe(true)
    })

    it('should not allow pin when participant is not connected', () => {
      const participant = ref(createMockParticipant({ state: ParticipantState.Joining }))
      const { canPin } = useParticipantControls(participant)

      expect(canPin.value).toBe(false)
    })
  })

  describe('toggleMute', () => {
    it('should call onMute when participant is not muted', () => {
      const participant = ref(createMockParticipant({ isMuted: false }))
      const onMute = vi.fn()
      const { toggleMute } = useParticipantControls(participant, { onMute })

      toggleMute()

      expect(onMute).toHaveBeenCalledWith(participant.value)
    })

    it('should call onUnmute when participant is muted', () => {
      const participant = ref(createMockParticipant({ isMuted: true }))
      const onUnmute = vi.fn()
      const { toggleMute } = useParticipantControls(participant, { onUnmute })

      toggleMute()

      expect(onUnmute).toHaveBeenCalledWith(participant.value)
    })

    it('should not call any callback when canMute is false', () => {
      const participant = ref(createMockParticipant({ state: ParticipantState.Joining }))
      const onMute = vi.fn()
      const onUnmute = vi.fn()
      const { toggleMute } = useParticipantControls(participant, { onMute, onUnmute })

      toggleMute()

      expect(onMute).not.toHaveBeenCalled()
      expect(onUnmute).not.toHaveBeenCalled()
    })
  })

  describe('kickParticipant', () => {
    it('should call onKick when canKick is true', () => {
      const participant = ref(createMockParticipant({ isSelf: false }))
      const onKick = vi.fn()
      const { kickParticipant } = useParticipantControls(participant, {
        isModerator: ref(true),
        onKick,
      })

      kickParticipant()

      expect(onKick).toHaveBeenCalledWith(participant.value)
    })

    it('should not call onKick when canKick is false', () => {
      const participant = ref(createMockParticipant({ isSelf: true }))
      const onKick = vi.fn()
      const { kickParticipant } = useParticipantControls(participant, { onKick })

      kickParticipant()

      expect(onKick).not.toHaveBeenCalled()
    })
  })

  describe('togglePin', () => {
    it('should call onPin when not pinned', () => {
      const participant = ref(createMockParticipant())
      const onPin = vi.fn()
      const { togglePin } = useParticipantControls(participant, { isPinned: ref(false), onPin })

      togglePin()

      expect(onPin).toHaveBeenCalledWith(participant.value)
    })

    it('should call onUnpin when pinned', () => {
      const participant = ref(createMockParticipant())
      const onUnpin = vi.fn()
      const { togglePin } = useParticipantControls(participant, { isPinned: ref(true), onUnpin })

      togglePin()

      expect(onUnpin).toHaveBeenCalledWith(participant.value)
    })

    it('should not call any callback when canPin is false', () => {
      const participant = ref(createMockParticipant({ state: ParticipantState.Joining }))
      const onPin = vi.fn()
      const onUnpin = vi.fn()
      const { togglePin } = useParticipantControls(participant, {
        isPinned: ref(false),
        onPin,
        onUnpin,
      })

      togglePin()

      expect(onPin).not.toHaveBeenCalled()
      expect(onUnpin).not.toHaveBeenCalled()
    })
  })

  describe('setVolume', () => {
    it('should set volume within valid range', () => {
      const participant = ref(createMockParticipant())
      const { volume, setVolume } = useParticipantControls(participant)

      setVolume(0.7)

      expect(volume.value).toBe(0.7)
    })

    it('should clamp volume to 0', () => {
      const participant = ref(createMockParticipant())
      const { volume, setVolume } = useParticipantControls(participant)

      setVolume(-0.5)

      expect(volume.value).toBe(0)
    })

    it('should clamp volume to 1', () => {
      const participant = ref(createMockParticipant())
      const { volume, setVolume } = useParticipantControls(participant)

      setVolume(1.5)

      expect(volume.value).toBe(1)
    })

    it('should call onVolumeChange when volume changes', () => {
      const participant = ref(createMockParticipant())
      const onVolumeChange = vi.fn()
      const { setVolume } = useParticipantControls(participant, { onVolumeChange })

      setVolume(0.5)

      expect(onVolumeChange).toHaveBeenCalledWith(participant.value, 0.5)
    })

    it('should not call onVolumeChange when volume is unchanged', () => {
      const participant = ref(createMockParticipant())
      const onVolumeChange = vi.fn()
      const { setVolume } = useParticipantControls(participant, {
        initialVolume: 0.5,
        onVolumeChange,
      })

      setVolume(0.5)

      expect(onVolumeChange).not.toHaveBeenCalled()
    })
  })

  describe('with computed participant', () => {
    it('should work with computed participant ref', () => {
      const baseParticipant = ref(createMockParticipant())
      const participant = computed(() => baseParticipant.value)

      const { canMute, canKick, canPin } = useParticipantControls(participant, {
        isModerator: ref(true),
      })

      expect(canMute.value).toBe(true)
      expect(canKick.value).toBe(true)
      expect(canPin.value).toBe(true)
    })
  })
})
