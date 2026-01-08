# Lint Cleanup & Documentation Enhancement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all 295 ESLint warnings and enhance the VitePress documentation site with comprehensive API documentation and interactive examples.

**Architecture:** Two-phase approach: Phase A addresses lint warnings systematically by file groupings (highest count first); Phase B enhances documentation with missing guide pages, API documentation completeness, and examples integration.

**Tech Stack:** TypeScript, ESLint, VitePress, Vue 3 Composition API

---

## Phase A: Lint Warnings Cleanup (295 warnings → 0)

### Warning Distribution Analysis

| Rule                                       | Count | Strategy                               |
| ------------------------------------------ | ----- | -------------------------------------- |
| `@typescript-eslint/no-explicit-any`       | 209   | Replace with proper types or `unknown` |
| `@typescript-eslint/no-non-null-assertion` | 86    | Use optional chaining or type guards   |

### Files by Warning Count (Top 15)

| File                                         | Warnings | Priority |
| -------------------------------------------- | -------- | -------- |
| `src/core/SipClient.ts`                      | 70       | High     |
| `src/types/jssip.d.ts`                       | 30       | High     |
| `src/composables/__tests__/useTheme.test.ts` | 22       | Medium   |
| `src/types/plugin.types.ts`                  | 15       | High     |
| `src/plugins/PluginManager.ts`               | 14       | High     |
| `src/plugins/AnalyticsPlugin.ts`             | 13       | Medium   |
| `src/types/events.types.ts`                  | 12       | High     |
| `src/composables/useAmiBase.ts`              | 8        | Medium   |
| `src/adapters/jssip/JsSipAdapter.ts`         | 7        | Medium   |
| `src/types/config.types.ts`                  | 6        | High     |
| `src/stores/deviceStore.ts`                  | 6        | Medium   |
| `src/stores/persistence.ts`                  | 5        | Medium   |
| `src/stores/callStore.ts`                    | 5        | Medium   |
| `src/plugins/RecordingPlugin.ts`             | 5        | Medium   |
| `src/composables/useSettings.ts`             | 5        | Medium   |

---

### Task 1: Fix SipClient.ts (70 warnings - highest priority)

**Files:**

- Modify: `src/core/SipClient.ts`

**Step 1: Read the file to understand warning locations**

Run: `pnpm run lint 2>&1 | grep "SipClient.ts" | head -80`

Understand the specific line numbers and warning types.

**Step 2: Fix non-null assertions**

Replace patterns like:

```typescript
// Before
this.session!.terminate()

// After
this.session?.terminate()
// OR with type guard
if (this.session) {
  this.session.terminate()
}
```

**Step 3: Fix explicit any types**

Replace patterns like:

```typescript
// Before
const data: any = response

// After
const data: unknown = response
// OR with specific type
const data: SipResponseData = response
```

**Step 4: Run lint to verify fixes**

Run: `pnpm run lint 2>&1 | grep -c "SipClient.ts"`
Expected: 0 warnings for this file

**Step 5: Run tests to ensure no regressions**

Run: `pnpm test -- --grep "SipClient" --reporter=dot`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/core/SipClient.ts
git commit -m "fix(core): resolve 70 lint warnings in SipClient.ts

- Replace non-null assertions with optional chaining
- Replace explicit any with proper types

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Fix Type Definition Files (63 warnings total)

**Files:**

- Modify: `src/types/jssip.d.ts` (30 warnings)
- Modify: `src/types/plugin.types.ts` (15 warnings)
- Modify: `src/types/events.types.ts` (12 warnings)
- Modify: `src/types/config.types.ts` (6 warnings)

**Step 1: Read jssip.d.ts and identify any types**

Run: `pnpm run lint 2>&1 | grep "jssip.d.ts"`

**Step 2: Fix jssip.d.ts - replace any with proper JsSIP types**

For JsSIP declaration files, use proper library types or `unknown`:

