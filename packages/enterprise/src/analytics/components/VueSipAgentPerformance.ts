/**
 * @vuesip/enterprise - VueSipAgentPerformance Component
 *
 * Renderless component for agent performance metrics.
 * Provides agent metrics via scoped slot for custom rendering.
 *
 * @module analytics/components/VueSipAgentPerformance
 */

import { defineComponent, h, computed, watch, onMounted, onUnmounted, type SlotsType } from 'vue'
import { useCallAnalytics } from '../useCallAnalytics'
import type { AgentMetrics } from '../types'

/**
 * Slot props provided to the default slot
 */
export interface AgentPerformanceSlotProps {
  /** All agent metrics */
  agents: AgentMetrics[]
  /** Top performing agents */
  topPerformers: AgentMetrics[]
  /** Underperforming agents */
  underperformers: AgentMetrics[]
  /** Specific agent data (if agentId prop provided) */
  selectedAgent: AgentMetrics | null
  /** Team averages */
  teamAverages: {
    handleTime: number
    serviceLevel: number
    occupancy: number
    availability: number
  }
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh the data */
  refresh: () => Promise<void>
  /** Get agent by ID */
  getAgent: (agentId: string) => AgentMetrics | null
  /** Sort agents by metric */
  sortedBy: (metric: keyof AgentMetrics, descending?: boolean) => AgentMetrics[]
}

/**
 * VueSipAgentPerformance - Renderless component for agent analytics
 *
 * @example
 * ```vue
 * <VueSipAgentPerformance v-slot="{ agents, topPerformers, teamAverages }">
 *   <div class="agent-dashboard">
 *     <h3>Team Performance</h3>
 *     <p>Avg Handle Time: {{ teamAverages.handleTime.toFixed(1) }}s</p>
 *     <div v-for="agent in topPerformers" :key="agent.agentId">
 *       {{ agent.agentName }}: {{ agent.serviceLevel.toFixed(1) }}% SL
 *     </div>
 *   </div>
 * </VueSipAgentPerformance>
 * ```
 */
export const VueSipAgentPerformance = defineComponent({
  name: 'VueSipAgentPerformance',

  props: {
    /**
     * Specific agent ID to focus on
     */
    agentId: {
      type: String,
      default: undefined,
    },
    /**
     * Refresh interval in milliseconds (0 to disable)
     */
    refreshInterval: {
      type: Number,
      default: 60000,
    },
    /**
     * Maximum number of agents to show in lists
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
      default: false,
    },
  },

  emits: {
    /**
     * Emitted when agent data is updated
     */
    'update:agents': (_agents: AgentMetrics[]) => true,
    /**
     * Emitted when selected agent data changes
     */
    'update:selected': (_agent: AgentMetrics | null) => true,
    /**
     * Emitted when an error occurs
     */
    error: (_error: string) => true,
  },

  slots: Object as SlotsType<{
    default: AgentPerformanceSlotProps
  }>,

  setup(props, { slots, emit }) {
    // Create analytics instance
    const analytics = useCallAnalytics({
      enableRealtime: props.realtime,
      refreshInterval: props.refreshInterval,
    })

    // Computed values
    const selectedAgent = computed(() => {
      if (!props.agentId) return null
      return analytics.getAgentReport(props.agentId)
    })

    const teamAverages = computed(() => {
      const agents = analytics.agentMetrics.value
      if (agents.length === 0) {
        return { handleTime: 0, serviceLevel: 0, occupancy: 0, availability: 0 }
      }

      const totalHandleTime = agents.reduce((sum, a) => sum + a.averageHandleTime, 0)
      const totalServiceLevel = agents.reduce((sum, a) => sum + a.serviceLevel, 0)
      const totalOccupancy = agents.reduce((sum, a) => sum + a.occupancy, 0)
      const totalAvailability = agents.reduce((sum, a) => sum + a.availability, 0)

      return {
        handleTime: totalHandleTime / agents.length,
        serviceLevel: totalServiceLevel / agents.length,
        occupancy: totalOccupancy / agents.length,
        availability: totalAvailability / agents.length,
      }
    })

    const limitedAgents = computed(() => analytics.agentMetrics.value.slice(0, props.limit))

    const limitedTopPerformers = computed(() => analytics.topPerformers.value.slice(0, props.limit))

    const limitedUnderperformers = computed(() =>
      analytics.underperformers.value.slice(0, props.limit)
    )

    /**
     * Sort agents by a specific metric
     */
    function sortedBy(metric: keyof AgentMetrics, descending = true): AgentMetrics[] {
      const agents = [...analytics.agentMetrics.value]
      return agents.sort((a, b) => {
        const aVal = a[metric]
        const bVal = b[metric]
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return descending ? bVal - aVal : aVal - bVal
        }
        return 0
      })
    }

    // Watch for updates and emit
    watch(
      () => analytics.agentMetrics.value,
      (newAgents) => {
        emit('update:agents', newAgents)
      }
    )

    watch(selectedAgent, (agent) => {
      emit('update:selected', agent)
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
      const slotProps: AgentPerformanceSlotProps = {
        agents: limitedAgents.value,
        topPerformers: limitedTopPerformers.value,
        underperformers: limitedUnderperformers.value,
        selectedAgent: selectedAgent.value,
        teamAverages: teamAverages.value,
        isLoading: analytics.isLoading.value,
        error: analytics.error.value,
        refresh: analytics.refresh,
        getAgent: analytics.getAgentReport,
        sortedBy,
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

export default VueSipAgentPerformance
