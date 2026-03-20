/**
 * useParticipantControls Composable Tests
 *
 * Tests for conference participant control functionality including:
 * - Permission checks (moderator-based)
 * - Mute/unmute toggles
 * - Kick participant
 * - Pin/unpin toggle
 * - Volume controls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { useParticipantControls } from '../../src/composables/useParticipantControls'
import { ParticipantState } from '../../src/types/conference.types'
import type { Participant } from '../../src/types/conference.types'

// Helper to create a mock participant
const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'participant-1',
  name: 'Test User',
  state: ParticipantState.Connected,
  isMuted: false,
  isSpeaking: false,
  isHandRaised: false,
  volume: 1,
  ...overrides,
})

describe('useParticipantControls', () => {
  let mockParticipant: Participant
  let participantRef: ReturnType<typeof ref>

  beforeEach(() => {
    mockParticipant = createMockParticipant()
    participantRef = ref(mockParticipant)
  })

  describe('Basic State', () => {
    it('should initialize with default values', () => {
      const { volume, canMute, canKick, canPin } = useParticipantControls(participantRef)

      expect(volume.value).toBe(1)
      // canMute and canPin are true when participant is Connected
      expect(canMute.value).toBe(true)
      expect(canKick.value).toBe(false) // Not a moderator by default
      expect(canPin.value).toBe(true)
    })

    it('should accept custom initial volume', () => {
      const { volume } = useParticipantControls(participantRef, {
        initialVolume: 0.5,
      })

      expect(volume.value).toBe(0.5)
    })
  })

  describe('Moderator Permissions', () => {
    it('should grant kick permission when isModerator is true', () => {
      const moderatorRef = ref(true)
      const { canKick } = useParticipantControls(participantRef, {
        isModerator: moderatorRef,
      })

      expect(canKick.value).toBe(true)
    })

    it('should deny kick permission when isModerator is false', () => {
      const moderatorRef = ref(false)
      const { canKick } = useParticipantControls(participantRef, {
        isModerator: moderatorRef,
      })

      expect(canKick.value).toBe(false)
    })

    it('should update kick permission when moderator status changes', () => {
      const moderatorRef = ref(false)
      const { canKick } = useParticipantControls(participantRef, {
        isModerator: moderatorRef,
      })

      expect(canKick.value).toBe(false)

      moderatorRef.value = true

      expect(canKick.value).toBe(true)
    })
  })

  describe('toggleMute', () => {
    it('should call onMute callback when participant is not muted', () => {
      const onMute = vi.fn()
      const { toggleMute } = useParticipantControls(participantRef, {
        isModerator: ref(true),
        onMute,
      })

      toggleMute()

      expect(onMute).toHaveBeenCalledWith(mockParticipant)
    })

    it('should call onUnmute callback when participant is muted', () => {
      const onUnmute = vi.fn()
      const mutedParticipant = createMockParticipant({ isMuted: true })
      const mutedParticipantRef = ref(mutedParticipant)

      const { toggleMute } = useParticipantControls(mutedParticipantRef, {
        isModerator: ref(true),
        onUnmute,
      })

      toggleMute()

      expect(onUnmute).toHaveBeenCalledWith(mutedParticipant)
    })
  })

  describe('kickParticipant', () => {
    it('should call onKick callback when user is moderator', () => {
      const onKick = vi.fn()
      const { kickParticipant } = useParticipantControls(participantRef, {
        isModerator: ref(true),
        onKick,
      })

      kickParticipant()

      expect(onKick).toHaveBeenCalledWith(mockParticipant)
    })

    it('should not call onKick when user is not moderator', () => {
      const onKick = vi.fn()
      participantRef.value.isSelf = true // Can't kick yourself
      const { kickParticipant } = useParticipantControls(participantRef, {
        isModerator: ref(true),
        onKick,
      })

      kickParticipant()

      expect(onKick).not.toHaveBeenCalled()
    })
  })

  describe('togglePin', () => {
    it('should call onPin callback when not pinned', () => {
      const onPin = vi.fn()
      const { togglePin } = useParticipantControls(participantRef, {
        isModerator: ref(true),
        isPinned: ref(false),
        onPin,
      })

      togglePin()

      expect(onPin).toHaveBeenCalledWith(mockParticipant)
    })

    it('should call onUnpin callback when already pinned', () => {
      const onUnpin = vi.fn()
      const { togglePin } = useParticipantControls(participantRef, {
        isModerator: ref(true),
        isPinned: ref(true),
        onUnpin,
      })

      togglePin()

      expect(onUnpin).toHaveBeenCalledWith(mockParticipant)
    })
  })

  describe('setVolume', () => {
    it('should update volume level', () => {
      const { volume, setVolume } = useParticipantControls(participantRef)

      setVolume(0.5)

      expect(volume.value).toBe(0.5)
    })

    it('should call onVolumeChange callback', () => {
      const onVolumeChange = vi.fn()
      const { setVolume } = useParticipantControls(participantRef, {
        onVolumeChange,
      })

      setVolume(0.7)

      expect(onVolumeChange).toHaveBeenCalledWith(mockParticipant, 0.7)
    })

    it('should clamp volume to valid range', () => {
      const { volume, setVolume } = useParticipantControls(participantRef)

      setVolume(1.5)
      expect(volume.value).toBe(1)

      setVolume(-0.5)
      expect(volume.value).toBe(0)
    })
  })

  describe('Computed Participant', () => {
    it('should work with computed participant ref', () => {
      const computedParticipant = computed(() => mockParticipant)
      const { canMute } = useParticipantControls(computedParticipant, {
        isModerator: ref(true),
      })

      expect(canMute.value).toBe(true)
    })
  })
})
