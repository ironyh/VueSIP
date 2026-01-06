/**
 * useCallQualityScore Composable
 *
 * Provides comprehensive call quality scoring by combining multiple WebRTC metrics
 * into a single quality score with trend analysis and history tracking.
 *
 * @packageDocumentation
 */

import { ref, type Ref } from 'vue'
import type {
  CallQualityScore,
  QualityGrade,
  QualityScoreWeights,
  QualityTrend,
  QualityTrendDirection,
  CallQualityScoreOptions,
  QualityScoreInput,
  UseCallQualityScoreReturn,
} from '@/types/call-quality.types'
import { DEFAULT_QUALITY_WEIGHTS } from '@/types/call-quality.types'

// =============================================================================
// Constants
// =============================================================================

/** Thresholds for each metric (values above these are considered bad) */
const METRIC_THRESHOLDS = {
  packetLoss: { excellent: 0.5, good: 1, fair: 2, poor: 5 },
  jitter: { excellent: 10, good: 20, fair: 40, poor: 80 },
  rtt: { excellent: 50, good: 100, fair: 200, poor: 400 },
  audioJitterBufferDelay: { excellent: 20, good: 40, fair: 80, poor: 150 },
}

/** Grade thresholds */
const GRADE_THRESHOLDS = {
  A: 90,
  B: 75,
  C: 60,
  D: 40,
}

/** Minimum history entries needed for confident trend analysis */
const MIN_TREND_ENTRIES = 3

/** Threshold for considering a trend stable vs changing */
const TREND_STABILITY_THRESHOLD = 0.5 // Score points per interval (lower threshold for sensitivity)

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Calculate a metric score (0-100) based on value and thresholds
 * Lower values are better for most metrics
 */
function calculateMetricScore(
  value: number | undefined,
  thresholds: { excellent: number; good: number; fair: number; poor: number },
  defaultScore: number = 100 // Default to perfect when unavailable (doesn't penalize)
): number {
  if (value === undefined || value === null) {
    return defaultScore
  }

  // Clamp negative values to 0
  const clampedValue = Math.max(0, value)

  if (clampedValue <= thresholds.excellent) {
    return 100
  } else if (clampedValue <= thresholds.good) {
    // Linear interpolation between 100 and 85
    const ratio = (clampedValue - thresholds.excellent) / (thresholds.good - thresholds.excellent)
    return 100 - ratio * 15
  } else if (clampedValue <= thresholds.fair) {
    // Linear interpolation between 85 and 65
    const ratio = (clampedValue - thresholds.good) / (thresholds.fair - thresholds.good)
    return 85 - ratio * 20
  } else if (clampedValue <= thresholds.poor) {
    // Linear interpolation between 65 and 40
    const ratio = (clampedValue - thresholds.fair) / (thresholds.poor - thresholds.fair)
    return 65 - ratio * 25
  } else {
    // Below poor threshold, scale down to minimum
    const ratio = Math.min(1, (clampedValue - thresholds.poor) / thresholds.poor)
    return Math.max(0, 40 - ratio * 40)
  }
}

/**
 * Calculate MOS-based score (MOS is 1-5, higher is better)
 */
function calculateMosScore(mos: number | undefined): number {
  if (mos === undefined || mos === null) {
    return 100 // Default to perfect when unavailable (doesn't penalize)
  }

  // Clamp MOS to valid range
  const clampedMos = clamp(mos, 1, 5)

  // Convert MOS (1-5) to score (0-100)
  // MOS 5 = 100, MOS 4 = 80, MOS 3 = 60, MOS 2 = 40, MOS 1 = 0
  return ((clampedMos - 1) / 4) * 100
}

/**
 * Calculate bitrate stability score (0-100)
 */