```typescript
// Before
on(event: string, handler: (data: any) => void): void

// After
on(event: string, handler: (data: unknown) => void): void
// OR with specific callback types
on(event: 'connected', handler: (data: ConnectionData) => void): void
```

**Step 3: Fix plugin.types.ts**

Run: `pnpm run lint 2>&1 | grep "plugin.types.ts"`

Replace generic `any` with proper plugin interfaces.

**Step 4: Fix events.types.ts**

Run: `pnpm run lint 2>&1 | grep "events.types.ts"`

Define specific event payload types.

**Step 5: Fix config.types.ts**

Run: `pnpm run lint 2>&1 | grep "config.types.ts"`

**Step 6: Run lint verification**

Run: `pnpm run lint 2>&1 | grep -E "(jssip.d.ts|plugin.types|events.types|config.types)" | wc -l`
Expected: 0

**Step 7: Run typecheck**

Run: `pnpm run typecheck`
Expected: No type errors

**Step 8: Commit**

```bash
git add src/types/
git commit -m "fix(types): resolve 63 lint warnings in type definitions

- jssip.d.ts: Replace any with unknown/specific types
- plugin.types.ts: Add proper plugin interfaces
- events.types.ts: Define event payload types
- config.types.ts: Type configuration options

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Fix Plugin Files (36 warnings total)

**Files:**

- Modify: `src/plugins/PluginManager.ts` (14 warnings)
- Modify: `src/plugins/AnalyticsPlugin.ts` (13 warnings)
- Modify: `src/plugins/RecordingPlugin.ts` (5 warnings)
- Modify: `src/plugins/HookManager.ts` (4 warnings)

**Step 1: Analyze warnings in each plugin file**

Run: `pnpm run lint 2>&1 | grep "plugins/"`

**Step 2: Fix PluginManager.ts**

Focus on plugin registration and lifecycle methods.

**Step 3: Fix AnalyticsPlugin.ts**

Replace event payload `any` types with specific analytics types.

**Step 4: Fix RecordingPlugin.ts**

Type the recording configuration and state.

**Step 5: Fix HookManager.ts**

Type hook callbacks properly.

**Step 6: Run lint verification**

Run: `pnpm run lint 2>&1 | grep "plugins/" | wc -l`
Expected: 0

**Step 7: Run tests**

Run: `pnpm test -- --grep "Plugin" --reporter=dot`
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/plugins/
git commit -m "fix(plugins): resolve 36 lint warnings in plugin system

- PluginManager: Type plugin lifecycle and registration
- AnalyticsPlugin: Define analytics event types
- RecordingPlugin: Type recording state and config
- HookManager: Type hook callbacks

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Fix Composables (47 warnings total)

**Files:**

- Modify: `src/composables/__tests__/useTheme.test.ts` (22 warnings)
- Modify: `src/composables/useAmiBase.ts` (8 warnings)
- Modify: `src/composables/useSettings.ts` (5 warnings)
- Modify: `src/composables/useCallQualityScore.ts` (4 warnings)
- Modify: `src/composables/useCallHistory.ts` (4 warnings)
- Modify: `src/composables/useConnectionRecovery.ts` (4 warnings)

**Step 1: Fix useTheme.test.ts non-null assertions**

In test files, use proper test assertions:

```typescript
// Before
const element = document.querySelector('.theme')!

// After
const element = document.querySelector('.theme')
expect(element).toBeTruthy()
if (!element) throw new Error('Element not found')
```

**Step 2: Fix useAmiBase.ts**

Type AMI response data properly.

**Step 3: Fix useSettings.ts**

Type settings object structure.

**Step 4: Fix useCallQualityScore.ts**

Type quality metrics.

**Step 5: Fix useCallHistory.ts**

Type history entries.

**Step 6: Fix useConnectionRecovery.ts**

Type recovery state and events.

**Step 7: Run lint verification**

Run: `pnpm run lint 2>&1 | grep "composables/" | wc -l`
Expected: 0

**Step 8: Run composable tests**

Run: `pnpm test -- --grep "composables" --reporter=dot`
Expected: All tests pass

**Step 9: Commit**

```bash
git add src/composables/
git commit -m "fix(composables): resolve 47 lint warnings

