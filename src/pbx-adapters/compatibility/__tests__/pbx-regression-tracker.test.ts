/**
 * Tests for PBX Regression Tracker
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSnapshot,
  clearHistory,
  exportHistoryJson,
  importHistoryJson,
  trackResult,
  getRegressionHistory,
  getLatestSnapshots,
} from '../pbx-regression-tracker'
import { scorePlatform } from '../pbx-compatibility-scorer'

// Clean up localStorage between tests
beforeEach(() => {
  clearHistory()
})

describe('createSnapshot', () => {
  it('creates a snapshot from a CompatibilityResult', () => {
    const result = scorePlatform('asterisk')
    const snap = createSnapshot(result, '22')

    expect(snap.platform).toBe('asterisk')
    expect(snap.version).toBe('22')
    expect(snap.overallScore).toBe(result.overallScore)
    expect(snap.compatibilityLevel).toBe(result.compatibilityLevel)
    expect(Object.keys(snap.categoryScores).length).toBeGreaterThan(0)
    expect(Object.keys(snap.featureScores).length).toBeGreaterThan(0)
    expect(snap.timestamp).toBeTruthy()
  })

  it('accepts custom timestamp', () => {
    const result = scorePlatform('freepbx')
    const snap = createSnapshot(result, '17', '2026-01-01T00:00:00Z')
    expect(snap.timestamp).toBe('2026-01-01T00:00:00Z')
  })
})

describe('trackResult', () => {
  it('returns null for the first snapshot (no baseline)', () => {
    const result = scorePlatform('asterisk')
    const report = trackResult(result, '20')
    expect(report).toBeNull()
  })

  it('stores the snapshot in history', () => {
    const result = scorePlatform('asterisk')
    trackResult(result, '20')

    const history = getRegressionHistory()
    expect(history.snapshots.length).toBe(1)
    expect(history.snapshots[0].platform).toBe('asterisk')
    expect(history.snapshots[0].version).toBe('20')
  })

  it('produces a report when version changes', () => {
    const result = scorePlatform('asterisk')
    trackResult(result, '20')
    const report = trackResult(result, '22')

    // Same scores -> no regressions, stable
    expect(report).not.toBeNull()
    if (!report) return
    expect(report.fromVersion).toBe('20')
    expect(report.toVersion).toBe('22')
    expect(report.isStable).toBe(true)
    expect(report.regressions.length).toBe(0)
    expect(report.improvements.length).toBe(0)
  })

  it('detects regressions when scores drop', () => {
    const result = scorePlatform('asterisk')
    trackResult(result, '20')

    // Simulate a worse result by modifying snapshot directly
    importHistoryJson(
      JSON.stringify({
        snapshots: [
          {
            platform: 'asterisk',
            version: '20',
            timestamp: '2026-01-01T00:00:00Z',
            overallScore: 90,
            compatibilityLevel: 'Excellent Compatibility',
            categoryScores: { sipProtocol: 100 },
            featureScores: { 'sipProtocol.rfc3261Compliance': 5 },
          },
        ],
        reports: [],
        lastUpdated: '2026-01-01T00:00:00Z',
      })
    )

    const report = trackResult(result, '22')
    // Asterisk's actual score is lower than 90, so there should be regressions
    expect(report).not.toBeNull()
    if (!report) return
    expect(report.overallDelta).toBeLessThan(0)
  })
})

describe('getLatestSnapshots', () => {
  it('returns the most recent snapshot per platform', () => {
    const result = scorePlatform('asterisk')
    trackResult(result, '20', '2026-01-01T00:00:00Z')
    trackResult(result, '21', '2026-01-02T00:00:00Z')
    trackResult(result, '22', '2026-01-03T00:00:00Z')

    const latest = getLatestSnapshots()
    expect(latest.has('asterisk')).toBe(true)
    const snap = latest.get('asterisk')
    expect(snap).toBeDefined()
    if (!snap) return
    expect(snap.version).toBe('22')
  })
})

describe('exportHistoryJson / importHistoryJson', () => {
  it('round-trips history through JSON', () => {
    const result = scorePlatform('asterisk')
    trackResult(result, '20')

    const json = exportHistoryJson()
    clearHistory()

    expect(getRegressionHistory().snapshots.length).toBe(0)

    importHistoryJson(json)
    expect(getRegressionHistory().snapshots.length).toBe(1)
  })
})

describe('getPlatformReports', () => {
  it('filters reports by platform', async () => {
    const { getPlatformReports: getReports } = await import('../pbx-regression-tracker')
    const asteriskResult = scorePlatform('asterisk')
    trackResult(asteriskResult, '20')
    trackResult(asteriskResult, '21')

    const reports = getReports('asterisk')
    expect(reports.length).toBe(1)
    expect(reports[0].platform).toBe('asterisk')
  })
})