function calculateBitrateStabilityScore(
  bitrate: number | undefined,
  previousBitrate: number | undefined
): number {
  if (bitrate === undefined || previousBitrate === undefined) {
    return 100 // Default to perfect when unavailable (doesn't penalize)
  }

  if (previousBitrate === 0) {
    return bitrate > 0 ? 100 : 50
  }

  // Calculate percentage change
  const change = Math.abs(bitrate - previousBitrate) / previousBitrate

  // No change = 100, 10% change = 90, 50% change = 50, 100%+ change = 0
  if (change <= 0.05) {
    return 100
  } else if (change <= 0.1) {
    return 90 + (0.1 - change) * 200
  } else if (change <= 0.5) {
    return 90 - (change - 0.1) * 100
  } else {
    return Math.max(0, 50 - (change - 0.5) * 100)
  }
}

/**
 * Calculate framerate score
 */
function calculateFramerateScore(
  framerate: number | undefined,
  targetFramerate: number | undefined
): number {
  if (framerate === undefined) {
    return 50
  }

  const target = targetFramerate ?? 30
  const ratio = framerate / target

  if (ratio >= 1) {
    return 100
  } else if (ratio >= 0.9) {
    return 95
  } else if (ratio >= 0.75) {
    return 85
  } else if (ratio >= 0.5) {
    return 65
  } else {
    return Math.max(0, ratio * 100)
  }
}

/**
 * Calculate resolution score based on standard resolutions
 */
function calculateResolutionScore(width: number | undefined, height: number | undefined): number {
  if (width === undefined || height === undefined) {
    return 50
  }

  const pixels = width * height

  // Reference: 1080p = 2,073,600, 720p = 921,600, 480p = 409,920, 360p = 230,400
  if (pixels >= 2000000) return 100 // 1080p+
  if (pixels >= 900000) return 90 // 720p
  if (pixels >= 400000) return 75 // 480p
  if (pixels >= 200000) return 60 // 360p
  if (pixels >= 100000) return 45 // 240p
  return Math.max(20, (pixels / 100000) * 45)
}

/**
 * Calculate freeze penalty score
 */
function calculateFreezeScore(freezeCount: number | undefined): number {
  if (freezeCount === undefined || freezeCount === 0) {
    return 100
  }

  // Each freeze reduces score by 15 points
  return Math.max(0, 100 - freezeCount * 15)
}

/**
 * Determine quality grade from overall score
 */
function getGrade(score: number): QualityGrade {
  if (score >= GRADE_THRESHOLDS.A) return 'A'
  if (score >= GRADE_THRESHOLDS.B) return 'B'
  if (score >= GRADE_THRESHOLDS.C) return 'C'
  if (score >= GRADE_THRESHOLDS.D) return 'D'
  return 'F'
}

/**
 * Generate human-readable description based on score and metrics
 */
function generateDescription(
  grade: QualityGrade,
  _overallScore: number,
  _audioScore: number,
  _videoScore: number | null,
  networkScore: number,
  input: QualityScoreInput
): string {
  switch (grade) {
    case 'A':
      return 'Excellent call quality'
    case 'B':
      return 'Good call quality'
    case 'C': {
      const issues: string[] = []
      if (networkScore < 65) issues.push('network latency')
      if (input.packetLoss && input.packetLoss > 2) issues.push('packet loss')
      if (input.jitter && input.jitter > 40) issues.push('jitter')
      if (issues.length > 0) {
        return `Fair call quality - ${issues.join(', ')} detected`
      }
      return 'Fair call quality'
    }
    case 'D': {
      const issues: string[] = []
      if (networkScore < 50) issues.push('high network delay')
      if (input.packetLoss && input.packetLoss > 5) issues.push('significant packet loss')
      if (input.jitter && input.jitter > 80) issues.push('high jitter')
      if (issues.length > 0) {
        return `Poor call quality - ${issues.join(', ')}`
      }
      return 'Poor call quality'
    }
    case 'F': {
      const issues: string[] = []
      if (networkScore < 40) issues.push('severe network issues')
      if (input.packetLoss && input.packetLoss > 10) issues.push('critical packet loss')
      if (issues.length > 0) {
        return `Very poor call quality - ${issues.join(', ')}`
      }
      return 'Very poor call quality - consider reconnecting'
    }
  }
}

