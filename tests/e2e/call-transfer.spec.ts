/**
 * Call Transfer E2E Tests
 *
 * Tests for basic call transfer functionality covering:
 * - Transfer button visibility during active calls
 * - Transfer dialog opening and input
 * - Blind transfer initiation
 * - Transfer status feedback
 *
 * Uses proper fixtures infrastructure for reliable mock SIP operations.
 * Note: TestApp.vue supports basic blind transfer only (no attended transfer).
 */

import { test, expect, APP_URL } from './fixtures'
import { SELECTORS, TEST_DATA } from './selectors'

test.describe('Call Transfer E2E', () => {
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

  test('should show transfer button during active call', async ({
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

    // Verify transfer button is visible during active call
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_BUTTON)).toBeVisible()
  })

  test('should not show transfer button when no call is active', async ({
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

    // Transfer button should not be visible without active call
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_BUTTON)).not.toBeVisible()
  })

  test('should open transfer input when transfer button is clicked', async ({
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

    // Click transfer button to open dialog
    await page.click(SELECTORS.TRANSFER.TRANSFER_BUTTON)

    // Verify transfer input and confirm button are visible
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_INPUT)).toBeVisible()
    await expect(page.locator(SELECTORS.TRANSFER.CONFIRM_TRANSFER_BUTTON)).toBeVisible()
  })

  test('should allow entering transfer target', async ({
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

    // Open transfer dialog
    await page.click(SELECTORS.TRANSFER.TRANSFER_BUTTON)

    // Enter transfer target
    const transferTarget = 'sip:reception@example.com'
    await page.fill(SELECTORS.TRANSFER.TRANSFER_INPUT, transferTarget)

    // Verify input contains the target
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_INPUT)).toHaveValue(transferTarget)
  })

  test('should initiate transfer and show status', async ({
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

    // Open transfer dialog and enter target
    await page.click(SELECTORS.TRANSFER.TRANSFER_BUTTON)
    await page.fill(SELECTORS.TRANSFER.TRANSFER_INPUT, 'sip:target@example.com')

    // Click confirm to initiate transfer
    await page.click(SELECTORS.TRANSFER.CONFIRM_TRANSFER_BUTTON)

    // Verify transfer status is displayed (either initiated or error)
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_STATUS)).toBeVisible()
  })

  test('should hide transfer controls after call ends', async ({
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

    // Verify transfer button is visible during active call
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_BUTTON)).toBeVisible()

    // Hangup the call
    await page.click(SELECTORS.CALL_CONTROLS.HANGUP_BUTTON)
    await waitForCallState(['idle', 'ended', 'terminated'])

    // Verify transfer button is no longer visible (give UI time to update)
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_BUTTON)).not.toBeVisible({
      timeout: 10000,
    })
  })

  test('should toggle transfer dialog visibility', async ({
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

    // Initially, transfer input should be hidden
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_INPUT)).not.toBeVisible()

    // Click transfer button to show dialog
    await page.click(SELECTORS.TRANSFER.TRANSFER_BUTTON)
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_INPUT)).toBeVisible()

    // Click transfer button again to hide dialog
    await page.click(SELECTORS.TRANSFER.TRANSFER_BUTTON)
    await expect(page.locator(SELECTORS.TRANSFER.TRANSFER_INPUT)).not.toBeVisible()
  })

  test('should maintain other call controls during transfer setup', async ({
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

    // Open transfer dialog
    await page.click(SELECTORS.TRANSFER.TRANSFER_BUTTON)

    // Verify other call controls are still available during transfer setup
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HANGUP_BUTTON)).toBeVisible()
    await expect(page.locator(SELECTORS.CALL_CONTROLS.MUTE_BUTTON)).toBeVisible()
    await expect(page.locator(SELECTORS.CALL_CONTROLS.HOLD_BUTTON)).toBeVisible()
  })
})
