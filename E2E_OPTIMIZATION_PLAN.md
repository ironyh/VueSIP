# E2E Test Optimization Plan

## Current State Analysis

### Test Statistics
- **Total Tests**: 170+ tests across 10+ test files
- **Browser Configurations**: 5 (chromium, firefox, webkit, Mobile Chrome, Mobile Safari)
- **CI Execution**: Sequential (workers=1) - **MAJOR BOTTLENECK**
- **Local Execution**: Parallel (fullyParallel: true)
- **SIP Delays**: 50-150ms per operation
- **Test Files**: 10 spec files

### Performance Bottlenecks Identified

1. **Sequential Execution in CI** ⚠️ **CRITICAL**
   - Current: `workers: process.env.CI ? 1 : undefined`
   - Impact: All tests run one at a time, taking 5-10x longer than necessary
   - Solution: Increase to 4-6 workers in CI

2. **All Tests Run on All Browsers** ⚠️ **HIGH**
   - Current: Every test runs on 5 browser configurations
   - Impact: 5x redundant execution for tests that don't need cross-browser validation
   - Solution: Full suite on chromium, smoke tests on others

3. **SIP Mock Delays** ⚠️ **MEDIUM**
   - Current: 50-150ms delays for SIP operations
   - Impact: Adds ~100-300ms per test
   - Solution: Reduce to 10-50ms (still realistic but faster)

4. **No Test Sharding** ⚠️ **MEDIUM**
   - Current: All tests run in single job
   - Impact: No distribution across multiple CI runners
   - Solution: Implement test sharding

5. **Visual Regression on All Browsers** ⚠️ **LOW**
   - Current: Visual tests run on all 5 browsers
   - Impact: Unnecessary - visual tests only need one browser
   - Solution: Only run on chromium

6. **No Test Prioritization** ⚠️ **LOW**
   - Current: Tests run in file order
   - Impact: Critical tests don't fail fast
   - Solution: Add test tags (critical, smoke, full)

## Optimization Strategies

### 1. Enable Parallel Execution in CI ✅
**Impact**: 4-6x speedup
**Risk**: Low - Playwright handles parallelization well

**Changes**:
- Update `playwright.config.ts`: `workers: process.env.CI ? 4 : undefined`
- Add retry logic for flaky tests
- Monitor for test isolation issues

### 2. Selective Browser Testing ✅
**Impact**: 3-4x reduction in test execution time
**Risk**: Low - Critical path still tested on all browsers

**Strategy**:
- **Chromium**: Full test suite (all 170+ tests)
- **Firefox/WebKit**: Smoke tests only (critical path ~20-30 tests)
- **Mobile**: Smoke tests only

**Implementation**:
- Tag tests with `@critical`, `@smoke`, `@full`
- Configure projects to run different test sets

### 3. Optimize SIP Mock Delays ✅
**Impact**: ~100-200ms saved per test
**Risk**: Very Low - Still realistic timing

**Changes**:
- Reduce `CONNECTION`: 50ms → 20ms
- Reduce `REGISTER_200`: 80ms → 30ms
- Reduce `INVITE_100`: 50ms → 20ms
- Reduce `INVITE_180`: 100ms → 50ms
- Reduce `INVITE_200`: 150ms → 50ms
- Keep `ACK_PROCESS`: 10ms (already optimal)

### 4. Test Sharding ✅
**Impact**: Better distribution across CI runners
**Risk**: Low - Playwright supports sharding natively

**Implementation**:
- Use Playwright's built-in sharding: `--shard=1/4`
- Update GitHub Actions to run multiple shards in parallel

### 5. Skip Visual Tests on Non-Chromium ✅
**Impact**: ~17 tests × 4 browsers = 68 fewer test runs
**Risk**: None - Visual tests are browser-agnostic

**Implementation**:
- Configure visual-regression.spec.ts to only run on chromium project

### 6. Test Tagging System ✅
**Impact**: Better test organization and selective execution
**Risk**: None

**Tags**:
- `@critical`: Must pass for deployment (20-30 tests)
- `@smoke`: Quick validation (30-40 tests)
- `@full`: Complete test suite (all 170+ tests)
- `@visual`: Visual regression tests
- `@performance`: Performance tests
- `@network`: Network condition tests

### 7. Optimize Fixture Setup ✅
**Impact**: Reduce per-test overhead
**Risk**: Low - Careful implementation needed

**Changes**:
- Share browser contexts where possible
- Cache mock setup
- Reduce redundant navigation

## Expected Performance Improvements

### Before Optimization
- **CI Execution Time**: ~45-60 minutes (sequential, all browsers)
- **Local Execution Time**: ~10-15 minutes (parallel, all browsers)
- **Test Runs per CI**: 850+ (170 tests × 5 browsers)

### After Optimization
- **CI Execution Time**: ~8-12 minutes (parallel, selective browsers)
- **Local Execution Time**: ~5-8 minutes (optimized delays)
- **Test Runs per CI**: ~250-300 (optimized browser selection)

### Improvement Metrics
- **CI Speedup**: 4-5x faster
- **Test Run Reduction**: 60-65% fewer test executions
- **Resource Usage**: More efficient CPU/memory utilization

## Implementation Plan

### Phase 1: Core Optimizations (High Impact, Low Risk)
1. ✅ Enable parallel execution (workers: 4)
2. ✅ Optimize SIP delays
3. ✅ Skip visual tests on non-chromium

### Phase 2: Selective Browser Testing (High Impact, Medium Risk)
4. ✅ Add test tagging system
5. ✅ Configure browser-specific test execution
6. ✅ Update CI workflow

### Phase 3: Advanced Optimizations (Medium Impact, Low Risk)
7. ✅ Implement test sharding
8. ✅ Optimize fixture setup
9. ✅ Add test prioritization

## Risk Mitigation

1. **Test Isolation**: Monitor for flaky tests after enabling parallel execution
2. **Browser Coverage**: Ensure critical path still tested on all browsers
3. **CI Stability**: Start with conservative worker count, increase gradually
4. **Test Reliability**: Add retry logic for known flaky tests

## Monitoring

After implementation, monitor:
- Test execution time trends
- Flaky test rate
- CI failure rate
- Test coverage metrics

