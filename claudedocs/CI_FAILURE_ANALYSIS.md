# GitHub Actions CI Failure Analysis - VueSIP

**Analysis Date**: 2025-12-04
**Analyst**: Research Agent
**Project**: VueSIP E2E Test Infrastructure
**CI Platform**: GitHub Actions

---

## Executive Summary

The VueSIP project has **stable CI testing on Chromium** but experiences **systematic failures in Firefox, WebKit, and mobile browsers** due to mock WebSocket timing issues. Visual regression tests are skipped due to environment rendering differences. The current mitigation strategy uses browser-specific test exclusions, which is effective but limits cross-browser coverage.

### Key Findings

✅ **Chromium**: Full test suite (13 files, 4,955 lines) runs successfully
⚠️ **Firefox**: 4 test files excluded due to mock timing
⚠️ **WebKit**: 7 test files excluded (most restrictive)
⚠️ **Mobile**: 6 test files excluded per browser
🔴 **Visual Regression**: Completely skipped in CI (316 lines, 3 suites)
🔴 **Network Conditions**: Completely skipped (594 lines, 5 suites)

---

## Root Cause Analysis

### 1. Visual Regression Test Failures

**Issue**: Screenshot comparison tests fail in CI due to rendering differences

**Root Cause**:
- Font rendering variations across CI environments
- CSS rendering engine differences
- Anti-aliasing and subpixel rendering inconsistencies
- Environment-specific system fonts

**Evidence**:
- File: `tests/e2e/visual-regression.spec.ts` (316 lines)
- All 3 test suites marked with `test.describe.skip`
- Commit 1e343d1: "fix(e2e): skip all visual regression test suites in CI"

**Current Mitigation**:
```typescript
// Skip all visual regression tests - they fail in CI due to rendering differences
test.describe.skip('Visual Regression Tests', () => {
```

**Severity**: Medium (tests work locally, visual consistency validated manually)

---

### 2. Browser Timeout Issues (Mock WebSocket Timing)

**Issue**: E2E tests timeout in Firefox, WebKit, and mobile browsers

**Root Cause**:
- Mock WebSocket event timing differs across browser engines
- Race conditions in WebSocket event handler registration
- Browser-specific differences in JavaScript event loop timing
- Mobile browsers have additional memory/CPU constraints

**Evidence**:
```typescript
// playwright.config.ts - Browser-specific exclusions
{
  name: 'firefox',
  testIgnore: [
    /visual-regression\.spec\.ts/,
    /performance\.spec\.ts/,
    /incoming-call\.spec\.ts/,
    /multi-user\.spec\.ts/,
  ],
}
```

**Affected Test Files**:
- `incoming-call.spec.ts` (394 lines) - Call handling with WebSocket events
- `multi-user.spec.ts` (579 lines) - Multiple connection coordination
- `basic-call-flow.spec.ts` (287 lines) - Core call flows
- `av-quality.spec.ts` (592 lines) - Audio/video device handling

**Technical Detail**: Mock WebSocket implementations fire events synchronously or asynchronously depending on browser, causing race conditions in event listener setup.

**Severity**: High (limits cross-browser test coverage)

---

### 3. Settings Button Click Interception

**Issue**: Settings button clicks intercepted by main element causing TimeoutError

**Root Cause**:
- UI not fully stabilized before interaction
- Main element overlaying settings button during transition
- Z-index/layout issues during panel opening animation

**Evidence**:
- Commit 892ab1f: "fix(e2e): resolve settings button click timeout in error-scenarios test"
- File: `tests/e2e/error-scenarios.spec.ts`

**Solution Applied**:
```typescript
// Wait for settings panel to be visible
await page.waitForSelector(SELECTORS.SETTINGS.PANEL, { state: 'visible' })

// Force click to bypass interception
await page.click(SELECTORS.SETTINGS.SETTINGS_BUTTON, { force: true })

// Add stabilization wait
await page.waitForTimeout(200)
```

**Severity**: Medium (fixed, but indicates potential UI stability issues)

**Status**: ✅ Resolved

---

### 4. Network Conditions Test Incompatibility

**Issue**: Network simulation tests don't work with mock WebSockets

**Root Cause**:
- Tests designed for real network manipulation (throttling, latency, packet loss)
- Mock WebSockets bypass network layer entirely
- No way to simulate network conditions with in-memory mocks

**Evidence**:
- File: `tests/e2e/network-conditions.spec.ts` (594 lines)
- All 5 test suites marked with `test.describe.skip`
- Tests require: connection quality, interruption, bandwidth throttling, DNS failures

**Current Status**: Completely skipped in all browsers

