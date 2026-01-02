/**
 * Call Hold/Resume E2E Tests
 *
 * Tests for call hold and resume functionality covering:
 * - Basic hold and resume operations
 * - Multiple hold toggles
 * - Hanging up while on hold
 * - Hold button visibility states
 *
 * Uses proper fixtures infrastructure for reliable mock SIP operations.
 */

import { test, expect, APP_URL } from './fixtures'
import { SELECTORS, TEST_DATA } from './selectors'

test.describe('Call Hold/Resume E2E', () => {
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

  test('should place active call on hold and resume', async ({
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

    // Verify hold button is visible and shows "Hold"
    const holdButton = page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)
    await expect(holdButton).toBeVisible()
    await expect(holdButton).toContainText(/Hold/i)

    // Place call on hold
    await holdButton.click()
    await waitForCallState('held')

    // Verify button now shows "Unhold" and call status shows held
    const unholdButton = page.locator(SELECTORS.CALL_CONTROLS.UNHOLD_BUTTON)
    await expect(unholdButton).toBeVisible()
    await expect(unholdButton).toContainText(/Unhold/i)
    await expect(page.locator(SELECTORS.STATUS.CALL_STATUS)).toContainText(/held/i)

    // Resume call
    await unholdButton.click()
    await waitForCallState('active')

    // Verify button shows "Hold" again
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).toBeVisible()
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).toContainText(/Hold/i)
  })

  test('should toggle hold state multiple times', async ({
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

    // Toggle hold multiple times
    for (let i = 0; i < 3; i++) {
      // Hold
      await page.click(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)
      await waitForCallState('held')
      await expect(page.locator(SELECTORS.STATUS.CALL_STATUS)).toContainText(/held/i)

      // Resume
      await page.click(SELECTORS.CALL_CONTROLS.UNHOLD_BUTTON)
      await waitForCallState('active')
      await expect(page.locator(SELECTORS.STATUS.CALL_STATUS)).toContainText(/active/i)
    }

    // Verify call is still active after multiple toggles
    await expect(page.locator(SELECTORS.STATUS.CALL_STATUS)).toContainText(/active/i)
  })

  test('should terminate call while on hold', async ({
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

    // Place call on hold
    await page.click(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)
    await waitForCallState('held')
    await expect(page.locator(SELECTORS.STATUS.CALL_STATUS)).toContainText(/held/i)

    // Hangup while on hold
    await page.click(SELECTORS.CALL_CONTROLS.HANGUP_BUTTON)
    await waitForCallState(['idle', 'ended', 'terminated'])

    // Verify hold button is no longer visible
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).not.toBeVisible()
    await expect(page.locator(SELECTORS.CALL_CONTROLS.UNHOLD_BUTTON)).not.toBeVisible()
  })

  test('should not show hold button when no call is active', async ({
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

    // Hold button should not be visible without active call
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).not.toBeVisible()
    await expect(page.locator(SELECTORS.CALL_CONTROLS.UNHOLD_BUTTON)).not.toBeVisible()
  })

  test('should show hold button during ringing state for outgoing calls', async ({
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

    // Simulate incoming call (to test ringing state)
    await simulateIncomingCall('sip:caller@example.com')
    await waitForCallState('ringing')

    // During ringing (incoming), hold button should NOT be visible
    // Hold only makes sense for active calls
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).not.toBeVisible()

    // Answer the call
    await page.click(SELECTORS.CALL_CONTROLS.ANSWER_BUTTON)
    await waitForCallState('active')

    // Now hold button should be visible
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).toBeVisible()
  })

  test('should maintain call controls during held state', async ({
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

    // Place call on hold
    await page.click(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)
    await waitForCallState('held')

    // Verify other call controls are still available during hold
    // Hangup should still be visible
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HANGUP_BUTTON)).toBeVisible()

    // Mute button should still be visible
    await expect(page.locator(SELECTORS.CALL_CONTROLS.MUTE_BUTTON)).toBeVisible()

    // Unhold button should be visible
    await expect(page.locator(SELECTORS.CALL_CONTROLS.UNHOLD_BUTTON)).toBeVisible()
  })

  test('should hide hold controls after call ends', async ({
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

    // Verify hold button is visible during active call
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).toBeVisible()

    // Hangup the call
    await page.click(SELECTORS.CALL_CONTROLS.HANGUP_BUTTON)
    await waitForCallState(['idle', 'ended', 'terminated'])

    // Verify hold button is no longer visible
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).not.toBeVisible()
    await expect(page.locator(SELECTORS.CALL_CONTROLS.UNHOLD_BUTTON)).not.toBeVisible()
  })
})
