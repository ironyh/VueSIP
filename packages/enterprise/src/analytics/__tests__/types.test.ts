/**
 * @vuesip/enterprise - Analytics Module Smoke Tests
 *
 * Basic smoke tests to verify analytics exports are working correctly.
 */

import { describe, it, expect } from 'vitest'
import {
  type CallMetrics,
  type AgentMetrics,
  type QueueMetrics,
  type SentimentMetrics,
  type TimeRange,
  type DataPoint,
  type AnalyticsConfig,
  type CallOutcome,
  type AgentState,
  type CallRecordData,
  type ReportOptions,
} from '../types'

describe('analytics/types', () => {
  describe('CallMetrics', () => {
    it('should allow creating valid CallMetrics object', () => {
      const metrics: CallMetrics = {
        totalCalls: 100,
        completedCalls: 85,
        missedCalls: 10,
        abandonedCalls: 5,
        averageHandleTime: 180,
        averageWaitTime: 30,
        serviceLevelPercent: 80,
        firstCallResolution: 75,
      }
      expect(metrics.totalCalls).toBe(100)
      expect(metrics.completedCalls).toBe(85)
    })
  })

  describe('AgentMetrics', () => {
    it('should allow creating valid AgentMetrics object', () => {
      const metrics: AgentMetrics = {
        agentId: 'agent-001',
        agentName: 'Test Agent',
        totalCalls: 50,
        averageHandleTime: 200,
        averageTalkTime: 150,
        averageWrapUpTime: 50,
        occupancy: 85,
        availability: 90,
        serviceLevel: 95,
        customerSatisfaction: 4.5,
        sentimentScore: 0.3,
      }
      expect(metrics.agentId).toBe('agent-001')
      expect(metrics.customerSatisfaction).toBe(4.5)
    })

    it('should allow optional sentiment fields', () => {
      const metrics: AgentMetrics = {
        agentId: 'agent-002',
        agentName: 'Minimal Agent',
        totalCalls: 10,
        averageHandleTime: 100,
        averageTalkTime: 80,
        averageWrapUpTime: 20,
        occupancy: 50,
        availability: 100,
        serviceLevel: 100,
      }
      expect(metrics.customerSatisfaction).toBeUndefined()
      expect(metrics.sentimentScore).toBeUndefined()
    })
  })

  describe('QueueMetrics', () => {
    it('should allow creating valid QueueMetrics object', () => {
      const metrics: QueueMetrics = {
        queueName: 'support-queue',
        callsWaiting: 3,
        callsInProgress: 5,
        longestWait: 120,
        averageWait: 45,
        abandonRate: 5,
        serviceLevelPercent: 85,
        agentsAvailable: 4,
        agentsBusy: 5,
        agentsPaused: 1,
      }
      expect(metrics.queueName).toBe('support-queue')
    })
  })

  describe('SentimentMetrics', () => {
    it('should allow creating valid SentimentMetrics with all trend directions', () => {
      const improving: SentimentMetrics = {
        averageSentiment: 0.5,
        positivePercent: 70,
        neutralPercent: 20,
        negativePercent: 10,
        escalationRate: 5,
        trendDirection: 'improving',
      }
      expect(improving.trendDirection).toBe('improving')

      const declining: SentimentMetrics = {
        averageSentiment: -0.3,
        positivePercent: 30,
        neutralPercent: 30,
        negativePercent: 40,
        escalationRate: 15,
        trendDirection: 'declining',
      }
      expect(declining.trendDirection).toBe('declining')

      const stable: SentimentMetrics = {
        averageSentiment: 0.1,
        positivePercent: 45,
        neutralPercent: 40,
        negativePercent: 15,
        escalationRate: 8,
        trendDirection: 'stable',
      }
      expect(stable.trendDirection).toBe('stable')
    })
  })

  describe('TimeRange', () => {
    it('should allow creating valid TimeRange with all granularities', () => {
      const start = new Date('2026-01-01T00:00:00Z')
      const end = new Date('2026-01-31T23:59:59Z')

      const granularities: TimeRange['granularity'][] = ['minute', 'hour', 'day', 'week', 'month']

      granularities.forEach((granularity) => {
        const range: TimeRange = { start, end, granularity }
        expect(range.granularity).toBe(granularity)
      })
    })
  })

  describe('DataPoint', () => {
    it('should allow creating valid DataPoint', () => {
      const point: DataPoint = {
        timestamp: new Date('2026-01-15T12:00:00Z'),
        value: 42,
        label: 'Test Point',
      }
      expect(point.value).toBe(42)
      expect(point.label).toBe('Test Point')
    })

    it('should allow DataPoint without optional label', () => {
      const point: DataPoint = {
        timestamp: new Date(),
        value: 100,
      }
      expect(point.label).toBeUndefined()
    })
  })

  describe('AnalyticsConfig', () => {
    it('should allow creating valid AnalyticsConfig', () => {
      const config: AnalyticsConfig = {
        refreshInterval: 30000,
        timeRange: {
          start: new Date(),
          end: new Date(),
          granularity: 'hour',
        },
        enableRealtime: true,
        serviceLevelThreshold: 20,
      }
      expect(config.refreshInterval).toBe(30000)
      expect(config.enableRealtime).toBe(true)
    })

    it('should allow empty AnalyticsConfig', () => {
      const config: AnalyticsConfig = {}
      expect(config.refreshInterval).toBeUndefined()
    })
  })

  describe('CallOutcome', () => {
    it('should allow all CallOutcome values', () => {
      const outcomes: CallOutcome[] = ['completed', 'missed', 'abandoned']
      expect(outcomes).toContain('completed')
      expect(outcomes).toContain('missed')
      expect(outcomes).toContain('abandoned')
    })
  })

  describe('AgentState', () => {
    it('should allow all AgentState values', () => {
      const states: AgentState[] = ['available', 'busy', 'paused', 'wrap-up', 'offline']
      expect(states).toContain('available')
      expect(states).toContain('busy')
      expect(states).toContain('paused')
      expect(states).toContain('wrap-up')
      expect(states).toContain('offline')
    })
  })

  describe('CallRecordData', () => {
    it('should allow creating valid CallRecordData', () => {
      const record: CallRecordData = {
        duration: 300,
        waitTime: 15,
        agentId: 'agent-001',
        queueName: 'support',
        outcome: 'completed',
        sentiment: 0.6,
        firstCallResolved: true,
        talkTime: 240,
        holdTime: 30,
        wrapUpTime: 30,
        timestamp: new Date('2026-01-15T12:00:00Z'),
      }
      expect(record.duration).toBe(300)
      expect(record.outcome).toBe('completed')
    })
  })

  describe('ReportOptions', () => {
    it('should allow creating valid ReportOptions', () => {
      const options: ReportOptions = {
        includeAgents: true,
        includeQueues: true,
        includeSentiment: true,
        includeTimeSeries: true,
        title: 'Monthly Report',
      }
      expect(options.includeAgents).toBe(true)
      expect(options.title).toBe('Monthly Report')
    })

    it('should allow empty ReportOptions', () => {
      const options: ReportOptions = {}
      expect(options.includeAgents).toBeUndefined()
    })
  })
})
