/**
 * @vuesip/enterprise - VueSipQueueHealth Component
 *
 * Renderless component for queue health monitoring.
 * Provides queue metrics via scoped slot for custom rendering.
 *
 * @module analytics/components/VueSipQueueHealth
 */

import { defineComponent, h, computed, watch, onMounted, onUnmounted, type SlotsType } from 'vue'
import { useCallAnalytics } from '../useCallAnalytics'
import type { QueueMetrics } from '../types'

/**
 * Queue health status
 */
export type QueueHealthStatus = 'healthy' | 'warning' | 'critical'

/**
 * Slot props provided to the default slot
 */
export interface QueueHealthSlotProps {
  /** All queue metrics */
  queues: QueueMetrics[]
  /** Busiest queues */
  busiestQueues: QueueMetrics[]
  /** Specific queue data (if queueName prop provided) */
  selectedQueue: QueueMetrics | null
  /** Overall health status */
  overallHealth: QueueHealthStatus
  /** Total calls waiting across all queues */
  totalWaiting: number
  /** Total calls in progress */
  totalInProgress: number
  /** Total agents available */
  totalAgentsAvailable: number
  /** Total agents busy */
  totalAgentsBusy: number
  /** Average service level across queues */
  averageServiceLevel: number
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh the data */
  refresh: () => Promise<void>
  /** Get queue by name */
  getQueue: (queueName: string) => QueueMetrics | null
  /** Get health status for a queue */
  getQueueHealth: (queue: QueueMetrics) => QueueHealthStatus
  /** Get health color for display */
  getHealthColor: (status: QueueHealthStatus) => string
}

/**
 * VueSipQueueHealth - Renderless component for queue monitoring
 *
 * @example
 * ```vue
 * <VueSipQueueHealth v-slot="{ queues, overallHealth, totalWaiting, getHealthColor }">
 *   <div class="queue-dashboard" :style="{ borderColor: getHealthColor(overallHealth) }">
 *     <h3>Queue Status: {{ overallHealth }}</h3>
 *     <p>{{ totalWaiting }} calls waiting</p>
 *     <div v-for="queue in queues" :key="queue.queueName">
 *       {{ queue.queueName }}: {{ queue.callsWaiting }} waiting
 *     </div>
 *   </div>
 * </VueSipQueueHealth>
 * ```
 */
