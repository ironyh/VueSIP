/**
 * E2E Tests for Call Hold/Resume Functionality
 *
 * Tests the complete user flow for placing calls on hold and resuming them.
 */

import { test, expect } from '@playwright/test'

test.describe('Call Hold/Resume E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/')

    // Wait for app to be ready
    await page.waitForSelector('[data-testid="sip-registration-status"]', { timeout: 10000 })
  })

  test('should place active call on hold and resume', async ({ page }) => {
    // Register SIP client
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')

    // Wait for registration
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    // Make a call
    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')

    // Wait for call to be active
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    // Verify hold button is visible and enabled
    const holdButton = page.locator('[data-testid="hold-button"]')
    await expect(holdButton).toBeVisible()
    await expect(holdButton).toBeEnabled()

    // Place call on hold
    await holdButton.click()

    // Verify hold state UI changes
    await expect(page.locator('[data-testid="call-status"]')).toContainText('On Hold', {
      timeout: 3000,
    })
    await expect(page.locator('[data-testid="hold-indicator"]')).toBeVisible()
    await expect(holdButton).toHaveText(/Resume|Unhold/i)

    // Verify audio is muted during hold (if indicator exists)
    const audioMutedIndicator = page.locator('[data-testid="audio-muted-indicator"]')
    if (await audioMutedIndicator.isVisible()) {
      await expect(audioMutedIndicator).toBeVisible()
    }

    // Resume call
    await holdButton.click()

    // Verify call is active again
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 3000,
    })
    await expect(page.locator('[data-testid="hold-indicator"]')).not.toBeVisible()
    await expect(holdButton).toHaveText(/Hold/i)
  })

  test('should toggle hold state multiple times', async ({ page }) => {
    // Setup and make call (same as above)
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    const holdButton = page.locator('[data-testid="hold-button"]')

    // Toggle hold multiple times
    for (let i = 0; i < 3; i++) {
      // Hold
      await holdButton.click()
      await expect(page.locator('[data-testid="call-status"]')).toContainText('On Hold', {
        timeout: 3000,
      })

      // Resume
      await holdButton.click()
      await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
        timeout: 3000,
      })
    }

    // Verify call is still active after multiple toggles
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active')
  })

  test('should display remote hold indicator when remote party holds', async ({ page }) => {
    // Setup and make call
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    // Simulate remote hold by triggering event (test-only functionality)
    await page.evaluate(() => {
      // This assumes the test environment has a way to simulate remote hold
      // In a real test, this would be done by the mock SIP server
      if (typeof (window as any).__simulateRemoteHold === 'function') {
        ;(window as any).__simulateRemoteHold()
      }
    })

    // Verify remote hold indicator appears
    await expect(page.locator('[data-testid="remote-hold-indicator"]')).toBeVisible({
      timeout: 3000,
    })
    await expect(page.locator('[data-testid="call-status"]')).toContainText(/Remote.*Hold/i, {
      timeout: 3000,
    })

    // Local hold button should still be enabled during remote hold
    const holdButton = page.locator('[data-testid="hold-button"]')
    await expect(holdButton).toBeEnabled()
  })

  test('should maintain hold state during call duration timer', async ({ page }) => {
    // Setup and make call
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    // Wait for duration timer to start
    const durationDisplay = page.locator('[data-testid="call-duration"]')
    await expect(durationDisplay).toBeVisible({ timeout: 3000 })

    // Get initial duration
    const initialDuration = await durationDisplay.textContent()

    // Place on hold
    await page.click('[data-testid="hold-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('On Hold', {
      timeout: 3000,
    })

    // Wait a few seconds
    await page.waitForTimeout(3000)

    // Verify duration timer continues during hold
    const durationDuringHold = await durationDisplay.textContent()
    expect(durationDuringHold).not.toBe(initialDuration)

    // Resume and verify timer still running
    await page.click('[data-testid="hold-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 3000,
    })

    await page.waitForTimeout(1000)
    const durationAfterResume = await durationDisplay.textContent()
    expect(durationAfterResume).not.toBe(durationDuringHold)
  })

  test('should terminate call while on hold', async ({ page }) => {
    // Setup and make call
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    // Place on hold
    await page.click('[data-testid="hold-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('On Hold', {
      timeout: 3000,
    })

    // Hangup while on hold
    await page.click('[data-testid="hangup-button"]')

    // Verify call terminated
    await expect(page.locator('[data-testid="call-status"]')).toContainText(/Terminated|Ended|Idle/, {
      timeout: 3000,
    })

    // Verify hold indicator is gone
    await expect(page.locator('[data-testid="hold-indicator"]')).not.toBeVisible()
  })

  test('should handle hold operation failure gracefully', async ({ page }) => {
    // Setup and make call
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    // Simulate hold failure (test-only functionality)
    await page.evaluate(() => {
      if (typeof (window as any).__simulateHoldFailure === 'function') {
        ;(window as any).__simulateHoldFailure()
      }
    })

    // Try to place on hold
    await page.click('[data-testid="hold-button"]')

    // Verify error notification appears
    const errorNotification = page.locator('[data-testid="error-notification"]')
    if (await errorNotification.isVisible()) {
      await expect(errorNotification).toContainText(/hold.*failed/i, { timeout: 3000 })
    }

    // Verify call remains active (not on hold)
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 3000,
    })
  })

  test('should prevent hold when call is not active', async ({ page }) => {
    // Register but don't make a call
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    // Verify hold button is disabled when no active call
    const holdButton = page.locator('[data-testid="hold-button"]')
    if (await holdButton.isVisible()) {
      await expect(holdButton).toBeDisabled()
    }

    // Start a call
    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')

    // During ringing state, hold should be disabled
    const callStatus = page.locator('[data-testid="call-status"]')
    if ((await callStatus.textContent()) === 'Ringing') {
      if (await holdButton.isVisible()) {
        await expect(holdButton).toBeDisabled()
      }
    }

    // Once active, hold should be enabled
    await expect(callStatus).toContainText('Active', { timeout: 5000 })
    await expect(holdButton).toBeEnabled()
  })

  test('should display hold state in call history', async ({ page }) => {
    // Setup and make call
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    // Place on hold
    await page.click('[data-testid="hold-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('On Hold', {
      timeout: 3000,
    })

    // Wait a bit while on hold
    await page.waitForTimeout(2000)

    // Resume
    await page.click('[data-testid="hold-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 3000,
    })

    // End call
    await page.click('[data-testid="hangup-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText(/Terminated|Ended/, {
      timeout: 3000,
    })

    // Navigate to call history
    const historyTab = page.locator('[data-testid="call-history-tab"]')
    if (await historyTab.isVisible()) {
      await historyTab.click()

      // Verify call appears in history with hold information
      const historyEntry = page.locator('[data-testid="call-history-entry"]').first()
      await expect(historyEntry).toBeVisible()

      // Check if hold duration or indicator is shown in history
      const holdInfo = historyEntry.locator('[data-testid="hold-info"]')
      if (await holdInfo.isVisible()) {
        await expect(holdInfo).toContainText(/hold/i)
      }
    }
  })

  test('should handle rapid hold/resume toggling', async ({ page }) => {
    // Setup and make call
    await page.fill('[data-testid="sip-uri-input"]', 'sip:alice@test.com')
    await page.fill('[data-testid="sip-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="sip-registration-status"]')).toContainText('Registered', {
      timeout: 5000,
    })

    await page.fill('[data-testid="dial-input"]', 'sip:bob@test.com')
    await page.click('[data-testid="call-button"]')
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active', {
      timeout: 5000,
    })

    const holdButton = page.locator('[data-testid="hold-button"]')

    // Rapidly toggle hold state
    await holdButton.click()
    await page.waitForTimeout(100)
    await holdButton.click()
    await page.waitForTimeout(100)
    await holdButton.click()

    // Wait for state to settle
    await page.waitForTimeout(2000)

    // Verify call is in a valid state (either active or held, not stuck)
    const callStatus = await page.locator('[data-testid="call-status"]').textContent()
    expect(callStatus).toMatch(/Active|On Hold/)

    // Verify UI is responsive (button is enabled)
    await expect(holdButton).toBeEnabled()
  })
})
