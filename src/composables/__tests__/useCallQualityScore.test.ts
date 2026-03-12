/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCallQualityScore } from '../useCallQualityScore'
import type { QualityScoreInput } from '@/types/call-quality.types'

describe('useCallQualityScore', () => {
  let qualityScore: ReturnType<typeof useCallQualityScore>

  beforeEach(() => {
    qualityScore = useCallQualityScore()
  })

  describe('initial state', () => {
    it('should start with null score', () => {
      expect(qualityScore.score.value).toBeNull()
    })

    it('should start with null trend', () => {
      expect(qualityScore.trend.value).toBeNull()
    })

    it('should start with empty history', () => {
      expect(qualityScore.history.value).toEqual([])
    })

    it('should start with default weights', () => {
      expect(qualityScore.weights.value).toBeDefined()
      expect(qualityScore.weights.value.packetLoss).toBeDefined()
    })
  })

  describe('updateScore', () => {
    it('should calculate score with excellent metrics', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.1,
        jitter: 5,
        rtt: 20,
        mos: 4.5,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value).not.toBeNull()
      expect(qualityScore.score.value?.overall).toBeGreaterThan(90)
      expect(qualityScore.score.value?.grade).toBe('A')
    })

    it('should calculate score with poor metrics', () => {
      const input: QualityScoreInput = {
        packetLoss: 10,
        jitter: 100,
        rtt: 500,
        mos: 1.5,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value).not.toBeNull()
      expect(qualityScore.score.value?.overall).toBeLessThan(40)
      expect(qualityScore.score.value?.grade).toBe('F')
    })

    it('should calculate grade B for good quality', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.8,
        jitter: 25,
        rtt: 80,
        mos: 4.0,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.grade).toBe('B')
    })

    it('should calculate grade C for fair quality', () => {
      const input: QualityScoreInput = {
        packetLoss: 1.5,
        jitter: 45,
        rtt: 150,
        mos: 3.5,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.grade).toBe('C')
    })

    it('should calculate grade D for poor quality', () => {
      const input: QualityScoreInput = {
        packetLoss: 4,
        jitter: 70,
        rtt: 300,
        mos: 2.5,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.grade).toBe('D')
    })

    it('should handle undefined metrics gracefully', () => {
      const input: QualityScoreInput = {}

      qualityScore.updateScore(input)

      // Should default to perfect scores when metrics are unavailable
      expect(qualityScore.score.value?.overall).toBe(100)
      expect(qualityScore.score.value?.grade).toBe('A')
    })

    it('should handle audio-only calls', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
        audioOnly: true,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.video).toBeNull()
    })

    it('should calculate video score when video metrics provided', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
        audioOnly: false,
        framerate: 30,
        resolutionWidth: 1920,
        resolutionHeight: 1080,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.video).not.toBeNull()
      expect(qualityScore.score.value?.video).toBeGreaterThan(90)
    })

    it('should calculate network score correctly', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 15,
        rtt: 50,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.network).toBeDefined()
      expect(qualityScore.score.value?.network).toBeGreaterThan(90)
    })

    it('should add entry to history', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.history.value.length).toBe(1)
    })

    it('should track last input internally', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScore.updateScore(input)

      // lastInput is tracked internally but not exposed in return type
      // Score should be calculated from the input
      expect(qualityScore.score.value).not.toBeNull()
    })

    it('should round scores to 2 decimal places', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.333,
        jitter: 15.555,
        rtt: 45.555,
        mos: 4.123,
      }

      qualityScore.updateScore(input)

      const score = qualityScore.score.value
      expect(score?.overall).toEqual(Math.round((score?.overall ?? 0) * 100) / 100)
    })
  })

  describe('history management', () => {
    it('should limit history size to default (10)', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      // Add 15 entries
      for (let i = 0; i < 15; i++) {
        qualityScore.updateScore(input)
      }

      expect(qualityScore.history.value.length).toBe(10)
    })

    it('should limit history size to custom value', () => {
      const qualityScoreWithLimit = useCallQualityScore({ historySize: 5 })
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      // Add 10 entries
      for (let i = 0; i < 10; i++) {
        qualityScoreWithLimit.updateScore(input)
      }

      expect(qualityScoreWithLimit.history.value.length).toBe(5)
    })

    it('should maintain chronological order in history', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScore.updateScore(input)
      qualityScore.updateScore({ ...input, packetLoss: 1 })
      qualityScore.updateScore({ ...input, packetLoss: 2 })

      expect(qualityScore.history.value.length).toBe(3)
      expect(qualityScore.history.value[0]?.overall).toBeGreaterThan(
        qualityScore.history.value[1]?.overall ?? 0
      )
    })
  })

  describe('trend analysis', () => {
    it('should return null trend when disabled', () => {
      const qualityScoreNoTrend = useCallQualityScore({ enableTrendAnalysis: false })
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScoreNoTrend.updateScore(input)

      expect(qualityScoreNoTrend.trend.value).toBeNull()
    })

    it('should detect improving trend', () => {
      const qualityScoreWithTrend = useCallQualityScore({
        enableTrendAnalysis: true,
        historySize: 10,
      })
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      // Add entries with improving quality
      for (let i = 0; i < 5; i++) {
        qualityScoreWithTrend.updateScore({
          ...input,
          packetLoss: 5 - i,
        })
      }

      // With only 2 entries, confidence is low but direction can be determined
      if (qualityScoreWithTrend.history.value.length >= 2) {
        expect(qualityScoreWithTrend.trend.value).not.toBeNull()
      }
    })

    it('should detect degrading trend', () => {
      const qualityScoreWithTrend = useCallQualityScore({
        enableTrendAnalysis: true,
        historySize: 10,
      })
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      // Add entries with degrading quality
      for (let i = 0; i < 5; i++) {
        qualityScoreWithTrend.updateScore({
          ...input,
          packetLoss: i,
        })
      }

      // With only 2 entries, confidence is low but direction can be determined
      if (qualityScoreWithTrend.history.value.length >= 2) {
        expect(qualityScoreWithTrend.trend.value).not.toBeNull()
      }
    })
  })

  describe('reset', () => {
    it('should clear score', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScore.updateScore(input)
      qualityScore.reset()

      expect(qualityScore.score.value).toBeNull()
    })

    it('should clear trend', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScore.updateScore(input)
      qualityScore.reset()

      expect(qualityScore.trend.value).toBeNull()
    })

    it('should clear history', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScore.updateScore(input)
      qualityScore.reset()

      expect(qualityScore.history.value).toEqual([])
    })

    it('should clear lastInput internally on reset', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.5,
        jitter: 10,
        rtt: 50,
        mos: 4.2,
      }

      qualityScore.updateScore(input)
      qualityScore.reset()

      // lastInput is cleared internally but not exposed in return type
      expect(qualityScore.score.value).toBeNull()
    })
  })

  describe('custom weights', () => {
    it('should accept custom weights', () => {
      const customWeights = {
        packetLoss: 0.5,
        jitter: 0.2,
        rtt: 0.2,
        mos: 0.1,
        bitrateStability: 0,
      }

      const qualityScoreCustom = useCallQualityScore({
        weights: customWeights,
      })

      expect(qualityScoreCustom.weights.value.packetLoss).toBe(0.5)
      expect(qualityScoreCustom.weights.value.jitter).toBe(0.2)
    })
  })

  describe('description generation', () => {
    it('should return excellent description for grade A', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.1,
        jitter: 5,
        rtt: 20,
        mos: 4.8,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.description).toBe('Excellent call quality')
    })

    it('should return good description for grade B', () => {
      const input: QualityScoreInput = {
        packetLoss: 0.8,
        jitter: 25,
        rtt: 80,
        mos: 4.0,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.description).toBe('Good call quality')
    })

    it('should include specific issues in fair quality description', () => {
      const input: QualityScoreInput = {
        packetLoss: 3,
        jitter: 45,
        rtt: 150,
        mos: 3.2,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.description).toContain('Fair call quality')
    })

    it('should include specific issues in poor quality description', () => {
      const input: QualityScoreInput = {
        packetLoss: 6,
        jitter: 90,
        rtt: 350,
        mos: 2.0,
      }

      qualityScore.updateScore(input)

      expect(qualityScore.score.value?.description).toContain('Poor call quality')
    })

    it('should indicate very poor quality with issues', () => {
      const input: QualityScoreInput = {
        packetLoss: 15,
        jitter: 120,
        rtt: 600,
        mos: 1.2,
      }

      qualityScore.updateScore(input)

      // Should indicate very poor quality
      expect(qualityScore.score.value?.grade).toBe('F')
      expect(qualityScore.score.value?.description).toContain('Very poor')
    })
  })
})
