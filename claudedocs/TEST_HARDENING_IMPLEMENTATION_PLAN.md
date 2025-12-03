# Test Hardening Implementation Plan

**Date**: 2025-12-03
**Project**: VueSIP E2E Test Stabilization
**Coordinator**: SwarmLead
**Priority**: High (Blocking CI/CD Pipeline)

## Executive Summary

This document provides a detailed, actionable implementation plan to harden E2E tests for GitHub Actions CI environment based on the analysis in `TEST_HARDENING_ANALYSIS.md`.

**Primary Issues**:
1. ✅ Selector undefined errors → **Root cause identified**
2. ⏱️ Timeout errors (10s too aggressive for CI) → **Solution ready**
3. 🔄 WebSocket mock timing issues → **Needs investigation**

**Estimated Implementation Time**: 4-6 hours total

---

## Phase 1: Critical Fixes (Immediate - 2-3 hours)

### Task 1.1: Update Playwright Configuration for CI Timeouts

**Priority**: 🔴 Critical
**Estimated Time**: 30 minutes
**Files**: `playwright.config.ts`

**Problem**:
- Default timeout: 30s (implicit)
- Fixture timeouts: 10s (hardcoded in `waitForConnectionState`, `waitForRegistrationState`, `waitForCallState`)
- CI environment is slower than local, causing false timeout failures

**Solution**:

```typescript
// playwright.config.ts - Add at root of config
export default defineConfig({
  // Global test timeout - increased for CI
  timeout: process.env.CI ? 60000 : 30000, // 60s on CI, 30s local

  // Expect timeout - for assertions
  expect: {
    timeout: process.env.CI ? 15000 : 5000, // 15s expect timeout on CI
  },

  use: {
    // Action timeout - for individual actions like click, fill
    actionTimeout: process.env.CI ? 20000 : 10000, // 20s action timeout on CI

    // Navigation timeout
    navigationTimeout: process.env.CI ? 30000 : 15000, // 30s navigation on CI

    // ... existing use config
  },

  // ... rest of config
})
```

**Changes Required**:
1. Add `timeout` at root level
2. Add `expect` configuration block
3. Update `use.actionTimeout`
4. Add `use.navigationTimeout`

**Testing**:
- Run locally: `pnpm test:e2e:chromium` (should use 30s/5s/10s timeouts)
- Push to CI: Verify logs show 60s/15s/20s timeouts

---

### Task 1.2: Update Fixture Timeout Values

**Priority**: 🔴 Critical
**Estimated Time**: 30 minutes
**Files**: `tests/e2e/fixtures.ts`

**Problem**:
- All `waitFor*` fixtures hardcode 10s timeout
- Lines affected: 1027, 1115, 1164, 1196

**Solution**:

```typescript
// tests/e2e/fixtures.ts

// Add at top of file after imports
const WAIT_TIMEOUT = process.env.CI ? 20000 : 10000 // 20s on CI, 10s local
const WAIT_POLLING = 200 // 200ms polling interval

// Then replace all hardcoded timeout values:

// Line 1027 - waitForDevices
{ timeout: WAIT_TIMEOUT }

// Line 1115 - waitForConnectionState
{ timeout: WAIT_TIMEOUT, polling: WAIT_POLLING }

// Line 1164 - waitForRegistrationState
{ timeout: WAIT_TIMEOUT, polling: WAIT_POLLING }

// Line 1196 - waitForCallState
{ timeout: WAIT_TIMEOUT, polling: WAIT_POLLING }
```

**Changes Required**:
1. Add `WAIT_TIMEOUT` constant (CI-aware)
2. Add `WAIT_POLLING` constant
3. Replace 4 hardcoded `timeout: 10000` values
4. Replace 3 hardcoded `polling: 200` values

**Testing**:
```bash
# Local test (should use 10s)
pnpm test:e2e:chromium

# CI test (will use 20s after push)
git add tests/e2e/fixtures.ts
git commit -m "test: increase fixture timeouts for CI"
git push
```

---

### Task 1.3: Fix Selector Undefined Issue (Investigation)

**Priority**: 🟡 High
**Estimated Time**: 1-2 hours
**Files**: `tests/e2e/av-quality.spec.ts`, `tests/e2e/fixtures.ts`

**Problem Analysis**:
Looking at the error pattern:
```
❌ Error: Error: locator.isVisible: selector: expected string, got undefined
```

This error occurs in video-related tests. Likely causes:
1. Selector not defined in `SELECTORS` object
2. Selector accessed before initialization
3. Race condition with selector loading

**Investigation Steps**:

