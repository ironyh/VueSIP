/**
 * PBX Compatibility Regression Tracker
 *
 * Tracks compatibility score changes across PBX versions and test runs.
 * Detects regressions (score drops) and improvements (score gains) by
 * comparing current results against a stored baseline.
 *
 * @module pbx-adapters/compatibility
 */

import { type CompatibilityResult } from './pbx-compatibility-scorer'

// ── Types ──────────────────────────────────────────────────────────────────

export type RegressionSeverity = 'critical' | 'major' | 'minor'

export interface ScoreSnapshot {
  platform: string
  version: string
  timestamp: string
  overallScore: number
  compatibilityLevel: string
  categoryScores: Record<string, number>
  featureScores: Record<string, number>
}

export interface RegressionEntry {
  type: 'regression' | 'improvement'
  severity: RegressionSeverity
  platform: string
  previousVersion: string
  currentVersion: string
  feature?: string
  category?: string
  previousScore: number
  currentScore: number
  delta: number
}

export interface RegressionReport {
  platform: string
  fromVersion: string
  toVersion: string
  fromTimestamp: string
  toTimestamp: string
  overallDelta: number
  regressions: RegressionEntry[]
  improvements: RegressionEntry[]
  isStable: boolean
}

export interface RegressionHistory {
  snapshots: ScoreSnapshot[]
  reports: RegressionReport[]
  lastUpdated: string
}

// ── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vuesip-pbx-regression-history'

function loadHistory(): RegressionHistory {
  if (typeof localStorage === 'undefined') {
    return { snapshots: [], reports: [], lastUpdated: new Date().toISOString() }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { snapshots: [], reports: [], lastUpdated: new Date().toISOString() }
    return JSON.parse(raw) as RegressionHistory
  } catch {
    return { snapshots: [], reports: [], lastUpdated: new Date().toISOString() }
  }
}