/**
 * Calculate trend direction and rate from history
 */
function calculateTrend(history: CallQualityScore[]): QualityTrend | null {
  if (history.length < MIN_TREND_ENTRIES) {
    // Not enough data, return low confidence trend if we have at least 2 entries
    if (history.length >= 2) {
      const first = history[0]!.overall
      const last = history[history.length - 1]!.overall
      const rate = (last - first) / (history.length - 1)

      let direction: QualityTrendDirection
      if (rate > TREND_STABILITY_THRESHOLD) {
        direction = 'improving'
      } else if (rate < -TREND_STABILITY_THRESHOLD) {
        direction = 'degrading'
      } else {
        direction = 'stable'
      }

      return {
        direction,
        rate,
        confidence: 0.3, // Low confidence with insufficient data
      }
    }
    return null
  }

  // Calculate linear regression for trend
  const n = history.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    const entry = history[i]!
    sumX += i
    sumY += entry.overall
    sumXY += i * entry.overall
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const meanY = sumY / n

  // Calculate R-squared for confidence
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const entry = history[i]!
    const predicted = sumY / n + slope * (i - (n - 1) / 2)
    ssRes += Math.pow(entry.overall - predicted, 2)
    ssTot += Math.pow(entry.overall - meanY, 2)
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0
  const confidence = clamp(rSquared * (n / 10), 0, 1) // Scale confidence by sample size

  let direction: QualityTrendDirection
  if (slope > TREND_STABILITY_THRESHOLD) {
    direction = 'improving'
  } else if (slope < -TREND_STABILITY_THRESHOLD) {
    direction = 'degrading'
  } else {
    direction = 'stable'
  }

  return {
    direction,
    rate: slope,
    confidence,
  }
}

// =============================================================================
// Main Composable
// =============================================================================

/**
 * Composable for calculating comprehensive call quality scores
 *
 * @param options - Configuration options
 * @returns Quality scoring interface
 *
 * @example
 * ```ts
 * const { score, trend, updateScore, reset } = useCallQualityScore({
 *   weights: { packetLoss: 0.3 },
 *   historySize: 20,
 * })
 *
 * // Update with new stats
 * updateScore({
 *   packetLoss: 0.5,
 *   jitter: 15,
 *   rtt: 50,
 *   mos: 4.2,
 * })
 *
 * // Check current score
 * console.log(score.value?.overall) // e.g., 85
 * console.log(score.value?.grade) // e.g., 'B'
 * ```
 */
