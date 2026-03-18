/**
 * useSentiment composable unit tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useSentiment, type SentimentOptions, type SentimentResult } from '../useSentiment'

describe('useSentiment', () => {
  let defaultOptions: SentimentOptions

  // Create a fresh mock for each test
  const createMockAnalyzer = (
    result: SentimentResult = { score: 0.5, confidence: 0.8, label: 'positive' as const }
  ) => {
    return vi.fn(() => Promise.resolve(result))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    defaultOptions = {
      escalationThreshold: -0.5,
      windowSize: 30,
      minTextLength: 3,
      smoothingFactor: 0.3,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const result = useSentiment(ref(''), {})

      expect(result.currentSentiment.value).toBe(0)
      expect(result.confidence.value).toBe(0)
      expect(result.isAnalyzing.value).toBe(false)
      expect(result.sentimentHistory.value).toHaveLength(0)
      expect(result.alerts.value).toHaveLength(0)
    })

    it('should apply custom options', () => {
      const options: SentimentOptions = {
        escalationThreshold: -0.3,
        windowSize: 60,
        minTextLength: 5,
        smoothingFactor: 0.5,
      }

      const sentiment = useSentiment(ref(''), options)
      // Just verify it doesn't throw
      expect(sentiment.currentSentiment.value).toBeDefined()
    })
  })

  describe('analyzeSentiment', () => {
    it('should analyze text and return result', async () => {
      const mockAnalyzer = createMockAnalyzer({
        score: 0.7,
        confidence: 0.9,
        label: 'positive' as const,
      })

      const sentiment = useSentiment(ref('test'), { ...defaultOptions, analyzer: mockAnalyzer })
      const result = await sentiment.analyzeSentiment('This is great!')

      expect(mockAnalyzer).toHaveBeenCalledWith('This is great!')
      expect(result.score).toBe(0.7)
      expect(result.confidence).toBe(0.9)
      expect(result.label).toBe('positive')
    })

    it('should call analyzer with text', async () => {
      const mockAnalyzer = createMockAnalyzer({
        score: 0.7,
        confidence: 0.9,
        label: 'positive' as const,
      })

      const sentiment = useSentiment(ref(''), { ...defaultOptions, analyzer: mockAnalyzer })
      await sentiment.analyzeSentiment('This is great!')

      expect(mockAnalyzer).toHaveBeenCalledWith('This is great!')
    })

    it('should add to sentiment history after analysis', async () => {
      const mockAnalyzer = createMockAnalyzer({
        score: 0.5,
        confidence: 0.7,
        label: 'neutral' as const,
      })

      const sentiment = useSentiment(ref('Some text'), {
        ...defaultOptions,
        analyzer: mockAnalyzer,
        smoothingFactor: 0,
      })
      await sentiment.analyzeSentiment('Some text')
      await nextTick()

      expect(sentiment.sentimentHistory.value.length).toBeGreaterThanOrEqual(1)
      const lastEntry =
        sentiment.sentimentHistory.value[sentiment.sentimentHistory.value.length - 1]
      expect(lastEntry.score).toBeDefined()
      expect(lastEntry.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('sentimentTrend', () => {
    it('should return stable when history has fewer than 2 entries', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)
      expect(sentiment.sentimentTrend.value).toBe('stable')
    })

    it('should detect improving trend', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      // Add history with improving scores
      const now = Date.now()
      sentiment.sentimentHistory.value = [
        { score: -0.5, timestamp: new Date(now - 20000) },
        { score: -0.3, timestamp: new Date(now - 10000) },
        { score: 0.0, timestamp: new Date(now) },
      ]

      expect(sentiment.sentimentTrend.value).toBe('improving')
    })

    it('should detect declining trend', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      // Add history with declining scores
      const now = Date.now()
      sentiment.sentimentHistory.value = [
        { score: 0.5, timestamp: new Date(now - 20000) },
        { score: 0.2, timestamp: new Date(now - 10000) },
        { score: -0.1, timestamp: new Date(now) },
      ]

      expect(sentiment.sentimentTrend.value).toBe('declining')
    })

    it('should detect stable trend when slope is within threshold', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      // Add history with similar scores
      const now = Date.now()
      sentiment.sentimentHistory.value = [
        { score: 0.3, timestamp: new Date(now - 20000) },
        { score: 0.31, timestamp: new Date(now - 10000) },
        { score: 0.29, timestamp: new Date(now) },
      ]

      expect(sentiment.sentimentTrend.value).toBe('stable')
    })
  })

  describe('averageSentiment', () => {
    it('should calculate average from history', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      sentiment.sentimentHistory.value = [
        { score: 0.5, timestamp: new Date() },
        { score: 0.3, timestamp: new Date() },
        { score: 0.1, timestamp: new Date() },
      ]

      expect(sentiment.averageSentiment.value).toBeCloseTo(0.3, 5)
    })

    it('should return 0 when history is empty', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)
      expect(sentiment.averageSentiment.value).toBe(0)
    })
  })

  describe('alerts', () => {
    it('should acknowledge alert by id', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      sentiment.alerts.value = [
        {
          id: 'alert-1',
          type: 'escalation' as const,
          message: 'Test',
          sentiment: -0.6,
          timestamp: new Date(),
          acknowledged: false,
        },
        {
          id: 'alert-2',
          type: 'escalation' as const,
          message: 'Test2',
          sentiment: -0.7,
          timestamp: new Date(),
          acknowledged: false,
        },
      ]

      sentiment.acknowledgeAlert('alert-1')

      expect(sentiment.alerts.value[0].acknowledged).toBe(true)
      expect(sentiment.alerts.value[1].acknowledged).toBe(false)
    })

    it('should clear all alerts', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      sentiment.alerts.value = [
        {
          id: 'alert-1',
          type: 'escalation' as const,
          message: 'Test',
          sentiment: -0.6,
          timestamp: new Date(),
          acknowledged: false,
        },
      ]

      sentiment.clearAlerts()

      expect(sentiment.alerts.value).toHaveLength(0)
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      // Modify state
      sentiment.currentSentiment.value = 0.8
      sentiment.confidence.value = 0.9
      sentiment.alerts.value = [
        {
          id: 'alert-1',
          type: 'escalation' as const,
          message: 'Test',
          sentiment: -0.6,
          timestamp: new Date(),
          acknowledged: false,
        },
      ]
      sentiment.sentimentHistory.value = [{ score: 0.5, timestamp: new Date() }]

      sentiment.reset()

      expect(sentiment.currentSentiment.value).toBe(0)
      expect(sentiment.confidence.value).toBe(0)
      expect(sentiment.alerts.value).toHaveLength(0)
      expect(sentiment.sentimentHistory.value).toHaveLength(0)
    })
  })

  describe('callbacks', () => {
    it('should register and return unsubscribe for onEscalation', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)
      const callback = vi.fn()

      const unsubscribe = sentiment.onEscalation(callback)

      // Should return a function
      expect(typeof unsubscribe).toBe('function')
    })

    it('should register and return unsubscribe for onSentimentChange', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)
      const callback = vi.fn()

      const unsubscribe = sentiment.onSentimentChange(callback)

      // Should return a function
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('emotionBreakdown', () => {
    it('should initialize with neutral emotions', () => {
      const sentiment = useSentiment(ref(''), defaultOptions)

      expect(sentiment.emotionBreakdown.value).toEqual({
        joy: 0,
        anger: 0,
        sadness: 0,
        fear: 0,
        surprise: 0,
        neutral: 1,
      })
    })
  })
})
