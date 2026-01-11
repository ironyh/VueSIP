// tests/unit/composables/useAgentMetrics.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useAgentMetrics } from '@/composables/useAgentMetrics'
import type { CallCenterProvider, AgentMetrics } from '@/providers/call-center/types'

const mockMetrics: AgentMetrics = {
  callsHandled: 25,
  totalTalkTime: 3600,
  averageHandleTime: 144,
  averageWrapUpTime: 30,
  longestCall: 600,
  shortestCall: 30,
  missedCalls: 2,
  transferredCalls: 3,
  sessionDuration: 28800,
}

function createMockProvider(): CallCenterProvider {
  return {
    id: 'test',
    name: 'Test Provider',
    capabilities: {
      supportsQueues: true,
      supportsMultiQueue: true,
      supportsPause: true,
      supportsPauseReasons: true,
      supportsBreakTypes: false,
      supportsWrapUp: true,
      supportsMetrics: true,
      supportsRealTimeEvents: true,
      supportsPenalty: true,
      supportsSkillBasedRouting: false,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setStatus: vi.fn(),
    joinQueue: vi.fn(),
    leaveQueue: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
    getMetrics: vi.fn().mockResolvedValue(mockMetrics),
    onStateChange: vi.fn(() => () => {}),
    onQueueEvent: vi.fn(() => () => {}),
  }
}

describe('useAgentMetrics', () => {
  let mockProvider: CallCenterProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
  })

  describe('metrics fetching', () => {
    it('should fetch metrics from provider', async () => {
      const providerRef = ref(mockProvider)
      const { fetchMetrics, metrics } = useAgentMetrics(providerRef)

      await fetchMetrics()

      expect(mockProvider.getMetrics).toHaveBeenCalled()
      expect(metrics.value?.callsHandled).toBe(25)
    })

    it('should format talk time', async () => {
      const providerRef = ref(mockProvider)
      const { fetchMetrics, totalTalkTimeFormatted } = useAgentMetrics(providerRef)

      await fetchMetrics()

      expect(totalTalkTimeFormatted.value).toBe('01:00:00') // 3600 seconds
    })

    it('should format average handle time', async () => {
      const providerRef = ref(mockProvider)
      const { fetchMetrics, averageHandleTimeFormatted } = useAgentMetrics(providerRef)

      await fetchMetrics()

      expect(averageHandleTimeFormatted.value).toBe('02:24') // 144 seconds
    })
  })

  describe('auto-refresh', () => {
    it('should auto-refresh when enabled', async () => {
      vi.useFakeTimers()
      const providerRef = ref(mockProvider)
      const { startAutoRefresh, stopAutoRefresh } = useAgentMetrics(providerRef, {
        autoRefreshInterval: 5000,
      })

      startAutoRefresh()

      // Initial call
      expect(mockProvider.getMetrics).toHaveBeenCalledTimes(1)

      // After interval
      vi.advanceTimersByTime(5000)
      expect(mockProvider.getMetrics).toHaveBeenCalledTimes(2)

      stopAutoRefresh()
      vi.advanceTimersByTime(5000)
      expect(mockProvider.getMetrics).toHaveBeenCalledTimes(2) // No more calls

      vi.useRealTimers()
    })
  })

  describe('computed summaries', () => {
    it('should calculate calls per hour', async () => {
      const providerRef = ref(mockProvider)
      const { fetchMetrics, callsPerHour } = useAgentMetrics(providerRef)

      await fetchMetrics()

      // 25 calls in 28800 seconds (8 hours) = 3.125 calls/hour
      expect(callsPerHour.value).toBeCloseTo(3.125, 2)
    })

    it('should calculate utilization percentage', async () => {
      const providerRef = ref(mockProvider)
      const { fetchMetrics, utilizationPercent } = useAgentMetrics(providerRef)

      await fetchMetrics()

      // 3600 talk time / 28800 session = 12.5%
      expect(utilizationPercent.value).toBeCloseTo(12.5, 1)
    })
  })
})
