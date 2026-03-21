/**
 * useAgentMetrics Unit Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, shallowRef } from 'vue'
import { useAgentMetrics } from '../useAgentMetrics'
import type { CallCenterProvider, AgentMetrics } from '@/providers/call-center/types'

describe('useAgentMetrics', () => {
  let mockProvider: CallCenterProvider
  let mockMetrics: AgentMetrics

  beforeEach(() => {
    mockMetrics = {
      callsHandled: 15,
      totalTalkTime: 5400, // 1h 30m
      averageHandleTime: 180, // 3m
      averageWrapUpTime: 60, // 1m
      longestCall: 600, // 10m
      shortestCall: 120, // 2m
      missedCalls: 2,
      transferredCalls: 3,
      sessionDuration: 7200, // 2h
    }

    mockProvider = {
      getMetrics: vi.fn().mockResolvedValue(mockMetrics),
    } as unknown as CallCenterProvider

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  describe('initialization', () => {
    it('should initialize with null metrics', () => {
      const provider = shallowRef<CallCenterProvider | null>(null)
      const { metrics, isLoading, error } = useAgentMetrics(provider)

      expect(metrics.value).toBeNull()
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should accept custom autoRefreshInterval', () => {
      const provider = shallowRef<CallCenterProvider | null>(null)
      const { fetchMetrics } = useAgentMetrics(provider, { autoRefreshInterval: 60000 })

      // Should not throw
      expect(typeof fetchMetrics).toBe('function')
    })
  })

  describe('formatted values', () => {
    it('should format totalTalkTime as HH:MM:SS', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { totalTalkTimeFormatted, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      expect(totalTalkTimeFormatted.value).toBe('01:30:00')
    })

    it('should format averageHandleTime as MM:SS', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { averageHandleTimeFormatted, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      expect(averageHandleTimeFormatted.value).toBe('03:00')
    })

    it('should format averageWrapUpTime as MM:SS', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { averageWrapUpTimeFormatted, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      expect(averageWrapUpTimeFormatted.value).toBe('01:00')
    })

    it('should return 00:00:00 when metrics is null', () => {
      const provider = shallowRef<CallCenterProvider | null>(null)
      const { totalTalkTimeFormatted } = useAgentMetrics(provider)

      expect(totalTalkTimeFormatted.value).toBe('00:00:00')
    })

    it('should return 00:00 for MM:SS formats when metrics is null', () => {
      const provider = shallowRef<CallCenterProvider | null>(null)
      const { averageHandleTimeFormatted, averageWrapUpTimeFormatted } = useAgentMetrics(provider)

      expect(averageHandleTimeFormatted.value).toBe('00:00')
      expect(averageWrapUpTimeFormatted.value).toBe('00:00')
    })
  })

  describe('computed statistics', () => {
    it('should calculate callsPerHour correctly', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { callsPerHour, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      // 15 calls / 2 hours = 7.5 calls per hour
      expect(callsPerHour.value).toBe(7.5)
    })

    it('should calculate utilizationPercent correctly', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { utilizationPercent, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      // 5400s talk / 7200s session = 75%
      expect(utilizationPercent.value).toBe(75)
    })

    it('should return 0 for callsPerHour when metrics is null', () => {
      const provider = shallowRef<CallCenterProvider | null>(null)
      const { callsPerHour } = useAgentMetrics(provider)

      expect(callsPerHour.value).toBe(0)
    })

    it('should return 0 for utilizationPercent when metrics is null', () => {
      const provider = shallowRef<CallCenterProvider | null>(null)
      const { utilizationPercent } = useAgentMetrics(provider)

      expect(utilizationPercent.value).toBe(0)
    })

    it('should return 0 for computed stats when sessionDuration is 0', async () => {
      const zeroSessionProvider = {
        getMetrics: vi.fn().mockResolvedValue({
          ...mockMetrics,
          sessionDuration: 0,
        }),
      } as unknown as CallCenterProvider

      const provider = shallowRef<CallCenterProvider | null>(zeroSessionProvider)
      const { callsPerHour, utilizationPercent, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      expect(callsPerHour.value).toBe(0)
      expect(utilizationPercent.value).toBe(0)
    })
  })

  describe('fetchMetrics', () => {
    it('should fetch metrics from provider', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { metrics, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      expect(mockProvider.getMetrics).toHaveBeenCalledTimes(1)
      expect(metrics.value).toEqual(mockMetrics)
    })

    it('should set loading state during fetch', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { isLoading, fetchMetrics } = useAgentMetrics(provider)

      const fetchPromise = fetchMetrics()
      expect(isLoading.value).toBe(true)

      await fetchPromise
      expect(isLoading.value).toBe(false)
    })

    it('should set error when provider is null', async () => {
      const provider = shallowRef<CallCenterProvider | null>(null)
      const { error, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      expect(error.value).toBe('Provider not initialized')
    })

    it('should handle provider errors', async () => {
      const errorProvider = {
        getMetrics: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as CallCenterProvider

      const provider = shallowRef<CallCenterProvider | null>(errorProvider)
      const { error, fetchMetrics } = useAgentMetrics(provider)

      await expect(fetchMetrics()).rejects.toThrow('Network error')
      expect(error.value).toBe('Network error')
    })
  })

  describe('auto-refresh', () => {
    it('should start auto-refresh and fetch immediately', async () => {
      vi.useRealTimers() // Need real timers for this async test

      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { startAutoRefresh, metrics } = useAgentMetrics(provider, { autoRefreshInterval: 5000 })

      startAutoRefresh()

      // Wait for the immediate fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should have fetched immediately
      expect(mockProvider.getMetrics).toHaveBeenCalledTimes(1)
      expect(metrics.value).toEqual(mockMetrics)

      vi.useFakeTimers() // Restore fake timers for other tests
    })

    it('should not start multiple refresh timers', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { startAutoRefresh } = useAgentMetrics(provider, { autoRefreshInterval: 5000 })

      startAutoRefresh()
      startAutoRefresh() // Second call should be ignored

      expect(mockProvider.getMetrics).toHaveBeenCalledTimes(1)
    })

    it('should stop auto-refresh', async () => {
      const provider = shallowRef<CallCenterProvider | null>(mockProvider)
      const { startAutoRefresh, stopAutoRefresh } = useAgentMetrics(provider, {
        autoRefreshInterval: 5000,
      })

      startAutoRefresh()
      vi.advanceTimersByTime(10000)

      const callCountBeforeStop = mockProvider.getMetrics.mock.calls.length

      stopAutoRefresh()
      vi.advanceTimersByTime(10000)

      const callCountAfterStop = mockProvider.getMetrics.mock.calls.length

      expect(callCountAfterStop).toBe(callCountBeforeStop)
    })
  })

  describe('with ref provider', () => {
    it('should work with ref instead of shallowRef', async () => {
      const provider = ref<CallCenterProvider | null>(mockProvider)
      const { metrics, fetchMetrics } = useAgentMetrics(provider)

      await fetchMetrics()

      expect(metrics.value).toEqual(mockMetrics)
    })
  })
})
