# GitHub Actions Test Hardening Analysis

**Date**: 2025-12-03
**SwarmLead Coordinator**: Analysis Phase Complete
**Status**: Strategy Development in Progress

## Executive Summary

Analysis of recent GitHub Actions runs reveals **systematic failures** in E2E tests across all browsers (chromium, firefox, webkit) with two primary failure patterns:

1. **Selector Undefined Errors**: `locator.isVisible: selector: expected string, got undefined` (30+ occurrences)
2. **Timeout Errors**: `page.waitForFunction: Timeout 10000ms exceeded` (20+ occurrences)

Unit tests are **passing successfully** with only minor Vue lifecycle warnings (non-critical).

## Test Status Overview

### ✅ Unit Tests (Passing)
- **Status**: All 2,347 tests passing
- **Coverage**: 80%+ across all metrics
- **Performance**: Tests complete in ~2-7 seconds
- **Minor Issues**: Vue lifecycle warnings in `useAudioDevices.test.ts` (non-critical)

### ❌ E2E Tests (Failing)
- **Status**: Multiple failures across all browsers
- **Primary Browser**: Chromium (full test suite)
- **Secondary Browsers**: Firefox, Webkit (smoke tests only)
- **Mobile**: Mobile Chrome, Mobile Safari (limited tests)

## Failure Analysis

### 1. Selector Undefined Errors (Critical)

**Pattern**: `Error: locator.isVisible: selector: expected string, got undefined`

**Affected Tests**:
- `av-quality.spec.ts` - Video stream acquisition tests
- `av-quality.spec.ts` - Audio/Video toggle tests
- `av-quality.spec.ts` - DTMF tone tests
- Multiple retries (3 attempts each)

**Root Cause**:
- Selectors in `tests/e2e/selectors.ts` may be returning `undefined`
- Possible race conditions where DOM elements aren't rendered yet
- Mock data inconsistencies between browsers

**Evidence**:
```
test (firefox)	2025-12-03T21:48:58.6429538Z    ❌ Error: Error: locator.isVisible: selector: expected string, got undefined...
test (chromium)	2025-12-03T21:48:28.5282230Z    ❌ Error: Error: locator.isVisible: selector: expected string, got undefined...
```

**Affected Browsers**: All (chromium, firefox, webkit)

### 2. Timeout Errors (Critical)

**Pattern**: `TimeoutError: page.waitForFunction: Timeout 10000ms exceeded`

**Affected Tests**:
- `error-scenarios.spec.ts` - Error message display tests
- `error-scenarios.spec.ts` - Registration failure handling
- Multiple tests timing out at 30+ seconds

**Root Cause**:
- CI environment slower than local development
- WebSocket mock timing issues
- State transitions not completing within timeout
- Network simulation delays in CI

**Evidence**:
```
test (firefox)	2025-12-03T21:48:10.3231260Z    ❌ Error: TimeoutError: page.waitForFunction: Timeout 10000ms exceeded....
test (chromium)	2025-12-03T21:47:53.5064467Z    ❌ Error: TimeoutError: page.waitForFunction: Timeout 10000ms exceeded....
```

**Affected Browsers**: All (chromium, firefox, webkit)

### 3. Browser-Specific Test Exclusions

**Current Configuration** (from `playwright.config.ts`):

**Firefox**:
- ❌ Excluded: visual-regression, performance, incoming-call, multi-user
- ✅ Runs: Basic functionality, accessibility, error scenarios

**Webkit**:
- ❌ Excluded: visual-regression, performance, incoming-call, multi-user, basic-call-flow, av-quality, error-scenarios
- ✅ Runs: Minimal smoke tests only

**Mobile (Chrome/Safari)**:
- ❌ Excluded: visual-regression, performance, av-quality, multi-user, incoming-call, basic-call-flow
- ✅ Runs: App functionality smoke tests

**Rationale**: "WebSocket timing and mock issues" per config comments

## Configuration Analysis

### Current Playwright Configuration

**Positive Aspects**:
- ✅ Retry strategy: 2 retries on CI (helps with flakiness)
- ✅ Parallel workers: 4 workers on CI (good performance)
- ✅ Chromium args: Proper sandbox disabling, memory management
- ✅ Media device mocking: Configured for audio/video tests
- ✅ Web server timeout: 120s (appropriate for CI)

**Areas for Improvement**:
- ⚠️ Base timeout: Not explicitly set (defaults to 30s)
- ⚠️ Wait timeout: Fixtures use 10s timeout (too aggressive for CI)
- ⚠️ No explicit CI-specific timeout multiplier
- ⚠️ No browser-specific timeout adjustments

### Current Vitest Configuration

**Status**: ✅ Well-configured for unit tests

**Strengths**:
- Parallel execution: thread pool with all CPU cores
- Retry strategy: 2 retries for flakiness detection
- Proper test isolation
- Good coverage thresholds (80%+)

## Test Hardening Strategy

### Phase 1: Critical Fixes (High Priority)

#### 1.1 Fix Selector Undefined Issues

**Problem**: Selectors returning undefined causing test failures

**Solution**:
1. Add null checks before using selectors
2. Implement better error messages for missing elements
3. Add wait conditions before visibility checks
4. Review `selectors.ts` for potential undefined returns

