/**
 * Tests for KeywordDetector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KeywordDetector } from '@/transcription/features/keyword-detector'
import type { TranscriptEntry } from '@/types/transcription.types'

describe('KeywordDetector', () => {
  let detector: KeywordDetector

  beforeEach(() => {
    detector = new KeywordDetector()
  })

  describe('addRule', () => {
    it('should add a keyword rule and return an ID', () => {
      const id = detector.addRule({ phrase: 'help', action: 'assist' })

      expect(id).toBeDefined()
      expect(id.startsWith('kw-')).toBe(true)
      expect(detector.getRules()).toHaveLength(1)
    })

    it('should add rules with regex patterns', () => {
      const id = detector.addRule({
        phrase: /refund|money back/i,
        action: 'escalate',
      })

      expect(id).toBeDefined()
      expect(detector.getRules()).toHaveLength(1)
    })
  })

  describe('removeRule', () => {
    it('should remove a rule by ID', () => {
      const id = detector.addRule({ phrase: 'test', action: 'test-action' })
      expect(detector.getRules()).toHaveLength(1)

      detector.removeRule(id)
      expect(detector.getRules()).toHaveLength(0)
    })

    it('should not throw for non-existent ID', () => {
      expect(() => detector.removeRule('non-existent')).not.toThrow()
    })
  })

  describe('detect', () => {
    it('should detect string phrases (case-insensitive)', () => {
      const onMatch = vi.fn()
      detector.addRule({ phrase: 'help', action: 'assist' })
      detector.onMatch(onMatch)

      const entry: TranscriptEntry = {
        id: 'test-1',
        text: 'I need HELP with my account',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      detector.detect(entry)

      expect(onMatch).toHaveBeenCalledTimes(1)
      expect(onMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          matchedText: 'HELP',
          rule: expect.objectContaining({ action: 'assist' }),
        })
      )
    })

    it('should detect regex patterns', () => {
      const onMatch = vi.fn()
      detector.addRule({ phrase: /refund|money back/i, action: 'escalate' })
      detector.onMatch(onMatch)

      const entry: TranscriptEntry = {
        id: 'test-1',
        text: 'I want my money back immediately',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      detector.detect(entry)

      expect(onMatch).toHaveBeenCalledTimes(1)
      expect(onMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          matchedText: 'money back',
        })
      )
    })

    it('should filter by speaker when specified', () => {
      const onMatch = vi.fn()
      detector.addRule({
        phrase: 'cancel',
        action: 'retention',
        speakerFilter: 'remote',
      })
      detector.onMatch(onMatch)

      const localEntry: TranscriptEntry = {
        id: 'test-1',
        text: 'Do you want to cancel?',
        speaker: 'local',
        timestamp: Date.now(),
        isFinal: true,
      }

      const remoteEntry: TranscriptEntry = {
        id: 'test-2',
        text: 'Yes, please cancel my subscription',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      detector.detect(localEntry)
      expect(onMatch).not.toHaveBeenCalled()

      detector.detect(remoteEntry)
      expect(onMatch).toHaveBeenCalledTimes(1)
    })

    it('should respect case sensitivity option', () => {
      const onMatch = vi.fn()
      detector.addRule({
        phrase: 'URGENT',
        action: 'priority',
        caseSensitive: true,
      })
      detector.onMatch(onMatch)

      const lowerEntry: TranscriptEntry = {
        id: 'test-1',
        text: 'This is urgent',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      const upperEntry: TranscriptEntry = {
        id: 'test-2',
        text: 'This is URGENT',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      detector.detect(lowerEntry)
      expect(onMatch).not.toHaveBeenCalled()

      detector.detect(upperEntry)
      expect(onMatch).toHaveBeenCalledTimes(1)
    })

    it('should detect multiple keywords in one entry', () => {
      const onMatch = vi.fn()
      detector.addRule({ phrase: 'help', action: 'assist' })
      detector.addRule({ phrase: 'cancel', action: 'retention' })
      detector.onMatch(onMatch)

      const entry: TranscriptEntry = {
        id: 'test-1',
        text: 'Can you help me cancel my subscription?',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      detector.detect(entry)

      expect(onMatch).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearRules', () => {
    it('should remove all rules', () => {
      detector.addRule({ phrase: 'test1', action: 'action1' })
      detector.addRule({ phrase: 'test2', action: 'action2' })
      expect(detector.getRules()).toHaveLength(2)

      detector.clearRules()
      expect(detector.getRules()).toHaveLength(0)
    })
  })

  describe('dispose', () => {
    it('should clean up all rules', () => {
      detector.addRule({ phrase: 'test', action: 'test' })
      detector.dispose()
      expect(detector.getRules()).toHaveLength(0)
    })
  })
})
