/**
 * Call Quality History - Persistence and analytics for call quality metrics
 *
 * Stores call quality statistics in localStorage for trend analysis
 * and troubleshooting historical call issues.
 *
 * @module utils/callQualityHistory
 */

import type { CallQualityStats, QualityLevel } from '../composables/useCallQualityStats'

/**
 * Single call quality record - snapshot of stats at a point in time
 */
export interface CallQualityRecord {
  /** Timestamp when the record was captured */
  timestamp: number
  /** RTT in milliseconds */
  rtt: number | null
  /** Jitter in milliseconds */
  jitter: number | null
  /** Packet loss percentage (0-100) */
  packetLossPercent: number | null
  /** Incoming bitrate in kbps */
  bitrateKbps: number | null
  /** Audio codec name */
  codec: string | null
  /** Computed quality level at this moment */
  qualityLevel: QualityLevel
}

/**
 * Summary of a complete call's quality metrics
 */
export interface CallQualitySummary {
  /** Unique call identifier */
  callId: string
  /** Call start timestamp */
  startTime: number
  /** Call end timestamp */
  endTime: number
  /** Call duration in seconds */
  duration: number
  /** Direction: inbound or outbound */
  direction: 'inbound' | 'outbound'
  /** Remote party URI/number */
  remoteUri: string
  /** Average RTT during the call */
  avgRtt: number | null
  /** Maximum RTT observed */
  maxRtt: number | null
  /** Average jitter */
  avgJitter: number | null
  /** Maximum jitter observed */
  maxJitter: number | null
  /** Average packet loss percentage */
  avgPacketLoss: number | null
  /** Maximum packet loss observed */
  maxPacketLoss: number | null
  /** Average bitrate in kbps */
  avgBitrate: number | null
  /** Primary codec used */
  codec: string | null
  /** Overall quality assessment */
  overallQuality: QualityLevel
  /** Number of quality samples collected */
  sampleCount: number
  /** Time spent in each quality level */
  qualityDistribution: Record<QualityLevel, number>
  /** Whether the call had any poor quality periods */
  hadQualityIssues: boolean
}

/**
 * Storage configuration
 */
const STORAGE_KEY = 'vuesip_call_quality_history'
const MAX_HISTORY_DAYS = 30
const MAX_RECORDS = 1000

/**
 * In-memory buffer for current call records
 */
let currentCallBuffer: CallQualityRecord[] = []
let currentCallId: string | null = null
let currentCallStartTime: number | null = null
let currentCallDirection: 'inbound' | 'outbound' = 'outbound'
let currentCallRemoteUri: string = ''

/**
 * Get all stored call quality summaries from localStorage
 */
export function getCallQualityHistory(): CallQualitySummary[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as CallQualitySummary[]
    // Filter out records older than MAX_HISTORY_DAYS
    const cutoff = Date.now() - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000
    return parsed.filter((record) => record.endTime > cutoff)
  } catch {
    return []
  }
}

/**
 * Save call quality summaries to localStorage
 */
function saveHistory(summaries: CallQualitySummary[]): void {
  try {
    // Keep only the most recent MAX_RECORDS
    const trimmed = summaries.slice(-MAX_RECORDS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Storage might be full - ignore
  }
}

/**
 * Start tracking quality for a new call
 */
export function startCallQualityTracking(
  callId: string,
  direction: 'inbound' | 'outbound',
  remoteUri: string
): void {
  currentCallId = callId
  currentCallStartTime = Date.now()
  currentCallDirection = direction
  currentCallRemoteUri = remoteUri
  currentCallBuffer = []
}

/**
 * Record a quality snapshot during an active call
 */
export function recordQualitySnapshot(stats: CallQualityStats, qualityLevel: QualityLevel): void {
  if (!currentCallId || !currentCallStartTime) return

  const record: CallQualityRecord = {
    timestamp: Date.now(),
    rtt: stats.rtt,
    jitter: stats.jitter,
    packetLossPercent: stats.packetLossPercent,
    bitrateKbps: stats.bitrateKbps,
    codec: stats.codec,
    qualityLevel,
  }

  currentCallBuffer.push(record)
}

/**
 * Calculate average of non-null values
 */
function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

/**
 * Calculate maximum of non-null values
 */
function max(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return Math.max(...valid)
}

/**
 * Get the most common codec from records
 */
function getPrimaryCodec(records: CallQualityRecord[]): string | null {
  const codecs = records.map((r) => r.codec).filter((c): c is string => c !== null)
  if (codecs.length === 0) return null

  const counts = new Map<string, number>()
  for (const codec of codecs) {
    counts.set(codec, (counts.get(codec) || 0) + 1)
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

/**
 * Calculate time spent in each quality level
 */
function calculateQualityDistribution(records: CallQualityRecord[]): Record<QualityLevel, number> {
  const distribution: Record<QualityLevel, number> = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    unknown: 0,
  }

  if (records.length < 2) return distribution

  // Calculate time between consecutive records
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1]
    const curr = records[i]
    if (!prev || !curr) continue
    const duration = (curr.timestamp - prev.timestamp) / 1000 // seconds
    distribution[prev.qualityLevel] += duration
  }

  return distribution
}

/**
 * Determine overall call quality based on distribution
 */
