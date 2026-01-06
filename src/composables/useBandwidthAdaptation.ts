/**
 * useBandwidthAdaptation Composable
 *
 * Provides intelligent bandwidth adaptation recommendations for WebRTC connections.
 * Analyzes available bandwidth, packet loss, RTT, and other metrics to suggest
 * resolution, framerate, and bitrate adjustments for optimal call quality.
 *
 * @example
 * ```typescript
 * const { recommendation, update, setConstraints } = useBandwidthAdaptation({
 *   sensitivity: 0.6,
 *   onRecommendation: (rec) => console.log('New recommendation:', rec)
 * })
 *
 * // Update with WebRTC stats
 * update({
 *   availableBitrate: 1500,
 *   currentBitrate: 1200,
 *   packetLoss: 0.5,
 *   rtt: 50,
 *   currentResolution: { width: 1280, height: 720, label: '720p' },
 *   videoEnabled: true
 * })
 *
 * // Check recommendation
 * if (recommendation.value.action === 'downgrade') {
 *   // Apply suggestions
 * }
 * ```
 *
 * @packageDocumentation
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  type BandwidthAction,
  type RecommendationPriority,
  type AdaptationSuggestion,
  type BandwidthRecommendation,
  type VideoResolution,
  type BandwidthConstraints,
  type BandwidthAdaptationOptions,
  type BandwidthAdaptationInput,
  type UseBandwidthAdaptationReturn,
  DEFAULT_BANDWIDTH_CONSTRAINTS,
  VIDEO_RESOLUTIONS,
} from '@/types/call-quality.types'

// =============================================================================
// Constants
// =============================================================================

/**
 * Thresholds for bandwidth ratio (available/current) to determine action
 */
const BANDWIDTH_RATIO_THRESHOLDS = {
  upgrade: 2.0, // 2x available bandwidth → can upgrade
  maintain: 0.8, // 80% available → maintain current
  downgrade: 0.5, // 50% available → should downgrade
  critical: 0.15, // 15% available → critical
}

/**
 * Thresholds for packet loss to determine severity
 */
const PACKET_LOSS_THRESHOLDS = {
  excellent: 0.5,
  good: 1.5,
  fair: 3,
  poor: 5,
  critical: 8,
}

/**
 * Thresholds for RTT to determine severity
 */
