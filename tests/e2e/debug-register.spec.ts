import { test, expect, APP_URL } from './fixtures'
import { TEST_DATA, SELECTORS } from './selectors'

test.describe('Debug Registration', () => {
  test('debug registration flow', async ({
    page,
    mockSipServer,
    mockMediaDevices,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
  }) => {
    // Capture ALL console logs
    const logs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      const logLine = `${msg.type()}: ${text}`
      logs.push(logLine)
      // Log important ones immediately
      if (
        text.includes('[MockWebSocket]') ||
        text.includes('[EventBridge]') ||
        text.includes('REGISTER') ||
        text.includes('SipClient') ||
        text.includes('JsSIP') ||
        text.includes('Error') ||
        text.includes('error')
      ) {
        console.log(`BROWSER: ${logLine}`)
      }
    })

    await mockSipServer()
    await mockMediaDevices()
    await page.goto(APP_URL)
    await page.waitForSelector(SELECTORS.APP.ROOT, { timeout: 5000 })

    await configureSip({
      uri: TEST_DATA.VALID_WS_URI,
      username: TEST_DATA.VALID_SIP_URI,
      password: TEST_DATA.VALID_PASSWORD,
    })

    // Click connect button
    console.log('Clicking connect button...')
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)

    // Wait for connection
    console.log('Waiting for connection state...')
    await waitForConnectionState('connected')
    console.log('Connected!')

    // Wait a bit to see if REGISTER is sent
    await page.waitForTimeout(3000)

    // Check what messages were received by the mock WebSocket
    const wsDebug = await page.evaluate(() => {
      const debug = (window as any).__mockWebSocketDebug
      const ws = (window as any).__mockWebSocket
      return {
        received: debug?.getReceivedMessages?.() || [],
        sent: debug?.getSentMessages?.() || [],
        wsState: ws?.readyState,
        wsisSip: ws?.isSipWebSocket,
      }
    })
    console.log('MockWebSocket debug:', JSON.stringify(wsDebug, null, 2))

    // Try to wait for registration
    console.log('Waiting for registration state...')
    try {
      await waitForRegistrationState('registered')
      console.log('Registered!')
    } catch (e) {
      console.log('Registration timed out')

      // Check EventBridge state
      const bridgeState = await page.evaluate(() => {
        const bridge = (window as any).__sipEventBridge
        return {
          state: bridge?.state,
          eventLog: bridge?.eventLog?.slice(-10),
        }
      })
      console.log('EventBridge state:', JSON.stringify(bridgeState, null, 2))
    }

    // Check final UI state
    const regStatus = await page.locator(SELECTORS.STATUS.REGISTRATION_STATUS).textContent()
    console.log('UI Registration status:', regStatus)

    // Print FIRST 50 log entries to see full flow
    console.log('\n=== FIRST 50 LOG ENTRIES ===')
    logs.slice(0, 50).forEach((log, i) => console.log(`${i}: ${log}`))
    console.log('=== END LOGS ===\n')
  })
})
