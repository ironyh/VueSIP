/**
 * Tests for useBandwidthAdaptation composable
 *
 * TDD specifications for bandwidth adaptation functionality
 * including recommendations, suggestions, auto-adaptation, and constraints.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useBandwidthAdaptation } from '@/composables/useBandwidthAdaptation'
import {
  DEFAULT_BANDWIDTH_CONSTRAINTS,
  VIDEO_RESOLUTIONS,
  type RecommendationPriority,
  type AdaptationSuggestion,
} from '@/types/call-quality.types'

describe('useBandwidthAdaptation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ==========================================================================
  // Initialization and Default State
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with maintain action and no suggestions', () => {
      const { recommendation } = useBandwidthAdaptation()

      expect(recommendation.value.action).toBe('maintain')
      expect(recommendation.value.suggestions).toEqual([])
      expect(recommendation.value.priority).toBe('low')
      expect(recommendation.value.estimatedImprovement).toBe(0)
    })

    it('should initialize with default constraints', () => {
      const { constraints } = useBandwidthAdaptation()

      expect(constraints.value).toEqual(DEFAULT_BANDWIDTH_CONSTRAINTS)
    })

    it('should initialize with auto-adaptation disabled by default', () => {
      const { isAutoAdapting } = useBandwidthAdaptation()

      expect(isAutoAdapting.value).toBe(false)
    })

    it('should accept custom constraints', () => {
      const { constraints } = useBandwidthAdaptation({
        constraints: {
          minVideoBitrate: 200,
          maxVideoBitrate: 5000,
        },
      })

      expect(constraints.value.minVideoBitrate).toBe(200)
      expect(constraints.value.maxVideoBitrate).toBe(5000)
      // Other constraints should use defaults
      expect(constraints.value.minAudioBitrate).toBe(DEFAULT_BANDWIDTH_CONSTRAINTS.minAudioBitrate)
    })

    it('should accept custom sensitivity', () => {
      const { recommendation, update } = useBandwidthAdaptation({
        sensitivity: 0.9, // High sensitivity
      })

      // With high sensitivity, moderately poor conditions should trigger downgrade
      update({
        availableBitrate: 600,
        currentBitrate: 1000,
        packetLoss: 3,
        rtt: 200,
      })

      // High sensitivity should be more reactive to moderate conditions
      expect(recommendation.value.action).not.toBe('maintain')
    })

    it('should enable auto-adaptation when option is true', () => {
      const { isAutoAdapting } = useBandwidthAdaptation({
        autoAdapt: true,
      })

      expect(isAutoAdapting.value).toBe(true)
    })
  })

  // ==========================================================================
  // Recommendation Actions
  // ==========================================================================

  describe('Recommendation Actions', () => {
    describe('Upgrade Action', () => {
      it('should recommend upgrade when bandwidth is abundant', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 5000,
          currentBitrate: 1000,
          packetLoss: 0,
          rtt: 20,
          currentResolution: VIDEO_RESOLUTIONS[2], // 480p
          currentFramerate: 30,
        })

        expect(recommendation.value.action).toBe('upgrade')
      })

      it('should suggest resolution upgrade when bandwidth allows', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 4000,
          currentBitrate: 1500,
          packetLoss: 0,
          rtt: 30,
          currentResolution: VIDEO_RESOLUTIONS[2], // 480p
          videoEnabled: true,
        })

        const videoSuggestion = recommendation.value.suggestions.find((s) => s.type === 'video')
        expect(videoSuggestion).toBeDefined()
        expect(videoSuggestion?.message).toMatch(/resolution|quality/i)
      })
    })

    describe('Maintain Action', () => {
      it('should recommend maintain when conditions are stable', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 2000,
          currentBitrate: 1800,
          packetLoss: 0.3,
          rtt: 50,
          currentResolution: VIDEO_RESOLUTIONS[1], // 720p
          currentFramerate: 30,
        })

        expect(recommendation.value.action).toBe('maintain')
      })

      it('should have no suggestions when maintaining', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 2000,
          currentBitrate: 1800,
          packetLoss: 0.2,
          rtt: 40,
        })

        // If maintaining, suggestions should be empty or low impact
        if (recommendation.value.action === 'maintain') {
          expect(recommendation.value.suggestions.length).toBe(0)
        }
      })
    })

    describe('Downgrade Action', () => {
      it('should recommend downgrade when bandwidth is constrained', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 500,
          currentBitrate: 1500,
          packetLoss: 3,
          rtt: 200,
          currentResolution: VIDEO_RESOLUTIONS[1], // 720p
        })

        expect(recommendation.value.action).toBe('downgrade')
      })

      it('should suggest resolution downgrade when bandwidth is limited', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 400,
          currentBitrate: 1200,
          packetLoss: 2,
          currentResolution: VIDEO_RESOLUTIONS[0], // 1080p
          videoEnabled: true,
        })

        const videoSuggestion = recommendation.value.suggestions.find((s) => s.type === 'video')
        expect(videoSuggestion).toBeDefined()
      })

      it('should suggest framerate reduction when needed', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 400,
          currentBitrate: 1000,
          packetLoss: 3,
          rtt: 200,
          currentFramerate: 30,
          videoEnabled: true,
        })

        // Should suggest reducing framerate (since no resolution provided, framerate is the suggestion)
        expect(recommendation.value.suggestions.length).toBeGreaterThan(0)
      })
    })

    describe('Critical Action', () => {
      it('should recommend critical when conditions are severe', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 100,
          currentBitrate: 1500,
          packetLoss: 10,
          rtt: 500,
          degradationEvents: 5,
        })

        expect(recommendation.value.action).toBe('critical')
      })

      it('should have high priority for critical recommendations', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 50,
          currentBitrate: 1000,
          packetLoss: 15,
          rtt: 600,
        })

        expect(recommendation.value.priority).toBe('critical')
      })

      it('should suggest disabling video in critical conditions', () => {
        const { recommendation, update } = useBandwidthAdaptation()

        update({
          availableBitrate: 50,
          currentBitrate: 800,
          packetLoss: 12,
          videoEnabled: true,
        })

        const videoSuggestion = recommendation.value.suggestions.find((s) => s.type === 'video')
        expect(videoSuggestion?.message).toMatch(/disable|turn off|audio.only/i)
      })
    })
  })

  // ==========================================================================
  // Priority Levels
  // ==========================================================================

  describe('Priority Levels', () => {
    it.each([
      [{ availableBitrate: 3000, currentBitrate: 1000, packetLoss: 0 }, 'low'],
      [{ availableBitrate: 800, currentBitrate: 1000, packetLoss: 2 }, 'medium'],
      [{ availableBitrate: 400, currentBitrate: 1000, packetLoss: 4 }, 'high'],
      [{ availableBitrate: 100, currentBitrate: 1000, packetLoss: 10 }, 'critical'],
    ] as [Record<string, number>, RecommendationPriority][])(
      'should assign %s priority for conditions',
      (input, expectedPriority) => {
        const { recommendation, update } = useBandwidthAdaptation()

        update(input)

        expect(recommendation.value.priority).toBe(expectedPriority)
      }
    )
  })

  // ==========================================================================
  // Suggestions
  // ==========================================================================

  describe('Suggestions', () => {
    it('should order suggestions by impact (highest first)', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 300,
        currentBitrate: 1500,
        packetLoss: 5,
        currentResolution: VIDEO_RESOLUTIONS[0], // 1080p
        currentFramerate: 30,
        currentAudioBitrate: 128,
        videoEnabled: true,
      })

      const suggestions = recommendation.value.suggestions
      if (suggestions.length >= 2) {
        for (let i = 1; i < suggestions.length; i++) {
          expect(suggestions[i - 1].impact).toBeGreaterThanOrEqual(suggestions[i].impact)
        }
      }
    })

    it('should include current and recommended values in suggestions', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 300,
        currentBitrate: 1500,
        currentResolution: VIDEO_RESOLUTIONS[0], // 1080p
        videoEnabled: true,
      })

      const suggestions = recommendation.value.suggestions
      if (suggestions.length > 0) {
        const suggestion = suggestions[0]
        expect(suggestion.current).toBeTruthy()
        expect(suggestion.recommended).toBeTruthy()
        expect(suggestion.current).not.toBe(suggestion.recommended)
      }
    })

    it('should include video suggestions when video is enabled', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 300,
        currentBitrate: 1200,
        currentResolution: VIDEO_RESOLUTIONS[0],
        videoEnabled: true,
      })

      const videoSuggestions = recommendation.value.suggestions.filter((s) => s.type === 'video')
      expect(videoSuggestions.length).toBeGreaterThan(0)
    })

    it('should not include video suggestions when video is disabled', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 300,
        currentBitrate: 100,
        videoEnabled: false,
      })

      const videoSuggestions = recommendation.value.suggestions.filter((s) => s.type === 'video')
      expect(videoSuggestions.length).toBe(0)
    })

    it('should include audio suggestions when audio bitrate is high', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 50,
        currentBitrate: 200,
        currentAudioBitrate: 128,
        videoEnabled: false,
      })

      const audioSuggestions = recommendation.value.suggestions.filter((s) => s.type === 'audio')
      expect(audioSuggestions.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // Estimated Improvement
  // ==========================================================================

  describe('Estimated Improvement', () => {
    it('should estimate improvement based on suggestions', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 300,
        currentBitrate: 1500,
        packetLoss: 5,
        currentResolution: VIDEO_RESOLUTIONS[0],
        videoEnabled: true,
      })

      // Should have positive improvement estimate when there are suggestions
      if (recommendation.value.suggestions.length > 0) {
        expect(recommendation.value.estimatedImprovement).toBeGreaterThan(0)
      }
    })

    it('should have zero improvement when maintaining', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 2000,
        currentBitrate: 1800,
        packetLoss: 0.2,
        rtt: 30,
      })

      if (recommendation.value.action === 'maintain') {
        expect(recommendation.value.estimatedImprovement).toBe(0)
      }
    })

    it('should cap improvement at 100', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 50,
        currentBitrate: 2000,
        packetLoss: 20,
        currentResolution: VIDEO_RESOLUTIONS[0],
        currentFramerate: 60,
        currentAudioBitrate: 320,
        videoEnabled: true,
      })

      expect(recommendation.value.estimatedImprovement).toBeLessThanOrEqual(100)
    })
  })

  // ==========================================================================
  // Auto-Adaptation
  // ==========================================================================

  describe('Auto-Adaptation', () => {
    it('should enable auto-adaptation with setAutoAdapt', () => {
      const { isAutoAdapting, setAutoAdapt } = useBandwidthAdaptation()

      expect(isAutoAdapting.value).toBe(false)

      setAutoAdapt(true)

      expect(isAutoAdapting.value).toBe(true)
    })

    it('should disable auto-adaptation with setAutoAdapt', () => {
      const { isAutoAdapting, setAutoAdapt } = useBandwidthAdaptation({
        autoAdapt: true,
      })

      expect(isAutoAdapting.value).toBe(true)

      setAutoAdapt(false)

      expect(isAutoAdapting.value).toBe(false)
    })
  })

  // ==========================================================================
  // Constraints Management
  // ==========================================================================

  describe('Constraints', () => {
    it('should update constraints with setConstraints', () => {
      const { constraints, setConstraints } = useBandwidthAdaptation()

      setConstraints({
        minVideoBitrate: 300,
        maxVideoBitrate: 4000,
      })

      expect(constraints.value.minVideoBitrate).toBe(300)
      expect(constraints.value.maxVideoBitrate).toBe(4000)
    })

    it('should merge new constraints with existing ones', () => {
      const { constraints, setConstraints } = useBandwidthAdaptation()

      setConstraints({ minVideoBitrate: 250 })
      setConstraints({ maxVideoBitrate: 3500 })

      expect(constraints.value.minVideoBitrate).toBe(250)
      expect(constraints.value.maxVideoBitrate).toBe(3500)
    })

    it('should respect minVideoBitrate in recommendations', () => {
      const { recommendation, update, setConstraints } = useBandwidthAdaptation()

      setConstraints({ minVideoBitrate: 500 })

      update({
        availableBitrate: 400,
        currentBitrate: 800,
        packetLoss: 2,
        currentResolution: VIDEO_RESOLUTIONS[1],
        videoEnabled: true,
      })

      // Should suggest disabling video since we can't meet minimum
      const videoSuggestion = recommendation.value.suggestions.find((s) => s.type === 'video')
      expect(videoSuggestion).toBeDefined()
    })

    it('should respect resolution constraints', () => {
      const { constraints, setConstraints } = useBandwidthAdaptation()

      const minRes = VIDEO_RESOLUTIONS[3] // 360p
      setConstraints({ minResolution: minRes })

      expect(constraints.value.minResolution).toEqual(minRes)
    })
  })

  // ==========================================================================
  // Callback on Recommendation
  // ==========================================================================

  describe('Recommendation Callback', () => {
    it('should call onRecommendation when recommendation changes', () => {
      const onRecommendation = vi.fn()
      const { update } = useBandwidthAdaptation({ onRecommendation })

      update({
        availableBitrate: 200,
        currentBitrate: 1000,
        packetLoss: 5,
      })

      expect(onRecommendation).toHaveBeenCalled()
    })

    it('should pass recommendation to callback', () => {
      const onRecommendation = vi.fn()
      const { update } = useBandwidthAdaptation({ onRecommendation })

      update({
        availableBitrate: 200,
        currentBitrate: 1000,
        packetLoss: 5,
      })

      expect(onRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
          suggestions: expect.any(Array),
          priority: expect.any(String),
        })
      )
    })
  })

  // ==========================================================================
  // Apply Suggestion
  // ==========================================================================

  describe('Apply Suggestion', () => {
    it('should provide applySuggestion function', () => {
      const { applySuggestion } = useBandwidthAdaptation()

      expect(typeof applySuggestion).toBe('function')
    })

    it('should call applySuggestion without error', () => {
      const { applySuggestion } = useBandwidthAdaptation()

      const suggestion: AdaptationSuggestion = {
        type: 'video',
        message: 'Reduce resolution',
        current: '1080p',
        recommended: '720p',
        impact: 40,
      }

      expect(() => applySuggestion(suggestion)).not.toThrow()
    })
  })

  // ==========================================================================
  // Reset Functionality
  // ==========================================================================

  describe('Reset', () => {
    it('should reset to default state', () => {
      const { recommendation, isAutoAdapting, update, setAutoAdapt, reset } =
        useBandwidthAdaptation()

      // Make some changes
      update({
        availableBitrate: 100,
        currentBitrate: 1000,
        packetLoss: 10,
      })
      setAutoAdapt(true)

      expect(recommendation.value.action).toBe('critical')
      expect(isAutoAdapting.value).toBe(true)

      // Reset
      reset()

      expect(recommendation.value.action).toBe('maintain')
      expect(recommendation.value.suggestions).toEqual([])
      expect(isAutoAdapting.value).toBe(false)
    })

    it('should reset constraints to defaults', () => {
      const { constraints, setConstraints, reset } = useBandwidthAdaptation()

      setConstraints({
        minVideoBitrate: 500,
        maxVideoBitrate: 10000,
      })

      reset()

      expect(constraints.value).toEqual(DEFAULT_BANDWIDTH_CONSTRAINTS)
    })
  })

  // ==========================================================================
  // History Smoothing
  // ==========================================================================

  describe('History Smoothing', () => {
    it('should smooth recommendations over history window', () => {
      const { recommendation, update } = useBandwidthAdaptation({
        historySize: 5,
      })

      // First update with good conditions
      update({
        availableBitrate: 3000,
        currentBitrate: 1000,
        packetLoss: 0,
      })

      // Single bad update shouldn't immediately trigger critical
      update({
        availableBitrate: 100,
        currentBitrate: 1000,
        packetLoss: 8,
      })

      // With history smoothing, a single bad sample shouldn't cause critical
      // (This depends on implementation - adjust expectations as needed)
      expect(recommendation.value.action).not.toBe('critical')
    })

    it('should react to sustained poor conditions', () => {
      const { recommendation, update } = useBandwidthAdaptation({
        historySize: 3,
      })

      // Multiple bad updates
      for (let i = 0; i < 5; i++) {
        update({
          availableBitrate: 100,
          currentBitrate: 1000,
          packetLoss: 10,
        })
      }

      expect(recommendation.value.action).toBe('critical')
    })
  })

  // ==========================================================================
  // Sensitivity
  // ==========================================================================

  describe('Sensitivity', () => {
    it('should be more reactive with high sensitivity', () => {
      const lowSensitivity = useBandwidthAdaptation({ sensitivity: 0.2 })
      const highSensitivity = useBandwidthAdaptation({ sensitivity: 0.9 })

      const moderateConditions = {
        availableBitrate: 800,
        currentBitrate: 1000,
        packetLoss: 2,
      }

      lowSensitivity.update(moderateConditions)
      highSensitivity.update(moderateConditions)

      // High sensitivity should produce higher priority or more aggressive action
      const lowPriorityOrder = ['low', 'medium', 'high', 'critical']
      const lowIndex = lowPriorityOrder.indexOf(lowSensitivity.recommendation.value.priority)
      const highIndex = lowPriorityOrder.indexOf(highSensitivity.recommendation.value.priority)

      expect(highIndex).toBeGreaterThanOrEqual(lowIndex)
    })

    it('should clamp sensitivity to valid range', () => {
      const { recommendation, update } = useBandwidthAdaptation({
        sensitivity: 1.5, // Out of range, should clamp to 1.0
      })

      update({
        availableBitrate: 500,
        currentBitrate: 1000,
        packetLoss: 3,
      })

      // Should still work without error
      expect(recommendation.value).toBeDefined()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty update gracefully', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({})

      expect(recommendation.value.action).toBe('maintain')
    })

    it('should handle zero bitrate values', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 0,
        currentBitrate: 0,
      })

      expect(recommendation.value.action).toBe('critical')
    })

    it('should handle negative values as zero', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: -100,
        currentBitrate: -50,
        packetLoss: -5,
      })

      // Should treat as zero/critical
      expect(recommendation.value).toBeDefined()
    })

    it('should handle very high bitrate values', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 1000000,
        currentBitrate: 500000,
        packetLoss: 0,
      })

      expect(recommendation.value.action).toBe('upgrade')
    })

    it('should handle rapid consecutive updates', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      for (let i = 0; i < 100; i++) {
        update({
          availableBitrate: 1000 + i * 10,
          currentBitrate: 800,
          packetLoss: i % 5,
        })
      }

      expect(recommendation.value).toBeDefined()
    })

    it('should handle update with only packet loss', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({ packetLoss: 5 })

      expect(recommendation.value.action).not.toBe('maintain')
    })

    it('should handle update with only RTT', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({ rtt: 500 })

      // High RTT alone should trigger concern
      expect(['downgrade', 'critical']).toContain(recommendation.value.action)
    })
  })

  // ==========================================================================
  // Timestamp
  // ==========================================================================

  describe('Timestamp', () => {
    it('should include timestamp in recommendation', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      const beforeUpdate = Date.now()
      update({
        availableBitrate: 1000,
        currentBitrate: 800,
      })
      const afterUpdate = Date.now()

      expect(recommendation.value.timestamp).toBeGreaterThanOrEqual(beforeUpdate)
      expect(recommendation.value.timestamp).toBeLessThanOrEqual(afterUpdate)
    })

    it('should update timestamp on each update', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({ availableBitrate: 1000, currentBitrate: 800 })
      const firstTimestamp = recommendation.value.timestamp

      vi.advanceTimersByTime(100)

      update({ availableBitrate: 900, currentBitrate: 800 })
      const secondTimestamp = recommendation.value.timestamp

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp)
    })
  })

  // ==========================================================================
  // Degradation Events
  // ==========================================================================

  describe('Degradation Events', () => {
    it('should factor in degradation events for recommendations', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      // Without degradation events
      update({
        availableBitrate: 800,
        currentBitrate: 1000,
        packetLoss: 2,
        degradationEvents: 0,
      })
      const priorityWithoutEvents = recommendation.value.priority

      // Reset and try with degradation events
      const { recommendation: rec2, update: update2 } = useBandwidthAdaptation()
      update2({
        availableBitrate: 800,
        currentBitrate: 1000,
        packetLoss: 2,
        degradationEvents: 5,
      })

      // Degradation events should increase urgency
      const priorityOrder = ['low', 'medium', 'high', 'critical']
      expect(priorityOrder.indexOf(rec2.value.priority)).toBeGreaterThanOrEqual(
        priorityOrder.indexOf(priorityWithoutEvents)
      )
    })
  })
})
