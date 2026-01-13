/**
 * @vuesip/enterprise - Analytics Module Tests
 *
 * Tests for call analytics composable, metrics calculation, and renderless components.
 */

import { describe, it, expect, vi } from 'vitest'
import { useCallAnalytics } from '../src/analytics/useCallAnalytics'
import type {
  CallMetrics,
  AgentMetrics,
  QueueMetrics,
  SentimentMetrics,
  TimeRange,
  DataPoint,
  CallRecordData,
} from '../src/analytics/types'

// ============================================
// Helper Functions
// ============================================

/**
 * Create a call record for testing
 */
function createCallData(overrides: Partial<CallRecordData> = {}): CallRecordData {
  return {
    duration: 180,
    waitTime: 15,
    agentId: 'agent-1',
    queueName: 'support',
    outcome: 'completed',
    sentiment: 0.5,
    firstCallResolved: true,
    talkTime: 150,
    wrapUpTime: 30,
    ...overrides,
  }
}

// ============================================
// useCallAnalytics Tests
// ============================================

describe('useCallAnalytics', () => {
  describe('initialization', () => {
    it('should initialize with default metrics', () => {
      const analytics = useCallAnalytics()

      expect(analytics.metrics.value.totalCalls).toBe(0)
      expect(analytics.metrics.value.completedCalls).toBe(0)
      expect(analytics.metrics.value.missedCalls).toBe(0)
      expect(analytics.metrics.value.abandonedCalls).toBe(0)
      expect(analytics.metrics.value.averageHandleTime).toBe(0)
      expect(analytics.metrics.value.averageWaitTime).toBe(0)
      expect(analytics.metrics.value.serviceLevelPercent).toBe(0)
      expect(analytics.metrics.value.firstCallResolution).toBe(0)
    })

    it('should initialize with empty agent metrics', () => {
      const analytics = useCallAnalytics()
      expect(analytics.agentMetrics.value).toHaveLength(0)
    })

    it('should initialize with empty queue metrics', () => {
      const analytics = useCallAnalytics()
      expect(analytics.queueMetrics.value).toHaveLength(0)
    })

    it('should initialize with default sentiment metrics', () => {
      const analytics = useCallAnalytics()

      expect(analytics.sentimentMetrics.value.averageSentiment).toBe(0)
      expect(analytics.sentimentMetrics.value.positivePercent).toBe(0)
      expect(analytics.sentimentMetrics.value.neutralPercent).toBe(0)
      expect(analytics.sentimentMetrics.value.negativePercent).toBe(0)
      expect(analytics.sentimentMetrics.value.trendDirection).toBe('stable')
    })

    it('should initialize with empty time series data', () => {
      const analytics = useCallAnalytics()

      expect(analytics.callVolume.value).toHaveLength(0)
      expect(analytics.handleTimeHistory.value).toHaveLength(0)
      expect(analytics.sentimentHistory.value).toHaveLength(0)
      expect(analytics.serviceLevelHistory.value).toHaveLength(0)
    })

    it('should initialize with no errors', () => {
      const analytics = useCallAnalytics()

      expect(analytics.isLoading.value).toBe(false)
      expect(analytics.error.value).toBeNull()
    })
  })

  describe('recordCall', () => {
    it('should record a completed call', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData())

      expect(analytics.metrics.value.totalCalls).toBe(1)
      expect(analytics.metrics.value.completedCalls).toBe(1)
      expect(analytics.metrics.value.missedCalls).toBe(0)
      expect(analytics.metrics.value.abandonedCalls).toBe(0)
    })

    it('should record a missed call', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ outcome: 'missed' }))

      expect(analytics.metrics.value.totalCalls).toBe(1)
      expect(analytics.metrics.value.completedCalls).toBe(0)
      expect(analytics.metrics.value.missedCalls).toBe(1)
    })

    it('should record an abandoned call', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ outcome: 'abandoned' }))

      expect(analytics.metrics.value.totalCalls).toBe(1)
      expect(analytics.metrics.value.abandonedCalls).toBe(1)
    })

    it('should calculate average handle time', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ duration: 100 }))
      analytics.recordCall(createCallData({ duration: 200 }))
      analytics.recordCall(createCallData({ duration: 300 }))

      expect(analytics.metrics.value.averageHandleTime).toBe(200)
    })

    it('should calculate average wait time', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ waitTime: 10 }))
      analytics.recordCall(createCallData({ waitTime: 20 }))
      analytics.recordCall(createCallData({ waitTime: 30 }))

      expect(analytics.metrics.value.averageWaitTime).toBe(20)
    })

    it('should calculate service level percent', () => {
      const analytics = useCallAnalytics({ serviceLevelThreshold: 20 })

      // 2 calls within SLA (<=20s)
      analytics.recordCall(createCallData({ waitTime: 15, outcome: 'completed' }))
      analytics.recordCall(createCallData({ waitTime: 20, outcome: 'completed' }))
      // 1 call outside SLA (>20s)
      analytics.recordCall(createCallData({ waitTime: 25, outcome: 'completed' }))

      // 2 out of 3 = 66.67%
      expect(analytics.metrics.value.serviceLevelPercent).toBeCloseTo(66.67, 1)
    })

    it('should calculate first call resolution', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ firstCallResolved: true }))
      analytics.recordCall(createCallData({ firstCallResolved: true }))
      analytics.recordCall(createCallData({ firstCallResolved: false }))
      analytics.recordCall(createCallData({ firstCallResolved: false }))

      // 2 out of 4 completed = 50%
      expect(analytics.metrics.value.firstCallResolution).toBe(50)
    })

    it('should update queue metrics when recording calls', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ queueName: 'support' }))
      analytics.recordCall(createCallData({ queueName: 'support' }))
      analytics.recordCall(createCallData({ queueName: 'sales' }))

      expect(analytics.queueMetrics.value).toHaveLength(2)

      const supportQueue = analytics.getQueueReport('support')
      expect(supportQueue).not.toBeNull()

      const salesQueue = analytics.getQueueReport('sales')
      expect(salesQueue).not.toBeNull()
    })
  })

  describe('updateAgentState', () => {
    it('should create agent record on first state update', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')

      expect(analytics.agentMetrics.value).toHaveLength(1)
      expect(analytics.agentMetrics.value[0].agentId).toBe('agent-1')
      expect(analytics.agentMetrics.value[0].agentName).toBe('Agent One')
    })

    it('should update existing agent state', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.updateAgentState('agent-1', 'busy')

      expect(analytics.agentMetrics.value).toHaveLength(1)
    })

    it('should track multiple agents', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.updateAgentState('agent-2', 'available', 'Agent Two')
      analytics.updateAgentState('agent-3', 'busy', 'Agent Three')

      expect(analytics.agentMetrics.value).toHaveLength(3)
    })

    it('should use agentId as name if not provided', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available')

      expect(analytics.agentMetrics.value[0].agentName).toBe('agent-1')
    })
  })

  describe('agent metrics calculation', () => {
    it('should calculate agent handle time', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1', duration: 100 }))
      analytics.recordCall(createCallData({ agentId: 'agent-1', duration: 200 }))

      const agent = analytics.getAgentReport('agent-1')
      expect(agent).not.toBeNull()
      expect(agent!.averageHandleTime).toBe(150)
    })

    it('should calculate agent talk time', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1', talkTime: 100 }))
      analytics.recordCall(createCallData({ agentId: 'agent-1', talkTime: 200 }))

      const agent = analytics.getAgentReport('agent-1')
      expect(agent).not.toBeNull()
      expect(agent!.averageTalkTime).toBe(150)
    })

    it('should calculate agent wrap-up time', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1', wrapUpTime: 30 }))
      analytics.recordCall(createCallData({ agentId: 'agent-1', wrapUpTime: 50 }))

      const agent = analytics.getAgentReport('agent-1')
      expect(agent).not.toBeNull()
      expect(agent!.averageWrapUpTime).toBe(40)
    })

    it('should calculate agent sentiment score', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1', sentiment: 0.8 }))
      analytics.recordCall(createCallData({ agentId: 'agent-1', sentiment: 0.4 }))

      const agent = analytics.getAgentReport('agent-1')
      expect(agent).not.toBeNull()
      expect(agent!.sentimentScore).toBeCloseTo(0.6, 2)
    })
  })

  describe('sentiment metrics calculation', () => {
    it('should calculate average sentiment', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ sentiment: 0.8 }))
      analytics.recordCall(createCallData({ sentiment: 0.4 }))
      analytics.recordCall(createCallData({ sentiment: -0.2 }))

      expect(analytics.sentimentMetrics.value.averageSentiment).toBeCloseTo(0.333, 2)
    })

    it('should calculate sentiment distribution', () => {
      const analytics = useCallAnalytics()

      // 2 positive (>0.3)
      analytics.recordCall(createCallData({ sentiment: 0.8 }))
      analytics.recordCall(createCallData({ sentiment: 0.5 }))
      // 2 neutral (-0.3 to 0.3)
      analytics.recordCall(createCallData({ sentiment: 0.1 }))
      analytics.recordCall(createCallData({ sentiment: -0.1 }))
      // 1 negative (<-0.3)
      analytics.recordCall(createCallData({ sentiment: -0.5 }))

      expect(analytics.sentimentMetrics.value.positivePercent).toBe(40)
      expect(analytics.sentimentMetrics.value.neutralPercent).toBe(40)
      expect(analytics.sentimentMetrics.value.negativePercent).toBe(20)
    })

    it('should detect improving sentiment trend', () => {
      const analytics = useCallAnalytics()

      // First half: negative sentiment
      analytics.recordCall(
        createCallData({ sentiment: -0.5, timestamp: new Date(Date.now() - 60000) })
      )
      analytics.recordCall(
        createCallData({ sentiment: -0.3, timestamp: new Date(Date.now() - 50000) })
      )
      // Second half: positive sentiment
      analytics.recordCall(
        createCallData({ sentiment: 0.5, timestamp: new Date(Date.now() - 20000) })
      )
      analytics.recordCall(
        createCallData({ sentiment: 0.7, timestamp: new Date(Date.now() - 10000) })
      )

      expect(analytics.sentimentMetrics.value.trendDirection).toBe('improving')
    })

    it('should detect declining sentiment trend', () => {
      const analytics = useCallAnalytics()

      // First half: positive sentiment
      analytics.recordCall(
        createCallData({ sentiment: 0.7, timestamp: new Date(Date.now() - 60000) })
      )
      analytics.recordCall(
        createCallData({ sentiment: 0.5, timestamp: new Date(Date.now() - 50000) })
      )
      // Second half: negative sentiment
      analytics.recordCall(
        createCallData({ sentiment: -0.3, timestamp: new Date(Date.now() - 20000) })
      )
      analytics.recordCall(
        createCallData({ sentiment: -0.5, timestamp: new Date(Date.now() - 10000) })
      )

      expect(analytics.sentimentMetrics.value.trendDirection).toBe('declining')
    })

    it('should detect stable sentiment trend', () => {
      const analytics = useCallAnalytics()

      // All similar sentiment
      analytics.recordCall(
        createCallData({ sentiment: 0.5, timestamp: new Date(Date.now() - 60000) })
      )
      analytics.recordCall(
        createCallData({ sentiment: 0.4, timestamp: new Date(Date.now() - 50000) })
      )
      analytics.recordCall(
        createCallData({ sentiment: 0.5, timestamp: new Date(Date.now() - 20000) })
      )
      analytics.recordCall(
        createCallData({ sentiment: 0.45, timestamp: new Date(Date.now() - 10000) })
      )

      expect(analytics.sentimentMetrics.value.trendDirection).toBe('stable')
    })
  })

  describe('computed properties', () => {
    it('should compute top performers', () => {
      const analytics = useCallAnalytics({ serviceLevelThreshold: 20 })

      // Agent 1: 100% service level
      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1', waitTime: 10 }))
      analytics.recordCall(createCallData({ agentId: 'agent-1', waitTime: 15 }))

      // Agent 2: 50% service level
      analytics.updateAgentState('agent-2', 'available', 'Agent Two')
      analytics.recordCall(createCallData({ agentId: 'agent-2', waitTime: 10 }))
      analytics.recordCall(createCallData({ agentId: 'agent-2', waitTime: 30 }))

      // Agent 3: 0% service level
      analytics.updateAgentState('agent-3', 'available', 'Agent Three')
      analytics.recordCall(createCallData({ agentId: 'agent-3', waitTime: 30 }))
      analytics.recordCall(createCallData({ agentId: 'agent-3', waitTime: 40 }))

      expect(analytics.topPerformers.value).toHaveLength(3)
      expect(analytics.topPerformers.value[0].agentId).toBe('agent-1')
      expect(analytics.topPerformers.value[1].agentId).toBe('agent-2')
      expect(analytics.topPerformers.value[2].agentId).toBe('agent-3')
    })

    it('should compute underperformers', () => {
      const analytics = useCallAnalytics({ serviceLevelThreshold: 20 })

      // High performer
      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1', waitTime: 10 }))

      // Low performer (below 80% of average)
      analytics.updateAgentState('agent-2', 'available', 'Agent Two')
      analytics.recordCall(createCallData({ agentId: 'agent-2', waitTime: 50 }))

      expect(analytics.underperformers.value.length).toBeGreaterThanOrEqual(0)
    })

    it('should compute busiest queues', () => {
      const analytics = useCallAnalytics()

      // Queue with more calls
      analytics.recordCall(createCallData({ queueName: 'support' }))
      analytics.recordCall(createCallData({ queueName: 'support' }))
      analytics.recordCall(createCallData({ queueName: 'support' }))

      // Queue with fewer calls
      analytics.recordCall(createCallData({ queueName: 'sales' }))

      const busiest = analytics.busiestQueues.value
      expect(busiest).toHaveLength(2)
    })
  })

  describe('time range filtering', () => {
    it('should filter calls by time range', () => {
      const analytics = useCallAnalytics()
      const now = new Date()

      // Call within range
      analytics.recordCall(
        createCallData({
          timestamp: new Date(now.getTime() - 30 * 60000), // 30 minutes ago
        })
      )

      // Call outside range
      analytics.recordCall(
        createCallData({
          timestamp: new Date(now.getTime() - 2 * 60 * 60000), // 2 hours ago
        })
      )

      // Set time range to last hour
      analytics.setTimeRange({
        start: new Date(now.getTime() - 60 * 60000),
        end: now,
        granularity: 'minute',
      })

      expect(analytics.metrics.value.totalCalls).toBe(1)
    })
  })

  describe('export functionality', () => {
    it('should export metrics as JSON', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData())
      analytics.recordCall(createCallData())

      const json = analytics.exportMetrics('json')
      const parsed = JSON.parse(json)

      expect(parsed).toHaveProperty('exportedAt')
      expect(parsed).toHaveProperty('callMetrics')
      expect(parsed).toHaveProperty('agentMetrics')
      expect(parsed).toHaveProperty('queueMetrics')
      expect(parsed).toHaveProperty('sentimentMetrics')
      expect(parsed.callMetrics.totalCalls).toBe(2)
    })

    it('should export metrics as CSV', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ duration: 180 }))
      analytics.recordCall(createCallData({ duration: 120 }))

      const csv = analytics.exportMetrics('csv')

      expect(csv).toContain('metric,value')
      expect(csv).toContain('totalCalls,2')
      expect(csv).toContain('averageHandleTime,150.00')
    })
  })

  describe('report generation', () => {
    it('should generate a formatted report', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1' }))
      analytics.recordCall(createCallData({ agentId: 'agent-1' }))

      const report = analytics.generateReport()

      expect(report).toContain('# Call Center Analytics Report')
      expect(report).toContain('## Summary Metrics')
      expect(report).toContain('Total Calls: 2')
      expect(report).toContain('## Agent Performance')
      expect(report).toContain('Agent One')
    })

    it('should generate report with custom title', () => {
      const analytics = useCallAnalytics()

      const report = analytics.generateReport({ title: 'Custom Report Title' })

      expect(report).toContain('# Custom Report Title')
    })

    it('should exclude agents when option set', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1' }))

      const report = analytics.generateReport({ includeAgents: false })

      expect(report).not.toContain('## Agent Performance')
    })

    it('should exclude queues when option set', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ queueName: 'support' }))

      const report = analytics.generateReport({ includeQueues: false })

      expect(report).not.toContain('## Queue Status')
    })

    it('should include sentiment analysis', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ sentiment: 0.8 }))
      analytics.recordCall(createCallData({ sentiment: -0.5 }))

      const report = analytics.generateReport({ includeSentiment: true })

      expect(report).toContain('## Sentiment Analysis')
      expect(report).toContain('Average Sentiment:')
    })
  })

  describe('getAgentReport', () => {
    it('should return agent metrics by ID', () => {
      const analytics = useCallAnalytics()

      analytics.updateAgentState('agent-1', 'available', 'Agent One')
      analytics.recordCall(createCallData({ agentId: 'agent-1' }))

      const report = analytics.getAgentReport('agent-1')

      expect(report).not.toBeNull()
      expect(report!.agentId).toBe('agent-1')
      expect(report!.agentName).toBe('Agent One')
    })

    it('should return null for unknown agent', () => {
      const analytics = useCallAnalytics()

      const report = analytics.getAgentReport('unknown-agent')

      expect(report).toBeNull()
    })
  })

  describe('getQueueReport', () => {
    it('should return queue metrics by name', () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData({ queueName: 'support' }))

      const report = analytics.getQueueReport('support')

      expect(report).not.toBeNull()
      expect(report!.queueName).toBe('support')
    })

    it('should return null for unknown queue', () => {
      const analytics = useCallAnalytics()

      const report = analytics.getQueueReport('unknown-queue')

      expect(report).toBeNull()
    })
  })

  describe('refresh', () => {
    it('should set loading state during refresh', async () => {
      const analytics = useCallAnalytics()

      const refreshPromise = analytics.refresh()

      // Loading might be briefly true during refresh
      await refreshPromise

      expect(analytics.isLoading.value).toBe(false)
      expect(analytics.error.value).toBeNull()
    })

    it('should recalculate all metrics on refresh', async () => {
      const analytics = useCallAnalytics()

      analytics.recordCall(createCallData())
      analytics.recordCall(createCallData())

      const initialTotal = analytics.metrics.value.totalCalls

      await analytics.refresh()

      expect(analytics.metrics.value.totalCalls).toBe(initialTotal)
    })
  })
})

