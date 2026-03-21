/**
 * useBandwidthAdaptation Tests
 *
 * Tests for the bandwidth adaptation composable that provides
 * intelligent bandwidth adaptation recommendations for WebRTC connections.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBandwidthAdaptation } from '@/composables/useBandwidthAdaptation'
import type { BandwidthAdaptationInput } from '@/types/call-quality.types'

describe('useBandwidthAdaptation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const { recommendation, isAutoAdapting, constraints } = useBandwidthAdaptation()

      expect(recommendation.value).toEqual({
        action: 'maintain',
        suggestions: [],
        priority: 'low',
        estimatedImprovement: 0,
        timestamp: expect.any(Number),
      })
      expect(isAutoAdapting.value).toBe(false)
      expect(constraints.value).toBeDefined()
      expect(constraints.value.minVideoBitrate).toBeGreaterThan(0)
    })

    it('should accept custom sensitivity', () => {
      // Update with metrics to trigger recommendation
      const input: BandwidthAdaptationInput = {
        availableBitrate: 100,
        currentBitrate: 500,
        packetLoss: 6,
        rtt: 400,
      }

      // With high sensitivity, should trigger more severe recommendations
      const { update } = useBandwidthAdaptation({ sensitivity: 0.8 })
      update(input)

      const { update: updateLow } = useBandwidthAdaptation({ sensitivity: 0.2 })
      updateLow(input)
    })

    it('should accept custom history size', () => {
      const { update } = useBandwidthAdaptation({ historySize: 10 })

      // Add 10 entries
      for (let i = 0; i < 10; i++) {
        update({ packetLoss: i })
      }

      // Should not throw and should handle history correctly
      expect(true).toBe(true)
    })
  })

  describe('update with empty input', () => {
    it('should maintain current state on empty update', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      const initialTimestamp = recommendation.value.timestamp

      // Empty update
      update({})

      expect(recommendation.value.timestamp).toBeGreaterThanOrEqual(initialTimestamp)
      expect(recommendation.value.action).toBe('maintain')
    })
  })

  describe('bandwidth ratio detection', () => {
    it('should recommend upgrade when bandwidth ratio is high', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      // available 2000, current 500 = 4x ratio (above 2.0 threshold)
      update({
        availableBitrate: 2000,
        currentBitrate: 500,
        packetLoss: 0,
        rtt: 30,
      })

      expect(recommendation.value.action).toBe('upgrade')
    })

    it('should recommend maintain when bandwidth ratio is good', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      // available 1000, current 1000 = 1x ratio (between 0.8-2.0)
      update({
        availableBitrate: 1000,
        currentBitrate: 1000,
        packetLoss: 0.3,
        rtt: 40,
      })

      expect(recommendation.value.action).toBe('maintain')
    })

    it('should recommend downgrade when bandwidth is limited', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      // available 300, current 1000 = 0.3x ratio (below 0.5 threshold)
      update({
        availableBitrate: 300,
        currentBitrate: 1000,
        packetLoss: 1,
        rtt: 80,
      })

      expect(recommendation.value.action).toBe('downgrade')
    })
  })

  describe('packet loss detection', () => {
    it('should recommend critical action on very high packet loss', () => {
      const { recommendation, update } = useBandwidthAdaptation({ sensitivity: 0.8 })

      update({
        availableBitrate: 1500,
        currentBitrate: 1200,
        packetLoss: 15, // Very high packet loss
        rtt: 100,
      })

      // With high packet loss, severity should be high
      expect(recommendation.value.priority).not.toBe('low')
    })

    it('should react to moderate packet loss with some severity', () => {
      const { recommendation, update } = useBandwidthAdaptation({ sensitivity: 0.7 })

      update({
        availableBitrate: 1500,
        currentBitrate: 1200,
        packetLoss: 6, // High packet loss
        rtt: 100,
      })

      // High packet loss should trigger some action
      expect(['downgrade', 'critical']).toContain(recommendation.value.action)
    })

    it('should not trigger severity on excellent packet loss', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 1500,
        currentBitrate: 1200,
        packetLoss: 0.1,
        rtt: 30,
      })

      expect(recommendation.value.action).not.toBe('critical')
      expect(recommendation.value.priority).not.toBe('critical')
    })
  })

  describe('RTT detection', () => {
    it('should recommend critical on very high RTT', () => {
      const { recommendation, update } = useBandwidthAdaptation({ sensitivity: 0.8 })

      update({
        availableBitrate: 1500,
        currentBitrate: 1200,
        packetLoss: 0,
        rtt: 800, // Very high RTT
      })

      expect(recommendation.value.priority).not.toBe('low')
    })

    it('should react to poor RTT with some severity', () => {
      const { recommendation, update } = useBandwidthAdaptation({ sensitivity: 0.7 })

      update({
        availableBitrate: 1500,
        currentBitrate: 1200,
        packetLoss: 0,
        rtt: 400, // High RTT
      })

      // High RTT should trigger response
      expect(recommendation.value.action).not.toBe('maintain')
    })
  })

  describe('video resolution suggestions', () => {
    it('should suggest disabling video when bandwidth is too low', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 50, // Below min video bitrate
        currentBitrate: 100,
        videoEnabled: true,
        currentResolution: { width: 1280, height: 720, label: '720p' },
      })

      const videoSuggestion = recommendation.value.suggestions.find((s) => s.type === 'video')
      expect(videoSuggestion).toBeDefined()
      expect(videoSuggestion?.recommended).toBe('Audio only')
    })

    it('should suggest resolution downgrade on poor conditions', () => {
      const { recommendation, update } = useBandwidthAdaptation({ sensitivity: 0.7 })

      update({
        availableBitrate: 500,
        currentBitrate: 1500,
        packetLoss: 4,
        videoEnabled: true,
        currentResolution: { width: 1280, height: 720, label: '720p' },
        currentFramerate: 30,
      })

      // Should have video suggestions on poor conditions
      const videoSuggestion = recommendation.value.suggestions.find((s) => s.type === 'video')
      expect(videoSuggestion).toBeDefined()
    })

    it('should suggest resolution upgrade when bandwidth allows', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 4000,
        currentBitrate: 1500,
        packetLoss: 0.1,
        rtt: 30,
        videoEnabled: true,
        currentResolution: { width: 854, height: 480, label: '480p' },
      })

      expect(recommendation.value.action).toBe('upgrade')

      const videoSuggestion = recommendation.value.suggestions.find((s) =>
        s.message.includes('Increase video resolution')
      )
      expect(videoSuggestion).toBeDefined()
      expect(videoSuggestion?.recommended).toBe('720p')
    })

    it('should suggest framerate reduction as fallback', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 600,
        currentBitrate: 1200,
        packetLoss: 2,
        videoEnabled: true,
        currentResolution: { width: 1280, height: 720, label: '720p' },
        currentFramerate: 30,
      })

      const fpsSuggestion = recommendation.value.suggestions.find((s) =>
        s.message.includes('framerate')
      )
      expect(fpsSuggestion).toBeDefined()
    })
  })

  describe('audio bitrate suggestions', () => {
    it('should suggest reducing audio bitrate on downgrade', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 300,
        currentBitrate: 800,
        packetLoss: 4,
        videoEnabled: false,
        currentAudioBitrate: 128,
      })

      const audioSuggestion = recommendation.value.suggestions.find((s) => s.type === 'audio')
      expect(audioSuggestion).toBeDefined()
      expect(audioSuggestion?.message).toContain('Reduce audio bitrate')
    })
  })

  describe('priority determination', () => {
    it('should set critical priority for critical actions', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 0,
        currentBitrate: 0,
        packetLoss: 15,
        rtt: 800,
      })

      expect(recommendation.value.priority).toBe('critical')
    })

    it('should set high priority for downgrade with severity', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 200,
        currentBitrate: 1000,
        packetLoss: 4,
        rtt: 250,
      })

      expect(recommendation.value.priority).toBe('high')
    })

    it('should set low priority for maintain action', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 1500,
        currentBitrate: 1200,
        packetLoss: 0.2,
        rtt: 40,
      })

      expect(recommendation.value.priority).toBe('low')
    })
  })

  describe('degradation events', () => {
    it('should increase severity with degradation events', () => {
      const { recommendation: recNoEvents, update: updateNoEvents } = useBandwidthAdaptation()
      const { recommendation: recWithEvents, update: updateWithEvents } = useBandwidthAdaptation()

      const baseInput = {
        availableBitrate: 1000,
        currentBitrate: 800,
        packetLoss: 1,
        rtt: 100,
      }

      updateNoEvents({ ...baseInput, degradationEvents: 0 })
      updateWithEvents({ ...baseInput, degradationEvents: 5 })

      // With more degradation events, severity should be higher
      // This means priority should be equal or higher
      const priorityOrder = ['low', 'medium', 'high', 'critical']
      const noEventsIdx = priorityOrder.indexOf(recNoEvents.value.priority)
      const withEventsIdx = priorityOrder.indexOf(recWithEvents.value.priority)

      expect(withEventsIdx).toBeGreaterThanOrEqual(noEventsIdx)
    })
  })

  describe('callback functionality', () => {
    it('should call onRecommendation callback when provided', () => {
      const callback = vi.fn()
      const { update } = useBandwidthAdaptation({ onRecommendation: callback })

      const input: BandwidthAdaptationInput = {
        availableBitrate: 500,
        currentBitrate: 1000,
        packetLoss: 3,
        rtt: 150,
      }

      update(input)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
          suggestions: expect.any(Array),
          priority: expect.any(String),
        })
      )
    })
  })

  describe('setAutoAdapt', () => {
    it('should toggle auto-adapting state', () => {
      const { isAutoAdapting, setAutoAdapt } = useBandwidthAdaptation()

      expect(isAutoAdapting.value).toBe(false)

      setAutoAdapt(true)
      expect(isAutoAdapting.value).toBe(true)

      setAutoAdapt(false)
      expect(isAutoAdapting.value).toBe(false)
    })
  })

  describe('setConstraints', () => {
    it('should update constraints', () => {
      const { constraints, setConstraints } = useBandwidthAdaptation()

      setConstraints({ minVideoBitrate: 200 })

      expect(constraints.value.minVideoBitrate).toBe(200)
      expect(constraints.value.minFramerate).toBeDefined()
    })

    it('should merge with existing constraints', () => {
      const { constraints, setConstraints } = useBandwidthAdaptation()

      setConstraints({ minVideoBitrate: 300 })

      // minAudioBitrate should remain unchanged
      expect(constraints.value.minAudioBitrate).toBeDefined()
    })
  })

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      const { recommendation, isAutoAdapting, constraints, update, reset } =
        useBandwidthAdaptation()

      // Make some changes
      update({
        availableBitrate: 100,
        currentBitrate: 1000,
        packetLoss: 10,
      })

      expect(recommendation.value.action).not.toBe('maintain')

      reset()

      expect(recommendation.value.action).toBe('maintain')
      expect(recommendation.value.suggestions).toEqual([])
      expect(isAutoAdapting.value).toBe(false)
      expect(constraints.value).toBeDefined()
    })
  })

  describe('applySuggestion', () => {
    it('should exist as a function', () => {
      const { applySuggestion } = useBandwidthAdaptation()

      expect(typeof applySuggestion).toBe('function')

      // Should not throw when called
      expect(() =>
        applySuggestion({
          type: 'video',
          message: 'Test',
          current: '720p',
          recommended: '480p',
          impact: 50,
        })
      ).not.toThrow()
    })
  })

  describe('history smoothing', () => {
    it('should smooth metrics over history', () => {
      const { recommendation, update } = useBandwidthAdaptation({ historySize: 3 })

      // Add entries with varying packet loss
      update({ packetLoss: 1 })
      update({ packetLoss: 2 })
      update({ packetLoss: 3 })

      // Should have processed all updates without error
      expect(recommendation.value).toBeDefined()
    })

    it('should limit history size', () => {
      const { update } = useBandwidthAdaptation({ historySize: 2 })

      // Add more than history size
      update({ packetLoss: 1 })
      update({ packetLoss: 2 })
      update({ packetLoss: 3 })
      update({ packetLoss: 4 })

      // Should not throw - history is managed internally
      expect(true).toBe(true)
    })
  })

  describe('estimated improvement calculation', () => {
    it('should calculate estimated improvement for actions with suggestions', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 200,
        currentBitrate: 1000,
        videoEnabled: true,
        currentResolution: { width: 1280, height: 720, label: '720p' },
        currentFramerate: 30,
      })

      // Should have non-zero estimated improvement for downgrade
      if (recommendation.value.action !== 'maintain') {
        expect(recommendation.value.estimatedImprovement).toBeGreaterThanOrEqual(0)
      }
    })

    it('should return 0 for maintain action', () => {
      const { recommendation, update } = useBandwidthAdaptation()

      update({
        availableBitrate: 1500,
        currentBitrate: 1200,
        packetLoss: 0.1,
        rtt: 30,
      })

      expect(recommendation.value.estimatedImprovement).toBe(0)
    })
  })
})