export function useCallQualityScore(
  options: CallQualityScoreOptions = {}
): UseCallQualityScoreReturn {
  const { weights: customWeights, historySize = 10, enableTrendAnalysis = true } = options

  // Merge custom weights with defaults
  const weights: Ref<QualityScoreWeights> = ref({
    ...DEFAULT_QUALITY_WEIGHTS,
    ...customWeights,
  })

  // State
  const score: Ref<CallQualityScore | null> = ref(null)
  const trend: Ref<QualityTrend | null> = ref(null)
  const history: Ref<CallQualityScore[]> = ref([])
  const lastInput: Ref<QualityScoreInput | null> = ref(null)

  /**
   * Calculate audio quality score
   */
  function calculateAudioScore(input: QualityScoreInput): number {
    const mosScore = calculateMosScore(input.mos)
    const packetLossScore = calculateMetricScore(
      input.audioPacketLoss ?? input.packetLoss,
      METRIC_THRESHOLDS.packetLoss
    )
    const jitterScore = calculateMetricScore(
      input.audioJitterBufferDelay ?? input.jitter,
      METRIC_THRESHOLDS.audioJitterBufferDelay
    )

    // Weighted combination for audio
    return mosScore * 0.5 + packetLossScore * 0.3 + jitterScore * 0.2
  }

  /**
   * Calculate video quality score
   */
  function calculateVideoScore(input: QualityScoreInput): number | null {
    if (input.audioOnly) {
      return null
    }

    // Check if we have any video metrics
    const hasVideoMetrics =
      input.videoPacketLoss !== undefined ||
      input.framerate !== undefined ||
      input.resolutionWidth !== undefined ||
      input.freezeCount !== undefined

    if (!hasVideoMetrics) {
      return null
    }

    const packetLossScore = calculateMetricScore(
      input.videoPacketLoss,
      METRIC_THRESHOLDS.packetLoss,
      80
    )
    const framerateScore = calculateFramerateScore(input.framerate, input.targetFramerate)
    const resolutionScore = calculateResolutionScore(input.resolutionWidth, input.resolutionHeight)
    const freezeScore = calculateFreezeScore(input.freezeCount)

    // Weighted combination for video
    return (
      packetLossScore * 0.25 + framerateScore * 0.35 + resolutionScore * 0.25 + freezeScore * 0.15
    )
  }

  /**
   * Calculate network quality score
   */
  function calculateNetworkScore(input: QualityScoreInput): number {
    const rttScore = calculateMetricScore(input.rtt, METRIC_THRESHOLDS.rtt)
    const jitterScore = calculateMetricScore(input.jitter, METRIC_THRESHOLDS.jitter)
    const packetLossScore = calculateMetricScore(input.packetLoss, METRIC_THRESHOLDS.packetLoss)

    // RTT has highest impact on network score
    return rttScore * 0.45 + jitterScore * 0.3 + packetLossScore * 0.25
  }

  /**
   * Calculate overall quality score
   */
  function calculateOverallScore(input: QualityScoreInput): number {
    const w = weights.value

    const packetLossScore = calculateMetricScore(input.packetLoss, METRIC_THRESHOLDS.packetLoss)
    const jitterScore = calculateMetricScore(input.jitter, METRIC_THRESHOLDS.jitter)
    const rttScore = calculateMetricScore(input.rtt, METRIC_THRESHOLDS.rtt)
    const mosScore = calculateMosScore(input.mos)
    const bitrateScore = calculateBitrateStabilityScore(input.bitrate, input.previousBitrate)

    return (
      packetLossScore * w.packetLoss +
      jitterScore * w.jitter +
      rttScore * w.rtt +
      mosScore * w.mos +
      bitrateScore * w.bitrateStability
    )
  }

  /**
   * Update score with new stats
   */
  function updateScore(input: QualityScoreInput): void {
    lastInput.value = input

    const overallScore = calculateOverallScore(input)
    const audioScore = calculateAudioScore(input)
    const videoScore = calculateVideoScore(input)
    const networkScore = calculateNetworkScore(input)
    const grade = getGrade(overallScore)

    const newScore: CallQualityScore = {
      overall: Math.round(overallScore * 100) / 100,
      audio: Math.round(audioScore * 100) / 100,
      video: videoScore !== null ? Math.round(videoScore * 100) / 100 : null,
      network: Math.round(networkScore * 100) / 100,
      grade,
      description: generateDescription(
        grade,
        overallScore,
        audioScore,
        videoScore,
        networkScore,
        input
      ),
      timestamp: Date.now(),
    }

    score.value = newScore

    // Add to history
    history.value = [...history.value, newScore].slice(-historySize)

    // Update trend if enabled
    if (enableTrendAnalysis) {
      trend.value = calculateTrend(history.value)
    }
  }

  /**
   * Reset state
   */
  function reset(): void {
    score.value = null
    trend.value = null
    history.value = []
    lastInput.value = null
  }

  return {
    score,
    trend,
    history,
    updateScore,
    reset,
    weights,
  }
}
