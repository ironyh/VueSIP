# E2E Test Hardening Recommendations for GitHub Actions

## Executive Summary

After comprehensive analysis of the VueSIP E2E test suite, this document provides actionable recommendations to improve test reliability in GitHub Actions CI environment. The test suite contains ~5000 lines across 13 spec files with complex SIP call flow testing using mocked WebSocket and media devices.

**Key Findings:**
- ✅ Good foundation: Proper test fixtures, mocked APIs, centralized selectors
- ⚠️ Timing issues: Extensive use of hardcoded timeouts, race conditions in wait strategies
- ⚠️ Visual regression: Tests fully skipped due to CI flakiness
- ⚠️ Mobile/Firefox/WebKit: Significant test exclusions due to mock timing issues
- ⚠️ Error handling: Limited retry logic and error recovery mechanisms

---

## Critical Issues Identified

### 1. **Timing and Wait Strategy Issues**

#### Problems:
- Extensive use of `page.waitForTimeout()` with arbitrary delays (300ms, 500ms, 1000ms)
- Race conditions in connection/registration state checks
- Mock WebSocket responses have fixed delays that may be insufficient in CI
- Tests rely on timing rather than state verification

**Examples:**
```typescript
// ❌ Bad: Arbitrary timeout
await page.waitForTimeout(500)

// ❌ Bad: Multiple sequential timeouts
await page.waitForTimeout(300)
await page.waitForTimeout(500)
await page.waitForTimeout(1000)
```

#### Recommendations:

**A. Replace hardcoded timeouts with state-based waits:**

```typescript
// ✅ Good: Wait for specific state
await page.waitForFunction(
  () => (window as any).__sipState?.connectionState === 'connected',
  { timeout: 10000, polling: 100 }
)

// ✅ Good: Wait for network idle
await page.waitForLoadState('networkidle')

// ✅ Good: Wait for specific element state
await expect(page.locator('[data-testid="status"]')).toHaveAttribute('data-state', 'connected')
```

**B. Add exponential backoff for retries:**

```typescript
async function waitForStateWithBackoff(
  page: Page,
  checkFn: () => Promise<boolean>,
  maxRetries = 5
) {
  for (let i = 0; i < maxRetries; i++) {
    if (await checkFn()) return true
    await page.waitForTimeout(Math.min(100 * Math.pow(2, i), 2000))
  }
  throw new Error('State check timed out')
}
```

**C. Enhance fixture wait strategies:**

Current `waitForConnectionState` has some fallbacks but could be more robust:

```typescript
// Enhanced version with better diagnostics
waitForConnectionState: async ({ page }, use) => {
  await use(async (state: 'connected' | 'disconnected') => {
    await page.waitForFunction(
      (expectedState) => {
        // 1. Check internal state (most reliable)
        const sipState = (window as any).__sipState
        if (sipState) {
          const matches = expectedState === 'connected'
            ? sipState.isConnected
            : !sipState.isConnected
          if (matches) {
            console.log('[Wait] Matched via internal state')
            return true
          }
        }

        // 2. Check DOM state
        const element = document.querySelector('[data-testid="connection-status"]')
        if (element) {
          const text = element.textContent?.toLowerCase() || ''
          if (text.includes(expectedState.toLowerCase())) {
            console.log('[Wait] Matched via DOM')
            return true
          }
        }

        // 3. Diagnostic logging
        const now = Date.now()
        const debug = (window as any).__connectionDebug || {}
        if (!debug.lastLog || now - debug.lastLog > 1000) {
          debug.lastLog = now
          console.log('[Wait] Still waiting for:', expectedState, {
            sipState: sipState?.connectionState,
            domText: element?.textContent,
          })
        }

        return false
      },
      state,
      {
        timeout: 15000,  // Increased for CI
        polling: 100     // More aggressive polling
      }
    )
  })
}
```

---

### 2. **Visual Regression Test Reliability**

#### Current State:
All visual regression tests are completely skipped with `test.describe.skip()` due to:
- Font rendering differences
- Browser rendering inconsistencies
- Timing of animations and transitions
- Environmental differences (CI vs local)

#### Recommendations:

**A. Use Playwright's visual comparison options properly:**

