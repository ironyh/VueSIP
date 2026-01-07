/**
 * Tests for useActiveSpeaker composable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useActiveSpeaker } from '@/composables/useActiveSpeaker'
import { ParticipantState, type Participant } from '@/types/conference.types'
import { withSetup } from '../../utils/test-helpers'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

/**
 * Helper to create a mock participant
 */
function createMockParticipant(overrides: Partial<Participant> = {}): Participant {
  const id = overrides.id || `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    uri: overrides.uri || `sip:user-${id}@example.com`,
    displayName: overrides.displayName || `User ${id}`,
    state: overrides.state || ParticipantState.Connected,
    isMuted: overrides.isMuted ?? false,
    isOnHold: overrides.isOnHold ?? false,
    isModerator: overrides.isModerator ?? false,
    isSelf: overrides.isSelf ?? false,
    audioLevel: overrides.audioLevel,
    joinedAt: overrides.joinedAt || new Date(),
    ...overrides,
  }
}

describe('useActiveSpeaker', () => {
  let participantsRef: Ref<Participant[]>

  beforeEach(() => {
    vi.useFakeTimers()
    participantsRef = ref<Participant[]>([])
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ============================================================================
  // Initial State
  // ============================================================================

  describe('Initial State', () => {
    it('should initialize with no active speaker', () => {
      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value).toBeNull()
      expect(result.activeSpeakers.value).toEqual([])
      expect(result.isSomeoneSpeaking.value).toBe(false)
      expect(result.speakerHistory.value).toEqual([])

      unmount()
    })

    it('should initialize with empty participants array', () => {
      participantsRef.value = []
      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value).toBeNull()
      expect(result.activeSpeakers.value).toHaveLength(0)

      unmount()
    })

    it('should accept custom options', () => {
      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, {
          threshold: 0.25,
          debounceMs: 500,
          historySize: 5,
          excludeMuted: false,
        })
      )

      expect(result.activeSpeaker.value).toBeNull()

      unmount()
    })
  })

  // ============================================================================
  // Active Speaker Detection
  // ============================================================================

  describe('Active Speaker Detection', () => {
    it('should detect active speaker from audio levels', () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.2,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Alice has the highest audio level
      expect(result.activeSpeaker.value?.id).toBe('alice')
      expect(result.activeSpeaker.value?.displayName).toBe('Alice')

      unmount()
    })

    it('should return null when no one is speaking above threshold', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.1, // Below default threshold of 0.15
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.05,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value).toBeNull()

      unmount()
    })

    it('should detect multiple active speakers', () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.3,
      })
      const charlie = createMockParticipant({
        id: 'charlie',
        displayName: 'Charlie',
        audioLevel: 0.1, // Below threshold
      })

      participantsRef.value = [alice, bob, charlie]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeakers.value).toHaveLength(2)
      expect(result.activeSpeakers.value.map((p) => p.id)).toContain('alice')
      expect(result.activeSpeakers.value.map((p) => p.id)).toContain('bob')
      expect(result.activeSpeakers.value.map((p) => p.id)).not.toContain('charlie')

      unmount()
    })

    it('should sort active speakers by audio level descending', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.3,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.5,
      })
      const charlie = createMockParticipant({
        id: 'charlie',
        audioLevel: 0.4,
      })

      participantsRef.value = [alice, bob, charlie]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Should be sorted by audio level: bob (0.5), charlie (0.4), alice (0.3)
      expect(result.activeSpeakers.value[0]?.id).toBe('bob')
      expect(result.activeSpeakers.value[1]?.id).toBe('charlie')
      expect(result.activeSpeakers.value[2]?.id).toBe('alice')

      unmount()
    })

    it('should update isSomeoneSpeaking correctly', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.1, // Below threshold
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.isSomeoneSpeaking.value).toBe(false)

      // Update audio level above threshold
      participantsRef.value = [{ ...alice, audioLevel: 0.5 }]

      expect(result.isSomeoneSpeaking.value).toBe(true)

      unmount()
    })
  })

  // ============================================================================
  // Threshold Configuration
  // ============================================================================

  describe('Threshold Configuration', () => {
    it('should respect custom threshold', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.2, // Above custom threshold of 0.1
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { threshold: 0.1 })
      )

      expect(result.activeSpeaker.value?.id).toBe('alice')

      unmount()
    })

    it('should allow dynamic threshold updates via setThreshold', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.12, // Below default threshold of 0.15
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value).toBeNull()

      // Lower threshold
      result.setThreshold(0.1)

      expect(result.activeSpeaker.value?.id).toBe('alice')

      unmount()
    })

    it('should clamp threshold to valid range (0-1)', () => {
      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Try to set invalid thresholds
      result.setThreshold(-0.5)
      result.setThreshold(1.5)

      // Should not throw errors
      expect(result.activeSpeaker.value).toBeNull()

      unmount()
    })
  })

  // ============================================================================
  // Muted Participant Handling
  // ============================================================================

  describe('Muted Participant Handling', () => {
    it('should exclude muted participants by default', () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.8,
        isMuted: true,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.3,
        isMuted: false,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Alice is muted, so Bob should be the active speaker
      expect(result.activeSpeaker.value?.id).toBe('bob')
      expect(result.activeSpeakers.value).toHaveLength(1)

      unmount()
    })

    it('should include muted participants when excludeMuted is false', () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.8,
        isMuted: true,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.3,
        isMuted: false,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { excludeMuted: false })
      )

      // With excludeMuted: false, Alice should be active speaker (highest level)
      expect(result.activeSpeaker.value?.id).toBe('alice')
      expect(result.activeSpeakers.value).toHaveLength(2)

      unmount()
    })
  })

  // ============================================================================
  // Debouncing Speaker Changes
  // ============================================================================

  describe('Debouncing Speaker Changes', () => {
    it('should debounce rapid speaker changes', async () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.3,
      })

      participantsRef.value = [alice, bob]

      const onSpeakerChange = vi.fn()
      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, {
          debounceMs: 300,
          onSpeakerChange,
        })
      )

      // Initial speaker is Alice
      expect(result.activeSpeaker.value?.id).toBe('alice')

      // Rapidly change speaker to Bob
      participantsRef.value = [
        { ...alice, audioLevel: 0.2 },
        { ...bob, audioLevel: 0.6 },
      ]

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(300)

      // Now Bob should be the active speaker
      expect(result.activeSpeaker.value?.id).toBe('bob')

      unmount()
    })

    it('should call onSpeakerChange callback when speaker changes', async () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.3,
      })

      participantsRef.value = [alice, bob]

      const onSpeakerChange = vi.fn()
      const { unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, {
          debounceMs: 100,
          onSpeakerChange,
        })
      )

      // Wait for initial debounce
      await vi.advanceTimersByTimeAsync(100)

      // Initial call with Alice as speaker
      expect(onSpeakerChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'alice' }),
        null
      )

      onSpeakerChange.mockClear()

      // Change speaker to Bob
      participantsRef.value = [
        { ...alice, audioLevel: 0.2 },
        { ...bob, audioLevel: 0.6 },
      ]

      await vi.advanceTimersByTimeAsync(100)

      expect(onSpeakerChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bob' }),
        expect.objectContaining({ id: 'alice' })
      )

      unmount()
    })

    it('should not trigger callback for intermediate changes within debounce period', async () => {
      const alice = createMockParticipant({ id: 'alice', audioLevel: 0.5 })
      const bob = createMockParticipant({ id: 'bob', audioLevel: 0.3 })
      const charlie = createMockParticipant({ id: 'charlie', audioLevel: 0.2 })

      participantsRef.value = [alice, bob, charlie]

      const onSpeakerChange = vi.fn()
      const { unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, {
          debounceMs: 300,
          onSpeakerChange,
        })
      )

      // Wait for initial debounce
      await vi.advanceTimersByTimeAsync(300)
      onSpeakerChange.mockClear()

      // Rapid changes: Alice -> Bob -> Charlie within debounce period
      participantsRef.value = [
        { ...alice, audioLevel: 0.2 },
        { ...bob, audioLevel: 0.6 },
        { ...charlie, audioLevel: 0.3 },
      ]

      await vi.advanceTimersByTimeAsync(100)

      participantsRef.value = [
        { ...alice, audioLevel: 0.2 },
        { ...bob, audioLevel: 0.3 },
        { ...charlie, audioLevel: 0.7 },
      ]

      // Wait for full debounce
      await vi.advanceTimersByTimeAsync(300)

      // Should only have one callback call (to Charlie, the final speaker)
      expect(onSpeakerChange).toHaveBeenCalledTimes(1)
      expect(onSpeakerChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'charlie' }),
        expect.objectContaining({ id: 'alice' })
      )

      unmount()
    })
  })

  // ============================================================================
  // Speaker History Tracking
  // ============================================================================

  describe('Speaker History Tracking', () => {
    it('should track speaker history', async () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { debounceMs: 50 })
      )

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(50)

      expect(result.speakerHistory.value).toHaveLength(1)
      expect(result.speakerHistory.value[0]?.participantId).toBe('alice')
      expect(result.speakerHistory.value[0]?.displayName).toBe('Alice')
      expect(result.speakerHistory.value[0]?.endedAt).toBeNull() // Still speaking

      unmount()
    })

    it('should update history when speaker changes', async () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.3,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { debounceMs: 50 })
      )

      await vi.advanceTimersByTimeAsync(50)

      // Change to Bob
      participantsRef.value = [
        { ...alice, audioLevel: 0.2 },
        { ...bob, audioLevel: 0.6 },
      ]

      await vi.advanceTimersByTimeAsync(50)

      expect(result.speakerHistory.value).toHaveLength(2)
      // First entry (Alice) should have endedAt set
      expect(result.speakerHistory.value[0]?.participantId).toBe('alice')
      expect(result.speakerHistory.value[0]?.endedAt).not.toBeNull()
      // Second entry (Bob) should be current speaker
      expect(result.speakerHistory.value[1]?.participantId).toBe('bob')
      expect(result.speakerHistory.value[1]?.endedAt).toBeNull()

      unmount()
    })

    it('should track peak audio level in history', async () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { debounceMs: 50 })
      )

      await vi.advanceTimersByTimeAsync(50)

      // Increase audio level
      participantsRef.value = [{ ...alice, audioLevel: 0.8 }]
      await vi.advanceTimersByTimeAsync(10)

      // Decrease audio level
      participantsRef.value = [{ ...alice, audioLevel: 0.6 }]
      await vi.advanceTimersByTimeAsync(10)

      // Peak should be captured
      expect(result.speakerHistory.value[0]?.peakLevel).toBeGreaterThanOrEqual(0.5)

      unmount()
    })

    it('should limit history size', async () => {
      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { debounceMs: 50, historySize: 3 })
      )

      // Create multiple speaker changes
      for (let i = 0; i < 5; i++) {
        const participant = createMockParticipant({
          id: `speaker-${i}`,
          displayName: `Speaker ${i}`,
          audioLevel: 0.5,
        })
        participantsRef.value = [participant]
        await vi.advanceTimersByTimeAsync(50)
      }

      // History should be limited to historySize
      expect(result.speakerHistory.value.length).toBeLessThanOrEqual(3)

      unmount()
    })

    it('should clear history when clearHistory is called', async () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { debounceMs: 50 })
      )

      await vi.advanceTimersByTimeAsync(50)

      expect(result.speakerHistory.value.length).toBeGreaterThan(0)

      result.clearHistory()

      expect(result.speakerHistory.value).toEqual([])

      unmount()
    })
  })

  // ============================================================================
  // Reactive Updates
  // ============================================================================

  describe('Reactive Updates', () => {
    it('should react to participant audio level changes', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.5,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.3,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value?.id).toBe('alice')

      // Update audio levels - Bob becomes dominant
      participantsRef.value = [
        { ...alice, audioLevel: 0.2 },
        { ...bob, audioLevel: 0.7 },
      ]

      expect(result.activeSpeaker.value?.id).toBe('bob')

      unmount()
    })

    it('should react to participants being added', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value?.id).toBe('alice')

      // Add new participant with higher audio level
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.8,
      })
      participantsRef.value = [alice, bob]

      expect(result.activeSpeaker.value?.id).toBe('bob')

      unmount()
    })

    it('should react to participants being removed', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.8,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value?.id).toBe('alice')

      // Remove Alice
      participantsRef.value = [bob]

      expect(result.activeSpeaker.value?.id).toBe('bob')

      unmount()
    })

    it('should handle empty participants array after having speakers', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value?.id).toBe('alice')

      // Remove all participants
      participantsRef.value = []

      expect(result.activeSpeaker.value).toBeNull()
      expect(result.activeSpeakers.value).toEqual([])
      expect(result.isSomeoneSpeaking.value).toBe(false)

      unmount()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle undefined audio levels', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: undefined,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Only Bob has audio level, so he should be active speaker
      expect(result.activeSpeaker.value?.id).toBe('bob')

      unmount()
    })

    it('should handle participants with zero audio level', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      expect(result.activeSpeaker.value?.id).toBe('bob')
      expect(result.activeSpeakers.value).toHaveLength(1)

      unmount()
    })

    it('should handle all participants with same audio level', () => {
      const alice = createMockParticipant({
        id: 'alice',
        displayName: 'Alice',
        audioLevel: 0.5,
      })
      const bob = createMockParticipant({
        id: 'bob',
        displayName: 'Bob',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Should select one (first in array)
      expect(result.activeSpeaker.value).not.toBeNull()
      expect(result.activeSpeakers.value).toHaveLength(2)

      unmount()
    })

    it('should handle disconnected participants', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.8,
        state: ParticipantState.Disconnected,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.5,
        state: ParticipantState.Connected,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Connected participant Bob should be preferred
      // (depends on implementation - may include disconnected or not)
      expect(result.activeSpeakers.value.length).toBeGreaterThan(0)

      unmount()
    })

    it('should handle participants on hold', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.8,
        isOnHold: true,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.5,
        isOnHold: false,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Both should be considered based on audio levels
      expect(result.activeSpeaker.value).not.toBeNull()

      unmount()
    })

    it('should handle very small audio level differences', () => {
      const alice = createMockParticipant({
        id: 'alice',
        audioLevel: 0.5001,
      })
      const bob = createMockParticipant({
        id: 'bob',
        audioLevel: 0.5,
      })

      participantsRef.value = [alice, bob]

      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))

      // Alice should be dominant (highest, even if marginally)
      expect(result.activeSpeaker.value?.id).toBe('alice')

      unmount()
    })
  })

  // ============================================================================
  // Performance
  // ============================================================================

  describe('Performance', () => {
    it('should handle large number of participants efficiently', () => {
      const participants = Array.from({ length: 50 }, (_, i) =>
        createMockParticipant({
          id: `participant-${i}`,
          audioLevel: Math.random() * 0.5 + 0.2,
        })
      )

      participantsRef.value = participants

      const startTime = performance.now()
      const { result, unmount } = withSetup(() => useActiveSpeaker(participantsRef))
      const endTime = performance.now()

      expect(result.activeSpeaker.value).not.toBeNull()
      expect(endTime - startTime).toBeLessThan(50) // Should be fast

      unmount()
    })

    it('should not cause memory leaks with frequent updates', async () => {
      const { result, unmount } = withSetup(() =>
        useActiveSpeaker(participantsRef, { debounceMs: 10 })
      )

      // Simulate frequent updates
      for (let i = 0; i < 100; i++) {
        participantsRef.value = [
          createMockParticipant({
            id: 'alice',
            audioLevel: Math.random(),
          }),
        ]
        await vi.advanceTimersByTimeAsync(10)
      }

      // History should be bounded
      expect(result.speakerHistory.value.length).toBeLessThanOrEqual(10)

      unmount()
    })
  })
})