- useTheme.test.ts: Replace non-null assertions with guards
- useAmiBase: Type AMI responses
- useSettings: Type settings structure
- useCallQualityScore: Type quality metrics
- useCallHistory: Type history entries
- useConnectionRecovery: Type recovery state

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Fix Remaining Files (79 warnings)

**Files:**

- Modify: `src/adapters/jssip/JsSipAdapter.ts` (7 warnings)
- Modify: `src/stores/deviceStore.ts` (6 warnings)
- Modify: `src/stores/persistence.ts` (5 warnings)
- Modify: `src/stores/callStore.ts` (5 warnings)
- Modify: `src/core/TransportManager.ts` (3 warnings)
- Modify: `src/core/MediaManager.ts` (3 warnings)
- Modify: `src/core/AmiClient.ts` (3 warnings)
- And remaining files with 1-4 warnings each

**Step 1: Fix adapter files**

Run: `pnpm run lint 2>&1 | grep "adapters/"`

**Step 2: Fix store files**

Run: `pnpm run lint 2>&1 | grep "stores/"`

**Step 3: Fix remaining core files**

Run: `pnpm run lint 2>&1 | grep "core/"`

**Step 4: Fix utility files**

Run: `pnpm run lint 2>&1 | grep "utils/"`

**Step 5: Run full lint check**

Run: `pnpm run lint`
Expected: `✖ 0 problems (0 errors, 0 warnings)`

**Step 6: Run full test suite**

Run: `pnpm test`
Expected: All 5002+ tests pass

**Step 7: Commit**

```bash
git add src/
git commit -m "fix(lint): resolve remaining 79 lint warnings

- adapters: Type JsSIP adapter methods
- stores: Type store state and actions
- core: Type transport and media managers
- utils: Type utility functions

Achieves 0 lint warnings across entire codebase.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase B: Documentation Enhancement

### Task 6: Update VitePress Sidebar Configuration

**Files:**

- Modify: `docs/.vitepress/config.ts`

**Step 1: Read current config**

Already analyzed - config at `docs/.vitepress/config.ts`

**Step 2: Add missing guide pages to sidebar**

Add these pages under appropriate sections:

- AMI CDR Guide
- Call Parking Guide
- Call Quality Guide
- Multi-Line Guide
- Migration Guide
- Voicemail Guide

**Step 3: Add Call Quality section to sidebar**

```typescript
{
  text: 'Call Quality',
  collapsed: false,
  items: [
    { text: 'Call Quality Monitoring', link: '/guide/call-quality' },
    { text: 'Quality Dashboard', link: '/guide/call-quality-dashboard' },
  ],
},
```

**Step 4: Verify build**

Run: `pnpm run docs:build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add docs/.vitepress/config.ts
git commit -m "docs(config): add missing guide pages to VitePress sidebar

- Add Call Quality section with monitoring and dashboard guides
- Add AMI/CDR, Call Parking, Multi-Line guides
- Add Migration and Voicemail guides

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Create Call Quality Dashboard Guide

**Files:**

- Create: `docs/guide/call-quality-dashboard.md`

**Step 1: Create comprehensive dashboard guide**

Include:

- Overview of Call Quality Dashboard composables
- useCallQualityDashboard usage
- useQualityTrends for historical analysis
- useQualityRecommendations for optimization suggestions
- useQualityAlerts for threshold monitoring
- Code examples for each composable
- Integration with playground examples

**Step 2: Add code snippets from playground**

Reference the call-quality-dashboard example:

```typescript
import { useCallQualityDashboard } from 'vuesip'

const { overallScore, networkMetrics, audioMetrics, alerts, trends } = useCallQualityDashboard()
```

**Step 3: Verify links work**

Run: `pnpm run docs:build`
Expected: No broken links

**Step 4: Commit**

