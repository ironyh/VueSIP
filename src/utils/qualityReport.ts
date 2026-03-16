/**
 * Quality Report Utilities
 *
 * Provides quality metric calculations, history tracking, and report generation
 * for WebRTC call quality analytics.
 *
 * @module utils/qualityReport
 */

// =============================================================================
// Types - defined locally since not exported from @/types/call.types
// =============================================================================

/** Quality level based on score */
export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

/** Quality trend direction */
export type QualityTrend = 'improving' | 'stable' | 'degrading'

/** Quality metrics snapshot */
export interface QualityMetrics {
  timestamp: Date
  rtt: number | null
  jitter: number | null
  packetLossPercent: number | null
  bitrateKbps: number | null
  mosScore: number | null
  qualityScore: number | null
  qualityLevel: QualityLevel
}

/** Quality alert record */
export interface QualityAlertRecord {
  id: string
  timestamp: Date
  type: 'degradation' | 'recovery' | 'threshold'
  metric: string
  value: number
  threshold: number
  message: string
}

/** Complete call quality report */
export interface CallQualityReport {
  id: string
  callId: string
  duration: number
  averageMos: number | null
  minMos: number | null
  maxMos: number | null
  averagePacketLoss: number | null
  maxPacketLoss: number | null
  averageJitter: number | null
  maxJitter: number | null
  averageRtt: number | null
  maxRtt: number | null
  overallQuality: QualityLevel
  trend: QualityTrend
  alertCount: number
  alerts: QualityAlertRecord[]
  generatedAt: Date
}

/** Maximum history buffer size (60 seconds at 1 sample/second) */
export const MAX_HISTORY_SIZE = 60

/** Quality score thresholds */
export const QUALITY_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
  poor: 20,
} as const

/** MOS calculation constants (based on E-model) */
const MOS_R0 = 93.2 // Base signal-to-noise ratio
const MOS_IS = 1.5 // Impairment factor for simultaneous transmission
const MOS_ID = 0 // Equipment impairment factor (G.711 = 0)

/**
 * Calculate Mean Opinion Score (MOS) from network metrics
 * Uses simplified E-model algorithm adapted for WebRTC
 *
 * @param packetLossPercent - Packet loss percentage (0-100)
 * @param jitterMs - Jitter in milliseconds
 * @param rttMs - Round-trip time in milliseconds
 * @returns MOS score (1.0-5.0) or null if insufficient data
 */
export function calculateMOS(
  packetLossPercent: number | null,
  jitterMs: number | null,
  rttMs: number | null
): number | null {
  // Need at least one metric to calculate
  if (packetLossPercent === null && jitterMs === null && rttMs === null) {
    return null
  }

  // Use safe defaults for missing metrics
  const effectivePacketLoss = packetLossPercent ?? 0
  const effectiveJitter = jitterMs ?? 0
  const effectiveRtt = rttMs ?? 0

  // Calculate impairment factors
  // Packet loss impairment (exponential impact, standard E-model formula)
  // Using log10(1 + pl*10) but scaled more reasonably for WebRTC
  const Ipl = effectivePacketLoss > 0 ? 25 * Math.log10(1 + effectivePacketLoss) : 0

  // Delay impairment (RTT + jitter buffer)
  const totalDelay = effectiveRtt + effectiveJitter * 2 // Jitter buffer estimate
  const Id = totalDelay > 150 ? 0.024 * totalDelay + 0.11 * (totalDelay - 177.3) : 0

  // Calculate R factor (0-100)
  const R = Math.max(0, Math.min(100, MOS_R0 - MOS_IS - MOS_ID - Ipl - Id))

  // Convert R factor to MOS (1.0-4.5 scale, capped at 4.5)
  // Using standard ITU-T G.107 formula coefficient 7e-6 (not 7e-5)
  // The formula produces negative values with 7e-5 for R < ~30, causing MOS to floor at 1.0 prematurely
  if (R < 0) return 1.0
  if (R > 100) return 4.5

  const mos = 1 + 0.035 * R + R * (R - 60) * (100 - R) * 7e-6
  return Math.max(1.0, Math.min(4.5, mos))
}

