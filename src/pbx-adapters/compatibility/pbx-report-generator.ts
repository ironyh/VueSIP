/**
 * PBX Compatibility Report Generator
 *
 * Generates structured Markdown and JSON reports from compatibility scores
 * and regression data. Designed for CI artifact output and documentation.
 *
 * @module pbx-adapters/compatibility
 */

import {
  type CompatibilityResult,
  type CategoryResult,
  listPlatforms,
  scorePlatform,
} from './pbx-compatibility-scorer'

import {
  type RegressionReport,
  type RegressionHistory,
  getRegressionHistory,
  getLatestSnapshots,
} from './pbx-regression-tracker'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportOptions {
  /** Include per-feature breakdown (default: true) */
  includeFeatures?: boolean
  /** Include gap analysis (default: true) */
  includeGaps?: boolean
  /** Include regression history (default: false) */
  includeRegression?: boolean
  /** Specific platforms to include (default: all) */
  platforms?: string[]
  /** Report title */
  title?: string
}

export interface FullReport {
  title: string
  generatedAt: string
  platforms: CompatibilityResult[]
  summary: ReportSummary
  regressionHistory?: RegressionHistory
}

export interface ReportSummary {
  totalPlatforms: number
  excellent: number
  good: number
  moderate: number
  limited: number
  poor: number
  averageScore: number
  topPlatform: string
  topScore: number
  criticalGapsCount: number
}

// ── Summary Builder ────────────────────────────────────────────────────────

function buildSummary(results: CompatibilityResult[]): ReportSummary {
  const levels = { excellent: 0, good: 0, moderate: 0, limited: 0, poor: 0 }
  let totalScore = 0
  let topPlatform = ''
  let topScore = 0
  let criticalGaps = 0

  for (const r of results) {
    totalScore += r.overallScore
    if (r.overallScore > topScore) {
      topScore = r.overallScore
      topPlatform = r.platform
    }
    // Map compatibilityLevel to summary bucket
    const level = r.compatibilityLevel.toLowerCase()
    if (level.includes('excellent')) levels.excellent++
    else if (level.includes('good')) levels.good++
    else if (level.includes('moderate')) levels.moderate++
    else if (level.includes('limited')) levels.limited++
    else levels.poor++

    criticalGaps += r.criticalGaps.length
  }

  return {
    totalPlatforms: results.length,
    ...levels,
    averageScore: results.length > 0 ? Math.round((totalScore / results.length) * 10) / 10 : 0,
    topPlatform,
    topScore,
    criticalGapsCount: criticalGaps,
  }
}

// ── Markdown Generation ────────────────────────────────────────────────────

function scoreBar(score: number): string {
  const filled = Math.round(score / 5)
  return '█'.repeat(filled) + '░'.repeat(5 - filled)
}

function categoryToMd(cat: CategoryResult, _includeFeatures: boolean): string {
  const lines: string[] = []
  lines.push(`#### ${cat.label} — ${cat.rawScore}%`)
  lines.push('')
  lines.push(`| Feature | Score | Criticality | Status |`)
  lines.push(`|---------|-------|-------------|--------|`)
  for (const feat of cat.features) {
    const bar = scoreBar(feat.score)
    const status = feat.gap ? '⚠️ Gap' : '✅ OK'
    lines.push(`| ${feat.label} | ${bar} ${feat.score}/5 | ${feat.criticality} | ${status} |`)
  }
  lines.push('')
  if (cat.gaps.length > 0) {
    lines.push(`**Gaps (${cat.gaps.length}):** ${cat.gaps.map((g) => g.label).join(', ')}`)
    lines.push('')
  }
  return lines.join('\n')
}

