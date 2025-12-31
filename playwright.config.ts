import { defineConfig, devices } from '@playwright/test'

/**
 * Global test ignore patterns - shared across all projects
 * These patterns are applied to all browser configurations
 */
const GLOBAL_TEST_IGNORE = [
  /simple-debug\.spec\.ts/, // Debug test for manual troubleshooting
  /quick-test\.spec\.ts/, // Debug test for quick checks
  /diagnose-registration\.spec\.ts/, // Diagnostic test
  /multi-line\.spec\.ts/, // Tests unimplemented multi-line UI feature
  // Tests requiring mock SIP infrastructure fixes (mock WebSocket/EventBridge timing issues)
  /audio-devices\.spec\.ts/, // Requires mock media device integration
  /av-quality\.spec\.ts/, // Requires mock WebRTC connection
  /dtmf\.spec\.ts/, // Requires active call mocking
  /call-transfer\.spec\.ts/, // Requires active call mocking
  /incoming-call\.spec\.ts/, // Requires mock incoming call simulation
  /call-hold\.spec\.ts/, // Requires active call mocking
  /basic-call-flow\.spec\.ts/, // Requires full mock SIP flow
  /multi-user\.spec\.ts/, // Requires multi-instance mock coordination
  /network-conditions\.spec\.ts/, // Requires network simulation
  /eventbridge-lifecycle-diagnostic\.spec\.ts/, // Diagnostic for EventBridge
  /performance\.spec\.ts/, // Requires real connection timing metrics
]

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run tests in parallel - optimized for CI performance */
  workers: process.env.CI ? 4 : undefined,
  /* Global test ignore patterns - debug/diagnostic tests and mock infrastructure issues */
  testIgnore: GLOBAL_TEST_IGNORE,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['./tests/e2e/reporters/custom-reporter.ts'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL used with APP_URL and other relative navigations. */
    baseURL: 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Capture screenshot on test failure */
    screenshot: 'only-on-failure',
    /* Record video on test failure */
    video: 'retain-on-failure',
    /* CI-aware timeouts - double timeouts in CI environment for reliability */
    actionTimeout: process.env.CI ? 20000 : 10000,
    navigationTimeout: process.env.CI ? 60000 : 30000,
  },
  /* Global test timeout - increased for CI */
  timeout: process.env.CI ? 60000 : 30000,
  /* Expect timeout for assertions */
  expect: {
    timeout: process.env.CI ? 15000 : 5000,
  },

  /* Configure projects for major browsers */
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
            // Only use single-process in strict CI containers to avoid memory exhaustion
            ...(process.env.CI && process.env.CONTAINER ? ['--single-process', '--no-zygote'] : []),
            // Memory management
            '--js-flags=--max-old-space-size=2048',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            // Media device mocking
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
          ],
        },
        permissions: ['microphone', 'camera'],
      },
      // Full test suite on chromium (primary browser)
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Smoke tests only - extend global ignores with firefox-specific exclusions
      testIgnore: [...GLOBAL_TEST_IGNORE, /visual-regression\.spec\.ts/],
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // Smoke tests only - extend global ignores with webkit-specific exclusions
      testIgnore: [
        ...GLOBAL_TEST_IGNORE,
        /visual-regression\.spec\.ts/,
        /error-scenarios\.spec\.ts/,
        /accessibility\.spec\.ts/,
        /app-functionality\.spec\.ts/,
      ],
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      // Smoke tests only - extend global ignores with mobile-specific exclusions
      testIgnore: [
        ...GLOBAL_TEST_IGNORE,
        /visual-regression\.spec\.ts/,
        /accessibility\.spec\.ts/,
        /app-functionality\.spec\.ts/,
        /error-scenarios\.spec\.ts/,
      ],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      // Smoke tests only - extend global ignores with mobile safari-specific exclusions
      testIgnore: [
        ...GLOBAL_TEST_IGNORE,
        /visual-regression\.spec\.ts/,
        /accessibility\.spec\.ts/,
        /app-functionality\.spec\.ts/,
        /error-scenarios\.spec\.ts/,
      ],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for CI environments
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: process.env.CI ? 'pipe' : 'ignore',
  },
})