/**
 * Calculate overall quality score (0-100) from metrics
 *
 * @param mos - Mean Opinion Score (1.0-5.0)
 * @param packetLossPercent - Packet loss percentage (0-100)
 * @param jitterMs - Jitter in milliseconds
 * @param rttMs - Round-trip time in milliseconds
 * @returns Quality score (0-100) or null if insufficient data
 */
export function calculateQualityScore(
  mos: number | null,
  packetLossPercent: number | null,
  jitterMs: number | null,
  rttMs: number | null
): number | null {
  if (mos === null) {
    // Calculate MOS if we have raw metrics
    mos = calculateMOS(packetLossPercent, jitterMs, rttMs)
  }

  if (mos === null) return null

  // Convert MOS (1.0-4.5) to score (0-100)
  // 4.5 MOS = 100 score, 1.0 MOS = 0 score
  const baseScore = ((mos - 1.0) / 3.5) * 100

  // Apply penalties for extreme values
  let penalty = 0
  if (packetLossPercent !== null && packetLossPercent > 5) {
    penalty += (packetLossPercent - 5) * 2
  }
  if (jitterMs !== null && jitterMs > 50) {
    penalty += (jitterMs - 50) * 0.5
  }
  if (rttMs !== null && rttMs > 500) {
    penalty += (rttMs - 500) * 0.1
  }

  return Math.max(0, Math.min(100, baseScore - penalty))
}

/**
 * Determine quality level from score
 *
 * @param score - Quality score (0-100) or null
 * @returns Quality level
 */
export function determineQualityLevel(score: number | null): QualityLevel {
  if (score === null) return 'poor'
  if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent'
  if (score >= QUALITY_THRESHOLDS.good) return 'good'
  if (score >= QUALITY_THRESHOLDS.fair) return 'fair'
  if (score >= QUALITY_THRESHOLDS.poor) return 'poor'
  return 'critical'
}

/**
 * Determine quality trend from recent history
 *
 * @param history - Recent quality metrics (at least 2 samples)
 * @returns Trend direction
 */
export function determineQualityTrend(history: QualityMetrics[]): QualityTrend {
  if (history.length < 2) return 'stable'

  // Use last 10 seconds or all available
  const samples = history.slice(-10)
  const firstHalf = samples.slice(0, Math.floor(samples.length / 2))
  const secondHalf = samples.slice(Math.floor(samples.length / 2))

  const avgFirst = average(firstHalf.map((m) => m.qualityScore ?? 50))
  const avgSecond = average(secondHalf.map((m) => m.qualityScore ?? 50))

  const change = avgSecond - avgFirst
  const threshold = 10 // Minimum change to count as trend

  if (change > threshold) return 'improving'
  if (change < -threshold) return 'degrading'
  return 'stable'
}

/**
 * Create a quality metrics snapshot from raw stats
 *
 * @param rtt - Round-trip time in ms
 * @param jitter - Jitter in ms
 * @param packetLossPercent - Packet loss percentage
 * @param bitrateKbps - Bitrate in kbps
 * @returns Quality metrics snapshot
 */
export function createQualityMetrics(
  rtt: number | null,
  jitter: number | null,
  packetLossPercent: number | null,
  bitrateKbps: number | null
): QualityMetrics {
  const mosScore = calculateMOS(packetLossPercent, jitter, rtt)
  const qualityScore = calculateQualityScore(mosScore, packetLossPercent, jitter, rtt)
  const qualityLevel = determineQualityLevel(qualityScore)

  return {
    timestamp: new Date(),
    rtt,
    jitter,
    packetLossPercent,
    bitrateKbps,
    mosScore,
    qualityScore,
    qualityLevel,
  }
}

/**
 * Quality history buffer for tracking metrics over time
 */
export class QualityHistoryBuffer {
  private buffer: QualityMetrics[] = []
  private maxSize: number

  constructor(maxSize: number = MAX_HISTORY_SIZE) {
    this.maxSize = maxSize
  }