const RTT_THRESHOLDS = {
  excellent: 50,
  good: 100,
  fair: 200,
  poor: 350,
  critical: 500,
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clamp a value to a range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Clamp to non-negative
 */
function clampNonNegative(value: number | undefined): number {
  return value !== undefined ? Math.max(0, value) : 0
}

/**
 * Find next lower resolution from current
 */
function findLowerResolution(current: VideoResolution): VideoResolution | null {
  const currentIndex = VIDEO_RESOLUTIONS.findIndex(
    (r) => r.width === current.width && r.height === current.height
  )
  if (currentIndex === -1 || currentIndex === VIDEO_RESOLUTIONS.length - 1) {
    return null
  }
  return VIDEO_RESOLUTIONS[currentIndex + 1] ?? null
}

/**
 * Find next higher resolution from current
 */
function findHigherResolution(current: VideoResolution): VideoResolution | null {
  const currentIndex = VIDEO_RESOLUTIONS.findIndex(
    (r) => r.width === current.width && r.height === current.height
  )
  if (currentIndex <= 0) {
    return null
  }
  return VIDEO_RESOLUTIONS[currentIndex - 1] ?? null
}

/**
 * Create default recommendation
 */
function createDefaultRecommendation(): BandwidthRecommendation {
  return {
    action: 'maintain',
    suggestions: [],
    priority: 'low',
    estimatedImprovement: 0,
    timestamp: Date.now(),
  }
}

// =============================================================================
// Main Composable
// =============================================================================

/**
 * Bandwidth adaptation composable
 *
 * @param options - Configuration options
 * @returns Reactive bandwidth adaptation state and controls
 */
export function useBandwidthAdaptation(
  options: BandwidthAdaptationOptions = {}
): UseBandwidthAdaptationReturn {
  // Merge options with defaults
  const sensitivity = clamp(options.sensitivity ?? 0.5, 0, 1)
  const historySize = options.historySize ?? 5
  const onRecommendation = options.onRecommendation

  // State
  const isAutoAdapting: Ref<boolean> = ref(options.autoAdapt ?? false)
  const constraints: Ref<Required<BandwidthConstraints>> = ref({
    ...DEFAULT_BANDWIDTH_CONSTRAINTS,
    ...options.constraints,
  })

  // History for smoothing
  const history: Ref<BandwidthAdaptationInput[]> = ref([])

  // Current recommendation
  const currentRecommendation: Ref<BandwidthRecommendation> = ref(createDefaultRecommendation())

  // Computed recommendation with proper typing
  const recommendation: ComputedRef<BandwidthRecommendation> = computed(
    () => currentRecommendation.value
  )

  /**
   * Calculate severity score (0-1) based on metrics
   */
  function calculateSeverity(input: BandwidthAdaptationInput): number {
    const contributions: number[] = []

    // Bandwidth ratio contribution
    if (input.availableBitrate !== undefined && input.currentBitrate !== undefined) {
      const ratio =
        input.currentBitrate > 0
          ? input.availableBitrate / input.currentBitrate
          : input.availableBitrate > 0
            ? 2
            : 0

      if (ratio <= BANDWIDTH_RATIO_THRESHOLDS.critical) {
        contributions.push(1.0)
      } else if (ratio <= BANDWIDTH_RATIO_THRESHOLDS.downgrade) {
        contributions.push(0.7)
      } else if (ratio <= BANDWIDTH_RATIO_THRESHOLDS.maintain) {
        contributions.push(0.4)
      }
      // Good bandwidth ratio doesn't contribute to severity
    }

    // Packet loss contribution
    if (input.packetLoss !== undefined) {
      const packetLoss = clampNonNegative(input.packetLoss)
      if (packetLoss >= PACKET_LOSS_THRESHOLDS.critical) {
        contributions.push(1.0)
      } else if (packetLoss >= PACKET_LOSS_THRESHOLDS.poor) {
        contributions.push(0.7)
      } else if (packetLoss >= PACKET_LOSS_THRESHOLDS.fair) {
        contributions.push(0.5)
      } else if (packetLoss >= PACKET_LOSS_THRESHOLDS.good) {
        contributions.push(0.3)
      } else if (packetLoss >= PACKET_LOSS_THRESHOLDS.excellent) {
        contributions.push(0.15)
      }
      // Zero/excellent packet loss doesn't contribute to severity
    }

    // RTT contribution
    if (input.rtt !== undefined) {
      const rtt = clampNonNegative(input.rtt)
      if (rtt >= RTT_THRESHOLDS.critical) {
        contributions.push(1.0)
      } else if (rtt >= RTT_THRESHOLDS.poor) {
        contributions.push(0.7)
      } else if (rtt >= RTT_THRESHOLDS.fair) {
        contributions.push(0.5)
      } else if (rtt >= RTT_THRESHOLDS.good) {
        contributions.push(0.3)
      }
      // Excellent RTT doesn't contribute to severity
    }

    // Degradation events contribution
    if (input.degradationEvents !== undefined && input.degradationEvents > 0) {
      contributions.push(Math.min(input.degradationEvents * 0.1, 0.5))
    }

    // Handle edge case of no severity-contributing metrics
    if (contributions.length === 0) {
      return 0
    }

    // Use max contribution for more responsive severity detection
    // This makes the system react to the worst metric
    const maxContribution = Math.max(...contributions)
    const avgContribution = contributions.reduce((a, b) => a + b, 0) / contributions.length

    // Blend max and average (weighted toward max for responsiveness)
    const baseSeverity = maxContribution * 0.6 + avgContribution * 0.4

    // Apply sensitivity scaling
    return baseSeverity * (0.5 + sensitivity * 0.5)
  }

  /**
   * Determine action based on severity and metrics
   */
  function determineAction(input: BandwidthAdaptationInput, severity: number): BandwidthAction {
    // Critical conditions - lowered threshold to account for sensitivity scaling
    if (severity >= 0.7) {
      return 'critical'
    }

    // Check for zero/negative bitrates
    const available = clampNonNegative(input.availableBitrate)
    const current = clampNonNegative(input.currentBitrate)

    if (available === 0 && current === 0) {
      return 'critical'
    }

    // Downgrade conditions
    if (severity >= 0.4) {
      return 'downgrade'
    }

    // Check for upgrade opportunity
    if (
      available > 0 &&
      current > 0 &&
      available / current >= BANDWIDTH_RATIO_THRESHOLDS.upgrade &&
      severity < 0.2
    ) {
      return 'upgrade'
    }

    // Default to maintain
    return 'maintain'
  }

  /**
   * Determine priority based on severity
   */
  function determinePriority(severity: number, action: BandwidthAction): RecommendationPriority {
    if (action === 'critical' || severity >= 0.7) {
      return 'critical'
    }
    if (severity >= 0.4) {
      return 'high'
    }
    if (severity >= 0.25) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Generate suggestions based on current conditions
   */
  function generateSuggestions(
    input: BandwidthAdaptationInput,
    action: BandwidthAction
  ): AdaptationSuggestion[] {
    const suggestions: AdaptationSuggestion[] = []

    // No suggestions for maintain
    if (action === 'maintain') {
      return suggestions
    }

    const videoEnabled = input.videoEnabled !== false
    const availableBitrate = input.availableBitrate ?? 0

    // Video-related suggestions
    if (videoEnabled) {
      // Check if bandwidth is below minimum video bitrate - suggest disabling video
      if (availableBitrate > 0 && availableBitrate < constraints.value.minVideoBitrate) {
        suggestions.push({
          type: 'video',
          message: 'Disable video - insufficient bandwidth for minimum quality',
          current: 'Video enabled',
          recommended: 'Audio only',
          impact: 75,
        })
      } else if (action === 'critical') {
        // Suggest disabling video
        suggestions.push({
          type: 'video',
          message: 'Disable video and switch to audio-only call',
          current: 'Video enabled',
          recommended: 'Audio only',
          impact: 80,
        })
      } else if (action === 'downgrade') {
        // Suggest resolution downgrade if resolution is provided
        if (input.currentResolution) {
          const lowerRes = findLowerResolution(input.currentResolution)
          if (lowerRes) {
            suggestions.push({
              type: 'video',
              message: `Reduce video resolution from ${input.currentResolution.label} to ${lowerRes.label}`,
              current: input.currentResolution.label,
              recommended: lowerRes.label,
              impact: 50,
            })
          }
        }

        // Suggest framerate reduction - works even without resolution
        if (input.currentFramerate && input.currentFramerate > constraints.value.minFramerate) {
          const targetFramerate = Math.max(
            constraints.value.minFramerate,
            Math.floor(input.currentFramerate * 0.6)
          )
          suggestions.push({
            type: 'video',
            message: `Reduce framerate from ${input.currentFramerate}fps to ${targetFramerate}fps`,
            current: `${input.currentFramerate}fps`,
            recommended: `${targetFramerate}fps`,
            impact: 30,
          })
        }
      } else if (action === 'upgrade' && input.currentResolution) {
        // Suggest resolution upgrade
        const higherRes = findHigherResolution(input.currentResolution)
        if (higherRes) {
          suggestions.push({
            type: 'video',
            message: `Increase video resolution from ${input.currentResolution.label} to ${higherRes.label}`,
            current: input.currentResolution.label,
            recommended: higherRes.label,
            impact: 40,
          })
        }
      }
    }

    // Audio-related suggestions
    if (
      input.currentAudioBitrate !== undefined &&
      input.currentAudioBitrate > constraints.value.minAudioBitrate
    ) {
      if (action === 'downgrade' || action === 'critical') {
        const targetAudioBitrate = Math.max(
          constraints.value.minAudioBitrate,
          Math.floor(input.currentAudioBitrate * 0.5)
        )
        if (targetAudioBitrate < input.currentAudioBitrate) {
          suggestions.push({
            type: 'audio',
            message: `Reduce audio bitrate from ${input.currentAudioBitrate}kbps to ${targetAudioBitrate}kbps`,
            current: `${input.currentAudioBitrate}kbps`,
            recommended: `${targetAudioBitrate}kbps`,
            impact: 20,
          })
        }
      }
    }

    // Sort by impact (highest first)
    suggestions.sort((a, b) => b.impact - a.impact)

    return suggestions
  }

  /**
   * Calculate estimated improvement from suggestions
   */
  function calculateEstimatedImprovement(
    suggestions: AdaptationSuggestion[],
    action: BandwidthAction
  ): number {
    if (action === 'maintain' || suggestions.length === 0) {
      return 0
    }

    // Sum impacts with diminishing returns
    let improvement = 0
    let factor = 1.0
    for (const suggestion of suggestions) {
      improvement += suggestion.impact * factor
      factor *= 0.6 // Diminishing returns
    }

    return Math.min(100, Math.round(improvement))
  }

  /**
   * Get smoothed input from history
   */
  function getSmoothedInput(): BandwidthAdaptationInput {
    if (history.value.length === 0) {
      return {}
    }

    // Use most recent values, but average some metrics
    const recent = history.value[history.value.length - 1]!

    // Average packet loss and RTT over history for smoothing
    let avgPacketLoss = 0
    let avgRtt = 0
    let plCount = 0
    let rttCount = 0

    for (const h of history.value) {
      if (h.packetLoss !== undefined) {
        avgPacketLoss += h.packetLoss
        plCount++
      }
      if (h.rtt !== undefined) {
        avgRtt += h.rtt
        rttCount++
      }
    }

    return {
      ...recent,
      packetLoss: plCount > 0 ? avgPacketLoss / plCount : recent.packetLoss,
      rtt: rttCount > 0 ? avgRtt / rttCount : recent.rtt,
    }
  }

  /**
   * Update with new network statistics
   */
  function update(input: BandwidthAdaptationInput): void {
    // Check for empty input
    const hasMetrics =
      input.availableBitrate !== undefined ||
      input.currentBitrate !== undefined ||
      input.packetLoss !== undefined ||
      input.rtt !== undefined ||
      input.degradationEvents !== undefined

    if (!hasMetrics) {
      // Empty update - maintain current state
      currentRecommendation.value = {
        ...currentRecommendation.value,
        timestamp: Date.now(),
      }
      return
    }

    // Add to history
    history.value.push({ ...input })
    if (history.value.length > historySize) {
      history.value.shift()
    }

    // Get smoothed input
    const smoothedInput = getSmoothedInput()

    // Calculate severity
    const severity = calculateSeverity(smoothedInput)

    // Determine action
    const action = determineAction(smoothedInput, severity)

    // Determine priority
    const priority = determinePriority(severity, action)

    // Generate suggestions
    const suggestions = generateSuggestions(input, action)

    // Calculate estimated improvement
    const estimatedImprovement = calculateEstimatedImprovement(suggestions, action)

    // Create new recommendation
    const newRecommendation: BandwidthRecommendation = {
      action,
      suggestions,
      priority,
      estimatedImprovement,
      timestamp: Date.now(),
    }

    // Update state
    currentRecommendation.value = newRecommendation

    // Call callback if provided
    if (onRecommendation) {
      onRecommendation(newRecommendation)
    }
  }

  /**
   * Enable or disable auto-adaptation
   */
  function setAutoAdapt(enabled: boolean): void {
    isAutoAdapting.value = enabled
  }

  /**
   * Update constraints
   */
  function setConstraints(newConstraints: Partial<BandwidthConstraints>): void {
    constraints.value = {
      ...constraints.value,
      ...newConstraints,
    }
  }

  /**
   * Reset to default state
   */
  function reset(): void {
    isAutoAdapting.value = false
    constraints.value = { ...DEFAULT_BANDWIDTH_CONSTRAINTS }
    history.value = []
    currentRecommendation.value = createDefaultRecommendation()
  }

  /**
   * Apply a specific suggestion (placeholder for integration)
   */
  function applySuggestion(_suggestion: AdaptationSuggestion): void {
    // This is a placeholder for integrating with actual media controls
    // In a real implementation, this would:
    // - For video suggestions: call RTCRtpSender.setParameters() or renegotiate
    // - For audio suggestions: adjust audio encoder settings
    // - For codec suggestions: trigger codec renegotiation
  }

  return {
    recommendation,
    isAutoAdapting,
    constraints,
    update,
    setAutoAdapt,
    setConstraints,
    reset,
    applySuggestion,
  }
}
