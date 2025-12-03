import { test, expect, APP_URL } from './fixtures'
import { TEST_DATA, SELECTORS } from './selectors'

test.describe('Debug Outgoing Call', () => {
  test('debug outgoing call flow', async ({
    page,
    mockSipServer,
    mockMediaDevices,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    waitForCallState,
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
        text.includes('INVITE') ||
        text.includes('SipClient') ||
        text.includes('JsSIP') ||
        text.includes('Error') ||
        text.includes('error') ||
        text.includes('call') ||
        text.includes('Call')
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

    // Connect first
    console.log('Clicking connect button...')
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)

    // Wait for connection
    console.log('Waiting for connection state...')
    await waitForConnectionState('connected')
    console.log('Connected!')

    // Wait for registration to complete before making calls
    console.log('Waiting for registration state...')
    await waitForRegistrationState('registered')
    console.log('Registered!')

    // Enter phone number
    console.log('Entering phone number...')
    await page.fill(SELECTORS.DIALPAD.NUMBER_INPUT, TEST_DATA.VALID_DESTINATION)

    // Click call button
    console.log('Clicking call button...')
    await page.click(SELECTORS.DIALPAD.CALL_BUTTON)

    // Wait a bit for INVITE to be sent
    await page.waitForTimeout(2000)

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

    // Check EventBridge state
    const bridgeState = await page.evaluate(() => {
      const bridge = (window as any).__sipEventBridge
      return {
        state: bridge?.state,
        eventLog: bridge?.eventLog?.slice(-10),
      }
    })
    console.log('EventBridge state:', JSON.stringify(bridgeState, null, 2))

    // Try to wait for call state
    console.log('Waiting for call state...')
    try {
      await waitForCallState(['ringing', 'answered', 'initiating'], 5000)
      console.log('Call state reached!')
    } catch (e) {
      console.log('Call state timed out')
    }

    // Print FIRST 50 log entries to see full flow
    console.log('\n=== FIRST 50 LOG ENTRIES ===')
    logs.slice(0, 50).forEach((log, i) => console.log(`${i}: ${log}`))
    console.log('=== END LOGS ===\n')
  })
})