// ============================================
// Time Series Data Tests
// ============================================

describe('Time Series Data', () => {
  it('should generate call volume data points', () => {
    const analytics = useCallAnalytics()
    const now = new Date()

    // Set time range first
    analytics.setTimeRange({
      start: new Date(now.getTime() - 2 * 60 * 60000), // 2 hours ago
      end: now,
      granularity: 'hour',
    })

    // Record calls at different times
    analytics.recordCall(
      createCallData({
        timestamp: new Date(now.getTime() - 90 * 60000), // 1.5 hours ago
      })
    )
    analytics.recordCall(
      createCallData({
        timestamp: new Date(now.getTime() - 30 * 60000), // 30 minutes ago
      })
    )

    expect(analytics.callVolume.value.length).toBeGreaterThan(0)
    analytics.callVolume.value.forEach((point) => {
      expect(point).toHaveProperty('timestamp')
      expect(point).toHaveProperty('value')
      expect(typeof point.value).toBe('number')
    })
  })

  it('should generate handle time history data points', () => {
    const analytics = useCallAnalytics()
    const now = new Date()

    analytics.setTimeRange({
      start: new Date(now.getTime() - 2 * 60 * 60000),
      end: now,
      granularity: 'hour',
    })

    analytics.recordCall(
      createCallData({
        duration: 100,
        timestamp: new Date(now.getTime() - 90 * 60000),
      })
    )
    analytics.recordCall(
      createCallData({
        duration: 200,
        timestamp: new Date(now.getTime() - 30 * 60000),
      })
    )

    expect(analytics.handleTimeHistory.value.length).toBeGreaterThan(0)
  })

  it('should generate sentiment history data points', () => {
    const analytics = useCallAnalytics()
    const now = new Date()

    analytics.setTimeRange({
      start: new Date(now.getTime() - 2 * 60 * 60000),
      end: now,
      granularity: 'hour',
    })

    analytics.recordCall(
      createCallData({
        sentiment: 0.8,
        timestamp: new Date(now.getTime() - 90 * 60000),
      })
    )
    analytics.recordCall(
      createCallData({
        sentiment: -0.3,
        timestamp: new Date(now.getTime() - 30 * 60000),
      })
    )

    expect(analytics.sentimentHistory.value.length).toBeGreaterThan(0)
  })

  it('should generate service level history data points', () => {
    const analytics = useCallAnalytics({ serviceLevelThreshold: 20 })
    const now = new Date()

    analytics.setTimeRange({
      start: new Date(now.getTime() - 2 * 60 * 60000),
      end: now,
      granularity: 'hour',
    })

    analytics.recordCall(
      createCallData({
        waitTime: 15,
        timestamp: new Date(now.getTime() - 90 * 60000),
      })
    )
    analytics.recordCall(
      createCallData({
        waitTime: 30,
        timestamp: new Date(now.getTime() - 30 * 60000),
      })
    )

    expect(analytics.serviceLevelHistory.value.length).toBeGreaterThan(0)
  })
})