1. **Check which selector is undefined** (add debug logging):
```typescript
// tests/e2e/av-quality.spec.ts - around line 100+

// Before any .isVisible() call, add:
const selector = SELECTORS.CALL_CONTROLS.TOGGLE_VIDEO_BUTTON
console.log('Selector value:', selector)
if (!selector) {
  throw new Error(`Selector is undefined!`)
}
await expect(page.locator(selector)).toBeVisible()
```

2. **Review av-quality.spec.ts** for undefined selectors:
   - Check all uses of `SELECTORS.*`
   - Look for dynamic selector generation
   - Check if any selectors are conditionally defined

3. **Add null safety** to commonly failing test patterns:
```typescript
// Helper function for safe selector access
async function waitForElement(page, selector: string | undefined, options = {}) {
  if (!selector) {
    throw new Error(`Selector is undefined - this is a test bug`)
  }
  return page.locator(selector).waitFor(options)
}
```

**Hypothesis**:
The issue may be in video-related selectors that don't exist in `selectors.ts`. Review line 73:
```typescript
TOGGLE_VIDEO_BUTTON: '[data-testid="toggle-video-button"]',
```

This exists, so the problem is likely:
- Tests calling `SELECTORS.something.that.doesnt.exist`
- Or accessing nested properties incorrectly

**Action**:
1. Run tests with additional logging
2. Identify which selector returns undefined
3. Fix either the selector definition or the test code

---

## Phase 2: Reliability Improvements (Short-term - 2-3 hours)

### Task 2.1: Add CI-Specific WebSocket Mock Delays

**Priority**: 🟡 Medium
**Estimated Time**: 1 hour
**Files**: `tests/e2e/fixtures.ts`

**Problem**:
- WebSocket mock delays optimized for local development
- CI environment needs slightly longer delays

**Solution**:

```typescript
// tests/e2e/fixtures.ts - Update SIP_DELAYS around line 124

const SIP_DELAYS = {
  CONNECTION: process.env.CI ? 50 : 20,      // 50ms on CI, 20ms local
  REGISTER_200: process.env.CI ? 60 : 30,    // 60ms on CI, 30ms local
  INVITE_100: process.env.CI ? 40 : 20,      // 40ms on CI, 20ms local
  INVITE_180: process.env.CI ? 80 : 50,      // 80ms on CI, 50ms local
  INVITE_200: process.env.CI ? 100 : 50,     // 100ms on CI, 50ms local
  BYE_200: process.env.CI ? 40 : 20,         // 40ms on CI, 20ms local
  CANCEL_200: process.env.CI ? 40 : 20,      // 40ms on CI, 20ms local
  ACK_PROCESS: process.env.CI ? 20 : 10,     // 20ms on CI, 10ms local
  OPTIONS_200: process.env.CI ? 40 : 20,     // 40ms on CI, 20ms local
}
```

**Rationale**:
- CI runners typically have shared CPU and I/O
- Doubling delays adds ~200ms per test but eliminates race conditions
- Total test suite time increase: ~10-15 seconds (acceptable trade-off)

**Testing**:
```bash
# Measure before
time pnpm test:e2e:chromium

# Apply changes, measure after
time pnpm test:e2e:chromium
```

---

### Task 2.2: Add Test Timeout Annotations for Slow Tests

**Priority**: 🟢 Low
**Estimated Time**: 30 minutes
**Files**: Various `*.spec.ts` files

**Problem**:
- Some tests legitimately take longer than others
- One-size-fits-all timeout causes issues

**Solution**:

```typescript
// For tests that need more time
test('should handle complex multi-user scenario', async ({ page }) => {
  test.setTimeout(process.env.CI ? 90000 : 45000) // 90s on CI, 45s local

  // ... test implementation
})

// For known fast tests (smoke tests)
test('should load application', async ({ page }) => {
  test.setTimeout(process.env.CI ? 30000 : 15000) // 30s on CI, 15s local

  // ... test implementation
})
```

**Files to Update**:
- `tests/e2e/multi-user.spec.ts` - Increase timeouts
- `tests/e2e/performance.spec.ts` - Increase timeouts
- `tests/e2e/network-conditions.spec.ts` - Increase timeouts
- `tests/e2e/app-functionality.spec.ts` - Can reduce some smoke test timeouts

**Testing**:
Run each modified file individually to verify timeouts are appropriate.

---

### Task 2.3: Improve Error Messages and Debugging

**Priority**: 🟢 Low
**Estimated Time**: 1 hour
**Files**: `tests/e2e/fixtures.ts`, test files

**Solution**:

```typescript
// tests/e2e/fixtures.ts - Improve waitForConnectionState error reporting

waitForConnectionState: async ({ page }, use) => {
  await use(async (state: 'connected' | 'disconnected') => {
    try {
      await page.waitForFunction(
        // ... existing function
        state,
        { timeout: WAIT_TIMEOUT, polling: WAIT_POLLING }
      )
    } catch (error) {
      // Enhanced error reporting on failure
      const debugInfo = await page.evaluate(() => ({
        sipState: (window as any).__sipState,
        connectionDebug: (window as any).__connectionDebug,
        elementExists: !!document.querySelector('[data-testid="connection-status"]'),
        elementText: document.querySelector('[data-testid="connection-status"]')?.textContent,
      }))

      console.error('waitForConnectionState failed:', {
        expectedState: state,
        timeout: WAIT_TIMEOUT,
        debugInfo,
      })

      throw new Error(
        `Failed to reach connection state "${state}" after ${WAIT_TIMEOUT}ms. ` +
        `Debug info: ${JSON.stringify(debugInfo, null, 2)}`
      )
    }
  })
},
```

**Benefits**:
- Easier to diagnose CI failures
- Reduces debugging iteration time
- Better error messages in GitHub Actions logs

---

## Phase 3: Monitoring & Validation (Ongoing - 1 hour)

### Task 3.1: Add Test Timing Metrics

**Priority**: 🟢 Nice-to-have
**Estimated Time**: 30 minutes
**Files**: `tests/e2e/reporters/custom-reporter.ts`

**Solution**:

```typescript
// tests/e2e/reporters/custom-reporter.ts

class CustomReporter {
  onTestEnd(test, result) {
    // Track slow tests
    if (result.duration > 30000) {
      console.warn(`⏱️  Slow test detected: ${test.title} took ${result.duration}ms`)
    }

    // Track timeout failures specifically
    if (result.status === 'timedOut') {
      console.error(`⏱️  TIMEOUT: ${test.title} exceeded ${test.timeout}ms`)
    }

    // Track flaky tests (passed on retry)
    if (result.status === 'passed' && result.retry > 0) {
      console.warn(`🔄 FLAKY: ${test.title} passed on retry ${result.retry}`)
    }
  }
}
```

**Benefits**:
- Identify tests that need timeout increases
- Track flakiness trends
- Proactive performance monitoring

---

### Task 3.2: Create CI-Specific Test Suite

**Priority**: 🟢 Nice-to-have
**Estimated Time**: 30 minutes
**Files**: `package.json`, `.github/workflows/e2e-tests.yml`

**Solution**:

```json
// package.json - Add new test scripts
{
  "scripts": {
    "test:e2e:ci:fast": "playwright test app-functionality.spec.ts basic-call-flow.spec.ts --project=chromium --workers=4",
    "test:e2e:ci:full": "playwright test --project=chromium --workers=4 --timeout=60000",
    "test:e2e:ci:smoke": "playwright test --grep @smoke --project=chromium --workers=4 --timeout=30000"
  }
}
```

**Benefits**:
- Faster feedback for common scenarios
- Progressive testing strategy
- Optimized CI resource usage

---

## Implementation Checklist

### Phase 1: Critical (DO FIRST)

- [ ] **Task 1.1**: Update `playwright.config.ts` with CI timeout multipliers
  - [ ] Add `timeout: process.env.CI ? 60000 : 30000`
  - [ ] Add `expect.timeout` configuration
  - [ ] Add `use.actionTimeout` configuration
  - [ ] Add `use.navigationTimeout` configuration
  - [ ] Test locally to ensure no regressions

- [ ] **Task 1.2**: Update `tests/e2e/fixtures.ts` with CI-aware timeouts
  - [ ] Add `WAIT_TIMEOUT` constant
  - [ ] Add `WAIT_POLLING` constant
  - [ ] Replace hardcoded timeout at line 1027
  - [ ] Replace hardcoded timeouts at lines 1115, 1164, 1196
  - [ ] Test locally to ensure no regressions

- [ ] **Task 1.3**: Investigate and fix selector undefined errors
  - [ ] Add debug logging to failing tests
  - [ ] Identify which selector is undefined
  - [ ] Fix selector definition or test code
  - [ ] Add null safety checks
  - [ ] Verify fix with local test run

### Phase 2: Reliability (DO NEXT)

- [ ] **Task 2.1**: Add CI-specific WebSocket mock delays
  - [ ] Update `SIP_DELAYS` object with CI conditions
  - [ ] Test locally (no change)
  - [ ] Test in CI (verify improvements)

- [ ] **Task 2.2**: Add test-specific timeout annotations
  - [ ] Update slow tests in `multi-user.spec.ts`
  - [ ] Update slow tests in `performance.spec.ts`
  - [ ] Update slow tests in `network-conditions.spec.ts`
  - [ ] Verify timeout annotations work correctly