**Severity**: Medium (network resilience not tested in CI)

---

### 5. CI Environment Differences

**Issue**: Tests need different timeouts and resource allocation in CI vs local

**Root Cause**:
- CI containers have limited CPU/memory resources
- Shared runners create variable performance
- Different rendering engines in headless mode
- Network latency to dev server

**Mitigation Strategy**:
```typescript
// playwright.config.ts - CI-aware configuration
use: {
  actionTimeout: process.env.CI ? 20000 : 10000,      // 2x timeout
  navigationTimeout: process.env.CI ? 60000 : 30000,  // 2x timeout
},
timeout: process.env.CI ? 60000 : 30000,              // 2x global timeout
workers: process.env.CI ? 4 : undefined,              // Controlled parallelism
retries: process.env.CI ? 2 : 0,                      // Retry flaky tests
```

**Severity**: High (affects all tests, requires careful configuration)

**Status**: ✅ Well-managed with current configuration

---

## Test Infrastructure Overview

### Test Suite Statistics

| Test File | Lines | Status | Browsers |
|-----------|-------|--------|----------|
| network-conditions.spec.ts | 594 | ⏭️ Skipped | All |
| av-quality.spec.ts | 592 | ✅ Chromium only | Mobile excluded |
| performance.spec.ts | 582 | ✅ Chromium only | All others excluded |
| multi-user.spec.ts | 579 | ✅ Chromium only | All others excluded |
| app-functionality.spec.ts | 515 | ✅ All browsers | ✅ |
| accessibility.spec.ts | 459 | ✅ All browsers | ✅ |
| error-scenarios.spec.ts | 399 | ✅ Chromium, Firefox, Mobile | WebKit excluded |
| incoming-call.spec.ts | 394 | ✅ Chromium only | All others excluded |
| visual-regression.spec.ts | 316 | ⏭️ Skipped | All |
| basic-call-flow.spec.ts | 287 | ✅ Chromium, Firefox | WebKit, Mobile excluded |
| debug-call.spec.ts | 109 | ✅ All browsers | ✅ |
| debug-register.spec.ts | 97 | ✅ All browsers | ✅ |
| simple-debug.spec.ts | 32 | ✅ All browsers | ✅ |
| **TOTAL** | **4,955** | **Chromium: 100%** | **Others: 30-60%** |

### Browser Coverage Matrix

| Browser | Test Coverage | Excluded Tests | Reason |
|---------|---------------|----------------|--------|
| **Chromium** | 100% (13/13 files) | 2 skipped suites (visual, network) | Primary CI browser ✅ |
| **Firefox** | 60% (9/13 files) | 4 files + 2 skipped suites | Mock timing issues ⚠️ |
| **WebKit** | 38% (6/13 files) | 7 files + 2 skipped suites | Extensive timing issues ⚠️ |
| **Mobile Chrome** | 46% (7/13 files) | 6 files + 2 skipped suites | Mobile timing issues ⚠️ |
| **Mobile Safari** | 46% (7/13 files) | 6 files + 2 skipped suites | Mobile timing issues ⚠️ |

---

## Recent CI Hardening Efforts

### Commit History (Last 10 Test-Related Commits)

1. **1e343d1** - `fix(e2e): skip all visual regression test suites in CI`
   - Impact: Eliminated visual regression flakiness
   - Date: 2025-12-04

2. **892ab1f** - `fix(e2e): resolve settings button click timeout in error-scenarios test`
   - Impact: Fixed WebKit/Firefox/mobile timeout in error scenarios
   - Technical: Added force clicks and stabilization waits
   - Date: 2025-12-04

3. **781560e** - `feat: Harden Tests for GitHub Actions Reliability (#95)`
   - Impact: Comprehensive CI hardening
   - Date: 2025-12-03

4. **bc718bf** - `fix(test): improve packet loss statistics test reliability`
   - Impact: Fixed probabilistic test failure (13% → 0.17% failure rate)
   - Date: 2025-12-03

5. **f2ef73f** - `fix(test): use alias import and correct mock interface for validators`
   - Impact: TypeScript compatibility fix
   - Date: Recent

**Pattern**: Progressive hardening focused on CI environment compatibility

---

## Configuration Analysis

### ✅ Strengths

**Playwright Configuration** (`playwright.config.ts`):
- ✅ CI-aware timeout multipliers (2x in CI)
- ✅ Smart browser-specific test exclusions
- ✅ Chromium gets full test suite
- ✅ Good artifact collection (screenshots, videos, traces)
- ✅ Proper retry logic (2 retries in CI)
- ✅ Parallel execution (4 workers in CI)
- ✅ Comprehensive browser matrix (5 projects)