function saveHistory(history: RegressionHistory): void {
  if (typeof localStorage === 'undefined') return
  history.lastUpdated = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

// ── Snapshot Helpers ───────────────────────────────────────────────────────

/**
 * Create a snapshot from a CompatibilityResult for storage.
 */
export function createSnapshot(
  result: CompatibilityResult,
  version: string,
  timestamp?: string
): ScoreSnapshot {
  const categoryScores: Record<string, number> = {}
  const featureScores: Record<string, number> = {}

  for (const cat of result.categories) {
    categoryScores[cat.key] = cat.rawScore
    for (const feat of cat.features) {
      featureScores[`${cat.key}.${feat.key}`] = feat.score
    }
  }

  return {
    platform: result.platform,
    version,
    timestamp: timestamp ?? new Date().toISOString(),
    overallScore: result.overallScore,
    compatibilityLevel: result.compatibilityLevel,
    categoryScores,
    featureScores,
  }
}

// ── Comparison Engine ──────────────────────────────────────────────────────

function classifySeverity(delta: number): RegressionSeverity {
  const abs = Math.abs(delta)
  if (abs >= 3) return 'critical'
  if (abs >= 2) return 'major'
  return 'minor'
}

function compareSnapshots(previous: ScoreSnapshot, current: ScoreSnapshot): RegressionReport {
  const regressions: RegressionEntry[] = []
  const improvements: RegressionEntry[] = []

  // Compare overall
  const overallDelta = current.overallScore - previous.overallScore

  // Compare feature-level scores
  for (const [featKey, currentVal] of Object.entries(current.featureScores)) {
    const prevVal = previous.featureScores[featKey]
    if (prevVal === undefined) continue

    const delta = currentVal - prevVal
    if (delta === 0) continue

    const [catKey, ...rest] = featKey.split('.')
    const featureName = rest.join('.')
    const entry: RegressionEntry = {
      type: delta < 0 ? 'regression' : 'improvement',
      severity: classifySeverity(delta),
      platform: current.platform,
      previousVersion: previous.version,
      currentVersion: current.version,
      feature: featureName,
      category: catKey,
      previousScore: prevVal,
      currentScore: currentVal,
      delta,
    }

    if (delta < 0) regressions.push(entry)
    else improvements.push(entry)
  }

  // Compare category-level scores
  for (const [catKey, currentVal] of Object.entries(current.categoryScores)) {
    const prevVal = previous.categoryScores[catKey]
    if (prevVal === undefined) continue

    const delta = currentVal - prevVal
    if (delta === 0) continue

    const entry: RegressionEntry = {
      type: delta < 0 ? 'regression' : 'improvement',
      severity: classifySeverity(delta),
      platform: current.platform,
      previousVersion: previous.version,
      currentVersion: current.version,
      category: catKey,
      previousScore: Math.round(prevVal),
      currentScore: Math.round(currentVal),
      delta: Math.round(delta),
    }

    if (delta < 0) regressions.push(entry)
    else improvements.push(entry)
  }

  // Sort by severity (critical first)
  const severityOrder: Record<RegressionSeverity, number> = { critical: 0, major: 1, minor: 2 }
  regressions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  improvements.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    platform: current.platform,
    fromVersion: previous.version,
    toVersion: current.version,
    fromTimestamp: previous.timestamp,
    toTimestamp: current.timestamp,
    overallDelta: Math.round(overallDelta * 10) / 10,
    regressions,
    improvements,
    isStable: regressions.length === 0,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a compatibility result as a snapshot and compare against baseline.
 * Returns a regression report if a previous snapshot exists for the platform.
 */
export function trackResult(
  result: CompatibilityResult,
  version: string,
  timestamp?: string
): RegressionReport | null {
  const history = loadHistory()
  const snapshot = createSnapshot(result, version, timestamp)

  // Find the most recent snapshot for this platform
  const previous =
    history.snapshots
      .filter((s) => s.platform === result.platform)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? null

  let report: RegressionReport | null = null

  if (previous && previous.version !== version) {
    report = compareSnapshots(previous, snapshot)
    history.reports.push(report)
  }

  history.snapshots.push(snapshot)
  saveHistory(history)

  return report
}

/**
 * Get the full regression history (all snapshots and reports).
 */
export function getRegressionHistory(): RegressionHistory {
  return loadHistory()
}

/**
 * Get the latest snapshot for each platform.
 */
export function getLatestSnapshots(): Map<string, ScoreSnapshot> {
  const history = loadHistory()
  const map = new Map<string, ScoreSnapshot>()

  for (const snap of history.snapshots) {
    const existing = map.get(snap.platform)
    if (!existing || snap.timestamp > existing.timestamp) {
      map.set(snap.platform, snap)
    }
  }

  return map
}

/**
 * Get all regression reports for a specific platform.
 */
export function getPlatformReports(platform: string): RegressionReport[] {
  const history = loadHistory()
  return history.reports.filter((r) => r.platform === platform)
}

/**
 * Compare two specific snapshots by index.
 */
export function compareVersions(
  platform: string,
  versionA: string,
  versionB: string
): RegressionReport | null {
  const history = loadHistory()
  const snapA = history.snapshots.find((s) => s.platform === platform && s.version === versionA)
  const snapB = history.snapshots.find((s) => s.platform === platform && s.version === versionB)

  if (!snapA || !snapB) return null
  return compareSnapshots(snapA, snapB)
}

/**
 * Export history as JSON string (for CI artifacts or external storage).
 */
export function exportHistoryJson(): string {
  return JSON.stringify(loadHistory(), null, 2)
}

/**
 * Import history from JSON string (for CI artifact loading).
 */
export function importHistoryJson(json: string): void {
  const parsed = JSON.parse(json) as RegressionHistory
  saveHistory(parsed)
}

/**
 * Clear all stored regression history.
 */
export function clearHistory(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}