function determineOverallQuality(
  distribution: Record<QualityLevel, number>,
  hadPoorQuality: boolean
): QualityLevel {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0)
  if (total === 0) return 'unknown'

  // If more than 10% was poor, mark as poor
  if (hadPoorQuality && distribution.poor / total > 0.1) {
    return 'poor'
  }

  // If more than 20% was fair or poor, mark as fair
  if ((distribution.fair + distribution.poor) / total > 0.2) {
    return 'fair'
  }

  // If more than 50% was excellent, mark as excellent
  if (distribution.excellent / total > 0.5) {
    return 'excellent'
  }

  return 'good'
}

/**
 * Stop tracking and save the call quality summary
 */
export function stopCallQualityTracking(): CallQualitySummary | null {
  if (!currentCallId || !currentCallStartTime) return null

  const endTime = Date.now()
  const duration = Math.round((endTime - currentCallStartTime) / 1000)

  // Need at least one record to save
  if (currentCallBuffer.length === 0) {
    currentCallId = null
    currentCallStartTime = null
    return null
  }

  const rtimes = currentCallBuffer.map((r) => r.rtt)
  const jitters = currentCallBuffer.map((r) => r.jitter)
  const losses = currentCallBuffer.map((r) => r.packetLossPercent)
  const bitrates = currentCallBuffer.map((r) => r.bitrateKbps)

  const distribution = calculateQualityDistribution(currentCallBuffer)
  const hadPoorQuality = currentCallBuffer.some((r) => r.qualityLevel === 'poor')

  const summary: CallQualitySummary = {
    callId: currentCallId,
    startTime: currentCallStartTime,
    endTime,
    duration,
    direction: currentCallDirection,
    remoteUri: currentCallRemoteUri,
    avgRtt: avg(rtimes),
    maxRtt: max(rtimes),
    avgJitter: avg(jitters),
    maxJitter: max(jitters),
    avgPacketLoss: avg(losses),
    maxPacketLoss: max(losses),
    avgBitrate: avg(bitrates),
    codec: getPrimaryCodec(currentCallBuffer),
    overallQuality: determineOverallQuality(distribution, hadPoorQuality),
    sampleCount: currentCallBuffer.length,
    qualityDistribution: distribution,
    hadQualityIssues: hadPoorQuality,
  }

  // Save to localStorage
  const history = getCallQualityHistory()
  history.push(summary)
  saveHistory(history)

  // Clear buffer
  currentCallId = null
  currentCallStartTime = null
  currentCallBuffer = []

  return summary
}

/**
 * Clear all call quality history
 */
export function clearCallQualityHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Get quality trend over time (for charting)
 */
export function getQualityTrends(days = 7): Array<{
  date: string
  callCount: number
  avgQuality: number
  issuesCount: number
}> {
  const history = getCallQualityHistory()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const recent = history.filter((h) => h.endTime > cutoff)

  // Group by date
  const byDate = new Map<
    string,
    {
      calls: CallQualitySummary[]
      qualitySum: number
      issues: number
    }
  >()

  const qualityScores: Record<QualityLevel, number> = {
    excellent: 4,
    good: 3,
    fair: 2,
    poor: 1,
    unknown: 0,
  }

  for (const call of recent) {
    const datePart = new Date(call.endTime).toISOString().split('T')
    const date = datePart[0] ?? ''
    if (!date) continue
    const existing = byDate.get(date) || { calls: [], qualitySum: 0, issues: 0 }
    existing.calls.push(call)
    existing.qualitySum += qualityScores[call.overallQuality]
    if (call.hadQualityIssues) existing.issues++
    byDate.set(date, existing)
  }

  // Fill in missing dates
  const result: Array<{
    date: string
    callCount: number
    avgQuality: number
    issuesCount: number
  }> = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStrParts = d.toISOString().split('T')
    const dateStr = dateStrParts[0] ?? ''
    if (!dateStr) continue
    const data = byDate.get(dateStr)

    result.push({
      date: dateStr,
      callCount: data?.calls.length || 0,
      avgQuality: data ? data.qualitySum / data.calls.length : 0,
      issuesCount: data?.issues || 0,
    })
  }

  return result
}

/**
 * Get statistics for the last N calls
 */
export function getRecentCallQualityStats(count = 10): {
  calls: CallQualitySummary[]
  avgDuration: number
  qualityBreakdown: Record<QualityLevel, number>
  issueRate: number
} {
  const history = getCallQualityHistory()
  const recent = history.slice(-count)

  const qualityBreakdown: Record<QualityLevel, number> = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    unknown: 0,
  }

  for (const call of recent) {
    qualityBreakdown[call.overallQuality]++
  }

  const avgDuration =
    recent.length > 0 ? recent.reduce((sum, c) => sum + c.duration, 0) / recent.length : 0

  const issueRate =
    recent.length > 0 ? recent.filter((c) => c.hadQualityIssues).length / recent.length : 0

  return {
    calls: recent,
    avgDuration,
    qualityBreakdown,
    issueRate,
  }
}

/**
 * Format quality level for display
 */
export function formatQualityLevel(level: QualityLevel): string {
  const labels: Record<QualityLevel, string> = {
    excellent: 'Utmärkt',
    good: 'Bra',
    fair: 'Acceptabel',
    poor: 'Dålig',
    unknown: 'Okänd',
  }
  return labels[level] || level
}

/**
 * Get quality level color
 */
export function getQualityLevelColor(level: QualityLevel): string {
  const colors: Record<QualityLevel, string> = {
    excellent: '#22c55e',
    good: '#84cc16',
    fair: '#eab308',
    poor: '#ef4444',
    unknown: '#6b7280',
  }
  return colors[level]
}
