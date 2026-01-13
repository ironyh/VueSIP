/**
 * @vuesip/enterprise - Analytics Module
 *
 * Provides analytics and reporting features for VueSIP including:
 * - Call metrics and KPIs
 * - Agent performance tracking
 * - Queue health monitoring
 * - Sentiment analysis
 * - Real-time dashboards
 * - Export and reporting
 *
 * @module analytics
 */

// ============================================
// Types
// ============================================

export type {
  CallMetrics,
  AgentMetrics,
  QueueMetrics,
  SentimentMetrics,
  TimeRange,
  DataPoint,
  AnalyticsConfig,
  CallOutcome,
  AgentState,
  CallRecordData,
  CallRecord,
  AgentStateRecord,
  QueueStateRecord,
  ReportOptions,
} from './types'

// ============================================
// Composable
// ============================================

export { useCallAnalytics, type UseCallAnalyticsReturn } from './useCallAnalytics'

// ============================================
// Renderless Components
// ============================================

export {
  VueSipCallVolume,
  type CallVolumeSlotProps,
  type TimeRangePreset,
} from './components/VueSipCallVolume'

export {
  VueSipAgentPerformance,
  type AgentPerformanceSlotProps,
} from './components/VueSipAgentPerformance'

export {
  VueSipSentimentTrends,
  type SentimentTrendsSlotProps,
} from './components/VueSipSentimentTrends'

export {
  VueSipQueueHealth,
  type QueueHealthSlotProps,
  type QueueHealthStatus,
} from './components/VueSipQueueHealth'

// ============================================
// Legacy exports for backward compatibility
// ============================================

/**
 * @deprecated Use AnalyticsConfig from './types' instead
 */
export interface AnalyticsEvent {
  name: string
  timestamp: Date
  properties: Record<string, unknown>
  userId?: string
  sessionId?: string
}

/**
 * @deprecated Use useCallAnalytics instead
 */
export function useAnalytics(_config?: {
  enabled?: boolean
  provider?: string
  endpoint?: string
  samplingRate?: number
  realtime?: boolean
}) {
  console.warn('@vuesip/enterprise: useAnalytics is deprecated. Use useCallAnalytics instead.')
  return {
    trackEvent: async (_event: Omit<AnalyticsEvent, 'timestamp'>) => {},
    getCallMetrics: async (
      _startDate: Date,
      _endDate: Date
    ): Promise<{
      totalCalls: number
      inboundCalls: number
      outboundCalls: number
      missedCalls: number
      averageDuration: number
      totalDuration: number
      averageWaitTime: number
      abandonRate: number
      firstCallResolution: number
    }> => ({
      totalCalls: 0,
      inboundCalls: 0,
      outboundCalls: 0,
      missedCalls: 0,
      averageDuration: 0,
      totalDuration: 0,
      averageWaitTime: 0,
      abandonRate: 0,
      firstCallResolution: 0,
    }),
    getAgentMetrics: async (
      _agentId: string
    ): Promise<{
      agentId: string
      totalCalls: number
      averageHandleTime: number
      averageHoldTime: number
      utilizationRate: number
      firstCallResolution: number
    }> => ({
      agentId: _agentId,
      totalCalls: 0,
      averageHandleTime: 0,
      averageHoldTime: 0,
      utilizationRate: 0,
      firstCallResolution: 0,
    }),
  }
}
