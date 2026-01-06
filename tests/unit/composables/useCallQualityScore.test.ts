/**
 * Tests for useCallQualityScore composable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCallQualityScore } from '@/composables/useCallQualityScore'
import type { QualityScoreWeights } from '@/types/call-quality.types'
import { DEFAULT_QUALITY_WEIGHTS } from '@/types/call-quality.types'

describe('useCallQualityScore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  // ==========================================================================
  // Initialization
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with null score when no stats provided', () => {
      const { score, trend, history } = useCallQualityScore()

      expect(score.value).toBeNull()
      expect(trend.value).toBeNull()
      expect(history.value).toEqual([])
    })

    it('should accept custom weight configuration', () => {
      const customWeights: Partial<QualityScoreWeights> = {
        packetLoss: 0.4,
        mos: 0.4,
        jitter: 0.1,
        rtt: 0.05,
        bitrateStability: 0.05,
      }

      const { weights } = useCallQualityScore({ weights: customWeights })

      expect(weights.value.packetLoss).toBe(0.4)
      expect(weights.value.mos).toBe(0.4)
      expect(weights.value.jitter).toBe(0.1)
    })

    it('should use default weights when not specified', () => {
      const { weights } = useCallQualityScore()

      expect(weights.value).toEqual(DEFAULT_QUALITY_WEIGHTS)
    })

    it('should merge partial weights with defaults', () => {
      const { weights } = useCallQualityScore({
        weights: { packetLoss: 0.5 },
      })

      expect(weights.value.packetLoss).toBe(0.5)
      expect(weights.value.jitter).toBe(DEFAULT_QUALITY_WEIGHTS.jitter)
      expect(weights.value.rtt).toBe(DEFAULT_QUALITY_WEIGHTS.rtt)
    })
  })

  // ==========================================================================
  // Score Calculation
  // ==========================================================================

  describe('Score Calculation', () => {
    it('should calculate overall score from combined metrics', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 0.5,
        jitter: 15,
        rtt: 50,
        mos: 4.2,
        bitrate: 1000,
        previousBitrate: 1000,
      })

      expect(score.value).not.toBeNull()
      expect(score.value!.overall).toBeGreaterThan(0)
      expect(score.value!.overall).toBeLessThanOrEqual(100)
    })

    it('should weight packet loss correctly', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      // Low packet loss
      update1({
        packetLoss: 0.1,
        jitter: 20,
        rtt: 100,
        mos: 4.0,
      })

      // High packet loss
      update2({
        packetLoss: 5,
        jitter: 20,
        rtt: 100,
        mos: 4.0,
      })

      expect(score1.value!.overall).toBeGreaterThan(score2.value!.overall)
    })

    it('should weight jitter correctly', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      // Low jitter
      update1({
        packetLoss: 1,
        jitter: 5,
        rtt: 100,
        mos: 4.0,
      })

      // High jitter
      update2({
        packetLoss: 1,
        jitter: 100,
        rtt: 100,
        mos: 4.0,
      })

      expect(score1.value!.overall).toBeGreaterThan(score2.value!.overall)
    })

    it('should weight RTT correctly', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      // Low RTT
      update1({
        packetLoss: 1,
        jitter: 20,
        rtt: 30,
        mos: 4.0,
      })

      // High RTT
      update2({
        packetLoss: 1,
        jitter: 20,
        rtt: 500,
        mos: 4.0,
      })

      expect(score1.value!.overall).toBeGreaterThan(score2.value!.overall)
    })

    it('should weight MOS correctly', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      // High MOS
      update1({
        packetLoss: 1,
        jitter: 20,
        rtt: 100,
        mos: 4.5,
      })

      // Low MOS
      update2({
        packetLoss: 1,
        jitter: 20,
        rtt: 100,
        mos: 2.5,
      })

      expect(score1.value!.overall).toBeGreaterThan(score2.value!.overall)
    })

    it('should weight bitrate stability correctly', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      // Stable bitrate
      update1({
        packetLoss: 1,
        jitter: 20,
        rtt: 100,
        mos: 4.0,
        bitrate: 1000,
        previousBitrate: 1000,
      })

      // Unstable bitrate (50% drop)
      update2({
        packetLoss: 1,
        jitter: 20,
        rtt: 100,
        mos: 4.0,
        bitrate: 500,
        previousBitrate: 1000,
      })

      expect(score1.value!.overall).toBeGreaterThan(score2.value!.overall)
    })

    it('should return 100 for perfect metrics', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 0,
        jitter: 0,
        rtt: 0,
        mos: 5.0,
        bitrate: 1000,
        previousBitrate: 1000,
      })

      expect(score.value!.overall).toBe(100)
    })

    it('should return low score for worst-case metrics', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 20,
        jitter: 200,
        rtt: 1000,
        mos: 1.0,
        bitrate: 100,
        previousBitrate: 1000,
      })

      expect(score.value!.overall).toBeLessThan(30)
    })

    it('should handle partial metrics gracefully', () => {
      const { score, updateScore } = useCallQualityScore()

      // Only provide some metrics
      updateScore({
        packetLoss: 1,
        rtt: 100,
      })

      expect(score.value).not.toBeNull()
      expect(score.value!.overall).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // Audio Quality Score
  // ==========================================================================

  describe('Audio Quality Score', () => {
    it('should calculate audio score from audio-specific metrics', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        audioPacketLoss: 0.5,
        audioJitterBufferDelay: 20,
        mos: 4.2,
      })

      expect(score.value!.audio).toBeGreaterThan(70)
    })

    it('should prioritize audio codec quality through MOS', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      update1({
        audioPacketLoss: 0.5,
        mos: 4.5, // High MOS = good codec
      })

      update2({
        audioPacketLoss: 0.5,
        mos: 3.0, // Low MOS = poor codec
      })

      expect(score1.value!.audio).toBeGreaterThan(score2.value!.audio)
    })

    it('should factor in audio jitter buffer delay', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      update1({
        audioJitterBufferDelay: 10, // Low delay
        mos: 4.0,
      })

      update2({
        audioJitterBufferDelay: 100, // High delay
        mos: 4.0,
      })

      expect(score1.value!.audio).toBeGreaterThan(score2.value!.audio)
    })

    it('should consider audio packet loss specifically', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      update1({
        audioPacketLoss: 0.1,
        mos: 4.0,
      })

      update2({
        audioPacketLoss: 3,
        mos: 4.0,
      })

      expect(score1.value!.audio).toBeGreaterThan(score2.value!.audio)
    })
  })

  // ==========================================================================
  // Video Quality Score
  // ==========================================================================

  describe('Video Quality Score', () => {
    it('should calculate video score from video-specific metrics', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        videoPacketLoss: 0.5,
        framerate: 28,
        targetFramerate: 30,
        resolutionWidth: 1280,
        resolutionHeight: 720,
        audioOnly: false,
      })

      expect(score.value!.video).not.toBeNull()
      expect(score.value!.video).toBeGreaterThan(70)
    })

    it('should return null for audio-only calls', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        audioPacketLoss: 0.5,
        mos: 4.2,
        audioOnly: true,
      })

      expect(score.value!.video).toBeNull()
    })

    it('should factor in resolution and framerate', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      // High resolution and framerate
      update1({
        framerate: 30,
        targetFramerate: 30,
        resolutionWidth: 1920,
        resolutionHeight: 1080,
        audioOnly: false,
      })

      // Low resolution and framerate
      update2({
        framerate: 15,
        targetFramerate: 30,
        resolutionWidth: 640,
        resolutionHeight: 360,
        audioOnly: false,
      })

      expect(score1.value!.video).toBeGreaterThan(score2.value!.video!)
    })

    it('should consider video packet loss specifically', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      update1({
        videoPacketLoss: 0.1,
        framerate: 30,
        targetFramerate: 30,
        audioOnly: false,
      })

      update2({
        videoPacketLoss: 5,
        framerate: 30,
        targetFramerate: 30,
        audioOnly: false,
      })

      expect(score1.value!.video).toBeGreaterThan(score2.value!.video!)
    })

    it('should account for freeze events', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      update1({
        framerate: 30,
        targetFramerate: 30,
        freezeCount: 0,
        audioOnly: false,
      })

      update2({
        framerate: 30,
        targetFramerate: 30,
        freezeCount: 5,
        audioOnly: false,
      })

      expect(score1.value!.video).toBeGreaterThan(score2.value!.video!)
    })
  })

  // ==========================================================================
  // Network Score
  // ==========================================================================

  describe('Network Score', () => {
    it('should calculate network score from connection metrics', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        rtt: 50,
        jitter: 10,
        packetLoss: 0.5,
      })

      expect(score.value!.network).toBeGreaterThan(70)
    })

    it('should factor in RTT heavily', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      update1({
        rtt: 20,
        jitter: 20,
        packetLoss: 1,
      })

      update2({
        rtt: 400,
        jitter: 20,
        packetLoss: 1,
      })

      // RTT should have major impact on network score
      expect(score1.value!.network - score2.value!.network).toBeGreaterThan(20)
    })

    it('should consider jitter as network instability', () => {
      const { score: score1, updateScore: update1 } = useCallQualityScore()
      const { score: score2, updateScore: update2 } = useCallQualityScore()

      update1({
        rtt: 100,
        jitter: 5,
        packetLoss: 1,
      })

      update2({
        rtt: 100,
        jitter: 80,
        packetLoss: 1,
      })

      expect(score1.value!.network).toBeGreaterThan(score2.value!.network)
    })

    it('should handle missing network metrics', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        mos: 4.0,
        // No RTT, jitter, or packet loss
      })

      // Should still produce a network score using defaults
      expect(score.value!.network).toBeDefined()
    })
  })

  // ==========================================================================
  // Grade Assignment
  // ==========================================================================

  describe('Grade Assignment', () => {
    it('should assign grade A for scores >= 90', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 0,
        jitter: 5,
        rtt: 20,
        mos: 4.8,
        bitrate: 1000,
        previousBitrate: 1000,
      })

      expect(score.value!.grade).toBe('A')
    })

    it('should assign grade B for scores >= 75', () => {
      const { score, updateScore } = useCallQualityScore()

      // Slightly degraded metrics to target B grade range (75-89)
      updateScore({
        packetLoss: 1.2,
        jitter: 30,
        rtt: 100,
        mos: 3.9,
        bitrate: 900,
        previousBitrate: 1000,
      })

      expect(score.value!.overall).toBeGreaterThanOrEqual(75)
      expect(score.value!.overall).toBeLessThan(90)
      expect(score.value!.grade).toBe('B')
    })

    it('should assign grade C for scores >= 60', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 2,
        jitter: 40,
        rtt: 150,
        mos: 3.5,
      })

      expect(score.value!.overall).toBeGreaterThanOrEqual(60)
      expect(score.value!.overall).toBeLessThan(75)
      expect(score.value!.grade).toBe('C')
    })

    it('should assign grade D for scores >= 40', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 5,
        jitter: 80,
        rtt: 300,
        mos: 2.8,
      })

      expect(score.value!.overall).toBeGreaterThanOrEqual(40)
      expect(score.value!.overall).toBeLessThan(60)
      expect(score.value!.grade).toBe('D')
    })

    it('should assign grade F for scores < 40', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 15,
        jitter: 150,
        rtt: 600,
        mos: 1.5,
      })

      expect(score.value!.overall).toBeLessThan(40)
      expect(score.value!.grade).toBe('F')
    })
  })

  // ==========================================================================
  // Quality Trend
  // ==========================================================================

  describe('Quality Trend', () => {
    it('should detect improving quality trend', () => {
      const { trend, updateScore } = useCallQualityScore({ enableTrendAnalysis: true })

      // Simulate improving quality over time
      const mosValues = [3.0, 3.2, 3.5, 3.8, 4.0, 4.2, 4.4]

      for (const mos of mosValues) {
        updateScore({ mos, rtt: 100, packetLoss: 1 })
        vi.advanceTimersByTime(1000)
      }

      expect(trend.value).not.toBeNull()
      expect(trend.value!.direction).toBe('improving')
      expect(trend.value!.rate).toBeGreaterThan(0)
    })

    it('should detect stable quality', () => {
      const { trend, updateScore } = useCallQualityScore({ enableTrendAnalysis: true })

      // Simulate stable quality
      for (let i = 0; i < 7; i++) {
        updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })
        vi.advanceTimersByTime(1000)
      }

      expect(trend.value).not.toBeNull()
      expect(trend.value!.direction).toBe('stable')
    })

    it('should detect degrading quality trend', () => {
      const { trend, updateScore } = useCallQualityScore({ enableTrendAnalysis: true })

      // Simulate degrading quality over time
      const mosValues = [4.4, 4.2, 4.0, 3.8, 3.5, 3.2, 3.0]

      for (const mos of mosValues) {
        updateScore({ mos, rtt: 100, packetLoss: 1 })
        vi.advanceTimersByTime(1000)
      }

      expect(trend.value).not.toBeNull()
      expect(trend.value!.direction).toBe('degrading')
      expect(trend.value!.rate).toBeLessThan(0)
    })

    it('should calculate trend rate correctly', () => {
      const { trend, updateScore } = useCallQualityScore({ enableTrendAnalysis: true })

      // Large improvement - MOS 2.0 to 4.0 is a 50-point score change over 5 samples
      updateScore({ mos: 2.0, rtt: 100, packetLoss: 1 })
      vi.advanceTimersByTime(1000)
      updateScore({ mos: 2.5, rtt: 100, packetLoss: 1 })
      vi.advanceTimersByTime(1000)
      updateScore({ mos: 3.0, rtt: 100, packetLoss: 1 })
      vi.advanceTimersByTime(1000)
      updateScore({ mos: 3.5, rtt: 100, packetLoss: 1 })
      vi.advanceTimersByTime(1000)
      updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })

      expect(trend.value!.rate).toBeGreaterThan(2) // Positive rate indicating improvement
    })

    it('should require minimum history for trend confidence', () => {
      const { trend, updateScore } = useCallQualityScore({
        enableTrendAnalysis: true,
        historySize: 10,
      })

      // Only 2 data points - not enough for confident trend
      updateScore({ mos: 3.0, rtt: 100, packetLoss: 1 })
      vi.advanceTimersByTime(1000)
      updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })

      // Trend may exist but confidence should be low
      if (trend.value) {
        expect(trend.value.confidence).toBeLessThan(0.5)
      }
    })

    it('should not calculate trend when disabled', () => {
      const { trend, updateScore } = useCallQualityScore({ enableTrendAnalysis: false })

      for (let i = 0; i < 10; i++) {
        updateScore({ mos: 3.0 + i * 0.1, rtt: 100, packetLoss: 1 })
        vi.advanceTimersByTime(1000)
      }

      expect(trend.value).toBeNull()
    })
  })

  // ==========================================================================
  // Description Generation
  // ==========================================================================

  describe('Description Generation', () => {
    it('should generate "Excellent call quality" for A grade', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 0,
        jitter: 5,
        rtt: 20,
        mos: 4.8,
      })

      expect(score.value!.description.toLowerCase()).toContain('excellent')
    })

    it('should generate "Good call quality" for B grade', () => {
      const { score, updateScore } = useCallQualityScore()

      // Slightly degraded metrics to target B grade range (75-89)
      updateScore({
        packetLoss: 1.2,
        jitter: 30,
        rtt: 100,
        mos: 3.9,
        bitrate: 900,
        previousBitrate: 1000,
      })

      expect(score.value!.description.toLowerCase()).toContain('good')
    })

    it('should include specific issues in lower grades', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 8,
        jitter: 20,
        rtt: 100,
        mos: 3.0,
      })

      // Should mention the high packet loss
      expect(score.value!.description.toLowerCase()).toMatch(/packet loss|loss/)
    })

    it('should mention network issues when network score is low', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 1,
        jitter: 100,
        rtt: 500,
        mos: 3.5,
      })

      // Should mention network-related issues
      expect(score.value!.description.toLowerCase()).toMatch(/network|latency|delay/)
    })
  })

  // ==========================================================================
  // History Management
  // ==========================================================================

  describe('History Management', () => {
    it('should add scores to history', () => {
      const { history, updateScore } = useCallQualityScore()

      updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })
      vi.advanceTimersByTime(1000)
      updateScore({ mos: 4.2, rtt: 90, packetLoss: 0.5 })

      expect(history.value.length).toBe(2)
    })

    it('should limit history to configured size', () => {
      const { history, updateScore } = useCallQualityScore({ historySize: 5 })

      for (let i = 0; i < 10; i++) {
        updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })
        vi.advanceTimersByTime(1000)
      }

      expect(history.value.length).toBe(5)
    })

    it('should clear history on reset', () => {
      const { history, updateScore, reset } = useCallQualityScore()

      updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })
      vi.advanceTimersByTime(1000)
      updateScore({ mos: 4.2, rtt: 90, packetLoss: 0.5 })

      expect(history.value.length).toBe(2)

      reset()

      expect(history.value.length).toBe(0)
    })

    it('should reset score to null on reset', () => {
      const { score, updateScore, reset } = useCallQualityScore()

      updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })
      expect(score.value).not.toBeNull()

      reset()

      expect(score.value).toBeNull()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle zero values correctly', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 0,
        jitter: 0,
        rtt: 0,
        mos: 5.0,
      })

      expect(score.value!.overall).toBe(100)
    })

    it('should clamp MOS to valid range', () => {
      const { score, updateScore } = useCallQualityScore()

      // MOS above 5 should be treated as 5
      updateScore({ mos: 6.0, rtt: 100, packetLoss: 1 })

      expect(score.value).not.toBeNull()
      expect(score.value!.overall).toBeLessThanOrEqual(100)
    })

    it('should handle negative values gracefully', () => {
      const { score, updateScore } = useCallQualityScore()

      // Negative values shouldn't break the calculation
      updateScore({
        packetLoss: -1, // Invalid
        jitter: 20,
        rtt: 100,
        mos: 4.0,
      })

      expect(score.value).not.toBeNull()
    })

    it('should handle very large values', () => {
      const { score, updateScore } = useCallQualityScore()

      updateScore({
        packetLoss: 100,
        jitter: 10000,
        rtt: 10000,
        mos: 1.0,
      })

      expect(score.value!.overall).toBeGreaterThanOrEqual(0)
      expect(score.value!.overall).toBeLessThanOrEqual(100)
    })

    it('should include timestamp in score', () => {
      const { score, updateScore } = useCallQualityScore()

      const before = Date.now()
      updateScore({ mos: 4.0, rtt: 100, packetLoss: 1 })
      const after = Date.now()

      expect(score.value!.timestamp).toBeGreaterThanOrEqual(before)
      expect(score.value!.timestamp).toBeLessThanOrEqual(after)
    })
  })
})
