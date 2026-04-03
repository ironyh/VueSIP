#!/usr/bin/env node

/**
 * PBX Test Runner
 *
 * Executes PBX integration tests and generates structured reports (JSON + Markdown + JUnit).
 * Designed for CI/CD pipeline integration.
 *
 * Usage:
 *   node scripts/pbx-test-runner.mjs [--output-dir ./pbx-reports] [--junit]
 *
 * Environment variables:
 *   VUESIP_TEST_PBX_URI   - PBX WebSocket URI (default: mock)
 *   VUESIP_TEST_PBX_USER  - SIP username
 *   VUESIP_TEST_PBX_PASS  - SIP password
 *   VUESIP_TEST_PBX_TYPE  - asterisk | freepbx | all
 */

import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const outputDir = resolve(
  args[args.indexOf('--output-dir') + 1] || './pbx-reports'
)
const generateJunit = args.includes('--junit')
const jsonReportPath = join(outputDir, 'pbx-test-results.json')
const markdownReportPath = join(outputDir, 'pbx-test-report.md')
const junitReportPath = join(outputDir, 'pbx-test-results.xml')

const pbxType = process.env.VUESIP_TEST_PBX_TYPE || 'all'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function runVitest(testPattern, resultFile) {
  const cmd = [
    'npx',
    'vitest',
    'run',
    '--reporter=json',
    `--outputFile=${resultFile}`,
    testPattern,
  ].join(' ')

  try {
    execSync(cmd, {
      encoding: 'utf-8',
      env: { ...process.env, CI: 'true' },
      timeout: 300_000,
      stdio: 'pipe',
    })
    return { success: true }
  } catch (err) {
    // vitest exits non-zero on test failures; JSON file is still written
    return { success: false, exitCode: err.status }
  }
}

/**
 * Parse vitest JSON output file into a summary.
 */
function parseResults(jsonPath) {
  if (!existsSync(jsonPath)) {
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      testResults: [],
    }
  }

  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    const testResults = []
    let passed = 0
    let failed = 0
    let skipped = 0

    for (const suite of data.testResults || []) {
      const suiteName = suite.name || 'unknown'
      for (const assertion of suite.assertionResults || []) {
        const status = assertion.status === 'passed'
          ? 'passed'
          : assertion.status === 'failed'
            ? 'failed'
            : 'skipped'

        if (status === 'passed') passed++
        else if (status === 'failed') failed++
        else skipped++

        testResults.push({
          suite: suiteName,
          name: assertion.title || assertion.fullName || 'unnamed',
          status,
          duration: assertion.duration || 0,
          error: assertion.failureMessages?.join('\n') || undefined,
        })
      }
    }

    return {
      totalTests: testResults.length,
      passed,
      failed,
      skipped,
      duration: data.success ? (data.endTime || 0) - (data.startTime || 0) : 0,
      testResults,
    }
  } catch (err) {
    console.error(`  ⚠️ Failed to parse ${jsonPath}: ${err.message}`)
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      testResults: [],
    }
  }
}

/**
 * Generate a markdown report from the aggregate summary.
 */
