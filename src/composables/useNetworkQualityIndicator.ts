/**
 * useNetworkQualityIndicator Composable
 *
 * Provides reactive network quality indicators for WebRTC connections
 * including signal bars, quality levels, colors, and accessibility labels.
 *
 * @example
 * ```typescript
 * const { indicator, isAvailable, update, reset } = useNetworkQualityIndicator()
 *
 * // Update with WebRTC stats
 * update({
 *   rtt: 50,
 *   jitter: 10,
 *   packetLoss: 0.5,
 *   candidateType: 'host'
 * })
 *
 * // Use in template
 * // <NetworkIndicator
 * //   :bars="indicator.bars"
 * //   :color="indicator.color"
 * //   :aria-label="indicator.ariaLabel"
 * // />
 * ```
 *
 * @packageDocumentation
 */

import { ref, computed, type Ref } from 'vue'
import {
  type NetworkQualityLevel,
  type SignalBars,
  type NetworkQualityIcon,
  type NetworkDetails,
  type NetworkQualityIndicatorData,
  type NetworkQualityColors,
  type NetworkQualityThresholds,
  type NetworkQualityIndicatorOptions,
  type NetworkQualityInput,
  type UseNetworkQualityIndicatorReturn,
  DEFAULT_NETWORK_COLORS,
  DEFAULT_NETWORK_THRESHOLDS,
} from '@/types/call-quality.types'

// =============================================================================
// Constants
// =============================================================================

/**
 * Mapping from quality level to signal bars (1-5)
 */
const LEVEL_TO_BARS: Record<NetworkQualityLevel, SignalBars> = {
  excellent: 5,
  good: 4,
  fair: 3,
  poor: 2,
  critical: 1,
  unknown: 1,
}

/**
 * Mapping from quality level to icon name
 */
const LEVEL_TO_ICON: Record<NetworkQualityLevel, NetworkQualityIcon> = {
  excellent: 'signal-excellent',
  good: 'signal-good',
  fair: 'signal-fair',
  poor: 'signal-poor',
  critical: 'signal-critical',
  unknown: 'signal-unknown',
}

/**
 * Aria label templates for each quality level
 */