```typescript
test('should match app layout', async ({ page }) => {
  await page.goto(APP_URL)
  await page.waitForLoadState('networkidle')

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready)

  // Disable animations
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `
  })

  await expect(page).toHaveScreenshot('app-layout.png', {
    fullPage: true,
    animations: 'disabled',
    // Key: Add threshold for minor differences
    maxDiffPixels: 100,
    maxDiffPixelRatio: 0.01,
    // Mask dynamic content
    mask: [
      page.locator('[data-testid="timestamp"]'),
      page.locator('[data-testid="dynamic-status"]'),
    ],
  })
})
```

**B. Separate visual tests to optional workflow:**

Create `.github/workflows/visual-regression.yml` that:
- Runs on-demand or on schedule
- Uses consistent Docker container for rendering
- Generates baseline screenshots in CI
- Provides visual diff artifacts for review

**C. Use Percy, Chromatic, or similar service:**

These services are designed for visual regression testing in CI and handle:
- Cross-browser rendering
- Baseline management
- Visual diff reporting
- Approval workflows

---

### 3. **Mock WebSocket Timing Issues**

#### Problems:
- Fixed delays in `SIP_DELAYS` may be too fast or slow for CI
- Mock responses fire independently of JsSIP's processing state
- Race conditions when multiple SIP messages arrive quickly

**Current delays (in fixtures.ts):**
```typescript
const SIP_DELAYS = {
  CONNECTION: 20,      // Was 50ms
  REGISTER_200: 30,    // Was 80ms
  INVITE_100: 20,      // Was 50ms
  INVITE_180: 50,      // Was 100ms
  INVITE_200: 50,      // Was 150ms
  BYE_200: 20,        // Was 50ms
  CANCEL_200: 20,      // Was 50ms
  ACK_PROCESS: 10,
  OPTIONS_200: 20,     // Was 50ms
}
```

#### Recommendations:

**A. Make delays configurable based on environment:**

```typescript
const baseDelays = {
  CONNECTION: 50,
  REGISTER_200: 80,
  INVITE_100: 50,
  INVITE_180: 100,
  INVITE_200: 150,
  BYE_200: 50,
  CANCEL_200: 50,
  ACK_PROCESS: 10,
  OPTIONS_200: 50,
}

// In CI, increase delays for slower environments
const multiplier = process.env.CI ? 1.5 : 1.0
const SIP_DELAYS = Object.fromEntries(
  Object.entries(baseDelays).map(([key, value]) => [
    key,
    Math.round(value * multiplier),
  ])
)
```

**B. Add synchronization between mock and JsSIP:**

```typescript
// In MockWebSocket
private async sendResponse(response: string, delay: number) {
  await new Promise(resolve => setTimeout(resolve, delay))

  // Wait for JsSIP to be ready to receive
  await this.waitForJsSipReady()

  this.emitEvent('message', new MessageEvent('message', { data: response }))
}

private async waitForJsSipReady(timeout = 5000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if ((window as any).__sipState?.isReady) return
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}
```

**C. Add state verification after mock responses:**

```typescript
// After simulating INVITE response
await page.waitForFunction(
  () => {
    const state = (window as any).__callState
    return state?.callState === 'active' || state?.callState === 'ringing'
  },
  { timeout: 5000, polling: 100 }
)
```

---

### 4. **Browser-Specific Test Exclusions**

#### Current State:
Significant tests skipped for Firefox, WebKit, and mobile:

**Firefox exclusions:**
- visual-regression.spec.ts
- performance.spec.ts
- incoming-call.spec.ts
- multi-user.spec.ts

**WebKit exclusions (even more):**
- All Firefox exclusions PLUS:
- basic-call-flow.spec.ts
- av-quality.spec.ts
- error-scenarios.spec.ts

**Mobile exclusions:**
- visual-regression.spec.ts
- performance.spec.ts
- av-quality.spec.ts
- multi-user.spec.ts
- incoming-call.spec.ts
- basic-call-flow.spec.ts

#### Recommendations:

**A. Diagnose and fix WebSocket mock issues:**

The root cause is "mock WebSocket timing issues." Add diagnostic logging:

```typescript
// In MockWebSocket constructor
console.log('[MockWebSocket] Browser:', navigator.userAgent)
console.log('[MockWebSocket] Timing baseline:', SIP_DELAYS)

