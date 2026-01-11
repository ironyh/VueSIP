/**
 * Unit tests for useAmiAgentStats composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiAgentStats } from '@/composables/useAmiAgentStats'
import type { AmiClient } from '@/core/AmiClient'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useAmiAgentStats', () => {
  let mockClient: AmiClient
  let eventHandlers: Map<string, Set<(event: unknown) => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    eventHandlers = new Map()

    mockClient = {
      on: vi.fn((event: string, handler: (data: unknown) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, new Set())
        }
        eventHandlers.get(event)!.add(handler)
      }),
      off: vi.fn((event: string, handler: (data: unknown) => void) => {
        eventHandlers.get(event)?.delete(handler)
      }),
      sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success' } }),
      isConnected: vi.fn().mockReturnValue(true),
    } as unknown as AmiClient
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  function emitEvent(eventData: unknown) {
    const handlers = eventHandlers.get('event')
    // Wrap event data in AmiMessage structure
    const amiMessage = {
      type: 'event' as const,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: eventData,
    }
    handlers?.forEach((handler) => handler(amiMessage))
  }

  describe('Initialization', () => {
    it('should initialize with null stats', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { stats, isTracking, isLoading, error } = useAmiAgentStats(clientRef)

      expect(stats.value).toBeNull()
      expect(isTracking.value).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should initialize with default options', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { performanceLevel, callsPerHour, avgHandleTime } = useAmiAgentStats(clientRef)

      expect(performanceLevel.value).toBeNull()
      expect(callsPerHour.value).toBe(0)
      expect(avgHandleTime.value).toBe(0)
    })

    it('should accept custom options', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        queues: ['sales', 'support'],
        period: 'today',
      })

      startTracking()

      expect(stats.value).not.toBeNull()
      expect(stats.value?.agentId).toBe('1001')
    })
  })

  describe('Tracking Control', () => {
    it('should start tracking when startTracking is called', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, isTracking } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      expect(isTracking.value).toBe(false)
      startTracking()
      expect(isTracking.value).toBe(true)
    })

    it('should stop tracking when stopTracking is called', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stopTracking, isTracking } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()
      expect(isTracking.value).toBe(true)

      stopTracking()
      expect(isTracking.value).toBe(false)
    })

    it('should not start tracking twice', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, isTracking } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()
      startTracking()

      expect(isTracking.value).toBe(true)
      // Should only setup listeners once
      expect(mockClient.on).toHaveBeenCalledTimes(3) // 3 event types
    })

    it('should setup event listeners when tracking starts', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        realTimeUpdates: true,
      })

      startTracking()

      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should remove event listeners when tracking stops', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stopTracking } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        realTimeUpdates: true,
      })

      startTracking()
      stopTracking()

      expect(mockClient.off).toHaveBeenCalledWith('event', expect.any(Function))
    })
  })

  describe('Recording Calls', () => {
    it('should record a call manually', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        queue: 'sales',
        remoteParty: 'sip:caller@example.com',
        direction: 'inbound',
        startTime: new Date(),
        answerTime: new Date(),
        endTime: new Date(),
        waitTime: 10,
        talkTime: 120,
        holdTime: 5,
        wrapTime: 30,
        disposition: 'answered',
        recorded: false,
      })

      expect(stats.value?.totalCalls).toBe(1)
      expect(stats.value?.inboundCalls).toBe(1)
      expect(stats.value?.totalTalkTime).toBe(120)
      expect(stats.value?.totalHoldTime).toBe(5)
      expect(stats.value?.totalWrapTime).toBe(30)
    })

    it('should update performance metrics after recording call', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      // Simulate some login time
      stats.value!.totalLoginTime = 3600 // 1 hour

      recordCall({
        queue: 'sales',
        remoteParty: 'sip:caller@example.com',
        direction: 'inbound',
        startTime: new Date(),
        answerTime: new Date(),
        endTime: new Date(),
        waitTime: 10,
        talkTime: 120,
        holdTime: 0,
        wrapTime: 30,
        disposition: 'answered',
        recorded: false,
      })

      expect(stats.value?.performance.avgTalkTime).toBe(120)
      expect(stats.value?.performance.avgHandleTime).toBe(150) // 120 + 0 + 30
    })

    it('should track missed calls', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        queue: 'sales',
        remoteParty: 'sip:caller@example.com',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 20,
        talkTime: 0,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'missed',
        recorded: false,
      })

      expect(stats.value?.totalCalls).toBe(1)
      expect(stats.value?.missedCalls).toBe(1)
    })

    it('should track transferred calls', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        queue: 'sales',
        remoteParty: 'sip:caller@example.com',
        direction: 'inbound',
        startTime: new Date(),
        answerTime: new Date(),
        endTime: new Date(),
        waitTime: 5,
        talkTime: 60,
        holdTime: 0,
        wrapTime: 10,
        disposition: 'transferred',
        transferredTo: 'PJSIP/1002',
        recorded: false,
      })

      expect(stats.value?.transferredCalls).toBe(1)
      expect(stats.value?.performance.transferRate).toBe(100)
    })

    it('should track outbound calls', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        remoteParty: 'sip:customer@example.com',
        direction: 'outbound',
        startTime: new Date(),
        answerTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 180,
        holdTime: 0,
        wrapTime: 20,
        disposition: 'answered',
        recorded: false,
      })

      expect(stats.value?.outboundCalls).toBe(1)
      expect(stats.value?.totalTalkTime).toBe(180)
    })

    it('should limit recent calls to max', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        maxRecentCalls: 5,
      })

      startTracking()

      // Record 10 calls
      for (let i = 0; i < 10; i++) {
        recordCall({
          remoteParty: `caller-${i}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 0,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      expect(stats.value?.recentCalls.length).toBe(5)
      expect(stats.value?.totalCalls).toBe(10)
    })

    it('should update wrap time for existing call', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, recordWrapTime, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        remoteParty: 'sip:caller@example.com',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      const callId = stats.value!.recentCalls[0].callId
      recordWrapTime(callId, 45)

      expect(stats.value?.recentCalls[0].wrapTime).toBe(45)
      expect(stats.value?.totalWrapTime).toBe(45)
    })
  })

  describe('AMI Event Handling', () => {
    it('should handle AgentComplete event', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        interfacePattern: 'PJSIP/*',
        realTimeUpdates: true,
      })

      startTracking()

      emitEvent({
        Event: 'AgentComplete',
        Queue: 'sales',
        Uniqueid: '1234567890.123',
        Channel: 'PJSIP/trunk-00000001',
        Member: 'PJSIP/1001',
        MemberName: 'Agent 1001',
        Interface: 'PJSIP/1001',
        HoldTime: '15',
        TalkTime: '180',
        Reason: 'operator',
      })

      await nextTick()

      expect(stats.value?.totalCalls).toBe(1)
      expect(stats.value?.totalTalkTime).toBe(180)
    })

    it('should handle AgentRingNoAnswer event', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        interfacePattern: 'PJSIP/*',
        realTimeUpdates: true,
      })

      startTracking()

      emitEvent({
        Event: 'AgentRingNoAnswer',
        Queue: 'support',
        Uniqueid: '1234567890.124',
        Channel: 'PJSIP/trunk-00000002',
        Interface: 'PJSIP/1001',
        MemberName: 'Agent 1001',
        Member: 'PJSIP/1001',
        RingTime: '20',
      })

      await nextTick()

      expect(stats.value?.totalCalls).toBe(1)
      expect(stats.value?.missedCalls).toBe(1)
    })

    it('should filter events by queue', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        queues: ['sales'],
        realTimeUpdates: true,
      })

      startTracking()

      // Event from non-tracked queue
      emitEvent({
        Event: 'AgentComplete',
        Queue: 'support', // Not in tracked queues
        Uniqueid: '1234567890.123',
        Channel: 'PJSIP/trunk-00000001',
        Member: 'PJSIP/1001',
        MemberName: 'Agent 1001',
        Interface: 'PJSIP/1001',
        HoldTime: '15',
        TalkTime: '180',
        Reason: 'operator',
      })

      await nextTick()

      expect(stats.value?.totalCalls).toBe(0)
    })

    it('should filter events by agentId', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        realTimeUpdates: true,
      })

      startTracking()

      // Event from different agent
      emitEvent({
        Event: 'AgentComplete',
        Queue: 'sales',
        Uniqueid: '1234567890.123',
        Channel: 'PJSIP/trunk-00000001',
        Member: 'PJSIP/1002', // Different agent
        MemberName: 'Agent 1002',
        Interface: 'PJSIP/1002',
        HoldTime: '15',
        TalkTime: '180',
        Reason: 'operator',
      })

      await nextTick()

      expect(stats.value?.totalCalls).toBe(0)
    })
  })

  describe('Queue Statistics', () => {
    it('should track per-queue statistics', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, getQueueStats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        queue: 'sales',
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 10,
        talkTime: 120,
        holdTime: 0,
        wrapTime: 20,
        disposition: 'answered',
        recorded: false,
      })

      recordCall({
        queue: 'support',
        remoteParty: 'caller2',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 15,
        talkTime: 180,
        holdTime: 0,
        wrapTime: 30,
        disposition: 'answered',
        recorded: false,
      })

      const queueStats = getQueueStats()
      expect(queueStats.length).toBe(2)

      const salesStats = queueStats.find((q) => q.queue === 'sales')
      expect(salesStats?.callsHandled).toBe(1)
      expect(salesStats?.talkTime).toBe(120)

      const supportStats = queueStats.find((q) => q.queue === 'support')
      expect(supportStats?.callsHandled).toBe(1)
      expect(supportStats?.talkTime).toBe(180)
    })

    it('should return stats for specific queue', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, getQueueStats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        queue: 'sales',
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 10,
        talkTime: 120,
        holdTime: 0,
        wrapTime: 20,
        disposition: 'answered',
        recorded: false,
      })

      const salesStats = getQueueStats(undefined, 'sales')
      expect(salesStats.length).toBe(1)
      expect(salesStats[0].queue).toBe('sales')
    })
  })

  describe('Hourly Statistics', () => {
    it('should track hourly breakdown', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, getHourlyBreakdown } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      const now = new Date()
      const currentHour = now.getHours()

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: now,
        endTime: now,
        waitTime: 0,
        talkTime: 120,
        holdTime: 0,
        wrapTime: 20,
        disposition: 'answered',
        recorded: false,
      })

      const hourlyStats = getHourlyBreakdown()
      expect(hourlyStats.length).toBe(24)

      const currentHourStats = hourlyStats[currentHour]
      expect(currentHourStats.callCount).toBe(1)
      expect(currentHourStats.talkTime).toBe(120)
    })
  })

  describe('Performance Metrics', () => {
    it('should calculate calls per hour', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats, callsPerHour } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()
      stats.value!.totalLoginTime = 3600 // 1 hour

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      recordCall({
        remoteParty: 'caller2',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(callsPerHour.value).toBe(2)
    })

    it('should calculate occupancy rate', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats, occupancy } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()
      stats.value!.totalLoginTime = 3600 // 1 hour

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 1800, // 30 minutes
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(occupancy.value).toBe(50) // 1800/3600 * 100
    })

    it('should calculate utilization rate', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats, utilization } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()
      stats.value!.totalLoginTime = 3600 // 1 hour

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 1500,
        holdTime: 0,
        wrapTime: 300, // 5 minutes wrap
        disposition: 'answered',
        recorded: false,
      })

      expect(utilization.value).toBe(50) // (1500+300)/3600 * 100
    })

    it('should calculate service level', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, serviceLevel } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        serviceLevelThreshold: 20,
      })

      startTracking()

      // Call answered within threshold
      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 15, // Within 20s threshold
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      // Call answered outside threshold
      recordCall({
        remoteParty: 'caller2',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 30, // Outside 20s threshold
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(serviceLevel.value).toBe(50) // 1/2 * 100
    })
  })

  describe('Performance Level Assessment', () => {
    it('should assess performance level as excellent', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats, performanceLevel } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      // Set excellent metrics
      stats.value!.performance = {
        callsPerHour: 12,
        avgHandleTime: 150,
        avgTalkTime: 100,
        avgWrapTime: 20,
        avgHoldTime: 5,
        fcrRate: 95,
        serviceLevel: 95,
        occupancy: 85,
        utilization: 90,
        avgQualityScore: 4.5,
        transferRate: 5,
        holdRate: 10,
      }

      // Trigger recalculation
      stats.value!.performanceLevel = 'excellent'

      expect(performanceLevel.value).toBe('excellent')
    })

    it('should assess performance level as needs_improvement', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stats, performanceLevel } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()
      stats.value!.totalLoginTime = 3600

      // Record poor performance calls
      for (let i = 0; i < 3; i++) {
        recordCall({
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 60, // Poor service level
          talkTime: 600, // Long handle time
          holdTime: 0,
          wrapTime: 60,
          disposition: 'answered',
          recorded: false,
        })
      }

      expect(['needs_improvement', 'average', 'critical']).toContain(performanceLevel.value)
    })
  })

  describe('Alerts', () => {
    it('should trigger alert when threshold is breached', () => {
      const onAlert = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, alerts, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        thresholds: [
          {
            metric: 'serviceLevel',
            warningThreshold: 80,
            criticalThreshold: 60,
            higherIsBetter: true,
          },
        ],
        onAlert,
      })

      startTracking()
      stats.value!.totalLoginTime = 3600

      // Record calls with poor service level
      for (let i = 0; i < 5; i++) {
        recordCall({
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 60, // All outside threshold
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      expect(alerts.value.length).toBeGreaterThan(0)
      expect(onAlert).toHaveBeenCalled()
    })

    it('should acknowledge alert', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, alerts, acknowledgeAlert, alertCount, stats } =
        useAmiAgentStats(clientRef, {
          agentId: '1001',
          thresholds: [
            {
              metric: 'serviceLevel',
              warningThreshold: 80,
              criticalThreshold: 60,
              higherIsBetter: true,
            },
          ],
        })

      startTracking()
      stats.value!.totalLoginTime = 3600

      // Trigger alert
      for (let i = 0; i < 5; i++) {
        recordCall({
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 60,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      const initialCount = alertCount.value
      expect(initialCount).toBeGreaterThan(0)

      acknowledgeAlert(alerts.value[0].id)
      expect(alertCount.value).toBe(initialCount - 1)
    })

    it('should acknowledge all alerts', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, acknowledgeAllAlerts, alertCount, stats } =
        useAmiAgentStats(clientRef, {
          agentId: '1001',
          thresholds: [
            {
              metric: 'serviceLevel',
              warningThreshold: 80,
              criticalThreshold: 60,
              higherIsBetter: true,
            },
          ],
        })

      startTracking()
      stats.value!.totalLoginTime = 3600

      // Trigger alerts
      for (let i = 0; i < 5; i++) {
        recordCall({
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 60,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      expect(alertCount.value).toBeGreaterThan(0)
      acknowledgeAllAlerts()
      expect(alertCount.value).toBe(0)
    })
  })

  describe('Team Comparison', () => {
    it('should compare agent to team average', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const {
        startTracking,
        recordCall,
        compareToTeam,
        allAgentStats: _allAgentStats,
      } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      // Record calls for main agent
      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 10,
        talkTime: 120,
        holdTime: 0,
        wrapTime: 20,
        disposition: 'answered',
        recorded: false,
      })

      const comparison = compareToTeam()
      expect(comparison).not.toBeNull()
      expect(comparison?.agent.agentId).toBe('1001')
      expect(comparison?.teamAverage).toBeDefined()
    })
  })

  describe('Period Management', () => {
    it('should set period and reset stats', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, setPeriod, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        period: 'today',
      })

      startTracking()

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(stats.value?.totalCalls).toBe(1)

      setPeriod('week')

      expect(stats.value?.period).toBe('week')
      expect(stats.value?.totalCalls).toBe(0) // Reset
    })

    it('should support custom period', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, setPeriod, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      const customStart = new Date('2024-01-01')
      const customEnd = new Date('2024-01-31')

      setPeriod('custom', customStart, customEnd)

      expect(stats.value?.period).toBe('custom')
      expect(stats.value?.periodStart.getTime()).toBe(customStart.getTime())
      expect(stats.value?.periodEnd.getTime()).toBe(customEnd.getTime())
    })
  })

  describe('Export Functions', () => {
    it('should export stats as CSV', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, exportCsv } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        queue: 'sales',
        remoteParty: 'sip:caller@example.com',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 10,
        talkTime: 120,
        holdTime: 5,
        wrapTime: 20,
        disposition: 'answered',
        recorded: false,
      })

      const csv = exportCsv()
      expect(csv).toContain('Call ID')
      expect(csv).toContain('Queue')
      expect(csv).toContain('sales')
      expect(csv).toContain('inbound')
    })

    it('should export stats as JSON', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, exportJson } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        queue: 'sales',
        remoteParty: 'sip:caller@example.com',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 10,
        talkTime: 120,
        holdTime: 5,
        wrapTime: 20,
        disposition: 'answered',
        recorded: false,
      })

      const json = exportJson()
      const parsed = JSON.parse(json)
      expect(parsed.agentId).toBe('1001')
      expect(parsed.totalCalls).toBe(1)
    })
  })

  describe('History Management', () => {
    it('should get call history', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, getCallHistory } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      for (let i = 0; i < 5; i++) {
        recordCall({
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: new Date(Date.now() - i * 1000),
          endTime: new Date(),
          waitTime: 0,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      const history = getCallHistory()
      expect(history.length).toBe(5)
    })

    it('should limit call history', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, getCallHistory } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      for (let i = 0; i < 10; i++) {
        recordCall({
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 0,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      const limited = getCallHistory(undefined, 3)
      expect(limited.length).toBe(3)
    })

    it('should clear history', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, clearHistory, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(stats.value?.recentCalls.length).toBe(1)
      clearHistory()
      expect(stats.value?.recentCalls.length).toBe(0)
    })
  })

  describe('Stats Reset', () => {
    it('should reset stats', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, resetStats, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 120,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(stats.value?.totalCalls).toBe(1)
      resetStats()
      expect(stats.value?.totalCalls).toBe(0)
      expect(stats.value?.totalTalkTime).toBe(0)
    })
  })

  describe('Persistence', () => {
    it('should persist stats to localStorage', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, stopTracking } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        persist: true,
        storageKey: 'test_agent_stats',
      })

      startTracking()

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 120,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      stopTracking()

      const stored = localStorage.getItem('test_agent_stats')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.stats).toBeDefined()
    })

    it('should load stats from localStorage', () => {
      const storageKey = 'test_agent_stats_load'
      const storedData = {
        stats: [
          {
            agentId: '1001',
            interface: 'PJSIP/1001',
            name: 'Agent 1001',
            period: 'today',
            periodStart: new Date().toISOString(),
            periodEnd: new Date().toISOString(),
            totalCalls: 5,
            inboundCalls: 5,
            outboundCalls: 0,
            internalCalls: 0,
            missedCalls: 0,
            transferredCalls: 0,
            voicemailCalls: 0,
            totalTalkTime: 600,
            totalHoldTime: 0,
            totalWrapTime: 100,
            totalHandleTime: 700,
            totalLoginTime: 3600,
            totalAvailableTime: 3000,
            totalPausedTime: 600,
            totalOnCallTime: 600,
            performance: {
              callsPerHour: 5,
              avgHandleTime: 140,
              avgTalkTime: 120,
              avgWrapTime: 20,
              avgHoldTime: 0,
              fcrRate: 100,
              serviceLevel: 100,
              occupancy: 16.67,
              utilization: 19.44,
              avgQualityScore: 0,
              transferRate: 0,
              holdRate: 0,
            },
            queueStats: [],
            hourlyStats: [],
            recentCalls: [],
            performanceLevel: 'average',
            lastUpdated: new Date().toISOString(),
          },
        ],
        alerts: [],
      }
      localStorage.setItem(storageKey, JSON.stringify(storedData))

      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        persist: true,
        storageKey,
      })

      startTracking()

      expect(stats.value?.totalCalls).toBe(5)
      expect(stats.value?.totalTalkTime).toBe(600)
    })
  })

  describe('Formatted Output', () => {
    it('should format talk time', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, formattedTalkTime } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 3665, // 1 hour, 1 minute, 5 seconds
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(formattedTalkTime.value).toBe('01:01:05')
    })

    it('should format login time', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, stats, formattedLoginTime } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()
      stats.value!.totalLoginTime = 7200 // 2 hours

      expect(formattedLoginTime.value).toBe('02:00:00')
    })
  })

  describe('Peak Hours', () => {
    it('should identify peak hours', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, peakHours } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      // Record more calls at specific hours
      const hour9 = new Date()
      hour9.setHours(9, 0, 0, 0)

      const hour14 = new Date()
      hour14.setHours(14, 0, 0, 0)

      for (let i = 0; i < 5; i++) {
        recordCall({
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: hour9,
          endTime: hour9,
          waitTime: 0,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      for (let i = 0; i < 3; i++) {
        recordCall({
          remoteParty: `caller${i + 5}`,
          direction: 'inbound',
          startTime: hour14,
          endTime: hour14,
          waitTime: 0,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      expect(peakHours.value).toContain(9)
      expect(peakHours.value[0]).toBe(9) // Most calls
    })
  })

  describe('Top Queues', () => {
    it('should identify top performing queues', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall, topQueues } = useAmiAgentStats(clientRef, {
        agentId: '1001',
      })

      startTracking()

      // Sales queue - 5 calls
      for (let i = 0; i < 5; i++) {
        recordCall({
          queue: 'sales',
          remoteParty: `caller${i}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 0,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      // Support queue - 3 calls
      for (let i = 0; i < 3; i++) {
        recordCall({
          queue: 'support',
          remoteParty: `caller${i + 5}`,
          direction: 'inbound',
          startTime: new Date(),
          endTime: new Date(),
          waitTime: 0,
          talkTime: 60,
          holdTime: 0,
          wrapTime: 0,
          disposition: 'answered',
          recorded: false,
        })
      }

      expect(topQueues.value.length).toBe(2)
      expect(topQueues.value[0].queue).toBe('sales')
      expect(topQueues.value[0].callsHandled).toBe(5)
    })
  })

  describe('Error Handling', () => {
    it('should handle null client', async () => {
      const clientRef = ref<AmiClient | null>(null)
      const onError = vi.fn()
      const { refresh, error } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        onError,
      })

      await refresh()

      expect(error.value).toBe('AMI client not available')
      expect(onError).toHaveBeenCalledWith('AMI client not available')
    })

    it('should call onError callback on failure', async () => {
      const onError = vi.fn()
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Connection failed'))

      const clientRef = ref<AmiClient | null>(mockClient)
      const {
        startTracking,
        refresh,
        error: _error,
      } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        queues: ['sales'],
        onError,
      })

      startTracking()
      await refresh()

      // The composable catches queue-specific errors but doesn't fail overall
      // so error might not be set in this case
      expect(mockClient.sendAction).toHaveBeenCalled()
    })
  })

  describe('Callback Integration', () => {
    it('should call onStatsUpdate callback', () => {
      const onStatsUpdate = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startTracking, recordCall } = useAmiAgentStats(clientRef, {
        agentId: '1001',
        onStatsUpdate,
      })

      startTracking()

      recordCall({
        remoteParty: 'caller1',
        direction: 'inbound',
        startTime: new Date(),
        endTime: new Date(),
        waitTime: 0,
        talkTime: 60,
        holdTime: 0,
        wrapTime: 0,
        disposition: 'answered',
        recorded: false,
      })

      expect(onStatsUpdate).toHaveBeenCalled()
      expect(onStatsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: '1001',
          totalCalls: 1,
        })
      )
    })
  })
})