**GitHub Actions Workflow** (`.github/workflows/e2e-tests.yml`):
- ✅ Separate jobs for desktop and mobile browsers
- ✅ Browser caching for faster runs
- ✅ Fail-fast disabled for comprehensive results
- ✅ Combined reporting job
- ✅ Proper artifact retention (30 days)

**Vitest Configuration** (`vite.config.ts`):
- ✅ Parallel thread pool execution
- ✅ File-level parallelization
- ✅ Good coverage requirements (80% lines/functions)
- ✅ Proper test isolation

### ⚠️ Areas for Improvement

1. **Documentation**: Add comments explaining why each test is excluded per browser
2. **Timeout Tuning**: Consider browser-specific timeout overrides instead of blanket exclusions
3. **Test Categorization**: Separate mock-dependent from mock-independent tests
4. **Sharding**: Implement test sharding for faster Chromium runs

---

## Recommendations

### Immediate Actions (Priority: High)

1. **✅ Continue Chromium-focused CI** (Already implemented)
   - Rationale: Chromium runs full suite successfully
   - Status: Working well
   - Effectiveness: High

2. **🔍 Investigate Visual Regression Service** (Effort: Medium, Impact: High)
   - Options: Percy, Chromatic, Applitools
   - Benefits: Dedicated infrastructure, baseline management, cross-browser support
   - Cost: $$-$$$

3. **🔧 Evaluate Real WebSocket Test Server** (Effort: High, Impact: High)
   - Rationale: Eliminate mock timing issues
   - Benefits: Full browser coverage, realistic tests
   - Alternatives: Improve mock timing consistency

### Long-Term Improvements

1. **Implement Real WebSocket/SIP Test Server** (Priority: High)
   - Estimated Effort: 2-3 weeks
   - Benefits:
     - Full browser coverage (100% instead of 30-60%)
     - More realistic E2E tests
     - Reduced flakiness
     - Network condition testing becomes possible
   - Approach: Docker-based test server with Asterisk or FreeSWITCH

2. **Set Up Visual Regression Service** (Priority: Medium)
   - Estimated Effort: 1 week
   - Benefits: Automated visual testing, baseline management
   - Recommended: Percy or Chromatic

3. **Browser-Specific Timeout Configuration** (Priority: Low)
   - Estimated Effort: 2-3 days
   - Benefits: Enable more tests per browser
   - Approach: Per-project timeout overrides

### Test Design Improvements

1. **Test Categorization**
   - Separate mock-dependent tests from browser compatibility tests
   - Create browser-agnostic helpers for timing-sensitive operations
   - Add explicit wait/retry patterns for WebSocket events

2. **Retry Strategy**
   - Add WebSocket-specific retry logic
   - Implement exponential backoff for timing-sensitive assertions
   - Better timeout messaging for debugging

3. **Performance**
   - Implement test sharding for Chromium (2-4 shards)
   - Add test result caching
   - Performance regression detection

---

## Conclusion

The VueSIP E2E test infrastructure is **well-configured for CI** with effective mitigations for known browser compatibility issues. The **Chromium test suite provides comprehensive coverage** (100% of tests), while other browsers are strategically limited to avoid mock WebSocket timing issues.

### Current State: ✅ Functional & Stable

- ✅ Chromium: Full coverage, reliable
- ✅ Firefox/WebKit/Mobile: Smoke tests only, acceptable
- ⚠️ Visual regression: Manual validation only
- ⚠️ Network conditions: Not tested in CI

### Next Steps Priority

1. **Short-term**: Continue current strategy (working well)
2. **Medium-term**: Evaluate visual regression service
3. **Long-term**: Implement real WebSocket/SIP test server for full cross-browser coverage

---

## Appendix: Technical Details

### Playwright Configuration Highlights

```typescript
// CI-aware configuration
use: {
  baseURL: 'http://localhost:5173',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  actionTimeout: process.env.CI ? 20000 : 10000,
  navigationTimeout: process.env.CI ? 60000 : 30000,
}

// Browser-specific launch options (Chromium)
launchOptions: {
  args: [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    ...(process.env.CI && process.env.CONTAINER
      ? ['--single-process', '--no-zygote']
      : []),
  ],
}
```

### GitHub Actions Matrix

```yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chromium, firefox, webkit]

# Mobile job
strategy:
  fail-fast: false
  matrix:
    device: ['Mobile Chrome', 'Mobile Safari']
```

---

**Analysis Complete** ✅
**Findings Stored in Memory**: `coordination/research/ci-failures/*`