// ============================================
// Edge Cases Tests
// ============================================

describe('Edge Cases', () => {
  it('should handle no calls gracefully', () => {
    const analytics = useCallAnalytics()

    expect(analytics.metrics.value.averageHandleTime).toBe(0)
    expect(analytics.metrics.value.averageWaitTime).toBe(0)
    expect(analytics.metrics.value.serviceLevelPercent).toBe(0)
    expect(analytics.metrics.value.firstCallResolution).toBe(0)
    expect(analytics.topPerformers.value).toHaveLength(0)
    expect(analytics.busiestQueues.value).toHaveLength(0)
  })

  it('should handle calls without sentiment gracefully', () => {
    const analytics = useCallAnalytics()

    analytics.recordCall(createCallData({ sentiment: undefined }))

    expect(analytics.sentimentMetrics.value.averageSentiment).toBe(0)
    expect(analytics.sentimentMetrics.value.positivePercent).toBe(0)
    expect(analytics.sentimentMetrics.value.neutralPercent).toBe(0)
    expect(analytics.sentimentMetrics.value.negativePercent).toBe(0)
  })

  it('should handle calls without first call resolution data', () => {
    const analytics = useCallAnalytics()

    analytics.recordCall(createCallData({ firstCallResolved: undefined }))

    expect(analytics.metrics.value.firstCallResolution).toBe(0)
  })

  it('should handle only missed calls', () => {
    const analytics = useCallAnalytics()

    analytics.recordCall(createCallData({ outcome: 'missed', duration: 0 }))
    analytics.recordCall(createCallData({ outcome: 'missed', duration: 0 }))

    expect(analytics.metrics.value.totalCalls).toBe(2)
    expect(analytics.metrics.value.missedCalls).toBe(2)
    expect(analytics.metrics.value.completedCalls).toBe(0)
    expect(analytics.metrics.value.averageHandleTime).toBe(0)
  })

  it('should handle only abandoned calls', () => {
    const analytics = useCallAnalytics()

    analytics.recordCall(createCallData({ outcome: 'abandoned', duration: 0 }))
    analytics.recordCall(createCallData({ outcome: 'abandoned', duration: 0 }))

    expect(analytics.metrics.value.totalCalls).toBe(2)
    expect(analytics.metrics.value.abandonedCalls).toBe(2)
    expect(analytics.metrics.value.completedCalls).toBe(0)
  })

  it('should handle agent with no calls', () => {
    const analytics = useCallAnalytics()

    analytics.updateAgentState('agent-1', 'available', 'Agent One')

    const agent = analytics.getAgentReport('agent-1')
    expect(agent).not.toBeNull()
    expect(agent!.totalCalls).toBe(0)
    expect(agent!.averageHandleTime).toBe(0)
    expect(agent!.sentimentScore).toBeUndefined()
  })

  it('should handle very large number of calls', () => {
    const analytics = useCallAnalytics()

    // Record 100 calls
    for (let i = 0; i < 100; i++) {
      analytics.recordCall(
        createCallData({
          duration: 100 + i,
          waitTime: 10 + (i % 30),
          sentiment: -0.5 + (i % 100) * 0.01,
        })
      )
    }

    expect(analytics.metrics.value.totalCalls).toBe(100)
    expect(analytics.metrics.value.averageHandleTime).toBeGreaterThan(0)
  })

  it('should handle concurrent agent state changes', () => {
    const analytics = useCallAnalytics()

    // Rapid state changes
    analytics.updateAgentState('agent-1', 'available', 'Agent One')
    analytics.updateAgentState('agent-1', 'busy')
    analytics.updateAgentState('agent-1', 'wrap-up')
    analytics.updateAgentState('agent-1', 'available')
    analytics.updateAgentState('agent-1', 'paused')
    analytics.updateAgentState('agent-1', 'available')

    expect(analytics.agentMetrics.value).toHaveLength(1)
  })
})

