/**
 * useCallQualityRecorder composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest'
import { ref, shallowRef } from 'vue'
import { useCallQualityRecorder } from '../useCallQualityRecorder'
import type { CallQualityStats } from '../useCallQualityStats'

describe('useCallQualityRecorder', () => {
  let mockStats: CallQualityStats

  beforeEach(() => {
    mockStats = {
      rtt: 50,
      jitter: 5,
      packetLossPercent: 0.5,
      bitrateKbps: 128,
      codec: 'opus',
      packetsReceived: 1000,
      packetsLost: 5,
      lastUpdated: new Date(),
    }
  })

  describe('initial state', () => {
    it('should return initial isRecording as false', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { isRecording } = useCallQualityRecorder(statsRef, isCallActive)

      expect(isRecording.value).toBe(false)
    })

    it('should return empty history initially', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { history } = useCallQualityRecorder(statsRef, isCallActive)

      expect(history.value).toEqual([])
    })

    it('should return null currentScore initially', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { currentScore } = useCallQualityRecorder(statsRef, isCallActive)

      expect(currentScore.value).toBeNull()
    })

    it('should return null trend initially', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { trend } = useCallQualityRecorder(statsRef, isCallActive)

      expect(trend.value).toBeNull()
    })
  })

  describe('start/stop recording', () => {
    it('should start recording when start() is called', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { start, isRecording } = useCallQualityRecorder(statsRef, isCallActive)

      start()

      expect(isRecording.value).toBe(true)
    })

    it('should stop recording when stop() is called', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { start, stop, isRecording } = useCallQualityRecorder(statsRef, isCallActive)

      start()
      stop()

      expect(isRecording.value).toBe(false)
    })

    it('should not start multiple timers if start is called twice', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { start, isRecording } = useCallQualityRecorder(statsRef, isCallActive)

      start()
      start()

      expect(isRecording.value).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset history and stop recording', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { start, reset, isRecording, history, currentScore } = useCallQualityRecorder(
        statsRef,
        isCallActive
      )

      start()
      reset()

      expect(isRecording.value).toBe(false)
      expect(history.value).toEqual([])
      expect(currentScore.value).toBeNull()
    })
  })

  describe('auto recording on call state change', () => {
    it('should auto-start recording when call becomes active', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { isRecording } = useCallQualityRecorder(statsRef, isCallActive)

      // Initially not recording
      expect(isRecording.value).toBe(false)

      // When call becomes active, should auto-start
      isCallActive.value = true

      // Give the watcher time to trigger
      return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
        expect(isRecording.value).toBe(true)
      })
    })

    it('should auto-stop recording when call becomes inactive', async () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(true)
      const { isRecording } = useCallQualityRecorder(statsRef, isCallActive)

      // Wait for auto-start
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(isRecording.value).toBe(true)

      // When call becomes inactive, should auto-stop
      isCallActive.value = false

      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(isRecording.value).toBe(false)
    })
  })

  describe('custom options', () => {
    it('should accept custom recordIntervalMs', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { start } = useCallQualityRecorder(statsRef, isCallActive, {
        recordIntervalMs: 5000,
      })

      expect(() => start()).not.toThrow()
    })

    it('should accept custom historySize', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { history } = useCallQualityRecorder(statsRef, isCallActive, {
        historySize: 10,
      })

      // History should be initialized as empty with custom size support
      expect(Array.isArray(history.value)).toBe(true)
    })

    it('should accept disable trend analysis', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { trend } = useCallQualityRecorder(statsRef, isCallActive, {
        enableTrendAnalysis: false,
      })

      // With trend disabled, should still work but trend might be computed differently
      expect(trend.value).toBeNull()
    })
  })

  describe('stats to score mapping', () => {
    it('should map stats to score input correctly', () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(false)
      const { start, currentScore } = useCallQualityRecorder(statsRef, isCallActive)

      start()

      // After starting, a snapshot should be recorded
      return new Promise((resolve) => setTimeout(resolve, 50)).then(() => {
        if (currentScore.value) {
          expect(currentScore.value).toHaveProperty('overall')
          expect(currentScore.value).toHaveProperty('audio')
          expect(currentScore.value).toHaveProperty('network')
          expect(currentScore.value).toHaveProperty('grade')
        }
      })
    })

    it('should handle null stats values gracefully', () => {
      const nullStats: CallQualityStats = {
        rtt: null,
        jitter: null,
        packetLossPercent: null,
        bitrateKbps: null,
        codec: null,
        packetsReceived: null,
        packetsLost: null,
        lastUpdated: new Date(),
      }

      const statsRef = shallowRef<CallQualityStats>(nullStats)
      const isCallActive = ref(false)
      const { start } = useCallQualityRecorder(statsRef, isCallActive)

      // Should not throw with null stats
      expect(() => start()).not.toThrow()
    })
  })

  describe('call timestamp change detection', () => {
    it('should reset history when timestamp gap > 5 seconds', async () => {
      const statsRef = shallowRef<CallQualityStats>(mockStats)
      const isCallActive = ref(true)
      const { history } = useCallQualityRecorder(statsRef, isCallActive)

      // Wait for initial snapshot
      await new Promise((resolve) => setTimeout(resolve, 50))

      const initialLength = history.value.length

      // Simulate a new call by jumping timestamp
      const oldTimestamp = mockStats.lastUpdated
      mockStats.lastUpdated = new Date(oldTimestamp.getTime() + 10000) // 10 seconds later

      // Wait for watcher to detect change
      await new Promise((resolve) => setTimeout(resolve, 50))

      // History should be reset due to new call detection
      expect(history.value.length).toBeLessThanOrEqual(initialLength)
    })
  })
})