**Affected Files**:
- `tests/e2e/av-quality.spec.ts`
- `tests/e2e/fixtures.ts` (likely has helper functions)
- `tests/e2e/selectors.ts` (selector definitions)

#### 1.2 Increase CI Timeout Values

**Problem**: 10s timeouts too aggressive for CI environment

**Solution**:
1. Add CI-specific timeout multiplier to Playwright config
2. Increase fixture wait timeouts from 10s to 20s+ on CI
3. Add explicit test-level timeouts for slow operations
4. Implement progressive timeout strategy

**Configuration Changes**:
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: process.env.CI ? 60000 : 30000, // 60s on CI, 30s local
  expect: {
    timeout: process.env.CI ? 15000 : 5000, // 15s expect timeout on CI
  },
  use: {
    actionTimeout: process.env.CI ? 20000 : 10000, // 20s action timeout on CI
  }
})
```

### Phase 2: Reliability Improvements (Medium Priority)

#### 2.1 Enhanced Mock Stability

**Problem**: WebSocket mock timing issues across browsers

**Solution**:
1. Add configurable delays to mock responses
2. Implement deterministic mock timing
3. Add CI-specific mock configurations
4. Review Firefox/Webkit mock compatibility

#### 2.2 Browser-Specific Hardening

**Problem**: Different browsers have different reliability profiles

**Solution**:
1. Adjust timeouts per browser type
2. Add browser-specific wait strategies
3. Improve WebSocket mock compatibility for Firefox/Webkit
4. Consider re-enabling excluded tests progressively

#### 2.3 Test Organization

**Problem**: Tests not organized by reliability characteristics

**Solution**:
1. Tag tests by stability (stable, flaky, experimental)
2. Create test suites by execution time (fast, medium, slow)
3. Separate integration-heavy tests from unit-like E2E tests
4. Implement smoke test suite for quick validation

### Phase 3: Monitoring & Observability (Low Priority)

#### 3.1 Enhanced Reporting

**Current**: HTML, custom, JSON, JUnit reporters

**Improvements**:
1. Add test duration tracking
2. Implement flakiness detection
3. Add CI-specific metrics collection
4. Create trend analysis reports

#### 3.2 Screenshot/Video Optimization

**Current**: On failure only (good)

**Improvements**:
1. Add trace collection for timeout failures
2. Implement selective video recording
3. Add DOM snapshot on selector failures
4. Optimize artifact storage

## Recommended Action Plan

### Immediate Actions (This Sprint)

1. **Fix Selector Issues** (2-3 hours)
   - Add null checks in test helpers
   - Implement waitForSelector wrappers
   - Add better error messaging

2. **Increase Timeouts** (1 hour)
   - Update playwright.config.ts with CI multipliers
   - Adjust fixture timeout constants
   - Add test-level timeout overrides

3. **Validate Changes** (1-2 hours)
   - Run full E2E suite locally
   - Push to CI and validate improvements
   - Monitor artifact sizes

### Short-term Actions (Next Sprint)

1. **Mock Improvements** (4-6 hours)
   - Review WebSocket mock implementation
   - Add CI-specific timing configurations
   - Test across all browsers

2. **Test Organization** (2-3 hours)
   - Tag tests by characteristics
   - Create focused test suites
   - Update CI workflows

### Long-term Actions (Future Sprints)

1. **Progressive Enhancement** (ongoing)
   - Re-enable excluded tests one by one
   - Monitor stability metrics
   - Adjust configurations as needed

2. **Infrastructure Improvements** (ongoing)
   - Implement test parallelization strategies
   - Optimize CI runtime
   - Enhance monitoring

## Success Metrics

### Primary Metrics
- **E2E Pass Rate**: Target >95% (current: ~60%)
- **Timeout Failures**: Reduce to <5% (current: ~25%)
- **Selector Failures**: Eliminate (current: ~40%)

### Secondary Metrics
- **CI Runtime**: Keep under 15 minutes
- **Flakiness Rate**: <2% retry rate
- **Test Coverage**: Maintain 80%+

## Risk Assessment

### High Risk
- ❌ Selector undefined errors blocking test execution
- ❌ Timeout errors in CI causing false negatives

### Medium Risk
- ⚠️ Browser-specific mock incompatibilities
- ⚠️ Potential timeout tuning trade-offs (hiding real issues)

### Low Risk
- ✓ Unit tests are stable and passing
- ✓ Test infrastructure is well-designed
- ✓ Good retry and artifact collection strategies

## Next Steps

1. **Swarm Coordination**: Delegate tasks to specialized agents
   - **E2E Agent**: Fix selector and timeout issues
   - **Config Agent**: Update Playwright configuration
   - **Validation Agent**: Test changes across all browsers

2. **Implementation Phase**: Execute Phase 1 critical fixes

3. **Validation Phase**: Run full test suite in CI

4. **Iteration**: Based on results, proceed to Phase 2

## References

- GitHub Actions Run: `19909893709` (2025-12-03)
- Test Workflow: `.github/workflows/e2e-tests.yml`
- Unit Test Workflow: `.github/workflows/test.yml`
- Playwright Config: `playwright.config.ts`
- Vitest Config: `vite.config.ts`