function regressionToMd(report: RegressionReport): string {
  const lines: string[] = []
  lines.push(`#### ${report.platform}: ${report.fromVersion} → ${report.toVersion}`)
  lines.push(`- **Overall delta:** ${report.overallDelta > 0 ? '+' : ''}${report.overallDelta}%`)
  lines.push(`- **Regressions:** ${report.regressions.length}`)
  lines.push(`- **Improvements:** ${report.improvements.length}`)
  lines.push(`- **Status:** ${report.isStable ? '✅ Stable' : '⚠️ Regressions detected'}`)
  lines.push('')

  if (report.regressions.length > 0) {
    lines.push('| Severity | Scope | Feature | Previous | Current | Delta |')
    lines.push('|----------|-------|---------|----------|---------|-------|')
    for (const r of report.regressions) {
      const scope = r.feature ? `${r.category}/${r.feature}` : (r.category ?? 'overall')
      lines.push(
        `| ${r.severity} | ${scope} | ${r.feature ?? '-'} | ${r.previousScore} | ${r.currentScore} | ${r.delta} |`
      )
    }
    lines.push('')
  }

  if (report.improvements.length > 0) {
    lines.push('**Improvements:**')
    for (const imp of report.improvements.slice(0, 10)) {
      const scope = imp.feature ? `${imp.category}/${imp.feature}` : (imp.category ?? 'overall')
      lines.push(`- ${scope}: ${imp.previousScore} → ${imp.currentScore} (+${imp.delta})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a full compatibility report for all (or selected) platforms.
 */
export function generateFullReport(options?: ReportOptions): FullReport {
  const platforms = options?.platforms ?? listPlatforms()
  const results = platforms.map((p) => scorePlatform(p))

  const report: FullReport = {
    title: options?.title ?? 'VueSIP PBX Compatibility Report',
    generatedAt: new Date().toISOString(),
    platforms: results,
    summary: buildSummary(results),
  }

  if (options?.includeRegression) {
    report.regressionHistory = getRegressionHistory()
  }

  return report
}

/**
 * Render the full report as Markdown.
 */
export function renderMarkdownReport(options?: ReportOptions): string {
  const report = generateFullReport(options)
  const includeFeatures = options?.includeFeatures !== false
  const lines: string[] = []

  // Header
  lines.push(`# ${report.title}`)
  lines.push('')
  lines.push(`_Generated: ${report.generatedAt}_`)
  lines.push('')

  // Summary
  lines.push('## Summary')
  lines.push('')
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| **Total Platforms** | ${report.summary.totalPlatforms} |`)
  lines.push(`| **Average Score** | ${report.summary.averageScore}% |`)
  lines.push(`| **Top Platform** | ${report.summary.topPlatform} (${report.summary.topScore}%) |`)
  lines.push(`| **Critical Gaps** | ${report.summary.criticalGapsCount} |`)
  lines.push(`| Excellent | ${report.summary.excellent} |`)
  lines.push(`| Good | ${report.summary.good} |`)
  lines.push(`| Moderate | ${report.summary.moderate} |`)
  lines.push(`| Limited | ${report.summary.limited} |`)
  lines.push(`| Poor | ${report.summary.poor} |`)
  lines.push('')

  // Overview table
  lines.push('## Compatibility Overview')
  lines.push('')
  lines.push('| Platform | Score | Level | Critical Gaps |')
  lines.push('|----------|-------|-------|---------------|')
  for (const p of report.platforms) {
    const gapCount = p.criticalGaps.length
    lines.push(
      `| **${p.platform}** | ${p.overallScore}% | ${p.compatibilityLevel} | ${gapCount > 0 ? '⚠️ ' + gapCount : '✅ 0'} |`
    )
  }
  lines.push('')

  // Per-platform details
  for (const p of report.platforms) {
    lines.push(`## ${p.platform} — ${p.overallScore}% (${p.compatibilityLevel})`)
    lines.push('')

    if (p.versions.length > 0) {
      lines.push(`**Versions tested:** ${p.versions.join(', ')}`)
      lines.push('')
    }

    if (p.knownLimitations.length > 0) {
      lines.push('**Known Limitations:**')
      for (const lim of p.knownLimitations) {
        lines.push(`- ${lim}`)
      }
      lines.push('')
    }

    if (includeFeatures) {
      for (const cat of p.categories) {
        lines.push(categoryToMd(cat, includeFeatures))
      }
    } else {
      // Category summary only
      lines.push('| Category | Score | Weight |')
      lines.push('|----------|-------|--------|')
      for (const cat of p.categories) {
        lines.push(`| ${cat.label} | ${cat.rawScore}% | ${cat.weight} |`)
      }
      lines.push('')
    }
  }

  // Regression history
  if (report.regressionHistory && report.regressionHistory.reports.length > 0) {
    lines.push('## Regression History')
    lines.push('')
    for (const reg of report.regressionHistory.reports) {
      lines.push(regressionToMd(reg))
    }
  }

  return lines.join('\n')
}

/**
 * Render the report as a compact JSON string.
 */
export function renderJsonReport(options?: ReportOptions): string {
  const report = generateFullReport(options)
  return JSON.stringify(report, null, 2)
}

/**
 * Generate a regression-only Markdown report from stored history.
 */
export function renderRegressionReport(): string {
  const history = getRegressionHistory()
  const lines: string[] = []

  lines.push('# VueSIP PBX Regression Report')
  lines.push('')
  lines.push(`_Last updated: ${history.lastUpdated}_`)
  lines.push(`_Snapshots: ${history.snapshots.length} | Reports: ${history.reports.length}_`)
  lines.push('')

  if (history.reports.length === 0) {
    lines.push(
      '_No regression data available yet. Run compatibility scoring with tracking enabled to build history._'
    )
    return lines.join('\n')
  }

  for (const report of history.reports) {
    lines.push(regressionToMd(report))
  }

  // Latest snapshot summary
  lines.push('## Latest Snapshots')
  lines.push('')
  const latest = getLatestSnapshots()
  lines.push('| Platform | Version | Score | Level | Recorded |')
  lines.push('|----------|---------|-------|-------|----------|')
  const entries = Array.from(latest.entries())
  for (const [platform, snap] of entries) {
    lines.push(
      `| ${platform} | ${snap.version} | ${snap.overallScore}% | ${snap.compatibilityLevel} | ${snap.timestamp.split('T')[0]} |`
    )
  }
  lines.push('')

  return lines.join('\n')
}

/**
 * Export all data (report + regression history) as a single JSON artifact.
 */
export function exportFullArtifact(options?: ReportOptions): string {
  const report = generateFullReport({ ...options, includeRegression: true })
  return JSON.stringify(report, null, 2)
}
