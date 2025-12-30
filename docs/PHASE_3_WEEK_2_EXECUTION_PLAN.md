# Phase 3 Week 2 Execution Plan

**Target**: Migrate 15 additional playground demos to PrimeVue 3.53.1
**Timeline**: Week 2 (2025-12-23 onwards)
**Goal**: Maintain 0 ESLint errors, 100% PrimeVue adoption, 100% CSS custom properties

---

## Executive Summary

Based on systematic pre-scan analysis, 22 demos remain for migration. Week 2 will target 15 demos strategically selected across 4 complexity tiers for balanced velocity and quality.

**Week 2 Selection Strategy**:

- **3 Tier 1** (Very Easy): 5-10 min each = ~30 min total
- **4 Tier 2** (Low Complexity): 15-30 min each = ~90 min total
- **5 Tier 3** (Medium Complexity): 30-45 min each = ~3 hours total
- **3 Tier 4** (High Complexity): 45-90 min each = ~3.5 hours total

**Total Estimated Time**: ~7-8 hours

---

## Week 2 Demo Selection (15 demos)

### ✅ Tier 1: Very Easy (3 demos, ~30 minutes total)

**1. BasicCallDemo.vue** ⚡ PRIORITY 1

- **Type**: Import Consolidation
- **Complexity**: Very Low
- **Time Estimate**: 5-10 minutes
- **Details**: 6 existing PrimeVue imports, 0 custom elements, 0 hex colors
- **Actions**: Consolidate imports to shared-components.ts
- **Risk**: None

**2. CallQualityDemo.vue** ⚡ PRIORITY 2

- **Type**: Minimal Changes (Already Clean)
- **Complexity**: Very Low
- **Time Estimate**: 5-10 minutes
- **Details**: 0 PrimeVue imports, 0 custom elements, 0 hex colors
- **Actions**: Verify no migration needed or add minimal PrimeVue if required
- **Risk**: None

**3. CallTimerDemo.vue** ⚡ PRIORITY 3

- **Type**: Minimal Changes (Already Clean)
- **Complexity**: Very Low
- **Time Estimate**: 5-10 minutes
- **Details**: 0 custom elements, 0 hex colors
- **Actions**: Verify clean state, potentially add shared-components if needed
- **Risk**: None

---

### ✅ Tier 2: Low Complexity (4 demos, ~90 minutes total)

**4. AgentLoginDemo.vue** 📋 PRIORITY 4

- **Type**: Full Migration (Minimal)
- **Complexity**: Low
- **Time Estimate**: 15-20 minutes
- **Details**: 2 custom buttons, 0 hex colors, 0 CSS typos
- **Actions**: Convert 2 buttons to PrimeVue Button, add shared-components import
- **Risk**: Low

**5. CallRecordingDemo.vue** 📋 PRIORITY 5

- **Type**: Full Migration (Inputs Only)
- **Complexity**: Low
- **Time Estimate**: 15-20 minutes
- **Details**: 2 custom inputs, 0 hex colors
- **Actions**: Convert 2 inputs to InputText/Password, CSS cleanup
- **Risk**: Low

**6. IVRMonitorDemo.vue** 📋 PRIORITY 6

- **Type**: Full Migration (Buttons + CSS Fix)
- **Complexity**: Low
- **Time Estimate**: 20-25 minutes
- **Details**: 2 custom buttons, 1 CSS typo
- **Actions**: Convert buttons, fix CSS typo `var(--surface-0)-space`
- **Risk**: Low

**7. CallMutePatternsDemo.vue** 📋 PRIORITY 7

- **Type**: CSS Cleanup Only
- **Complexity**: Very Low
- **Time Estimate**: 10-15 minutes
- **Details**: 1 CSS typo, 0 custom elements
- **Actions**: Fix CSS typo, verify no other migration needed
- **Risk**: None

---

### ⚠️ Tier 3: Medium Complexity (5 demos, ~3 hours total)

**8. AgentStatsDemo.vue** 🔧 PRIORITY 8

- **Type**: Full Migration (Buttons + CSS Fixes)
- **Complexity**: Medium
- **Time Estimate**: 30-35 minutes
- **Details**: 3 custom buttons, 2 CSS typos
- **Actions**: Convert buttons, fix 2 CSS typos
- **Risk**: Low-Medium

**9. BLFDemo.vue** 🔧 PRIORITY 9