// Log message processing times
const processStart = Date.now()
// ... process message ...
const processTime = Date.now() - processStart
if (processTime > 100) {
  console.warn('[MockWebSocket] Slow message processing:', processTime, 'ms')
}
```

**B. Use browser-specific delay configurations:**

```typescript
const getBrowserMultiplier = () => {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('firefox')) return 2.0      // Firefox needs more time
  if (ua.includes('webkit')) return 2.5       // WebKit needs even more
  if (ua.includes('mobile')) return 2.0       // Mobile needs more time
  return 1.0
}
```

**C. Run excluded tests in parallel with longer timeouts:**

```typescript
// In playwright.config.ts
{
  name: 'firefox-full',
  use: { ...devices['Desktop Firefox'] },
  testMatch: /.*\.spec\.ts/,  // Run all tests
  timeout: 45000,             // Increased timeout
  retries: 3,                 // More retries
}
```

---

### 5. **CI-Specific Optimizations**

#### Playwright Configuration Improvements:

**Current config is good but can be enhanced:**

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,        // ✅ Good
  workers: process.env.CI ? 4 : undefined, // ✅ Good

  reporter: [
    ['html'],
    ['./tests/e2e/reporters/custom-reporter.ts'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    // ➕ Add GitHub Actions reporter in CI
    ...(process.env.CI ? [['github']] : []),
    // ➕ Add dot reporter for cleaner CI logs
    ...(process.env.CI ? [['dot']] : []),
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // ➕ Add CI-specific settings
    ...(process.env.CI && {
      // Increase timeouts in CI
      actionTimeout: 15000,      // Default: 0 (no timeout)
      navigationTimeout: 30000,  // Default: 30000

      // More lenient expectations
      expect: {
        timeout: 10000,          // Default: 5000
      },
    }),
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-software-rasterizer',

            // ➕ CI container optimization
            ...(process.env.CI && process.env.CONTAINER
              ? ['--single-process', '--no-zygote']
              : []),

            // Memory management
            '--js-flags=--max-old-space-size=2048',
            '--disable-extensions',

            // ➕ Additional CI stability flags
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=VizDisplayCompositor',
            '--disable-ipc-flooding-protection',

            // Media device mocking
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--allow-file-access',
          ],
        },
        permissions: ['microphone', 'camera'],
      },
    },
  ],

  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,

    // ➕ Better CI logging
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: process.env.CI ? 'pipe' : 'ignore',

    // ➕ Add environment variables for test mode
    env: {
      NODE_ENV: 'test',
      VITE_TEST_MODE: 'true',
    },
  },

  // ➕ Add global timeout
  timeout: process.env.CI ? 45000 : 30000,

  // ➕ Add expect configuration
  expect: {
    timeout: process.env.CI ? 10000 : 5000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
    },
  },
})
```

---

### 6. **GitHub Actions Workflow Improvements**

#### Current Workflow Issues:
- No caching of Playwright browsers
- No parallelization of test execution
- Limited diagnostic output on failure

#### Recommended Enhancements:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop, 'claude/**']
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

env:
  # Define consistent environment variables
  CI: true
  CONTAINER: true

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        # ➕ Add sharding for parallel execution
        shard: [1, 2]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build package
        run: pnpm run build

      # ➕ Cache Playwright browsers
      - name: Get Playwright version
        id: playwright-version
        run: echo "version=$(pnpm list @playwright/test --depth=0 | grep @playwright | awk '{print $2}')" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        uses: actions/cache@v3
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}-${{ matrix.browser }}
          restore-keys: |
            playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}-
            playwright-${{ runner.os }}-

      - name: Install Playwright Browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: pnpm exec playwright install --with-deps ${{ matrix.browser }}

      - name: Install Playwright system dependencies
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: pnpm exec playwright install-deps ${{ matrix.browser }}

      - name: Create test-results directory
        run: mkdir -p test-results

      # ➕ Add system diagnostics
      - name: System diagnostics
        run: |
          echo "Memory:"
          free -h
          echo "Disk:"
          df -h
          echo "CPU:"
          lscpu | grep -E "^CPU\(s\)|^Model name"

      - name: List tests for project
        run: |
          echo "Listing tests for project: ${{ matrix.browser }}"
          pnpm exec playwright test --project=${{ matrix.browser }} --list || true
        env:
          CI: true
        continue-on-error: true

      # ➕ Run tests with sharding
      - name: Run E2E tests
        run: |
          pnpm exec playwright test \
            --project=${{ matrix.browser }} \
            --shard=${{ matrix.shard }}/2 \
            --reporter=github,dot,json,junit
        env:
          CI: true
          PWDEBUG: ${{ runner.debug }}

      # ➕ Upload test results with better naming
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: |
            playwright-report/
            test-results/
            test-results/results.json
            test-results/junit.xml
          retention-days: 30

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: test-results/**/*.png
          retention-days: 30
          if-no-files-found: warn

      - name: Upload videos on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: videos-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: test-results/**/*.webm
          retention-days: 30
          if-no-files-found: warn

      # ➕ Upload traces on failure
      - name: Upload traces on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: traces-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: test-results/**/*.zip
          retention-days: 30
          if-no-files-found: warn

  # ➕ Add smoke test job for fast feedback
  smoke:
    timeout-minutes: 10
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build package
        run: pnpm run build

      - name: Install Playwright Chromium
        run: pnpm exec playwright install --with-deps chromium

      # Run only critical smoke tests
      - name: Run smoke tests
        run: pnpm exec playwright test --project=chromium app-functionality.spec.ts
        env:
          CI: true

  test-mobile:
    timeout-minutes: 20
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        device: ['Mobile Chrome', 'Mobile Safari']

    steps:
      # ... (keep existing steps)

      - name: Run Mobile E2E tests
        run: pnpm exec playwright test --project="${{ matrix.device }}"
        env:
          CI: true
          # ➕ Mobile-specific settings
          PWTEST_SLOW_MO: 100  # Slow down actions for mobile

  report:
    name: Publish Test Report
    needs: [smoke, test, test-mobile]
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: all-results

      # ➕ Merge JUnit reports
      - name: Merge JUnit reports
        uses: mikepenz/action-junit-report@v4
        with:
          report_paths: 'all-results/**/junit.xml'
          check_name: E2E Test Results
          fail_on_failure: false

      - name: Publish HTML Report
        uses: actions/upload-artifact@v4
        with:
          name: html-report-combined
          path: all-results/**/playwright-report
          retention-days: 30

      # ➕ Create test summary
      - name: Create test summary
        if: always()
        run: |
          echo "# E2E Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          find all-results -name "results.json" -exec cat {} \; | \
            jq -r '.suites[] | "- **\(.title)**: \(.tests | length) tests"' >> $GITHUB_STEP_SUMMARY || true
