/**
 * @vuesip/enterprise - VueSipSentimentTrends Component
 *
 * Renderless component for sentiment analysis visualization.
 * Provides sentiment metrics via scoped slot for custom rendering.
 *
 * @module analytics/components/VueSipSentimentTrends
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
import type { SentimentMetrics, DataPoint, TimeRange } from '../types'

/**
 * Slot props provided to the default slot
 */
export interface SentimentTrendsSlotProps {
  /** Current sentiment metrics */
  metrics: SentimentMetrics
  /** Sentiment score history for charting */
  history: DataPoint[]
  /** Average sentiment score */
  averageSentiment: number
  /** Sentiment distribution percentages */
  distribution: {
    positive: number
    neutral: number
    negative: number
  }
  /** Whether sentiment is improving, declining, or stable */
  trend: 'improving' | 'declining' | 'stable'
  /** Trend change percentage */
  trendChange: number
  /** Sentiment category for the current average */
  sentimentCategory: 'positive' | 'neutral' | 'negative'
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh the data */
  refresh: () => Promise<void>
  /** Formatted labels for x-axis */
  labels: string[]
  /** Raw values for y-axis */
  values: number[]
  /** Color for current sentiment */
  sentimentColor: string
}

/**
 * Time range preset type
 */
export type TimeRangePreset = '1h' | '24h' | '7d' | '30d'

/**
 * VueSipSentimentTrends - Renderless component for sentiment analytics
 *
 * @example
 * ```vue
 * <VueSipSentimentTrends time-range="24h" v-slot="{ metrics, trend, distribution, sentimentColor }">
 *   <div class="sentiment-dashboard" :style="{ borderColor: sentimentColor }">
 *     <h3>Sentiment: {{ metrics.averageSentiment.toFixed(2) }}</h3>
 *     <p>Trend: {{ trend }}</p>
 *     <div class="distribution">
 *       <div :style="{ width: distribution.positive + '%' }">Positive</div>
 *       <div :style="{ width: distribution.neutral + '%' }">Neutral</div>
 *       <div :style="{ width: distribution.negative + '%' }">Negative</div>
 *     </div>
 *   </div>
 * </VueSipSentimentTrends>
 * ```
 */
export const VueSipSentimentTrends = defineComponent({
  name: 'VueSipSentimentTrends',

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
    /**
     * Color for positive sentiment
     */
    positiveColor: {
      type: String,
      default: '#22c55e',
    },
    /**
     * Color for neutral sentiment
     */
    neutralColor: {
      type: String,
      default: '#eab308',
    },
    /**
     * Color for negative sentiment
     */
    negativeColor: {
      type: String,
      default: '#ef4444',
    },
  },

  emits: {
    /**
     * Emitted when sentiment data is updated
     */
    'update:data': (_data: DataPoint[]) => true,
    /**
     * Emitted when trend changes
     */
    'update:trend': (_trend: 'improving' | 'declining' | 'stable') => true,
    /**
     * Emitted when an error occurs
     */
    error: (_error: string) => true,
  },

  slots: Object as SlotsType<{
    default: SentimentTrendsSlotProps
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
    const distribution = computed(() => ({
      positive: analytics.sentimentMetrics.value.positivePercent,
      neutral: analytics.sentimentMetrics.value.neutralPercent,
      negative: analytics.sentimentMetrics.value.negativePercent,
    }))

    const sentimentCategory = computed<'positive' | 'neutral' | 'negative'>(() => {
      const avg = analytics.sentimentMetrics.value.averageSentiment
      if (avg > 0.3) return 'positive'
      if (avg < -0.3) return 'negative'
      return 'neutral'
    })

    const sentimentColor = computed(() => {
      switch (sentimentCategory.value) {
        case 'positive':
          return props.positiveColor
        case 'negative':
          return props.negativeColor
        default:
          return props.neutralColor
      }
    })

    const trendChange = computed(() => {
      const history = analytics.sentimentHistory.value
      if (history.length < 2) return 0

      const midpoint = Math.floor(history.length / 2)
      const firstHalf = history.slice(0, midpoint)
      const secondHalf = history.slice(midpoint)

      if (firstHalf.length === 0 || secondHalf.length === 0) return 0

      const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length

      return secondAvg - firstAvg
    })

    const labels = computed(() =>
      analytics.sentimentHistory.value.map((p) => {
        const d = p.timestamp
        const granularity = currentRange.value.granularity
        switch (granularity) {
          case 'minute':
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
          case 'hour':
            return `${d.getHours().toString().padStart(2, '0')}:00`
          case 'day':
            return `${d.getMonth() + 1}/${d.getDate()}`
          default:
            return d.toLocaleString()
        }
      })
    )

    const values = computed(() => analytics.sentimentHistory.value.map((p) => p.value))

    // Watch for updates and emit
    watch(
      () => analytics.sentimentHistory.value,
      (newData) => {
        emit('update:data', newData)
      }
    )

    watch(
      () => analytics.sentimentMetrics.value.trendDirection,
      (trend) => {
        emit('update:trend', trend)
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
      const slotProps: SentimentTrendsSlotProps = {
        metrics: analytics.sentimentMetrics.value,
        history: analytics.sentimentHistory.value,
        averageSentiment: analytics.sentimentMetrics.value.averageSentiment,
        distribution: distribution.value,
        trend: analytics.sentimentMetrics.value.trendDirection,
        trendChange: trendChange.value,
        sentimentCategory: sentimentCategory.value,
        isLoading: analytics.isLoading.value,
        error: analytics.error.value,
        refresh: analytics.refresh,
        labels: labels.value,
        values: values.value,
        sentimentColor: sentimentColor.value,
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

export default VueSipSentimentTrends
