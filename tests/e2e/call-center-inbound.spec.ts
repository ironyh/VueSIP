/**
 * Call-center inbound call e2e (Fas 1 — mocked SIP).
 *
 * Verifies the ringing-UI + answer/reject + wrap-up flow that the app changes in
 * feat/call-center-inbound-answer introduced. Uses the mock SIP server + the
 * `simulateIncomingCall` fixture to inject a ringing inbound call (the same
 * fixture pattern as incoming-call.spec.ts), so it runs without a real PBX.
 *
 * What this proves: when a SIP INVITE arrives at the connected endpoint, the
 * IncomingCallBanner renders with Svara/Avvisa buttons; clicking Svara calls
 * useCallSession.answer() (not makeCall); the call becomes active; hangup
 * triggers wrap-up. This is the app-side precondition for the Nivå 3 live-PBX
 * test (which injects the caller via AMI Originate instead).
 */

import { test, expect } from './fixtures'

const CALL_CENTER_URL = process.env.CALL_CENTER_URL || 'http://localhost:5174/?test=true'

test.describe('Call-center inbound call flow', () => {
  test('rings, accepts, and wraps up an incoming call', async ({
    page,
    mockSipServer,
    mockMediaDevices,
    simulateIncomingCall,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Smoke is validated in Chromium only')

    await mockSipServer()
    await mockMediaDevices()
    await page.goto(CALL_CENTER_URL)

    // Sign in (demo mode — no AMI URL → demo gateway).
    await expect(page.getByTestId('call-center-login')).toBeVisible()
    await page.getByTestId('call-center-username').fill('1001')
    await page.getByTestId('call-center-password').fill('testpassword')
    await page.getByTestId('call-center-display-name').fill('Agent Inbound')
    await page.getByTestId('call-center-connect').click()
    await expect(page.getByTestId('call-center-dashboard')).toBeVisible({ timeout: 15000 })

    await page.getByTestId('agent-status-available').click()

    // Inject a ringing inbound call via the mock SIP transport.
    await simulateIncomingCall('sip:alice.smith@example.com')

    // The incoming banner must render with Svara/Avvisa buttons.
    await expect(page.getByTestId('call-center-incoming-banner')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('call-center-incoming-accept')).toBeVisible()
    await expect(page.getByTestId('call-center-incoming-reject')).toBeVisible()

    // Accept → the call becomes active (answer() was invoked, not makeCall()).
    await page.getByTestId('call-center-incoming-accept').click()
    await expect(page.getByTestId('call-center-active-call')).toBeVisible({ timeout: 10000 })

    // Hang up → wrap-up panel.
    await page.getByTestId('call-center-hangup').click()
    await expect(page.getByTestId('call-center-wrap-up')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('wrap-up-disposition').selectOption('resolved')
    await page.getByTestId('wrap-up-notes').fill('Inbound call resolved')
    await page.getByTestId('wrap-up-complete').click()

    // Back to available — wrap-up cleared.
    await expect(page.getByTestId('call-center-dashboard')).toBeVisible({ timeout: 10000 })
  })

  test('rejecting a ringing call returns to available without an active call', async ({
    page,
    mockSipServer,
    mockMediaDevices,
    simulateIncomingCall,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Smoke is validated in Chromium only')

    await mockSipServer()
    await mockMediaDevices()
    await page.goto(CALL_CENTER_URL)

    await expect(page.getByTestId('call-center-login')).toBeVisible()
    await page.getByTestId('call-center-username').fill('1001')
    await page.getByTestId('call-center-password').fill('testpassword')
    await page.getByTestId('call-center-display-name').fill('Agent Reject')
    await page.getByTestId('call-center-connect').click()
    await expect(page.getByTestId('call-center-dashboard')).toBeVisible({ timeout: 15000 })

    await page.getByTestId('agent-status-available').click()
    await simulateIncomingCall('sip:bob.jones@example.com')

    await expect(page.getByTestId('call-center-incoming-banner')).toBeVisible({ timeout: 8000 })
    await page.getByTestId('call-center-incoming-reject').click()

    // No active call should appear; the banner dismisses.
    await expect(page.getByTestId('call-center-incoming-banner')).toBeHidden({ timeout: 5000 })
    await expect(page.getByTestId('call-center-active-call')).toBeHidden()
  })
})
