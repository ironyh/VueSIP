# Comprehensive CI Test Fix Strategy

**Date**: 2025-12-04
**Status**: 🎯 Strategy Designed - Ready for Implementation
**Architect**: System Architecture Designer Agent
**Session**: swarm-ci-fix

---

## Executive Summary

This strategy addresses root causes of CI test failures through a systematic 4-phase approach:

1. **Foundation**: Fix critical configuration gaps (vitest.config.ts, Vue warnings)
2. **Reliability**: Harden tests and stabilize browser-specific issues
3. **Optimization**: Improve performance and reduce CI runtime
4. **Validation**: Comprehensive testing and documentation

**Expected Outcomes**:
- ✅ 100% unit test pass rate (0 warnings)
- ✅ 100% chromium E2E pass rate
- ✅ 95%+ cross-browser pass rate
- ✅ <1% flakiness rate
- ✅ <25 min total CI runtime
- ✅ Visual regression tests re-enabled

---

## Root Causes Identified

### 1. Browser-Specific Timing Issues (HIGH IMPACT)
**Evidence**:
- Firefox/WebKit mock WebSocket timing failures
- Visual regression test flakiness
- Tests skipped: `incoming-call`, `multi-user`, `visual-regression`, `performance`

**Affected Tests**: 150+ tests across Firefox, WebKit, Mobile browsers

**Root Cause**:
- Mock WebSocket implementation has browser-specific timing differences
- Visual tests lack proper wait-for-stable strategies
- Font loading timing varies across browsers

### 2. Resource Constraints in CI (HIGH IMPACT)
**Evidence**:
- Memory exhaustion with `--single-process` mode
- Timeout issues on mobile emulation
- Tests skipped: Mobile Chrome, Mobile Safari basic-call-flow

**Affected Tests**: 80+ mobile browser tests

**Root Cause**:
- Aggressive memory optimization flags cause instability
- Mobile emulation requires higher timeout thresholds
- Worker count not optimized per browser type

### 3. Test Configuration Gaps (MEDIUM IMPACT)
**Evidence**:
- Missing `vitest.config.ts` file
- Vue lifecycle warnings in console output
- Inconsistent timeout configuration

**Affected Tests**: 68 tests with warnings

**Root Cause**:
- No centralized Vitest configuration
- Tests not properly wrapped in Vue component context
- Missing lifecycle hook setup for composables

### 4. Vue Lifecycle Warnings (MEDIUM IMPACT)
**Evidence**:
```
[Vue warn]: onMounted is called when there is no active component instance
```

**Affected Tests**: `useAudioDevices` composable tests (multiple warnings)

**Root Cause**:
- Composables with lifecycle hooks tested outside component context
- Missing `mount()` wrapper from `@vue/test-utils`

---

## Strategy Architecture

### Core Principles

1. **Deterministic Test Behavior** - Eliminate all probabilistic failures
2. **CI-Aware Configuration** - Proper resource limits and timeouts for GitHub Actions
3. **Progressive Enhancement** - Fix critical issues first, optimize later
4. **Evidence-Based Validation** - Metrics-driven improvements with measurable outcomes

### Strategy Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Validation & Monitoring                       │
│  - Comprehensive testing (5 consecutive runs)           │
│  - Documentation updates                                │
│  - Monitoring & alerts setup                            │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Performance Optimization                      │
│  - Test parallelization & sharding                      │
│  - Enhanced error reporting                             │
│  - Performance test optimization                        │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Test Hardening & Stability                    │
│  - Browser configuration optimization                   │
│  - Visual regression stabilization                      │
│  - Mobile browser reliability                           │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Configuration & Infrastructure (FOUNDATION)   │
│  - Create vitest.config.ts                              │
│  - Fix Vue composable test setup                        │
│  - Update CI workflow timeouts                          │
└─────────────────────────────────────────────────────────┘
```

---

## Priority Matrix

### P0: Critical Fixes (MUST DO FIRST)

| Task | Impact | Effort | Risk | Fixes |
|------|--------|--------|------|-------|
| Create `vitest.config.ts` | 68 tests with warnings | 1-2h | Low | Missing test configuration |
| Fix Vue composable test setup | Eliminates console noise | 2-3h | Low | Lifecycle warnings |

**Total Effort**: 3-5 hours
**Expected Result**: All unit tests pass without warnings

### P1: High-Priority Reliability

| Task | Impact | Effort | Risk | Fixes |
|------|--------|--------|------|-------|
| Optimize Playwright browser config | All browsers stable | 3-4h | Medium | Memory/timeout issues |
| Enhance CI timeout configuration | 40-60% less flakiness | 2-3h | Low | Timeout failures |
| Stabilize visual regression tests | Re-enables visual testing | 4-6h | High | Skipped visual tests |

**Total Effort**: 9-13 hours
**Expected Result**: Cross-browser tests stable, visual regression enabled

### P2: Medium-Priority Optimization

| Task | Impact | Effort | Risk | Benefit |
|------|--------|--------|------|---------|
| Optimize E2E parallelization | 20-30% faster CI | 2-3h | Low | Reduced runtime |
| Enhance error reporting | Faster debugging | 3-4h | Low | Better diagnostics |

**Total Effort**: 5-7 hours
**Expected Result**: Faster CI execution, better failure diagnosis

### P3: Low-Priority Enhancements

| Task | Impact | Effort | Risk | Benefit |
|------|--------|--------|------|---------|
| Performance test optimization | Faster tests | 2-4h | Low | <5 min performance tests |
| Documentation updates | Maintainability | 1-2h | Low | Knowledge sharing |

**Total Effort**: 3-6 hours
**Expected Result**: Improved long-term maintainability

---

## Implementation Phases

### Phase 1: Foundation (4-6 hours)

#### Step 1.1: Create vitest.config.ts
**Goal**: Centralized test configuration with proper Vue setup

**Implementation**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    },
    testTimeout: process.env.CI ? 30000 : 10000,
    hookTimeout: process.env.CI ? 20000 : 10000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: process.env.CI ? 4 : undefined
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

**Validation**: Run `pnpm run test:unit` - should pass without warnings

#### Step 1.2: Fix Vue Composable Test Setup
**Goal**: Eliminate Vue lifecycle warnings

**Current Issue**:
```typescript
// ❌ WRONG - no component context
const { audioInputDevices } = useAudioDevices()
// [Vue warn]: onMounted is called when there is no active component instance
```

**Fix**:
```typescript
// ✅ CORRECT - proper component context
import { mount } from '@vue/test-utils'