- **Type**: Full Migration (Multiple Buttons)
- **Complexity**: Medium
- **Time Estimate**: 35-40 minutes
- **Details**: 4 custom buttons, 1 CSS typo
- **Actions**: Convert 4 buttons, fix CSS typo, CSS cleanup
- **Risk**: Medium

**10. QueueMonitorDemo.vue** 🔧 PRIORITY 10

- **Type**: Full Migration (Buttons + Colors)
- **Complexity**: Medium
- **Time Estimate**: 35-40 minutes
- **Details**: 3 custom buttons, 2 hex colors
- **Actions**: Convert buttons, replace hex colors with CSS variables
- **Risk**: Medium

**11. AutoAnswerDemo.vue** 🔧 PRIORITY 11

- **Type**: Full Migration (Mixed Elements + Colors)
- **Complexity**: Medium
- **Time Estimate**: 35-40 minutes
- **Details**: 1 button, 1 input, 2 hex colors
- **Actions**: Convert button/input, replace colors, CSS cleanup
- **Risk**: Medium

**12. SipMessagingDemo.vue** 🔧 PRIORITY 12

- **Type**: Full Migration (Inputs + Colors + CSS Fix)
- **Complexity**: Medium
- **Time Estimate**: 40-45 minutes
- **Details**: 4 custom inputs, 2 hex colors, 1 CSS typo
- **Actions**: Convert 4 inputs, replace colors, fix CSS typo
- **Risk**: Medium

---

### 🚨 Tier 4: High Complexity (3 demos, ~3.5 hours total)

**13. UserManagementDemo.vue** 💪 PRIORITY 13

- **Type**: Full Migration (Multiple Elements + Colors)
- **Complexity**: High
- **Time Estimate**: 50-60 minutes
- **Details**: 2 buttons, 3 inputs, 6 hex colors
- **Actions**: Convert all buttons/inputs, replace 6 hex colors, extensive CSS cleanup
- **Risk**: Medium-High

**14. RecordingManagementDemo.vue** 💪 PRIORITY 14

- **Type**: Full Migration (Inputs + Many Colors)
- **Complexity**: High
- **Time Estimate**: 55-65 minutes
- **Details**: 2 inputs, 13 hex colors
- **Actions**: Convert inputs, replace 13 hex colors (careful semantic mapping)
- **Risk**: High

**15. E911Demo.vue** 💪 PRIORITY 15

- **Type**: Full Migration (Many Buttons + Colors)
- **Complexity**: High
- **Time Estimate**: 65-75 minutes
- **Details**: 13 custom buttons, 6 hex colors
- **Actions**: Convert 13 buttons (likely need :deep() styling), replace colors
- **Risk**: High

---

## Deferred to Week 3 (7 High-Complexity Demos)

These demos require 45-90 minutes each due to extensive hex colors and complexity:

1. **ScreenSharingDemo.vue** - 14 hex colors, 1 CSS typo
2. **FeatureCodesDemo.vue** - 17 hex colors, 3 buttons, 1 CSS typo
3. **ClickToCallDemo.vue** - 21 hex colors, 5 buttons
4. **NetworkSimulatorDemo.vue** - 22 hex colors, 4 inputs, 1 CSS typo
5. **RingGroupsDemo.vue** - 24 hex colors, 5 buttons
6. **CallWaitingDemo.vue** - 32 hex colors, 5 inputs
7. **ToolbarLayoutsDemo.vue** - 62 hex colors, 3 CSS typos ⚠️ MOST COMPLEX

**Week 3 Total**: 7 demos (~8-10 hours estimated)

---

## Migration Workflow

### Phase 1: Tier 1 (Very Easy - Start Here)

**Time**: ~30 minutes total
**Focus**: Quick wins, build momentum
**Validation**: ESLint after each demo

1. BasicCallDemo.vue (import consolidation)
2. CallQualityDemo.vue (minimal/no changes)
3. CallTimerDemo.vue (minimal/no changes)

### Phase 2: Tier 2 (Low Complexity)

**Time**: ~90 minutes total
**Focus**: Standard button/input conversions
**Validation**: ESLint + visual check after each

4. AgentLoginDemo.vue (2 buttons)
5. CallRecordingDemo.vue (2 inputs)
6. IVRMonitorDemo.vue (2 buttons + CSS fix)
7. CallMutePatternsDemo.vue (CSS fix only)

### Phase 3: Tier 3 (Medium Complexity)

