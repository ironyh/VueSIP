import { test, expect } from './fixtures'
import { APP_URL } from './fixtures'

test.describe('Call Functionality - Outgoing Calls - COPY FOR DEBUG', () => {
  // CRITICAL: Console listener must be set up BEFORE page.goto() to capture all logs
  const logs: string[] = []

  test.beforeEach(async ({ page, mockSipServer, mockMediaDevices, configureSip }) => {
    // Setup console listener FIRST
    page.on('console', (msg) => {
      const text = msg.text()
      logs.push(`[${msg.type()}] ${text}`)
      console.log(`[BROWSER] ${text}`) // Echo to test output immediately
    })

    await mockSipServer()
    await mockMediaDevices()
    await page.goto(APP_URL)

    await configureSip({
      uri: 'wss://sip.example.com:7443',
      username: 'sip:testuser@example.com',
      password: 'testpassword',
      autoRegister: true, // CRITICAL: Enable auto-registration after connect
    })
  })

  test('should make an outgoing call - EXACT COPY', async ({
    page,
    browserName,
    waitForConnectionState,
    waitForRegistrationState,
    waitForCallState,
  }) => {
    test.skip(browserName === 'webkit', 'JsSIP Proxy incompatible with WebKit')

    // CRITICAL: Check if EventBridge exists BEFORE clicking connect
    const bridgeCheck = await page.evaluate(() => {
      return {
        hasEmitSipEvent: typeof (window as any).__emitSipEvent === 'function',
        hasEventBridge: typeof (window as any).__sipEventBridge !== 'undefined',
      }
    })
    console.log('[TEST] EventBridge check BEFORE connect:', bridgeCheck)

    // Connect
    await page.click('[data-testid="connect-button"]')

    // Wait for connection and registration using fixtures
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Enter destination and make call
    await page.fill('[data-testid="dialpad-input"]', 'sip:destination@example.com')
    await page.click('[data-testid="call-button"]')

    // Wait for call to progress to ringing/active
    await waitForCallState(['ringing', 'active'])

    // Verify active call interface appears
    await expect(page.locator('[data-testid="active-call"]')).toBeVisible()

    console.log('\n========== BROWSER CONSOLE LOGS ==========')
    logs.forEach((log, i) => console.log(`${i}: ${log}`))
    console.log('========== END LOGS ==========\n')
  })
})