```

---

### 7. **Error Handling and Retries**

#### Current State:
- Basic retry logic (2 retries in CI)
- Limited error recovery in tests
- No automatic retry for flaky assertions

#### Recommendations:

**A. Add retry logic for flaky operations:**

```typescript
// Create utility function
async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    delayMs?: number
    exponentialBackoff?: boolean
    shouldRetry?: (error: Error) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    shouldRetry = () => true,
  } = options

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1
      const shouldRetryError = shouldRetry(error as Error)

      if (isLastAttempt || !shouldRetryError) {
        throw error
      }

      const delay = exponentialBackoff
        ? delayMs * Math.pow(2, attempt)
        : delayMs

      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Should not reach here')
}

// Use in tests
test('should handle flaky connection', async ({ page, configureSip }) => {
  await configureSip(TEST_DATA.VALID_CONFIG)

  await retryOperation(
    async () => {
      await page.click('[data-testid="connect-button"]')
      await waitForConnectionState('connected')
    },
    {
      maxRetries: 3,
      delayMs: 1000,
      shouldRetry: (error) => error.message.includes('timeout'),
    }
  )
})
```

**B. Add test-level timeout configuration:**

```typescript
// For slow tests
test('slow operation', async ({ page }) => {
  test.setTimeout(60000)  // 1 minute for this specific test
  // ... test code
})

// For fast tests that should fail quickly
test('fast validation', async ({ page }) => {
  test.setTimeout(5000)  // 5 seconds max
  // ... test code
})
```

**C. Add better error messages:**

```typescript
// Enhanced wait with diagnostic error
async function waitForConnectionStateWithDiagnostics(
  page: Page,
  state: 'connected' | 'disconnected'
) {
  try {
    await page.waitForFunction(
      (expectedState) => {
        const sipState = (window as any).__sipState
        const element = document.querySelector('[data-testid="connection-status"]')
        return element?.textContent?.toLowerCase().includes(expectedState.toLowerCase())
      },
      state,
      { timeout: 10000, polling: 100 }
    )
  } catch (error) {
    // Capture diagnostic information
    const diagnostics = await page.evaluate(() => ({
      sipState: (window as any).__sipState,
      domText: document.querySelector('[data-testid="connection-status"]')?.textContent,
      console: (window as any).__testLogs || [],
    }))

    throw new Error(
      `Failed to reach connection state "${state}" after 10s. ` +
      `Current state: ${JSON.stringify(diagnostics, null, 2)}`
    )
  }
}
```

---

### 8. **Test Organization and Performance**

#### Recommendations:

**A. Group tests by speed:**

```typescript
// Fast tests (< 5s each)
test.describe('UI Tests @fast', () => {
  // Basic UI rendering tests
})

