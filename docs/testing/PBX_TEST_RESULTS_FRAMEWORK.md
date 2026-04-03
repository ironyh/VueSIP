# PBX Test Results Documentation Framework

## Overview

This framework provides comprehensive PBX compatibility documentation with three core capabilities:

1. **Compatibility Scoring** — Weighted scoring engine for PBX platform compatibility
2. **Regression Tracking** — Version-over-version score comparison and regression detection
3. **Automated Report Generation** — Markdown and JSON report output for CI and documentation

## Architecture

```
src/pbx-adapters/compatibility/
├── pbx-compatibility-scoring.json   # Scoring schema (weights, thresholds, platform data)
├── pbx-compatibility-scorer.ts      # Scoring engine
├── pbx-regression-tracker.ts        # Regression detection and history tracking
├── pbx-report-generator.ts          # Markdown/JSON report generation
└── index.ts                         # Barrel exports

tools/pbx-dashboard/
└── index.html                       # Interactive browser dashboard

tests/unit/pbx-adapters/             # Unit tests
tests/pbx-framework/                 # Integration test framework
```

## Quick Start

### Score a Platform

```ts
import { scorePlatform } from '@/pbx-adapters/compatibility'

const result = scorePlatform('asterisk')
console.log(`${result.platform}: ${result.overallScore}% (${result.compatibilityLevel})`)
```

### Track Results Over Time

```ts
import { scorePlatform, trackResult } from '@/pbx-adapters/compatibility'

// Score and track in one call
const result = scorePlatform('asterisk')
const regressionReport = trackResult(result, '22.8')

if (regressionReport) {
  console.log(`Regressions: ${regressionReport.regressions.length}`)
  console.log(`Improvements: ${regressionReport.improvements.length}`)
}
```

### Generate Reports

```ts
import { renderMarkdownReport, renderJsonReport } from '@/pbx-adapters/compatibility'

// Full Markdown report
const md = renderMarkdownReport({ includeFeatures: true, includeRegression: true })

// JSON for CI artifacts
const json = renderJsonReport({ platforms: ['asterisk', 'freepbx'] })

// Regression-only report
import { renderRegressionReport } from '@/pbx-adapters/compatibility'
const regressionMd = renderRegressionReport()
```

## Scoring Methodology

### Feature Categories & Weights

| Category                 | Weight | Criticality |
| ------------------------ | ------ | ----------- |
| SIP Protocol Compliance  | 25%    | Critical    |
| WebSocket Support        | 20%    | Critical    |
| WebRTC Integration       | 20%    | Critical    |
| Authentication Methods   | 15%    | High        |
| Codec Support            | 10%    | High        |
| Management & Control API | 10%    | High        |

### Scoring Scale

Each feature is scored 0–5:

| Score | Label     | Meaning                        |
| ----- | --------- | ------------------------------ |
| 5     | Excellent | Full support, production-ready |
| 4     | Good      | Solid with minor limitations   |
| 3     | Partial   | Basic, may need workarounds    |
| 2     | Limited   | Significant limitations        |
| 1     | Minimal   | Barely functional              |
| 0     | None      | Not supported                  |

### Compatibility Thresholds

| Level     | Score Range | Color           |
| --------- | ----------- | --------------- |
| Excellent | 85–100%     | 🟢 Green        |
| Good      | 70–84%      | 🟡 Yellow-Green |
| Moderate  | 55–69%      | 🟡 Yellow       |
| Limited   | 40–54%      | 🟠 Orange       |
| Poor      | 0–39%       | 🔴 Red          |

## Regression Tracking

### How It Works

1. Each time a compatibility result is tracked, a **snapshot** is stored (localStorage in browser, or exported as JSON for CI)
2. When a new version is tracked, it's compared against the previous snapshot
3. Feature-level and category-level deltas are computed
4. Regressions are classified by severity:
   - **Critical**: Score drop ≥ 3 points
   - **Major**: Score drop of 2 points
   - **Minor**: Score drop of 1 point

### CI Integration

```ts
import {
  scorePlatform,
  trackResult,
  exportHistoryJson,
  importHistoryJson,
  renderMarkdownReport,
} from '@/pbx-adapters/compatibility'

// In CI: load previous history from artifact
importHistoryJson(fs.readFileSync('pbx-history.json', 'utf-8'))

// Score current version
const result = scorePlatform('asterisk')
const report = trackResult(result, process.env.PBX_VERSION ?? 'unknown')

// Save updated history as artifact
fs.writeFileSync('pbx-history.json', exportHistoryJson())

// Generate report
fs.writeFileSync('pbx-report.md', renderMarkdownReport())
```

## Report Formats

### Markdown Report

The `renderMarkdownReport()` function generates:

- **Summary table** — overall stats across all platforms
- **Compatibility overview** — score/level/gap count per platform
- **Per-platform detail** — feature breakdown with score bars and gap indicators
- **Regression history** — version comparison with severity classification

### JSON Report

The `renderJsonReport()` / `exportFullArtifact()` functions produce structured JSON with:

- Full `CompatibilityResult` for each platform
- `ReportSummary` with aggregated statistics
- Optional `RegressionHistory` with all snapshots and reports

## Interactive Dashboard

Open `tools/pbx-dashboard/index.html` in a browser for:

- Overview metrics and platform score cards
- Feature compatibility matrix per PBX
- Failure pattern analysis
- Raw result viewer (load JSON files)

## Current Platform Scores

| Platform    | Score | Level    |
| ----------- | ----- | -------- |
| Kamailio    | ~80%  | Good     |
| Asterisk    | ~75%  | Good     |
| FreePBX     | ~70%  | Good     |
| Yeastar     | ~65%  | Moderate |
| Grandstream | ~60%  | Moderate |
| FusionPBX   | ~55%  | Moderate |
| 3CX         | ~40%  | Limited  |

_Scores are computed dynamically from the scoring schema. Run `renderMarkdownReport()` for current values._

## Adding New Platforms

1. Add platform data to `pbx-compatibility-scoring.json` under `platforms`
2. Score each feature 0–5 based on testing/research
3. Document known limitations
4. Run `scorePlatform('newplatform')` to verify

## Testing

```bash
# Unit tests for scoring engine
pnpm test src/pbx-adapters/compatibility/

# Integration tests
pnpm test tests/pbx-framework/
```
