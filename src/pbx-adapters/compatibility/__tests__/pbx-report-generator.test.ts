/**
 * Tests for PBX Report Generator
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateFullReport,
  renderMarkdownReport,
  renderJsonReport,
  renderRegressionReport,
  exportFullArtifact,
} from '../pbx-report-generator'
import { clearHistory as clearRegression } from '../pbx-regression-tracker'

// Clean up between tests
beforeEach(() => {
  clearRegression()
})

describe('generateFullReport', () => {
  it('generates a report for all platforms', () => {
    const report = generateFullReport()
    expect(report.platforms.length).toBeGreaterThan(0)
    expect(report.summary.totalPlatforms).toBeGreaterThan(0)
    expect(report.summary.averageScore).toBeGreaterThan(0)
    expect(report.summary.topPlatform).toBeTruthy()
    expect(report.title).toContain('VueSIP')
  })

  it('filters to specific platforms', () => {
    const report = generateFullReport({ platforms: ['asterisk', 'freepbx'] })
    expect(report.platforms.length).toBe(2)
    expect(report.platforms.map((p) => p.platform)).toEqual(['asterisk', 'freepbx'])
  })

  it('computes correct summary', () => {
    const report = generateFullReport({ platforms: ['asterisk'] })
    expect(report.summary.totalPlatforms).toBe(1)
    expect(report.summary.topPlatform).toBe('asterisk')
    expect(report.summary.topScore).toBe(report.platforms[0].overallScore)
  })
})

describe('renderMarkdownReport', () => {
  it('produces valid markdown with headers', () => {
    const md = renderMarkdownReport({ platforms: ['asterisk'] })
    expect(md).toContain('# VueSIP PBX Compatibility Report')
    expect(md).toContain('## Summary')
    expect(md).toContain('## Compatibility Overview')
    expect(md).toContain('asterisk')
    expect(md).toContain('## asterisk')
  })

  it('includes feature breakdown when enabled', () => {
    const md = renderMarkdownReport({
      platforms: ['freepbx'],
      includeFeatures: true,
    })
    expect(md).toContain('Feature')
    expect(md).toContain('Score')
    expect(md).toContain('Criticality')
  })

  it('omits feature details when disabled', () => {
    const md = renderMarkdownReport({
      platforms: ['freepbx'],
      includeFeatures: false,
    })
    expect(md).toContain('Category')
    expect(md).not.toContain('RFC 3261')
  })

  it('uses custom title', () => {
    const md = renderMarkdownReport({ title: 'Custom Report' })
    expect(md).toContain('# Custom Report')
  })
})

describe('renderJsonReport', () => {
  it('produces valid JSON', () => {
    const json = renderJsonReport({ platforms: ['asterisk'] })
    const parsed = JSON.parse(json)
    expect(parsed.platforms.length).toBe(1)
    expect(parsed.summary).toBeDefined()
    expect(parsed.generatedAt).toBeTruthy()
  })
})

describe('renderRegressionReport', () => {
  it('shows empty state when no history', () => {
    const md = renderRegressionReport()
    expect(md).toContain('No regression data available')
  })
})

describe('exportFullArtifact', () => {
  it('includes regression history when requested', () => {
    const json = exportFullArtifact({ platforms: ['asterisk'] })
    const parsed = JSON.parse(json)
    // regressionHistory may be empty but should be present
    expect(parsed.regressionHistory).toBeDefined()
  })
})