**Time**: ~3 hours total
**Focus**: Multiple elements + color fixes
**Validation**: ESLint + theme testing after each

8. AgentStatsDemo.vue (3 buttons + 2 CSS fixes)
9. BLFDemo.vue (4 buttons + CSS fix)
10. QueueMonitorDemo.vue (3 buttons + 2 colors)
11. AutoAnswerDemo.vue (mixed elements + colors)
12. SipMessagingDemo.vue (4 inputs + colors + CSS fix)

### Phase 4: Tier 4 (High Complexity - End Strong)

**Time**: ~3.5 hours total
**Focus**: Extensive conversions + many colors
**Validation**: Comprehensive ESLint + theme + visual testing

13. UserManagementDemo.vue (5 elements + 6 colors)
14. RecordingManagementDemo.vue (2 inputs + 13 colors)
15. E911Demo.vue (13 buttons + 6 colors)

---

## Risk Management

### Known Risks

**1. CSS Typo Pattern (7 occurrences across remaining demos)**

- Files: AgentStatsDemo, BLFDemo, CallMutePatternsDemo, IVRMonitorDemo, FeatureCodesDemo, NetworkSimulatorDemo, ScreenSharingDemo, SipMessagingDemo, ToolbarLayoutsDemo
- Pattern: `var(--surface-0)-space: nowrap;` → `white-space: nowrap;`
- Mitigation: Pre-check each file before starting

**2. High Hex Color Count (154 total across remaining demos)**

- Top offenders: ToolbarLayoutsDemo (62), CallWaitingDemo (32), RingGroupsDemo (24)
- Mitigation: Use CSS_CUSTOM_PROPERTIES_MIGRATION.md reference guide
- Strategy: Map colors by semantic meaning (green→success, orange→warning, red→danger)

**3. Complex Button Patterns (E911Demo with 13 buttons)**

- Potential need for extensive :deep() styling
- Mitigation: Follow PRIMEVUE_MIGRATION_BEST_PRACTICES.md custom button pattern
- Allocate extra time for testing

### Mitigation Strategies

1. **Pre-Scan Validation**: Already completed for all Week 2 demos
2. **CSS Typo Check**: Use `grep "var(--surface-0)-space" filename.vue` before starting
3. **Hex Color Pre-Check**: Use `grep "#[0-9a-fA-F]\{6\}" filename.vue` to identify all colors
4. **Incremental Validation**: Run ESLint after each demo completion
5. **Theme Testing**: Test both light and dark themes for color-heavy demos
6. **Documentation Reference**: Keep best practices guide open during work

---

## Success Criteria

### Week 2 Complete When:

- [ ] All 15 demos migrated to PrimeVue components
- [ ] 0 ESLint errors in all 15 demos
- [ ] All hex colors replaced with CSS custom properties
- [ ] All CSS typos fixed
- [ ] Centralized imports via shared-components.ts
- [ ] Full light/dark theme compatibility
- [ ] Build passes without errors
- [ ] No new test failures introduced

### Quality Gates (Per Demo):

- [ ] ESLint validation passes (0 errors, 0 warnings in migrated file)
- [ ] No hard-coded hex colors remain
- [ ] No CSS typo patterns present
- [ ] Button/input conversions complete and functional
- [ ] Custom styling preserved with :deep() where needed
- [ ] Theme switching tested (light/dark)

---

## Documentation Plan

After Week 2 completion, update:

1. **PHASE_3_PROGRESS_TRACKER.md**
   - Update Week 2 status to COMPLETE
   - Update overall progress (30/45-60 demos, ~50-67%)
   - Add Week 2 velocity metrics
   - Document any new patterns discovered

2. **PHASE_3_WEEK_2_COMPLETION_REPORT.md** (Create new)
   - Executive summary
   - All 15 demos completed
   - Migration statistics and velocity
   - New patterns/issues discovered
   - Lessons learned for Week 3

3. **PRIMEVUE_MIGRATION_BEST_PRACTICES.md** (Update if needed)
   - Add any new patterns discovered during Week 2
   - Update common pitfalls if new issues found

---

## Timeline Estimate

**Conservative Estimate**: 8-10 hours total work time
**Aggressive Estimate**: 7-8 hours if no issues encountered
**Recommended Pace**: 5 demos/day across 3 days

**Day 1**: Tier 1 + Tier 2 (7 demos, ~2 hours)
**Day 2**: Tier 3 (5 demos, ~3 hours)
**Day 3**: Tier 4 (3 demos, ~3.5 hours)

