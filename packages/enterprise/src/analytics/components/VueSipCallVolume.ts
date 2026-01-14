/**
 * @vuesip/enterprise - VueSipCallVolume Component
 *
 * Renderless component for call volume data visualization.
 * Provides call volume metrics via scoped slot for custom rendering.
 *
 * @module analytics/components/VueSipCallVolume
 */

import {
  defineComponent,
  h,
  computed,
  watch,
  onMounted,
  onUnmounted,
  type PropType,
  type SlotsType,
} from 'vue'
import { useCallAnalytics } from '../useCallAnalytics'
import type { DataPoint, TimeRange, CallMetrics } from '../types'

/**
 * Slot props provided to the default slot
 */
export interface CallVolumeSlotProps {
  /** Call volume data points for charting */
  dataPoints: DataPoint[]
  /** Current call metrics summary */
  metrics: CallMetrics
  /** Total calls in the time period */
  totalCalls: number
  /** Calls per hour average */
  callsPerHour: number
  /** Peak hour data */
  peakHour: { timestamp: Date; value: number } | null
  /** Low hour data */
  lowHour: { timestamp: Date; value: number } | null
  /** Whether data is currently loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh the data */
  refresh: () => Promise<void>
  /** Formatted labels for x-axis */
  labels: string[]
  /** Raw values for y-axis */
  values: number[]
}

/**
 * Time range preset type
 */
export type TimeRangePreset = '1h' | '24h' | '7d' | '30d'

/**
 * VueSipCallVolume - Renderless component for call volume analytics
 *
 * @example
 * ```vue
 * <VueSipCallVolume time-range="24h" v-slot="{ dataPoints, metrics, peakHour }">
 *   <div class="call-volume-chart">
 *     <h3>Call Volume - {{ metrics.totalCalls }} total</h3>
 *     <LineChart :data="dataPoints" />
 *     <p v-if="peakHour">Peak: {{ peakHour.value }} calls at {{ peakHour.timestamp }}</p>
 *   </div>
 * </VueSipCallVolume>
 * ```
 */
export const VueSipCallVolume = defineComponent({
  name: 'VueSipCallVolume',

  props: {
    /**
     * Time range preset for data
     */
    timeRange: {
      type: String as PropType<TimeRangePreset>,
      default: '24h',
    },
    /**
     * Refresh interval in milliseconds (0 to disable)
     */
    refreshInterval: {
      type: Number,
      default: 60000,
    },
    /**
     * Enable real-time updates
     */
    realtime: {
      type: Boolean,
      default: false,
    },
    /**
     * Custom time range (overrides timeRange preset)
     */
    customRange: {
      type: Object as PropType<TimeRange>,
      default: undefined,
    },
  },

  emits: {
    /**
     * Emitted when data is updated
     */
    'update:data': (_data: DataPoint[]) => true,
    /**
     * Emitted when an error occurs
     */
    error: (_error: string) => true,
    /**
     * Emitted when loading state changes
     */
    loading: (_isLoading: boolean) => true,
  },

  slots: Object as SlotsType<{
    default: CallVolumeSlotProps
  }>,

  setup(props, { slots, emit }) {
    // Create analytics instance
    const analytics = useCallAnalytics({
      enableRealtime: props.realtime,
      refreshInterval: props.refreshInterval,
    })

    /**
     * Convert time range preset to TimeRange object
     */
    function presetToRange(preset: TimeRangePreset): TimeRange {
      const now = new Date()
      const start = new Date()

      switch (preset) {
        case '1h':
          start.setHours(now.getHours() - 1)
          return { start, end: now, granularity: 'minute' }
        case '24h':
          start.setDate(now.getDate() - 1)
          return { start, end: now, granularity: 'hour' }
        case '7d':
          start.setDate(now.getDate() - 7)
          return { start, end: now, granularity: 'day' }
        case '30d':
          start.setDate(now.getDate() - 30)
          return { start, end: now, granularity: 'day' }
        default:
          start.setDate(now.getDate() - 1)
          return { start, end: now, granularity: 'hour' }
      }
    }

    // Set initial time range
    const currentRange = computed(() => props.customRange ?? presetToRange(props.timeRange))

    // Watch for time range changes
    watch(
      currentRange,
      (newRange) => {
        analytics.setTimeRange(newRange)
      },
      { immediate: true }
    )

    // Computed values
    const totalCalls = computed(() => analytics.metrics.value.totalCalls)

    const callsPerHour = computed(() => {
      const range = currentRange.value
      const hours = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60)
      return hours > 0 ? totalCalls.value / hours : 0
    })

    const peakHour = computed<{ timestamp: Date; value: number } | null>(() => {
      const points = analytics.callVolume.value
      if (points.length === 0) return null
      let max = points[0]!
      for (let i = 1; i < points.length; i++) {
        const p = points[i]!
        if (p.value > max.value) max = p
      }
      return max
    })

    const lowHour = computed<{ timestamp: Date; value: number } | null>(() => {
      const points = analytics.callVolume.value
      if (points.length === 0) return null
      let min = points[0]!
      for (let i = 1; i < points.length; i++) {
        const p = points[i]!
        if (p.value < min.value) min = p
      }
      return min
    })

    const labels = computed(() =>
      analytics.callVolume.value.map((p) => {
        const d = p.timestamp
        const granularity = currentRange.value.granularity
        switch (granularity) {
          case 'minute':
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
          case 'hour':
            return `${d.getHours().toString().padStart(2, '0')}:00`
          case 'day':
            return `${d.getMonth() + 1}/${d.getDate()}`
          case 'week':
            return `Week of ${d.getMonth() + 1}/${d.getDate()}`
          case 'month':
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
          default:
            return d.toLocaleString()
        }
      })
    )

    const values = computed(() => analytics.callVolume.value.map((p) => p.value))

    // Watch for data updates and emit
    watch(
      () => analytics.callVolume.value,
      (newData) => {
        emit('update:data', newData)
      }
    )

    watch(
      () => analytics.isLoading.value,
      (isLoading) => {
        emit('loading', isLoading)
      }
    )

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
      const slotProps: CallVolumeSlotProps = {
        dataPoints: analytics.callVolume.value,
        metrics: analytics.metrics.value,
        totalCalls: totalCalls.value,
        callsPerHour: callsPerHour.value,
        peakHour: peakHour.value,
        lowHour: lowHour.value,
        isLoading: analytics.isLoading.value,
        error: analytics.error.value,
        refresh: analytics.refresh,
        labels: labels.value,
        values: values.value,
      }

      // Renderless component - return slot content only
      if (slots.default) {
        const children = slots.default(slotProps)
        // Return first child or fragment
        return children.length === 1 ? children[0] : h('div', children)
      }

      return null
    }
  },
})

export default VueSipCallVolume