// Medium tests (5-15s each)
test.describe('Integration Tests @medium', () => {
  // Connection, registration tests
})

// Slow tests (> 15s each)
test.describe('Call Flow Tests @slow', () => {
  // Full call flow tests
})

// Then run in CI:
// Fast feedback: pnpm exec playwright test --grep @fast
// Full suite: pnpm exec playwright test
```

**B. Share expensive setup:**

```typescript
// Use shared-setup.ts for tests that can share state
import { sharedAppSetup } from './shared-setup'

test.describe('Read-only UI tests', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await sharedAppSetup(page, mockSipServer, mockMediaDevices)
    // Store in test.info() for sharing
  })

  // Tests that only read state, don't modify
})
```

**C. Optimize mock setup:**

```typescript
// Cache mock scripts to avoid re-injection
const mockScriptCache = new Map<string, string>()

export function mockWebSocketResponses(page: Page) {
  const cacheKey = 'websocket-mock'
  let script = mockScriptCache.get(cacheKey)

  if (!script) {
    // Build script once
    script = buildMockScript()
    mockScriptCache.set(cacheKey, script)
  }

  return page.addInitScript(script)
}
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Replace hardcoded timeouts with state-based waits in top 5 flaky tests
2. ✅ Add CI-specific delay multipliers for mock WebSocket
3. ✅ Enhance `waitForConnectionState` and `waitForCallState` fixtures
4. ✅ Add browser caching to GitHub Actions workflow
5. ✅ Add GitHub Actions reporter and better CI logging

### Phase 2: Reliability Improvements (Week 2)
1. ✅ Implement retry logic utility and add to flaky tests
2. ✅ Add diagnostic error messages with state dumps
3. ✅ Fix Firefox and WebKit mock timing issues
4. ✅ Add test sharding for faster CI execution
5. ✅ Create smoke test job for fast feedback

### Phase 3: Visual Regression (Week 3)
1. ✅ Implement proper visual comparison with thresholds
2. ✅ Create separate visual regression workflow
3. ✅ Evaluate Percy/Chromatic for visual testing
4. ✅ Add baseline screenshot generation in CI

### Phase 4: Optimization (Week 4)
1. ✅ Implement test tagging (@fast, @medium, @slow)
2. ✅ Optimize fixture sharing for read-only tests
3. ✅ Add performance benchmarks for test execution time
4. ✅ Document best practices and patterns

---

## Metrics to Track

### Test Reliability Metrics:
- **Flake Rate**: Percentage of tests that fail inconsistently
- **First-Pass Rate**: Percentage of tests that pass on first run
- **Average Execution Time**: Track per test and per browser
- **Retry Rate**: How often tests need retries to pass

### Target Goals:
- Flake Rate: < 2% (currently likely > 10% based on skipped tests)
- First-Pass Rate: > 95% (currently unknown)
- Average Execution Time: < 5 minutes for Chromium full suite
- Retry Success Rate: > 90% of retries should succeed

### Monitoring:
```yaml
# Add to workflow
- name: Calculate test metrics
  if: always()
  run: |
    node scripts/calculate-test-metrics.js
```

---

## Testing Best Practices for Future Tests

### ✅ DO:
1. Use `waitForFunction` with state checks, not `waitForTimeout`
2. Add data-testid attributes for all interactive elements
3. Write tests that are independent and can run in any order
4. Use centralized selectors and test data
5. Add diagnostic logging for debugging CI failures
6. Test one thing per test case
7. Use proper TypeScript types for test helpers

### ❌ DON'T:
1. Use hardcoded timeouts (except as last resort with explanation)
2. Rely on exact pixel matching for visual tests
3. Test implementation details (test behavior, not internals)
4. Create interdependent tests that must run in sequence
5. Duplicate test setup code (use fixtures)
6. Use generic error messages without context
7. Skip tests without filing issues to fix them

---

## Conclusion

The VueSIP E2E test suite has a solid foundation but requires systematic hardening for reliable CI execution. The primary issues are timing-related and can be addressed through:

1. State-based waiting instead of arbitrary timeouts
2. CI-aware mock delay configuration
3. Enhanced diagnostic capabilities
4. Proper visual regression testing approach
5. Better error handling and retry logic

Implementing these recommendations in phases will significantly improve test reliability while maintaining comprehensive coverage. The key is to move from time-based synchronization to state-based synchronization, and from "works on my machine" to "works reliably in CI."

**Estimated effort:** 3-4 weeks for full implementation
**Expected outcome:** >95% first-pass rate, <2% flake rate, full cross-browser coverage
