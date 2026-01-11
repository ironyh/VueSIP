/**
 * Provider-Agnostic Agent Metrics Composable
 *
 * Provides reactive metrics management that works with any CallCenterProvider.
 * Handles fetching, formatting, and computed statistics for agent performance.
 *
 * @module composables/useAgentMetrics
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import type { CallCenterProvider, AgentMetrics } from '@/providers/call-center/types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAgentMetrics')

/**
 * Options for useAgentMetrics
 */
export interface UseAgentMetricsOptions {
  /** Auto-refresh interval in milliseconds */
  autoRefreshInterval?: number
}

/**
 * Return type for useAgentMetrics
 */
export interface UseAgentMetricsReturn {
  // State
  /** Raw metrics from provider */
  metrics: Ref<AgentMetrics | null>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message */
  error: Ref<string | null>

  // Formatted values
  /** Total talk time formatted as HH:MM:SS */
  totalTalkTimeFormatted: ComputedRef<string>
  /** Average handle time formatted as MM:SS */
  averageHandleTimeFormatted: ComputedRef<string>
  /** Average wrap-up time formatted as MM:SS */
  averageWrapUpTimeFormatted: ComputedRef<string>

  // Computed statistics
  /** Calls handled per hour */
  callsPerHour: ComputedRef<number>
  /** Utilization percentage (talk time / session time) */
  utilizationPercent: ComputedRef<number>

  // Methods
  /** Fetch metrics from provider */
  fetchMetrics: () => Promise<void>
  /** Start auto-refresh */
  startAutoRefresh: () => void
  /** Stop auto-refresh */
  stopAutoRefresh: () => void
}

/**
 * Format seconds as HH:MM:SS
 */
function formatHHMMSS(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Format seconds as MM:SS
 */
function formatMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Provider-agnostic agent metrics composable
 *
 * @param providerRef - Ref to the CallCenterProvider instance
 * @param options - Configuration options
 * @returns Reactive metrics state and methods
 *
 * @example
 * ```typescript
 * const { provider } = useCallCenterProvider(config)
 * const {
 *   metrics,
 *   callsPerHour,
 *   utilizationPercent,
 *   fetchMetrics,
 *   startAutoRefresh,
 * } = useAgentMetrics(provider, { autoRefreshInterval: 30000 })
 *
 * // Fetch current metrics
 * await fetchMetrics()
 *
 * // Start auto-refresh
 * startAutoRefresh()
 * ```
 */
export function useAgentMetrics(
  providerRef: ShallowRef<CallCenterProvider | null> | Ref<CallCenterProvider | null>,
  options: UseAgentMetricsOptions = {}
): UseAgentMetricsReturn {
  const { autoRefreshInterval = 30000 } = options

  // Internal state
  const metrics = ref<AgentMetrics | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // Formatted values
  const totalTalkTimeFormatted = computed(() => {
    if (!metrics.value) return '00:00:00'
    return formatHHMMSS(metrics.value.totalTalkTime)
  })

  const averageHandleTimeFormatted = computed(() => {
    if (!metrics.value) return '00:00'
    return formatMMSS(metrics.value.averageHandleTime)
  })

  const averageWrapUpTimeFormatted = computed(() => {
    if (!metrics.value) return '00:00'
    return formatMMSS(metrics.value.averageWrapUpTime)
  })

  // Computed statistics
  const callsPerHour = computed(() => {
    if (!metrics.value || !metrics.value.sessionDuration) return 0
    const hours = metrics.value.sessionDuration / 3600
    return metrics.value.callsHandled / hours
  })

  const utilizationPercent = computed(() => {
    if (!metrics.value || !metrics.value.sessionDuration) return 0
    return (metrics.value.totalTalkTime / metrics.value.sessionDuration) * 100
  })

  // Methods
  async function fetchMetrics(): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const result = await providerRef.value.getMetrics()
      metrics.value = result
      logger.debug('Metrics fetched:', result)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch metrics'
      logger.error('Fetch metrics failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function startAutoRefresh(): void {
    if (refreshTimer) return

    // Fetch immediately
    fetchMetrics()

    // Then schedule interval
    refreshTimer = setInterval(() => {
      fetchMetrics()
    }, autoRefreshInterval)

    logger.info(`Auto-refresh started with ${autoRefreshInterval}ms interval`)
  }

  function stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
      logger.info('Auto-refresh stopped')
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopAutoRefresh()
  })

  return {
    // State
    metrics,
    isLoading,
    error,

    // Formatted values
    totalTalkTimeFormatted,
    averageHandleTimeFormatted,
    averageWrapUpTimeFormatted,

    // Computed statistics
    callsPerHour,
    utilizationPercent,

    // Methods
    fetchMetrics,
    startAutoRefresh,
    stopAutoRefresh,
  }
}