function generateMarkdown(aggregate) {
  const lines = [
    '# PBX Integration Test Report',
    '',
    `**Timestamp:** ${aggregate.timestamp}`,
    `**Platforms:** ${aggregate.platforms.join(', ')}`,
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| ✅ Passed | ${aggregate.passed} |`,
    `| ❌ Failed | ${aggregate.failed} |`,
    `| ⏭️ Skipped | ${aggregate.skipped} |`,
    `| **Total** | **${aggregate.totalTests}** |`,
    '',
  ]

  for (const suite of aggregate.suites) {
    lines.push(`## ${suite.platform || 'Unknown'}`, '')
    if (!suite.testResults || suite.testResults.length === 0) {
      lines.push('_No test results captured._', '')
      continue
    }

    lines.push('| # | Test | Status | Duration |')
    lines.push('|---|------|--------|----------|')

    suite.testResults.forEach((r, i) => {
      const icon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⏭️'
      lines.push(
        `| ${i + 1} | ${r.name} | ${icon} | ${r.duration}ms |`
      )
    })

    const failedTests = suite.testResults.filter((r) => r.status === 'failed')
    if (failedTests.length > 0) {
      lines.push('', '### Failures', '')
      for (const t of failedTests) {
        lines.push(`- **${t.name}**: ${t.error || 'unknown error'}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate a JUnit XML report.
 */
function generateJunitXml(aggregate) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites tests="${aggregate.totalTests}" failures="${aggregate.failed}" skipped="${aggregate.skipped}" time="${(aggregate.duration / 1000).toFixed(2)}">`,
  ]

  for (const suite of aggregate.suites) {
    const name = escapeXml(suite.platform || 'unknown')
    const cases = suite.testResults || []
    const suiteFail = cases.filter((c) => c.status === 'failed').length
    lines.push(
      `  <testsuite name="${name}" tests="${cases.length}" failures="${suiteFail}" time="0">`
    )

    for (const c of cases) {
      lines.push(
        `    <testcase name="${escapeXml(c.name)}" classname="${name}" time="${(c.duration / 1000).toFixed(3)}">`
      )
      if (c.status === 'failed' && c.error) {
        lines.push(`      <failure message="${escapeXml(c.error.slice(0, 200))}"><![CDATA[${c.error}]]></failure>`)
      } else if (c.status === 'skipped') {
        lines.push('      <skipped/>')
      }
      lines.push('    </testcase>')
    }
    lines.push('  </testsuite>')
  }

  lines.push('</testsuites>')
  return lines.join('\n')
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  ensureDir(outputDir)

  console.log(`🔬 PBX Test Runner — platform: ${pbxType}`)
  console.log(`📁 Output directory: ${outputDir}`)
  console.log('')

  const testPatterns =
    pbxType === 'all'
      ? [
          { pattern: 'tests/integration/pbx-validation/asterisk-validation.test.ts', platform: 'asterisk' },
          { pattern: 'tests/integration/pbx-validation/freepbx-validation.test.ts', platform: 'freepbx' },
        ]
      : pbxType === 'asterisk'
        ? [{ pattern: 'tests/integration/pbx-validation/asterisk-validation.test.ts', platform: 'asterisk' }]
        : pbxType === 'freepbx'
          ? [{ pattern: 'tests/integration/pbx-validation/freepbx-validation.test.ts', platform: 'freepbx' }]
          : [{ pattern: 'tests/integration/pbx-validation/', platform: 'all' }]

  const allSummaries = []
  let overallSuccess = true

  for (const { pattern, platform } of testPatterns) {
    console.log(`\n▶ Running: ${pattern}`)
    const resultFile = join(outputDir, `vitest-${platform}.json`)
    const result = runVitest(pattern, resultFile)
    const summary = parseResults(resultFile)
    summary.platform = platform
    allSummaries.push(summary)

    if (!result.success) overallSuccess = false

    console.log(
      `  Results: ${summary.passed}/${summary.totalTests} passed (${summary.failed} failed)`
    )
  }

  // Aggregate
  const aggregate = {
    timestamp: new Date().toISOString(),
    platforms: allSummaries.map((r) => r.platform),
    totalTests: allSummaries.reduce((a, r) => a + r.totalTests, 0),
    passed: allSummaries.reduce((a, r) => a + r.passed, 0),
    failed: allSummaries.reduce((a, r) => a + r.failed, 0),
    skipped: allSummaries.reduce((a, r) => a + r.skipped, 0),
    duration: allSummaries.reduce((a, r) => a + r.duration, 0),
    suites: allSummaries,
  }

  // Write JSON
  writeFileSync(jsonReportPath, JSON.stringify(aggregate, null, 2))
  console.log(`\n📊 JSON report: ${jsonReportPath}`)

  // Write Markdown
  const md = generateMarkdown(aggregate)
  writeFileSync(markdownReportPath, md)
  console.log(`📝 Markdown report: ${markdownReportPath}`)

  // Write JUnit XML
  if (generateJunit) {
    const xml = generateJunitXml(aggregate)
    writeFileSync(junitReportPath, xml)
    console.log(`📋 JUnit report: ${junitReportPath}`)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(
    `PBX Test Summary: ${aggregate.passed}/${aggregate.totalTests} passed, ${aggregate.failed} failed`
  )

  if (aggregate.failed > 0) {
    console.log('\n❌ Some PBX integration tests failed.')
    process.exit(1)
  } else {
    console.log('\n✅ All PBX integration tests passed.')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(2)
})
