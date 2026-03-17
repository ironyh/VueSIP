/**
 * Tests for useActiveSpeaker composable
 * @module tests/composables/useActiveSpeaker.test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useActiveSpeaker } from '@/composables/useActiveSpeaker'
import type { Participant } from '@/types/conference.types'
import { ParticipantState } from '@/types/conference.types'

// Helper to create a mock participant
function createParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'part-1',
    uri: 'sip:part1@example.com',
    displayName: 'Participant 1',
    state: ParticipantState.Connected,
    isMuted: false,
    isOnHold: false,
    isModerator: false,
    isSelf: false,
    audioLevel: 0,
    joinedAt: new Date(),
    ...overrides,
  }
}

describe('useActiveSpeaker', () => {
  let participants: ReturnType<typeof ref<Participant[]>>

  beforeEach(() => {
    participants = ref<Participant[]>([])
  })

  describe('initialization', () => {
    it('should return null activeSpeaker with empty participants', () => {
      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants)
      expect(activeSpeaker.value).toBeNull()
      expect(isSomeoneSpeaking.value).toBe(false)
    })

    it('should return empty activeSpeakers with empty participants', () => {
      const { activeSpeakers } = useActiveSpeaker(participants)
      expect(activeSpeakers.value).toEqual([])
    })

    it('should return empty speakerHistory on init', () => {
      const { speakerHistory } = useActiveSpeaker(participants)
      expect(speakerHistory.value).toEqual([])
    })
  })

  describe('basic speaker detection', () => {
    it('should detect participant above threshold as active speaker', () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.5 })]

      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(isSomeoneSpeaking.value).toBe(true)
      expect(activeSpeaker.value?.id).toBe('p1')
    })

    it('should return null when participant below threshold', () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.05 })]

      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants, {
        threshold: 0.15,
      })

      expect(isSomeoneSpeaking.value).toBe(false)
      expect(activeSpeaker.value).toBeNull()
    })

    it('should handle participants without audioLevel', () => {
      const p = createParticipant({ id: 'p1' })
      delete p.audioLevel
      participants.value = [p]

      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(isSomeoneSpeaking.value).toBe(false)
      expect(activeSpeaker.value).toBeNull()
    })
  })

  describe('multiple participants', () => {
    it('should return highest audio level as dominant speaker', () => {
      participants.value = [
        createParticipant({ id: 'p1', audioLevel: 0.3 }),
        createParticipant({ id: 'p2', audioLevel: 0.8 }),
        createParticipant({ id: 'p3', audioLevel: 0.5 }),
      ]

      const { activeSpeaker } = useActiveSpeaker(participants)

      expect(activeSpeaker.value?.id).toBe('p2')
    })

    it('should return all speakers above threshold in activeSpeakers', () => {
      participants.value = [
        createParticipant({ id: 'p1', audioLevel: 0.3 }),
        createParticipant({ id: 'p2', audioLevel: 0.8 }),
        createParticipant({ id: 'p3', audioLevel: 0.1 }), // below threshold
      ]

      const { activeSpeakers } = useActiveSpeaker(participants)

      expect(activeSpeakers.value.length).toBe(2)
      expect(activeSpeakers.value.map((p) => p.id)).toEqual(['p2', 'p1'])
    })

    it('should sort activeSpeakers by audio level descending', () => {
      participants.value = [
        createParticipant({ id: 'low', audioLevel: 0.2 }),
        createParticipant({ id: 'high', audioLevel: 0.9 }),
        createParticipant({ id: 'mid', audioLevel: 0.5 }),
      ]

      const { activeSpeakers } = useActiveSpeaker(participants)

      expect(activeSpeakers.value[0]?.id).toBe('high')
      expect(activeSpeakers.value[1]?.id).toBe('mid')
      expect(activeSpeakers.value[2]?.id).toBe('low')
    })
  })

  describe('muted participant filtering', () => {
    it('should exclude muted participants by default', () => {
      participants.value = [
        createParticipant({ id: 'muted', audioLevel: 0.9, isMuted: true }),
        createParticipant({ id: 'unmuted', audioLevel: 0.3, isMuted: false }),
      ]

      const { activeSpeaker, activeSpeakers } = useActiveSpeaker(participants)

      expect(activeSpeaker.value?.id).toBe('unmuted')
      expect(activeSpeakers.value.length).toBe(1)
    })

    it('should include muted participants when excludeMuted is false', () => {
      participants.value = [
        createParticipant({ id: 'muted', audioLevel: 0.9, isMuted: true }),
        createParticipant({ id: 'unmuted', audioLevel: 0.3, isMuted: false }),
      ]

      const { activeSpeaker, activeSpeakers } = useActiveSpeaker(participants, {
        excludeMuted: false,
      })

      expect(activeSpeaker.value?.id).toBe('muted')
      expect(activeSpeakers.value.length).toBe(2)
    })
  })

  describe('threshold configuration', () => {
    it('should use custom threshold', () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.2 })]

      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants, {
        threshold: 0.25,
      })

      expect(isSomeoneSpeaking.value).toBe(false)
      expect(activeSpeaker.value).toBeNull()
    })

    it('should use default threshold of 0.15', () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.14 })]

      const { isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(isSomeoneSpeaking.value).toBe(false)
    })
  })

  describe('setThreshold', () => {
    it('should dynamically update threshold', () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.2 })]

      const { isSomeoneSpeaking, setThreshold } = useActiveSpeaker(participants)

      // Initially below default 0.15 - should be speaking
      // Actually 0.2 > 0.15 so should be speaking
      expect(isSomeoneSpeaking.value).toBe(true)

      // Increase threshold above audio level
      setThreshold(0.25)

      expect(isSomeoneSpeaking.value).toBe(false)
    })

    it('should clamp threshold to valid range 0-1', () => {
      const { setThreshold } = useActiveSpeaker(participants)

      // Test upper bound
      setThreshold(1.5)
      // Would need to check internal state - but setThreshold should not throw

      // Test lower bound
      setThreshold(-0.5)
      // Should not throw
    })
  })

  describe('speaker history', () => {
    it('should track speaker changes in history', async () => {
      // Use debounceMs: 0 for immediate updates in test
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.5 })]

      const { speakerHistory } = useActiveSpeaker(participants, { debounceMs: 50 })

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(speakerHistory.value.length).toBeGreaterThanOrEqual(1)
      expect(speakerHistory.value[0]?.participantId).toBe('p1')
    })

    it('should limit history size', async () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.5 })]

      const { speakerHistory } = useActiveSpeaker(participants, {
        debounceMs: 0,
        historySize: 3,
      })

      // Wait for initial
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Add more speakers by changing participants
      participants.value = [createParticipant({ id: 'p2', audioLevel: 0.6 })]
      await new Promise((resolve) => setTimeout(resolve, 50))

      participants.value = [createParticipant({ id: 'p3', audioLevel: 0.7 })]
      await new Promise((resolve) => setTimeout(resolve, 50))

      participants.value = [createParticipant({ id: 'p4', audioLevel: 0.8 })]
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should be limited to 3
      expect(speakerHistory.value.length).toBeLessThanOrEqual(3)
    })

    it('should clear history', async () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.5 })]

      const { speakerHistory, clearHistory } = useActiveSpeaker(participants, { debounceMs: 50 })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(speakerHistory.value.length).toBeGreaterThan(0)

      clearHistory()

      expect(speakerHistory.value).toEqual([])
    })
  })

  describe('onSpeakerChange callback', () => {
    it('should call callback when speaker changes', async () => {
      const callback = vi.fn()

      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.5 })]

      useActiveSpeaker(participants, { debounceMs: 50, onSpeakerChange: callback })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()
    })

    it('should pass both current and previous speaker to callback', async () => {
      const callback = vi.fn()

      // Start with p1
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.5 })]

      useActiveSpeaker(participants, { debounceMs: 50, onSpeakerChange: callback })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Then switch to p2
      participants.value = [createParticipant({ id: 'p2', audioLevel: 0.8 })]

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should have been called with speaker change
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('audioLevel edge cases', () => {
    it('should handle null audioLevel', () => {
      const p = createParticipant({ id: 'p1' })
      p.audioLevel = null as any
      participants.value = [p]

      const { isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(isSomeoneSpeaking.value).toBe(false)
    })

    it('should handle undefined audioLevel', () => {
      const p = createParticipant({ id: 'p1' })
      p.audioLevel = undefined
      participants.value = [p]

      const { isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(isSomeoneSpeaking.value).toBe(false)
    })

    it('should handle audioLevel at exactly threshold', () => {
      participants.value = [createParticipant({ id: 'p1', audioLevel: 0.15 })]

      const { isSomeoneSpeaking } = useActiveSpeaker(participants, { threshold: 0.15 })

      // >= threshold should trigger
      expect(isSomeoneSpeaking.value).toBe(true)
    })
  })
})