const wrapper = mount({
  setup() {
    const devices = useAudioDevices()
    return { devices }
  },
  template: '<div />'
})

await flushPromises()
const { audioInputDevices } = wrapper.vm.devices
```

**Files to Fix**:
- `tests/unit/composables/useAudioDevices.test.ts`

**Validation**: Zero Vue warnings in test output

#### Step 1.3: Update CI Workflow Timeouts
**Goal**: Prevent timeout failures in GitHub Actions

**Changes**:
```yaml
# .github/workflows/test.yml
timeout: process.env.CI ? 60000 : 30000
expect:
  timeout: process.env.CI ? 15000 : 5000
```

**Validation**: No timeout failures in 3 consecutive CI runs

---

### Phase 2: Reliability (8-10 hours)

#### Step 2.1: Optimize Playwright Browser Configuration
**Goal**: Stable cross-browser test execution

**Current Issues**:
- `--single-process` causes memory issues
- Worker count not optimized per browser
- Missing browser-specific timeout overrides

**Optimization Strategy**:
```typescript
// playwright.config.ts
projects: [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: {
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox',
          // Remove --single-process for chromium (has enough memory)
          '--js-flags=--max-old-space-size=4096', // Increase memory
        ],
      },
    },
    // Chromium gets full test suite with more workers
    workers: process.env.CI ? 6 : undefined,
  },
  {
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      // Firefox-specific timeout increases
      actionTimeout: process.env.CI ? 30000 : 15000,
    },
    // Firefox with limited workers
    workers: process.env.CI ? 2 : undefined,
  },
  // ... webkit and mobile with optimized settings
]
```

**Validation**: All browsers pass on 3 consecutive runs

#### Step 2.2: Stabilize Visual Regression Tests
**Goal**: Re-enable visual regression testing in CI

**Current Issue**: Tests skipped due to flakiness

**Fix Strategy**:
1. **Wait for stable state**:
```typescript
// Wait for fonts to load
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000) // Allow font rendering

// Wait for animations to complete
await page.waitForSelector('[data-testid="app"]', {
  state: 'visible',
  timeout: 10000
})
```

2. **Configure pixel matching**:
```typescript
await expect(page).toHaveScreenshot('home.png', {
  maxDiffPixels: 100, // Allow minor differences
  threshold: 0.2,     // 20% tolerance for anti-aliasing
})
```

3. **Generate baseline images** for CI environment

**Validation**: Visual tests pass 5 consecutive runs

#### Step 2.3: Fix Mobile Browser Test Reliability
**Goal**: Stable mobile browser test execution

**Optimizations**:
```typescript
{
  name: 'Mobile Chrome',
  use: {
    ...devices['Pixel 5'],
    // Increase mobile timeouts significantly
    actionTimeout: process.env.CI ? 40000 : 20000,
    navigationTimeout: process.env.CI ? 90000 : 45000,
  },
  // Reduce mobile workers to 1 for stability
  workers: 1,
}
```

**Validation**: Mobile Chrome and Safari pass consistently

---

### Phase 3: Optimization (5-7 hours)

#### Step 3.1: Optimize Test Parallelization
**Goal**: Reduce CI runtime by 25%+

**Sharding Strategy**:
```yaml
# .github/workflows/e2e-tests.yml
strategy:
  matrix:
    browser: [chromium]
    shard: [1, 2, 3, 4] # Split chromium tests into 4 shards