---

## Pre-Execution Checklist

Before starting Week 2:

- [x] Pre-scan all 22 remaining demos (COMPLETE)
- [x] Categorize by complexity tier (COMPLETE)
- [x] Identify CSS typo occurrences (9 files identified)
- [x] Count hex colors (154 total identified)
- [x] Create execution plan (COMPLETE)
- [ ] Review PRIMEVUE_MIGRATION_BEST_PRACTICES.md
- [ ] Review CSS_CUSTOM_PROPERTIES_MIGRATION.md
- [ ] Confirm build/test baseline is clean
- [ ] Ensure shared-components.ts is up to date

---

## Appendix: Complete Analysis Data

### Tier 1 Details (3 demos)

| Demo                | PrimeVue Imports | Buttons | Inputs | Hex Colors | CSS Typos | Time Est |
| ------------------- | ---------------- | ------- | ------ | ---------- | --------- | -------- |
| BasicCallDemo.vue   | 6                | 0       | 0      | 0          | 0         | 5-10 min |
| CallQualityDemo.vue | 0                | 0       | 0      | 0          | 0         | 5-10 min |
| CallTimerDemo.vue   | 0                | 0       | 0      | 0          | 0         | 5-10 min |

### Tier 2 Details (4 demos)

| Demo                     | PrimeVue Imports | Buttons | Inputs | Hex Colors | CSS Typos | Time Est  |
| ------------------------ | ---------------- | ------- | ------ | ---------- | --------- | --------- |
| AgentLoginDemo.vue       | 0                | 2       | 0      | 0          | 0         | 15-20 min |
| CallRecordingDemo.vue    | 0                | 0       | 2      | 0          | 0         | 15-20 min |
| IVRMonitorDemo.vue       | 0                | 2       | 0      | 0          | 1         | 20-25 min |
| CallMutePatternsDemo.vue | 0                | 0       | 0      | 0          | 1         | 10-15 min |

### Tier 3 Details (5 demos)

| Demo                 | PrimeVue Imports | Buttons | Inputs | Hex Colors | CSS Typos | Time Est  |
| -------------------- | ---------------- | ------- | ------ | ---------- | --------- | --------- |
| AgentStatsDemo.vue   | 0                | 3       | 0      | 0          | 2         | 30-35 min |
| BLFDemo.vue          | 0                | 4       | 0      | 0          | 1         | 35-40 min |
| QueueMonitorDemo.vue | 0                | 3       | 0      | 2          | 0         | 35-40 min |
| AutoAnswerDemo.vue   | 0                | 1       | 1      | 2          | 0         | 35-40 min |
| SipMessagingDemo.vue | 0                | 0       | 4      | 2          | 1         | 40-45 min |

### Tier 4 Details (3 demos for Week 2, 7 deferred)

| Demo                        | PrimeVue Imports | Buttons | Inputs | Hex Colors | CSS Typos | Time Est   |
| --------------------------- | ---------------- | ------- | ------ | ---------- | --------- | ---------- |
| **Week 2:**                 |
| UserManagementDemo.vue      | 0                | 2       | 3      | 6          | 0         | 50-60 min  |
| RecordingManagementDemo.vue | 0                | 0       | 2      | 13         | 0         | 55-65 min  |
| E911Demo.vue                | 0                | 13      | 0      | 6          | 0         | 65-75 min  |
| **Week 3:**                 |
| ScreenSharingDemo.vue       | 0                | 0       | 0      | 14         | 1         | 50-60 min  |
| FeatureCodesDemo.vue        | 0                | 3       | 0      | 17         | 1         | 60-70 min  |
| ClickToCallDemo.vue         | 0                | 5       | 0      | 21         | 0         | 60-70 min  |
| NetworkSimulatorDemo.vue    | 0                | 0       | 4      | 22         | 1         | 70-80 min  |
| RingGroupsDemo.vue          | 0                | 5       | 0      | 24         | 0         | 70-80 min  |
| CallWaitingDemo.vue         | 0                | 0       | 5      | 32         | 0         | 80-90 min  |
| ToolbarLayoutsDemo.vue      | 5                | 0       | 0      | 62         | 3         | 90-120 min |

---

**Execution Plan Version**: 1.0
**Created**: 2025-12-22
**Status**: Ready for Execution
**Estimated Completion**: Week 2 (2025-12-23 onwards)
