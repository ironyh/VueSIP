import { defineConfig, devices } from '@playwright/test'

// Minimal config for running the real-PBX e2e specs (call-center-inbound-pbx*.spec.ts)
// against an already-running dev server, bypassing the auto-start webServer
// entries that target the default 5173/5174 ports. Useful when those ports are
// occupied by other dev apps.
//
// Usage:
//   1) Start the call-center dev server:   node node_modules/vite/bin/vite.js \
//        --prefix examples/call-center --port 5175 --strictPort
//   2) node node_modules/@playwright/test/cli.js test --config=tests/e2e/pbx.local.config.ts \
//        tests/e2e/call-center-inbound-pbx-audio.spec.ts
//   (with VUESIP_TEST_* env vars set, and CALL_CENTER_URL/CALL_CENTER_PORT matching)
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line']],
  use: {
    baseURL:
      process.env.CALL_CENTER_URL || `http://localhost:${process.env.CALL_CENTER_PORT || '5175'}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