- name: Run E2E tests (shard ${{ matrix.shard }}/4)
  run: |
    pnpm exec playwright test \
      --project=${{ matrix.browser }} \
      --shard=${{ matrix.shard }}/4
```

**Validation**: CI runtime reduced by 25%+

#### Step 3.2: Enhance Error Reporting
**Goal**: Better failure diagnosis

**Implementation**:
- Structured test failure reports
- Browser context in failures
- Network logs on failure
- Debug trace artifacts

**Validation**: Failure reports include actionable details

#### Step 3.3: Performance Test Optimization
**Goal**: Performance tests complete in <5 minutes

**Optimizations**:
- Reduce unnecessary iterations
- Optimize mock WebSocket performance
- Implement smart test selection

**Validation**: Performance suite completes <5 min

---

### Phase 4: Validation (3-4 hours)

#### Step 4.1: Comprehensive CI Validation
**Validation Checklist**:
- [ ] Run full test suite 5 consecutive times
- [ ] All browsers pass (chromium 100%, others 95%+)
- [ ] Mobile tests stable (90%+ pass rate)
- [ ] Performance benchmarks within budgets
- [ ] Visual regression enabled and passing
- [ ] Flakiness rate <1%

**Success Criteria**:
- 5/5 successful runs
- <1% flakiness rate
- <25 min total CI runtime

#### Step 4.2: Update Documentation
**Documents to Create/Update**:
- `docs/CI_TESTING_GUIDE.md` - CI best practices
- `docs/TROUBLESHOOTING.md` - Common issues and fixes
- `docs/TEST_WRITING_GUIDELINES.md` - How to write reliable tests

#### Step 4.3: Setup Monitoring and Alerts
**Monitoring Setup**:
- Test failure alerts
- Flakiness tracking
- Performance regression detection
- CI health dashboard

---

## Risk Mitigation

### Rollback Strategy
- Each phase can be reverted independently
- Feature flags for major changes
- Commit after each successful validation

### Testing Approach
- Validate each phase before proceeding
- Run full test suite between phases
- Track flakiness rate throughout

### Parallel Work
- Phases 1-2 can be worked in parallel
- Phase 1 (foundation) blocks nothing
- Phase 2 (reliability) can proceed independently

### Checkpoints
1. After Phase 1: All unit tests pass without warnings
2. After Phase 2: Cross-browser tests stable
3. After Phase 3: CI runtime optimized
4. After Phase 4: Full validation complete

---

## Success Criteria

### Quantitative Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Unit Test Pass Rate | ~99% | 100% | All tests green |
| Unit Test Warnings | 68 | 0 | Console output |
| E2E Chromium Pass Rate | ~95% | 100% | 5 consecutive runs |
| E2E Firefox Pass Rate | ~60% | 95%+ | Known limitations OK |
| E2E WebKit Pass Rate | ~50% | 90%+ | Known limitations OK |
| E2E Mobile Pass Rate | ~40% | 90%+ | Known limitations OK |
| Visual Regression | Disabled | Enabled | Tests passing |
| Flakiness Rate | ~5-10% | <1% | Failure tracking |
| CI Runtime | ~35 min | <25 min | GitHub Actions |

### Qualitative Goals

- ✅ All warnings eliminated
- ✅ Visual regression tests re-enabled
- ✅ Comprehensive documentation
- ✅ Monitoring and alerts operational
- ✅ Team confidence in CI stability

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 4-6 hours | None |
| Phase 2: Reliability | 8-10 hours | Phase 1 recommended |
| Phase 3: Optimization | 5-7 hours | Phase 2 complete |
| Phase 4: Validation | 3-4 hours | Phases 1-3 complete |
| **Total** | **20-27 hours** | Sequential execution |

**With Parallel Execution** (Phases 1-2 parallel):
- **Total**: 16-20 hours

---

## Next Steps

1. **Review this strategy** with team leads
2. **Assign agents** to each phase:
   - Agent 1: Phase 1 (Configuration)
   - Agent 2: Phase 2 (Reliability) - can start in parallel
   - Agent 3: Phase 3 (Optimization) - waits for Phase 2
   - Agent 4: Phase 4 (Validation) - final verification
3. **Begin Phase 1 immediately** (no blockers)
4. **Track progress** in memory at `progress/*` keys
5. **Report results** after each phase completion

---

## References

- **Research Data**: Memory key `research/ci-failures/*`
- **Analysis Data**: Memory key `analysis/test-quality/*`
- **This Strategy**: Memory keys `strategy/fix-plan/*`
- **Related Docs**:
  - `claudedocs/TEST_FIX_SUMMARY.md` - Previous fix history
  - `playwright.config.ts` - Current E2E configuration
  - `.github/workflows/*.yml` - CI workflow files

---

**Strategy Status**: ✅ Complete and Ready for Implementation
**Next Action**: Spawn implementation agents for Phase 1
