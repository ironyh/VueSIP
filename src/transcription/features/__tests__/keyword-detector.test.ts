/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KeywordDetector } from '../keyword-detector'
import type { TranscriptEntry } from '@/types/transcription.types'

describe('KeywordDetector', () => {
  let detector: KeywordDetector

  beforeEach(() => {
    detector = new KeywordDetector()
  })

  describe('addRule', () => {
    it('should add a rule and return an ID', () => {
      const id = detector.addRule({ phrase: 'hello', action: 'greeting' })
      expect(id).toMatch(/^kw-\d+-[a-z0-9]+$/)
    })

    it('should add multiple rules with unique IDs', () => {
      const id1 = detector.addRule({ phrase: 'hello', action: 'greeting' })
      const id2 = detector.addRule({ phrase: 'bye', action: 'farewell' })
      expect(id1).not.toBe(id2)
    })
  })

  describe('removeRule', () => {
    it('should remove a rule by ID', () => {
      const id = detector.addRule({ phrase: 'test', action: 'test-action' })
      detector.removeRule(id)
      expect(detector.getRules()).toHaveLength(0)
    })

    it('should do nothing for non-existent ID', () => {
      detector.addRule({ phrase: 'test', action: 'test-action' })
      detector.removeRule('non-existent-id')
      expect(detector.getRules()).toHaveLength(1)
    })
  })

  describe('getRules', () => {
    it('should return all registered rules', () => {
      detector.addRule({ phrase: 'rule1', action: 'action1' })
      detector.addRule({ phrase: 'rule2', action: 'action2' })
      const rules = detector.getRules()
      expect(rules).toHaveLength(2)
    })

    it('should return a copy of rules', () => {
      detector.addRule({ phrase: 'test', action: 'test-action' })
      const rules = detector.getRules()
      rules.push({ id: 'fake', phrase: 'fake', action: 'fake' })
      expect(detector.getRules()).toHaveLength(1)
    })
  })

  describe('clearRules', () => {
    it('should remove all rules', () => {
      detector.addRule({ phrase: 'rule1', action: 'action1' })
      detector.addRule({ phrase: 'rule2', action: 'action2' })
      detector.clearRules()
      expect(detector.getRules()).toHaveLength(0)
    })
  })

  describe('detect', () => {
    const createEntry = (text: string, speaker = 'agent'): TranscriptEntry => ({
      id: 'entry-1',
      text,
      speaker,
      timestamp: Date.now(),
    })

    it('should detect simple string phrase', () => {
      detector.addRule({ phrase: 'cancel', action: 'cancel-order' })
      const entry = createEntry('I want to cancel my order')
      const matches = detector.detect(entry)
      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe('cancel')
      expect(matches[0].rule.action).toBe('cancel-order')
    })

    it('should detect phrase regardless of case by default', () => {
      detector.addRule({ phrase: 'cancel', action: 'cancel-order' })
      const entry = createEntry('I want to CANCEL my order')
      const matches = detector.detect(entry)
      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe('CANCEL')
    })

    it('should be case sensitive when specified', () => {
      detector.addRule({ phrase: 'Cancel', action: 'cancel-order', caseSensitive: true })
      const entryLower = createEntry('I want to cancel my order')
      const entryExact = createEntry('I want to Cancel my order')

      expect(detector.detect(entryLower)).toHaveLength(0)
      expect(detector.detect(entryExact)).toHaveLength(1)
    })

    it('should detect regex patterns', () => {
      detector.addRule({ phrase: /\b\d{3}-\d{4}\b/, action: 'phone-number' })
      const entry = createEntry('Call me at 555-1234 tomorrow')
      const matches = detector.detect(entry)
      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe('555-1234')
    })

    it('should match regex with case insensitive flag', () => {
      detector.addRule({ phrase: /hello/i, action: 'greeting' })
      const entry = createEntry('Hello world')
      const matches = detector.detect(entry)
      expect(matches).toHaveLength(1)
    })

    it('should filter by speaker', () => {
      detector.addRule({ phrase: 'refund', action: 'refund-request', speakerFilter: 'customer' })
      const entryAgent = createEntry('I need a refund', 'agent')
      const entryCustomer = createEntry('I need a refund', 'customer')

      expect(detector.detect(entryAgent)).toHaveLength(0)
      expect(detector.detect(entryCustomer)).toHaveLength(1)
    })

    it('should return position of match', () => {
      detector.addRule({ phrase: 'cancel', action: 'cancel-action' })
      const entry = createEntry('Please cancel the order')
      const matches = detector.detect(entry)
      expect(matches[0].position).toEqual({ start: 7, end: 13 })
    })

    it('should return multiple matches for different rules', () => {
      detector.addRule({ phrase: 'cancel', action: 'cancel-action' })
      detector.addRule({ phrase: 'refund', action: 'refund-action' })
      const entry = createEntry('I want to cancel and get a refund')
      const matches = detector.detect(entry)
      expect(matches).toHaveLength(2)
    })

    it('should return empty array when no matches found', () => {
      detector.addRule({ phrase: 'xyz123', action: 'test' })
      const entry = createEntry('This is normal text')
      const matches = detector.detect(entry)
      expect(matches).toHaveLength(0)
    })
  })

  describe('onMatch', () => {
    it('should call callback when keyword matches', () => {
      const callback = vi.fn()
      detector.onMatch(callback)
      detector.addRule({ phrase: 'test', action: 'test-action' })

      detector.detect({ id: '1', text: 'This is a test', speaker: 'agent', timestamp: Date.now() })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = detector.onMatch(callback)

      detector.addRule({ phrase: 'test', action: 'test-action' })
      detector.detect({ id: '1', text: 'This is a test', speaker: 'agent', timestamp: Date.now() })
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      detector.detect({
        id: '2',
        text: 'This is another test',
        speaker: 'agent',
        timestamp: Date.now(),
      })
      expect(callback).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      detector.onMatch(callback1)
      detector.onMatch(callback2)

      detector.addRule({ phrase: 'help', action: 'assist' })
      detector.detect({ id: '1', text: 'I need help', speaker: 'agent', timestamp: Date.now() })

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  describe('dispose', () => {
    it('should clear all rules and callbacks', () => {
      detector.addRule({ phrase: 'test', action: 'test-action' })
      detector.onMatch(() => {})

      detector.dispose()

      expect(detector.getRules()).toHaveLength(0)
    })
  })
})
