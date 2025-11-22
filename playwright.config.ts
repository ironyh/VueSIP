import { defineConfig, devices } from '@playwright/test'

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
      // Smoke tests only - exclude visual regression and performance tests
      testIgnore: [
        /visual-regression\.spec\.ts/,
        /performance\.spec\.ts/,
      ],
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // Smoke tests only - exclude visual regression and performance tests
      testIgnore: [
        /visual-regression\.spec\.ts/,
        /performance\.spec\.ts/,
      ],
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      // Smoke tests only - exclude visual regression, performance, and advanced tests
      testIgnore: [
        /visual-regression\.spec\.ts/,
        /performance\.spec\.ts/,
        /av-quality\.spec\.ts/,
        /multi-user\.spec\.ts/,
      ],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      // Smoke tests only - exclude visual regression, performance, and advanced tests
      testIgnore: [
        /visual-regression\.spec\.ts/,
        /performance\.spec\.ts/,
        /av-quality\.spec\.ts/,
        /multi-user\.spec\.ts/,
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