export const VueSipQueueHealth = defineComponent({
  name: 'VueSipQueueHealth',

  props: {
    /**
     * Specific queue name to focus on
     */
    queueName: {
      type: String,
      default: undefined,
    },
    /**
     * Refresh interval in milliseconds (0 to disable)
     */
    refreshInterval: {
      type: Number,
      default: 30000, // More frequent for queue monitoring
    },
    /**
     * Maximum number of queues to show
     */
    limit: {
      type: Number,
      default: 10,
    },
    /**
     * Enable real-time updates
     */
    realtime: {
      type: Boolean,
      default: true,
    },
    /**
     * Warning threshold for wait time (seconds)
     */
    waitWarningThreshold: {
      type: Number,
      default: 60,
    },
    /**
     * Critical threshold for wait time (seconds)
     */
    waitCriticalThreshold: {
      type: Number,
      default: 120,
    },
    /**
     * Warning threshold for abandon rate (percent)
     */
    abandonWarningThreshold: {
      type: Number,
      default: 5,
    },
    /**
     * Critical threshold for abandon rate (percent)
     */
    abandonCriticalThreshold: {
      type: Number,
      default: 10,
    },
    /**
     * Color for healthy status
     */
    healthyColor: {
      type: String,
      default: '#22c55e',
    },
    /**
     * Color for warning status
     */
    warningColor: {
      type: String,
      default: '#eab308',
    },
    /**
     * Color for critical status
     */
    criticalColor: {
      type: String,
      default: '#ef4444',
    },
  },

  emits: {
    /**
     * Emitted when queue data is updated
     */
    'update:queues': (_queues: QueueMetrics[]) => true,
    /**
     * Emitted when selected queue data changes
     */
    'update:selected': (_queue: QueueMetrics | null) => true,
    /**
     * Emitted when health status changes
     */
    'update:health': (_status: QueueHealthStatus) => true,
    /**
     * Emitted when a queue enters critical state
     */
    critical: (_queue: QueueMetrics) => true,
    /**
     * Emitted when an error occurs
     */
    error: (_error: string) => true,
  },

  slots: Object as SlotsType<{
    default: QueueHealthSlotProps
  }>,

  setup(props, { slots, emit }) {
    // Create analytics instance
    const analytics = useCallAnalytics({
      enableRealtime: props.realtime,
      refreshInterval: props.refreshInterval,
    })

    /**
     * Get health status for a queue
     */
    function getQueueHealth(queue: QueueMetrics): QueueHealthStatus {
      // Check wait time
      if (queue.longestWait >= props.waitCriticalThreshold) return 'critical'
      if (queue.longestWait >= props.waitWarningThreshold) return 'warning'

      // Check abandon rate
      if (queue.abandonRate >= props.abandonCriticalThreshold) return 'critical'
      if (queue.abandonRate >= props.abandonWarningThreshold) return 'warning'

      // Check agent availability
      if (queue.agentsAvailable === 0 && queue.callsWaiting > 0) return 'critical'
      if (queue.agentsAvailable === 0) return 'warning'

      return 'healthy'
    }

    /**
     * Get color for health status
     */
    function getHealthColor(status: QueueHealthStatus): string {
      switch (status) {
        case 'healthy':
          return props.healthyColor
        case 'warning':
          return props.warningColor
        case 'critical':
          return props.criticalColor
      }
    }

    // Computed values
    const selectedQueue = computed(() => {
      if (!props.queueName) return null
      return analytics.getQueueReport(props.queueName)
    })

    const limitedQueues = computed(() => analytics.queueMetrics.value.slice(0, props.limit))

    const limitedBusiestQueues = computed(() => analytics.busiestQueues.value.slice(0, props.limit))

    const overallHealth = computed<QueueHealthStatus>(() => {
      const queues = analytics.queueMetrics.value
      if (queues.length === 0) return 'healthy'

      const hasAnyCritical = queues.some((q) => getQueueHealth(q) === 'critical')
      if (hasAnyCritical) return 'critical'

      const hasAnyWarning = queues.some((q) => getQueueHealth(q) === 'warning')
      if (hasAnyWarning) return 'warning'

      return 'healthy'
    })

    const totalWaiting = computed(() =>
      analytics.queueMetrics.value.reduce((sum, q) => sum + q.callsWaiting, 0)
    )

    const totalInProgress = computed(() =>
      analytics.queueMetrics.value.reduce((sum, q) => sum + q.callsInProgress, 0)
    )

    const totalAgentsAvailable = computed(() =>
      analytics.queueMetrics.value.reduce((sum, q) => sum + q.agentsAvailable, 0)
    )

    const totalAgentsBusy = computed(() =>
      analytics.queueMetrics.value.reduce((sum, q) => sum + q.agentsBusy, 0)
    )

    const averageServiceLevel = computed(() => {
      const queues = analytics.queueMetrics.value
      if (queues.length === 0) return 0
      return queues.reduce((sum, q) => sum + q.serviceLevelPercent, 0) / queues.length
    })

    // Track previous health states for critical alerts
    const previousHealthStates = new Map<string, QueueHealthStatus>()

    // Watch for updates and emit
    watch(
      () => analytics.queueMetrics.value,
      (newQueues) => {
        emit('update:queues', newQueues)

        // Check for new critical states
        for (const queue of newQueues) {
          const currentHealth = getQueueHealth(queue)
          const previousHealth = previousHealthStates.get(queue.queueName)

          if (currentHealth === 'critical' && previousHealth !== 'critical') {
            emit('critical', queue)
          }

          previousHealthStates.set(queue.queueName, currentHealth)
        }
      }
    )

    watch(selectedQueue, (queue) => {
      emit('update:selected', queue)
    })

    watch(overallHealth, (health) => {
      emit('update:health', health)
    })

    watch(
      () => analytics.error.value,
      (error) => {
        if (error) {
          emit('error', error)
        }
      }
    )

    // Auto-refresh timer
    let refreshTimer: ReturnType<typeof setInterval> | null = null

    onMounted(() => {
      if (props.refreshInterval > 0) {
        refreshTimer = setInterval(() => {
          analytics.refresh()
        }, props.refreshInterval)
      }
    })

    onUnmounted(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    })

    return () => {
      const slotProps: QueueHealthSlotProps = {
        queues: limitedQueues.value,
        busiestQueues: limitedBusiestQueues.value,
        selectedQueue: selectedQueue.value,
        overallHealth: overallHealth.value,
        totalWaiting: totalWaiting.value,
        totalInProgress: totalInProgress.value,
        totalAgentsAvailable: totalAgentsAvailable.value,
        totalAgentsBusy: totalAgentsBusy.value,
        averageServiceLevel: averageServiceLevel.value,
        isLoading: analytics.isLoading.value,
        error: analytics.error.value,
        refresh: analytics.refresh,
        getQueue: analytics.getQueueReport,
        getQueueHealth,
        getHealthColor,
      }

      // Renderless component - return slot content only
      if (slots.default) {
        const children = slots.default(slotProps)
        return children.length === 1 ? children[0] : h('div', children)
      }

      return null
    }
  },
})

export default VueSipQueueHealth