```bash
git add docs/guide/call-quality-dashboard.md
git commit -m "docs(guide): add Call Quality Dashboard guide

- Document useCallQualityDashboard composable
- Add useQualityTrends usage examples
- Include useQualityRecommendations patterns
- Add useQualityAlerts configuration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Enhance API Composables Documentation

**Files:**

- Modify: `docs/api/composables.md`

**Step 1: Read current composables doc**

Review existing structure at `docs/api/composables.md`

**Step 2: Add Call Quality composables section**

Add documentation for:

- `useCallQualityDashboard`
- `useQualityTrends`
- `useQualityRecommendations`
- `useQualityAlerts`
- `useCallQualityScore`

Include:

- Function signatures
- Return types
- Parameters
- Usage examples
- Cross-references to guide

**Step 3: Add Connection Recovery section**

Document `useConnectionRecovery` with:

- Configuration options
- Recovery strategies
- Event handling
- State management

**Step 4: Verify documentation build**

Run: `pnpm run docs:build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add docs/api/composables.md
git commit -m "docs(api): enhance composables documentation

- Add Call Quality composables (Dashboard, Trends, Recommendations, Alerts)
- Add Connection Recovery composable documentation
- Include comprehensive usage examples
- Add type signatures and return values

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Add Interactive Playground Examples to Docs

**Files:**

- Modify: `docs/examples/index.md`

**Step 1: Read current examples page**

Already analyzed - comprehensive examples exist.

**Step 2: Add Call Quality Dashboard example section**

```markdown
### 📊 Call Quality Dashboard

Real-time call quality monitoring with metrics visualization, trend analysis, and quality alerts.

**Perfect for:**

- Call centers requiring quality monitoring
- VoIP service providers
- Enterprise communication systems
- Quality assurance teams

**Features:**

- Real-time MOS score tracking
- Network metrics visualization (jitter, packet loss, RTT)
- Audio quality indicators
- Trend analysis over time
- Quality threshold alerts
- Optimization recommendations

[View Call Quality Dashboard Example →](https://github.com/ironyh/VueSip/tree/main/examples/call-quality-dashboard)
```

**Step 3: Update comparison table**

Add Call Quality Dashboard to the comparison table.

**Step 4: Verify build**

Run: `pnpm run docs:build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add docs/examples/index.md
git commit -m "docs(examples): add Call Quality Dashboard example

- Add dashboard example section with features
- Update comparison table
- Add learning path reference

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Final Verification and Cleanup

**Step 1: Run full lint check**

Run: `pnpm run lint`
Expected: 0 warnings

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Run typecheck**

Run: `pnpm run typecheck`
Expected: No type errors

**Step 4: Build documentation**

Run: `pnpm run docs:build`
Expected: Build succeeds without warnings

**Step 5: Build library**

Run: `pnpm run build`
Expected: Build succeeds

**Step 6: Remove TODO from VitePress config**

Edit `docs/.vitepress/config.ts`:

```typescript
// Remove this line:
ignoreDeadLinks: true, // TODO: Remove after creating missing guide pages
```

**Step 7: Commit final cleanup**

```bash
git add .
git commit -m "chore: final lint cleanup and docs verification

- Remove ignoreDeadLinks from VitePress config
- All lint warnings resolved (295 → 0)
- All tests passing (5002+)
- Documentation build verified

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `pnpm run lint` returns 0 warnings
- [ ] `pnpm test` passes all 5002+ tests
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run docs:build` succeeds
- [ ] All new documentation pages render correctly
- [ ] VitePress sidebar shows all guide pages
- [ ] No `ignoreDeadLinks` needed in config

---

## Summary

| Phase     | Tasks  | Warnings Fixed | Docs Enhanced |
| --------- | ------ | -------------- | ------------- |
| A         | 1-5    | 295            | -             |
| B         | 6-10   | -              | 5 pages       |
| **Total** | **10** | **295**        | **5 pages**   |

**Estimated completion:** 10 tasks with TDD approach, frequent commits