const LEVEL_TO_ARIA: Record<NetworkQualityLevel, string> = {
  excellent: 'Network quality: excellent connection',
  good: 'Network quality: good connection',
  fair: 'Network quality: fair connection',
  poor: 'Network quality: poor connection',
  critical: 'Network quality: critical - connection issues',
  unknown: 'Network quality: unavailable - no data',
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clamp a value to be at least 0
 */
function clampNonNegative(value: number): number {
  return Math.max(0, value)
}

/**
 * Determine quality level for a single metric based on thresholds
 * Thresholds are [excellent, good, fair, poor] - values above poor are critical
 */
function getMetricLevel(
  value: number,
  thresholds: [number, number, number, number]
): NetworkQualityLevel {
  const normalizedValue = clampNonNegative(value)
  const [excellent, good, fair, poor] = thresholds

  if (normalizedValue <= excellent) return 'excellent'
  if (normalizedValue <= good) return 'good'
  if (normalizedValue <= fair) return 'fair'
  if (normalizedValue <= poor) return 'poor'
  return 'critical'
}

/**
 * Get the worst quality level from multiple levels
 * Order: critical < poor < fair < good < excellent
 */
function getWorstLevel(levels: NetworkQualityLevel[]): NetworkQualityLevel {
  const priority: Record<NetworkQualityLevel, number> = {
    critical: 0,
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4,
    unknown: -1, // Should not be used in comparison
  }

  let worst: NetworkQualityLevel = 'excellent'
  let worstPriority = priority.excellent

  for (const level of levels) {
    if (level !== 'unknown' && priority[level] < worstPriority) {
      worst = level
      worstPriority = priority[level]
    }
  }

  return worst
}

/**
 * Create default network details
 */
function createDefaultDetails(): NetworkDetails {
  return {
    rtt: 0,
    jitter: 0,
    packetLoss: 0,
    bandwidth: 0,
    connectionType: 'unknown',
  }
}

/**
 * Create default indicator data
 * @internal Used for potential future reset functionality
 */
function _createDefaultIndicator(colors: NetworkQualityColors): NetworkQualityIndicatorData {
  return {
    level: 'unknown',
    bars: 1,
    color: colors.unknown,
    icon: 'signal-unknown',
    ariaLabel: LEVEL_TO_ARIA.unknown,
    details: createDefaultDetails(),
  }
}
void _createDefaultIndicator // Suppress unused warning

// =============================================================================
// Main Composable
// =============================================================================

/**
 * Network quality indicator composable
 *
 * @param options - Configuration options
 * @returns Reactive network quality indicator state and controls
 */
export function useNetworkQualityIndicator(
  options: NetworkQualityIndicatorOptions = {}
): UseNetworkQualityIndicatorReturn {
  // Merge options with defaults
  const colors: NetworkQualityColors = {
    ...DEFAULT_NETWORK_COLORS,
    ...options.colors,
  }

  const thresholds: NetworkQualityThresholds = {
    rtt: options.thresholds?.rtt ?? DEFAULT_NETWORK_THRESHOLDS.rtt,
    packetLoss: options.thresholds?.packetLoss ?? DEFAULT_NETWORK_THRESHOLDS.packetLoss,
    jitter: options.thresholds?.jitter ?? DEFAULT_NETWORK_THRESHOLDS.jitter,
  }

  const estimateBandwidth = options.estimateBandwidth !== false // Default true

  // State
  const isAvailable: Ref<boolean> = ref(false)
  const currentDetails: Ref<NetworkDetails> = ref(createDefaultDetails())
  const currentLevel: Ref<NetworkQualityLevel> = ref('unknown')

  // Computed indicator data
  const indicator = computed<NetworkQualityIndicatorData>(() => {
    const level = currentLevel.value
    return {
      level,
      bars: LEVEL_TO_BARS[level],
      color: colors[level],
      icon: LEVEL_TO_ICON[level],
      ariaLabel: LEVEL_TO_ARIA[level],
      details: { ...currentDetails.value },
    }
  })

  /**
   * Calculate the overall quality level from input metrics
   */
  function calculateLevel(input: NetworkQualityInput): NetworkQualityLevel {
    const levels: NetworkQualityLevel[] = []

    // Check each available metric
    if (input.rtt !== undefined) {
      levels.push(getMetricLevel(input.rtt, thresholds.rtt))
    }

    if (input.jitter !== undefined) {
      levels.push(getMetricLevel(input.jitter, thresholds.jitter))
    }

    if (input.packetLoss !== undefined) {
      levels.push(getMetricLevel(input.packetLoss, thresholds.packetLoss))
    }

    // If no metrics provided, return unknown
    if (levels.length === 0) {
      return 'unknown'
    }

    // Return the worst level among all metrics
    return getWorstLevel(levels)
  }

  /**
   * Update details from input, preserving previous values for undefined metrics
   */
  function updateDetails(input: NetworkQualityInput): void {
    const details = currentDetails.value

    if (input.rtt !== undefined) {
      details.rtt = clampNonNegative(input.rtt)
    }

    if (input.jitter !== undefined) {
      details.jitter = clampNonNegative(input.jitter)
    }

    if (input.packetLoss !== undefined) {
      details.packetLoss = clampNonNegative(input.packetLoss)
    }

    if (input.candidateType !== undefined) {
      details.connectionType = input.candidateType
    }

    // Handle bandwidth
    if (input.availableOutgoingBitrate !== undefined) {
      details.bandwidth = input.availableOutgoingBitrate
    } else if (estimateBandwidth && input.bitrate !== undefined) {
      // Estimate bandwidth from current bitrate
      // Use a simple heuristic: available bandwidth is roughly 1.2x current usage
      details.bandwidth = Math.round(input.bitrate * 1.2)
    }
  }

  /**
   * Update indicator with new network statistics
   */
  function update(input: NetworkQualityInput): void {
    // Calculate new level
    const newLevel = calculateLevel(input)

    // If we got any valid metrics, mark as available
    if (newLevel !== 'unknown') {
      isAvailable.value = true
    }

    // Update details
    updateDetails(input)

    // Update level (triggers computed recalculation)
    currentLevel.value = newLevel
  }

  /**
   * Reset indicator to unknown state
   */
  function reset(): void {
    isAvailable.value = false
    currentLevel.value = 'unknown'
    currentDetails.value = createDefaultDetails()
  }

  return {
    indicator,
    isAvailable,
    update,
    reset,
  }
}
