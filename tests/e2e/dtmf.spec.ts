/**
 * DTMF E2E Tests
 *
 * End-to-end tests for DTMF functionality covering:
 * - Dialpad visibility during calls
 * - DTMF button clicks
 * - DTMF feedback display
 * - All digit types (0-9, *, #)
 *
 * Uses proper fixtures infrastructure for reliable mock SIP operations.
 */

import { test, expect, APP_URL } from './fixtures'
import { SELECTORS, TEST_DATA, getDTMFSelector } from './selectors'

test.describe('DTMF Functionality', () => {
  // Skip in WebKit due to JsSIP Proxy incompatibility
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'JsSIP Proxy incompatible with WebKit (see WEBKIT_KNOWN_ISSUES.md)'
  )

  test.beforeEach(async ({ page, mockSipServer, mockMediaDevices }) => {
    // Setup mocks
    await mockSipServer()
    await mockMediaDevices()

    // Navigate to app
    await page.goto(APP_URL)
    await expect(page.locator(SELECTORS.APP.ROOT)).toBeVisible()
  })

  test('should show DTMF pad toggle button during active call', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Verify DTMF toggle button is visible during active call
    await expect(page.locator(SELECTORS.DIALPAD.DIALPAD_TOGGLE)).toBeVisible()
  })

  test('should toggle DTMF pad visibility', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // DTMF buttons should initially be hidden (pad not shown)
    await expect(page.locator(SELECTORS.DTMF.DTMF_1)).not.toBeVisible()

    // Click toggle to show DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // DTMF buttons should now be visible
    await expect(page.locator(SELECTORS.DTMF.DTMF_1)).toBeVisible()

    // Click toggle again to hide DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // DTMF buttons should be hidden again
    await expect(page.locator(SELECTORS.DTMF.DTMF_1)).not.toBeVisible()
  })

  test('should display all DTMF buttons when pad is open', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Open DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // Verify all digits are visible
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#']
    for (const digit of digits) {
      const selector = getDTMFSelector(digit)
      await expect(page.locator(selector)).toBeVisible()
    }
  })

  test('should send DTMF tone and show feedback', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Open DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // Click digit 5
    await page.click(SELECTORS.DTMF.DTMF_5)

    // Verify feedback shows the sent digit
    await expect(page.locator(SELECTORS.DTMF.DTMF_FEEDBACK)).toContainText('5')
  })

  test('should send multiple DTMF tones in sequence', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Open DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // Send sequence: 1, 2, 3
    await page.click(SELECTORS.DTMF.DTMF_1)
    await page.waitForTimeout(100)
    await page.click(SELECTORS.DTMF.DTMF_2)
    await page.waitForTimeout(100)
    await page.click(SELECTORS.DTMF.DTMF_3)

    // Verify feedback shows all sent digits
    await expect(page.locator(SELECTORS.DTMF.DTMF_FEEDBACK)).toContainText('123')
  })

  test('should send star and hash DTMF tones', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Open DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // Send star
    await page.click(SELECTORS.DTMF.DTMF_STAR)
    await expect(page.locator(SELECTORS.DTMF.DTMF_FEEDBACK)).toContainText('*')

    // Send hash
    await page.click(SELECTORS.DTMF.DTMF_HASH)
    await expect(page.locator(SELECTORS.DTMF.DTMF_FEEDBACK)).toContainText('#')
  })

  test('should handle IVR-style DTMF sequence', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it (like calling an IVR)
    await simulateIncomingCall('sip:ivr@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Open DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // Simulate IVR navigation: Press 1 for support, then # to confirm
    await page.click(SELECTORS.DTMF.DTMF_1)
    await page.waitForTimeout(200)
    await page.click(SELECTORS.DTMF.DTMF_HASH)

    // Verify IVR sequence was captured
    const feedback = page.locator(SELECTORS.DTMF.DTMF_FEEDBACK)
    await expect(feedback).toContainText('1')
    await expect(feedback).toContainText('#')
  })

  test('should handle rapid DTMF button presses', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Open DTMF pad
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)

    // Rapidly press buttons with minimal delay
    const rapidSequence = ['1', '2', '3', '4', '5']
    for (const digit of rapidSequence) {
      await page.click(getDTMFSelector(digit))
      await page.waitForTimeout(50) // Minimal delay
    }

    // Verify all tones were captured in feedback
    const feedback = page.locator(SELECTORS.DTMF.DTMF_FEEDBACK)
    await expect(feedback).toContainText('12345')
  })

  test('should not show DTMF pad when no call is active', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
  }) => {
    // Configure and connect (but don't make a call)
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // DTMF toggle should not be visible without active call
    await expect(page.locator(SELECTORS.DIALPAD.DIALPAD_TOGGLE)).not.toBeVisible()

    // Individual DTMF buttons should not be visible
    await expect(page.locator(SELECTORS.DTMF.DTMF_1)).not.toBeVisible()
  })

  test('should hide DTMF pad after call ends', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Open DTMF pad and verify it's visible
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)
    await expect(page.locator(SELECTORS.DTMF.DTMF_1)).toBeVisible()

    // Hang up the call
    await page.click(SELECTORS.CALL_CONTROLS.HANGUP_BUTTON)
    await waitForCallState(['idle', 'ended'])

    // DTMF toggle should no longer be visible
    await expect(page.locator(SELECTORS.DIALPAD.DIALPAD_TOGGLE)).not.toBeVisible()
  })
})

test.describe('DTMF During Held Call', () => {
  // Skip in WebKit due to JsSIP Proxy incompatibility
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'JsSIP Proxy incompatible with WebKit (see WEBKIT_KNOWN_ISSUES.md)'
  )

  test.beforeEach(async ({ page, mockSipServer, mockMediaDevices }) => {
    await mockSipServer()
    await mockMediaDevices()
    await page.goto(APP_URL)
    await expect(page.locator(SELECTORS.APP.ROOT)).toBeVisible()
  })

  test('should show DTMF controls during held call', async ({
    page,
    configureSip,
    waitForConnectionState,
    waitForRegistrationState,
    simulateIncomingCall,
    waitForCallState,
  }) => {
    // Configure and connect
    await configureSip(TEST_DATA.VALID_CONFIG)
    await page.click(SELECTORS.CONNECTION.CONNECT_BUTTON)
    await waitForConnectionState('connected')
    await waitForRegistrationState('registered')

    // Simulate incoming call and answer it
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Put call on hold
    await page.click(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)
    await waitForCallState('held')

    // DTMF toggle should still be accessible during held call
    // (TestApp.vue shows DTMF section when callState === 'active' || callState === 'held')
    await expect(page.locator(SELECTORS.DIALPAD.DIALPAD_TOGGLE)).toBeVisible()

    // Open DTMF pad - UI should still be available
    await page.click(SELECTORS.DIALPAD.DIALPAD_TOGGLE)
    await expect(page.locator(SELECTORS.DTMF.DTMF_1)).toBeVisible()
    await expect(page.locator(SELECTORS.DTMF.DTMF_9)).toBeVisible()

    // Note: Actually sending DTMF during held calls depends on the SIP implementation
    // and may not work with mock infrastructure. The important thing is the UI is accessible.
  })
})