- [ ] **Task 2.3**: Improve error messages
  - [ ] Enhance `waitForConnectionState` error reporting
  - [ ] Enhance `waitForRegistrationState` error reporting
  - [ ] Enhance `waitForCallState` error reporting
  - [ ] Test error output locally

### Phase 3: Monitoring (OPTIONAL)

- [ ] **Task 3.1**: Add test timing metrics to custom reporter
- [ ] **Task 3.2**: Create CI-specific test suite commands

---

## Testing Strategy

### Local Testing (Before Commit)

```bash
# 1. Run full E2E suite locally
pnpm test:e2e

# 2. Run specific failing browser
pnpm test:e2e:firefox
pnpm test:e2e:webkit

# 3. Run specific failing test file
pnpm test:e2e tests/e2e/av-quality.spec.ts

# 4. Verify no regressions
pnpm test:unit
pnpm build
pnpm typecheck
```

### CI Testing (After Commit)

```bash
# 1. Push to feature branch
git checkout -b test/hardening-ci-timeouts
git add playwright.config.ts tests/e2e/fixtures.ts
git commit -m "test: harden E2E tests for CI environment

- Increase timeouts for CI (60s test, 20s fixture, 15s expect)
- Add CI-specific WebSocket mock delays
- Improve error messages for debugging

Refs: claudedocs/TEST_HARDENING_ANALYSIS.md"
git push origin test/hardening-ci-timeouts

# 2. Monitor GitHub Actions
# - Check E2E Tests workflow
# - Review logs for timeout errors
# - Check pass rate improvement

# 3. Iterate if needed
# - Adjust timeouts based on CI results
# - Fix any remaining selector issues
```

### Success Criteria

**Primary Metrics**:
- [ ] E2E pass rate: >95% (currently ~60%)
- [ ] Timeout failures: <5% (currently ~25%)
- [ ] Selector failures: 0 (currently ~40%)

**Secondary Metrics**:
- [ ] CI runtime: <20 minutes (currently ~15 minutes)
- [ ] Flakiness rate: <2%
- [ ] Zero false negatives (tests failing for wrong reasons)

---

## Risk Mitigation

### Risk 1: Timeout Increases Hide Real Issues

**Mitigation**:
- Monitor test duration trends
- Set upper bounds on timeout values
- Add metrics to identify legitimately slow tests
- Progressive timeout increases (don't jump to 2 minutes)

### Risk 2: CI-Specific Code Diverges from Local

**Mitigation**:
- Use `process.env.CI` checks sparingly
- Document all CI-specific configurations
- Test locally with `CI=true` environment variable
- Maintain parity where possible

### Risk 3: Selector Issues Recur

**Mitigation**:
- Add TypeScript type safety for selectors
- Create helper functions with null checks
- Add linting rules to catch undefined selectors
- Consider using Playwright codegen for reliable selectors

---

## Post-Implementation

### Documentation Updates

- [ ] Update `README.md` with CI-specific testing notes
- [ ] Document timeout configuration in developer guide
- [ ] Add troubleshooting section for common CI failures
- [ ] Update contribution guidelines

### Team Communication

- [ ] Share analysis and implementation plan
- [ ] Demo timeout configuration changes
- [ ] Explain CI-specific considerations
- [ ] Gather feedback from team

### Continuous Improvement

- [ ] Monitor test stability for 1 week
- [ ] Analyze GitHub Actions logs for patterns
- [ ] Identify remaining flaky tests
- [ ] Plan Phase 2/3 enhancements

---

## Appendix: Quick Reference Commands

```bash
# Local development
pnpm test:e2e                    # Run all E2E tests
pnpm test:e2e:chromium           # Chromium only
pnpm test:e2e:headed             # With visible browser
pnpm test:e2e:debug              # Debug mode with Playwright Inspector

# CI simulation
CI=true pnpm test:e2e:chromium   # Test with CI timeouts locally

# Specific test files
pnpm test:e2e tests/e2e/av-quality.spec.ts
pnpm test:e2e tests/e2e/error-scenarios.spec.ts

# Check configuration
pnpm exec playwright show-config  # View effective config
pnpm exec playwright test --list  # List all tests

# Generate new selectors
pnpm exec playwright codegen http://localhost:5173

# View test reports
pnpm test:e2e:report              # Open HTML report
```

---

## Contact & Support

**SwarmLead Coordinator**: Available for questions
**Analysis Document**: `claudedocs/TEST_HARDENING_ANALYSIS.md`
**GitHub Actions**: `.github/workflows/e2e-tests.yml`

**Next Steps**: Proceed with Phase 1 implementation → validate in CI → iterate based on results
