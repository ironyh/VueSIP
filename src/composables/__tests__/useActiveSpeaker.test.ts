/**
 * useActiveSpeaker composable tests
 */

import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useActiveSpeaker } from '../useActiveSpeaker'
import type { Participant } from '../../types/conference.types'

describe('useActiveSpeaker', () => {
  const createParticipant = (id: string, audioLevel: number, isMuted = false): Participant => ({
    id,
    displayName: `Participant ${id}`,
    audioLevel,
    isMuted,
  })

  describe('basic detection', () => {
    it('should return null when no participants', () => {
      const participants = ref<Participant[]>([])
      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(activeSpeaker.value).toBeNull()
      expect(isSomeoneSpeaking.value).toBe(false)
    })

    it('should return null when all participants have zero audio level', () => {
      const participants = ref<Participant[]>([
        createParticipant('1', 0),
        createParticipant('2', 0),
      ])
      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(activeSpeaker.value).toBeNull()
      expect(isSomeoneSpeaking.value).toBe(false)
    })

    it('should detect single active speaker', () => {
      const participants = ref<Participant[]>([
        createParticipant('1', 0),
        createParticipant('2', 0.5), // Above default threshold of 0.15
      ])
      const { activeSpeaker, isSomeoneSpeaking } = useActiveSpeaker(participants)

      expect(activeSpeaker.value?.id).toBe('2')
      expect(isSomeoneSpeaking.value).toBe(true)
    })

    it('should return highest audio level speaker when multiple above threshold', () => {
      const participants = ref<Participant[]>([
        createParticipant('1', 0.3),
        createParticipant('2', 0.8), // Highest
        createParticipant('3', 0.5),
      ])
      const { activeSpeaker, activeSpeakers } = useActiveSpeaker(participants)

      expect(activeSpeaker.value?.id).toBe('2')
      expect(activeSpeakers.value).toHaveLength(3) // All above 0.15
    })
  })

  describe('threshold options', () => {
    it('should use custom threshold', () => {
      const participants = ref<Participant[]>([
        createParticipant('1', 0.1),
        createParticipant('2', 0.2),
      ])
      const { activeSpeaker } = useActiveSpeaker(participants, { threshold: 0.25 })

      expect(activeSpeaker.value).toBeNull() // Neither above 0.25
    })

    it('should update threshold via setThreshold', () => {
      const participants = ref<Participant[]>([createParticipant('1', 0.2)])
      const { activeSpeaker, setThreshold } = useActiveSpeaker(participants)

      expect(activeSpeaker.value?.id).toBe('1') // Above 0.15

      setThreshold(0.3)
      expect(activeSpeaker.value).toBeNull() // Below 0.3
    })
  })

  describe('muted filtering', () => {
    it('should exclude muted participants by default', () => {
      const participants = ref<Participant[]>([
        createParticipant('1', 0.8, true), // Muted but loud
        createParticipant('2', 0.3, false),
      ])
      const { activeSpeaker } = useActiveSpeaker(participants)

      expect(activeSpeaker.value?.id).toBe('2')
    })

    it('should include muted participants when excludeMuted is false', () => {
      const participants = ref<Participant[]>([
        createParticipant('1', 0.8, true),
        createParticipant('2', 0.3, false),
      ])
      const { activeSpeaker } = useActiveSpeaker(participants, { excludeMuted: false })

      expect(activeSpeaker.value?.id).toBe('1')
    })
  })

  describe('speaker history', () => {
    it('should track speaker history after debounce', async () => {
      vi.useFakeTimers()
      const participants = ref<Participant[]>([createParticipant('1', 0.5)])
      const { speakerHistory } = useActiveSpeaker(participants, {
        historySize: 10,
        debounceMs: 100,
      })

      // Advance past debounce
      vi.advanceTimersByTime(150)
      await nextTick()

      // Should have one history entry
      expect(speakerHistory.value).toHaveLength(1)
      expect(speakerHistory.value[0].participantId).toBe('1')

      vi.useRealTimers()
    })

    it('should clear history', async () => {
      vi.useFakeTimers()
      const participants = ref<Participant[]>([createParticipant('1', 0.5)])
      const { speakerHistory, clearHistory } = useActiveSpeaker(participants, {
        debounceMs: 100,
      })

      vi.advanceTimersByTime(150)
      await nextTick()

      expect(speakerHistory.value).toHaveLength(1)
      clearHistory()
      expect(speakerHistory.value).toHaveLength(0)

      vi.useRealTimers()
    })

    it('should limit history size', async () => {
      vi.useFakeTimers()
      const participants = ref<Participant[]>([createParticipant('1', 0.5)])
      const { speakerHistory } = useActiveSpeaker(participants, { historySize: 2, debounceMs: 100 })

      vi.advanceTimersByTime(150)
      await nextTick()

      // Should be capped at 2
      expect(speakerHistory.value.length).toBeLessThanOrEqual(2)

      vi.useRealTimers()
    })
  })

  describe('callback', () => {
    it('should call onSpeakerChange when speaker changes', () => {
      vi.useFakeTimers()
      const callback = vi.fn()
      const participants = ref<Participant[]>([createParticipant('1', 0.5)])

      useActiveSpeaker(participants, { debounceMs: 100, onSpeakerChange: callback })

      // Wait for debounce
      vi.advanceTimersByTime(150)

      expect(callback).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('participant filtering', () => {
    it('should handle participants without audioLevel', () => {
      const participants = ref<Participant[]>([
        { id: '1', displayName: 'No level' } as unknown as Participant,
        createParticipant('2', 0.5),
      ])
      const { activeSpeaker } = useActiveSpeaker(participants)

      // Should not throw and should find participant 2
      expect(activeSpeaker.value?.id).toBe('2')
    })
  })
})