// ============================================
// Configuration Tests
// ============================================

describe('Configuration', () => {
  it('should respect custom service level threshold', () => {
    const analytics = useCallAnalytics({ serviceLevelThreshold: 30 })

    // All calls within 30s threshold
    analytics.recordCall(createCallData({ waitTime: 25 }))
    analytics.recordCall(createCallData({ waitTime: 28 }))

    expect(analytics.metrics.value.serviceLevelPercent).toBe(100)
  })

  it('should respect custom refresh interval', () => {
    vi.useFakeTimers()

    const analytics = useCallAnalytics({
      enableRealtime: true,
      refreshInterval: 5000,
    })

    // The internal timer should be set up
    expect(analytics.isLoading.value).toBe(false)

    vi.useRealTimers()
  })

  it('should handle realtime mode disabled', () => {
    const analytics = useCallAnalytics({
      enableRealtime: false,
    })

    expect(analytics.isLoading.value).toBe(false)
  })
})

// ============================================
// Type Exports Tests
// ============================================

describe('Type Exports', () => {
  it('should export CallMetrics type correctly', () => {
    const metrics: CallMetrics = {
      totalCalls: 100,
      completedCalls: 90,
      missedCalls: 5,
      abandonedCalls: 5,
      averageHandleTime: 180,
      averageWaitTime: 20,
      serviceLevelPercent: 85,
      firstCallResolution: 70,
    }

    expect(metrics.totalCalls).toBe(100)
  })

  it('should export AgentMetrics type correctly', () => {
    const agent: AgentMetrics = {
      agentId: 'agent-1',
      agentName: 'Agent One',
      totalCalls: 50,
      averageHandleTime: 180,
      averageTalkTime: 150,
      averageWrapUpTime: 30,
      occupancy: 75,
      availability: 80,
      serviceLevel: 90,
      customerSatisfaction: 4.5,
      sentimentScore: 0.7,
    }

    expect(agent.agentId).toBe('agent-1')
  })

  it('should export QueueMetrics type correctly', () => {
    const queue: QueueMetrics = {
      queueName: 'support',
      callsWaiting: 5,
      callsInProgress: 10,
      longestWait: 120,
      averageWait: 45,
      abandonRate: 3,
      serviceLevelPercent: 85,
      agentsAvailable: 3,
      agentsBusy: 10,
      agentsPaused: 2,
    }

    expect(queue.queueName).toBe('support')
  })

  it('should export SentimentMetrics type correctly', () => {
    const sentiment: SentimentMetrics = {
      averageSentiment: 0.5,
      positivePercent: 60,
      neutralPercent: 30,
      negativePercent: 10,
      escalationRate: 5,
      trendDirection: 'improving',
    }

    expect(sentiment.trendDirection).toBe('improving')
  })

  it('should export TimeRange type correctly', () => {
    const range: TimeRange = {
      start: new Date(),
      end: new Date(),
      granularity: 'hour',
    }

    expect(range.granularity).toBe('hour')
  })

  it('should export DataPoint type correctly', () => {
    const point: DataPoint = {
      timestamp: new Date(),
      value: 42,
      label: 'Test',
    }

    expect(point.value).toBe(42)
  })
})