  /**
   * Add a metrics snapshot to the buffer
   */
  add(metrics: QualityMetrics): void {
    this.buffer.push(metrics)
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }
  }

  /**
   * Get all metrics in the buffer
   */
  getAll(): QualityMetrics[] {
    return [...this.buffer]
  }

  /**
   * Get recent metrics (last N samples)
   */
  getRecent(count: number): QualityMetrics[] {
    return this.buffer.slice(-count)
  }

  /**
   * Get metrics from the last N seconds
   */
  getLastSeconds(seconds: number): QualityMetrics[] {
    const cutoff = new Date(Date.now() - seconds * 1000)
    return this.buffer.filter((m) => m.timestamp >= cutoff)
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = []
  }

  /**
   * Get buffer size
   */
  get size(): number {
    return this.buffer.length
  }

  /**
   * Get average MOS from buffer
   */
  getAverageMOS(): number | null {
    const valid = this.buffer.map((m) => m.mosScore).filter((m): m is number => m !== null)
    return valid.length > 0 ? average(valid) : null
  }

  /**
   * Get min/max MOS from buffer
   */
  getMOSRange(): { min: number | null; max: number | null } {
    const valid = this.buffer.map((m) => m.mosScore).filter((m): m is number => m !== null)
    if (valid.length === 0) return { min: null, max: null }
    return { min: Math.min(...valid), max: Math.max(...valid) }
  }

  /**
   * Get average packet loss from buffer
   */
  getAveragePacketLoss(): number | null {
    const valid = this.buffer.map((m) => m.packetLossPercent).filter((p): p is number => p !== null)
    return valid.length > 0 ? average(valid) : null
  }

  /**
   * Get max packet loss from buffer
   */
  getMaxPacketLoss(): number | null {
    const valid = this.buffer.map((m) => m.packetLossPercent).filter((p): p is number => p !== null)
    return valid.length > 0 ? Math.max(...valid) : null
  }

  /**
   * Get average jitter from buffer
   */
  getAverageJitter(): number | null {
    const valid = this.buffer.map((m) => m.jitter).filter((j): j is number => j !== null)
    return valid.length > 0 ? average(valid) : null
  }

  /**
   * Get max jitter from buffer
   */
  getMaxJitter(): number | null {
    const valid = this.buffer.map((m) => m.jitter).filter((j): j is number => j !== null)
    return valid.length > 0 ? Math.max(...valid) : null
  }

  /**
   * Get average RTT from buffer
   */
  getAverageRtt(): number | null {
    const valid = this.buffer.map((m) => m.rtt).filter((r): r is number => r !== null)
    return valid.length > 0 ? average(valid) : null
  }

  /**
   * Get max RTT from buffer
   */
  getMaxRtt(): number | null {
    const valid = this.buffer.map((m) => m.rtt).filter((r): r is number => r !== null)
    return valid.length > 0 ? Math.max(...valid) : null
  }
}

/**
 * Generate a call quality report from history and alerts
 *
 * @param callId - Unique call identifier
 * @param duration - Call duration in seconds
 * @param history - Quality history buffer
 * @param alerts - Quality alerts during call
 * @returns Complete quality report
 */
export function generateCallQualityReport(
  callId: string,
  duration: number,
  history: QualityHistoryBuffer,
  alerts: QualityAlertRecord[]
): CallQualityReport {
  const mosRange = history.getMOSRange()
  const trend = determineQualityTrend(history.getAll())
  const allMetrics = history.getAll()
  const lastMetrics = allMetrics[allMetrics.length - 1]

  return {
    id: generateReportId(),
    callId,
    duration,
    averageMos: history.getAverageMOS(),
    minMos: mosRange.min,
    maxMos: mosRange.max,
    averagePacketLoss: history.getAveragePacketLoss(),
    maxPacketLoss: history.getMaxPacketLoss(),
    averageJitter: history.getAverageJitter(),
    maxJitter: history.getMaxJitter(),
    averageRtt: history.getAverageRtt(),
    maxRtt: history.getMaxRtt(),
    overallQuality: lastMetrics?.qualityLevel ?? 'poor',
    trend,
    alertCount: alerts.length,
    alerts: [...alerts],
    generatedAt: new Date(),
  }
}

/**
 * Helper: Calculate average of numeric values
 */
function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Helper: Generate unique report ID
 */
function generateReportId(): string {
  return `qr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export default {
  calculateMOS,
  calculateQualityScore,
  determineQualityLevel,
  determineQualityTrend,
  createQualityMetrics,
  QualityHistoryBuffer,
  generateCallQualityReport,
  MAX_HISTORY_SIZE,
  QUALITY_THRESHOLDS,
}
