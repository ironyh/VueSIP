/**
 * E2E tests for call transfer functionality
 * Tests complete transfer user flows with SIP REFER
 */

import { test, expect } from '@playwright/test'

test.describe('Call Transfer E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Wait for SIP client to be ready
    await page.waitForSelector('[data-testid="sip-status-registered"]', { timeout: 10000 })
  })

  test.describe('Blind Transfer', () => {
    test('should successfully perform blind transfer', async ({ page }) => {
      // Make an outgoing call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for call to be established
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Open transfer dialog
      await page.click('[data-testid="transfer-button"]')

      // Select blind transfer
      await page.click('[data-testid="transfer-type-blind"]')

      // Enter transfer target
      await page.fill('[data-testid="transfer-target-input"]', '1002')

      // Initiate transfer
      await page.click('[data-testid="transfer-execute-button"]')

      // Verify transfer initiated state
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('Initiated')

      // Wait for transfer to complete
      await page.waitForSelector('[data-testid="transfer-state-completed"]', { timeout: 10000 })

      // Verify call ended after successful transfer
      await expect(page.locator('[data-testid="call-state"]')).toHaveText('Terminated')
    })

    test('should show error for invalid transfer target', async ({ page }) => {
      // Make an outgoing call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for call to be established
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Open transfer dialog
      await page.click('[data-testid="transfer-button"]')

      // Select blind transfer
      await page.click('[data-testid="transfer-type-blind"]')

      // Enter invalid transfer target
      await page.fill('[data-testid="transfer-target-input"]', 'invalid-uri')

      // Attempt to initiate transfer
      await page.click('[data-testid="transfer-execute-button"]')

      // Verify error message
      await expect(page.locator('[data-testid="transfer-error"]')).toContainText('Invalid target URI')

      // Verify call still active
      await expect(page.locator('[data-testid="call-state"]')).toHaveText('Active')
    })

    test('should handle transfer rejection', async ({ page }) => {
      // Make an outgoing call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for call to be established
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Open transfer dialog
      await page.click('[data-testid="transfer-button"]')

      // Select blind transfer
      await page.click('[data-testid="transfer-type-blind"]')

      // Enter transfer target that will reject
      await page.fill('[data-testid="transfer-target-input"]', '9999')

      // Initiate transfer
      await page.click('[data-testid="transfer-execute-button"]')

      // Wait for transfer failure
      await page.waitForSelector('[data-testid="transfer-state-failed"]', { timeout: 10000 })

      // Verify error message
      await expect(page.locator('[data-testid="transfer-error"]')).toContainText('Transfer rejected')

      // Verify call still active
      await expect(page.locator('[data-testid="call-state"]')).toHaveText('Active')
    })

    test('should handle transfer timeout', async ({ page }) => {
      // Make an outgoing call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for call to be established
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Open transfer dialog
      await page.click('[data-testid="transfer-button"]')

      // Select blind transfer
      await page.click('[data-testid="transfer-type-blind"]')

      // Enter transfer target that will timeout
      await page.fill('[data-testid="transfer-target-input"]', '8888')

      // Initiate transfer
      await page.click('[data-testid="transfer-execute-button"]')

      // Wait for timeout (30 seconds)
      await page.waitForSelector('[data-testid="transfer-state-failed"]', { timeout: 35000 })

      // Verify timeout error
      await expect(page.locator('[data-testid="transfer-error"]')).toContainText('Transfer timeout')
    })
  })

  test.describe('Attended Transfer', () => {
    test('should successfully perform attended transfer', async ({ page }) => {
      // Make initial call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for call to be established
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Put call on hold
      await page.click('[data-testid="hold-button"]')
      await expect(page.locator('[data-testid="call-on-hold"]')).toBeVisible()

      // Make consultation call
      await page.fill('[data-testid="dialpad-input"]', '1002')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for consultation call to be established
      await page.waitForSelector('[data-testid="consultation-call-active"]', { timeout: 5000 })

      // Open transfer dialog
      await page.click('[data-testid="transfer-button"]')

      // Select attended transfer
      await page.click('[data-testid="transfer-type-attended"]')

      // Complete transfer
      await page.click('[data-testid="transfer-complete-button"]')

      // Verify transfer initiated
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('Initiated')

      // Wait for transfer to complete
      await page.waitForSelector('[data-testid="transfer-state-completed"]', { timeout: 10000 })

      // Verify both calls ended
      await expect(page.locator('[data-testid="active-calls-count"]')).toHaveText('0')
    })

    test('should require consultation call for attended transfer', async ({ page }) => {
      // Make initial call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for call to be established
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Open transfer dialog
      await page.click('[data-testid="transfer-button"]')

      // Select attended transfer
      await page.click('[data-testid="transfer-type-attended"]')

      // Verify transfer button is disabled (no consultation call)
      await expect(page.locator('[data-testid="transfer-complete-button"]')).toBeDisabled()

      // Verify warning message
      await expect(page.locator('[data-testid="transfer-warning"]')).toContainText(
        'Consultation call required'
      )
    })

    test('should allow switching back to original call during consultation', async ({ page }) => {
      // Make initial call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for call to be established
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Put call on hold
      await page.click('[data-testid="hold-button"]')

      // Make consultation call
      await page.fill('[data-testid="dialpad-input"]', '1002')
      await page.click('[data-testid="dialpad-call-button"]')

      // Wait for consultation call
      await page.waitForSelector('[data-testid="consultation-call-active"]', { timeout: 5000 })

      // Switch back to original call
      await page.click('[data-testid="call-list-item-1"]')

      // Verify original call is now active
      await expect(page.locator('[data-testid="active-call-id"]')).toContainText('1')

      // Verify consultation call is on hold
      await expect(page.locator('[data-testid="consultation-call-on-hold"]')).toBeVisible()
    })
  })

  test.describe('Transfer State Transitions', () => {
    test('should display all transfer states correctly', async ({ page }) => {
      // Make a call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Open transfer dialog
      await page.click('[data-testid="transfer-button"]')

      // Verify idle state
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('Idle')

      // Initiate transfer
      await page.click('[data-testid="transfer-type-blind"]')
      await page.fill('[data-testid="transfer-target-input"]', '1002')
      await page.click('[data-testid="transfer-execute-button"]')

      // Verify initiated state
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('Initiated')

      // Verify in-progress state
      await page.waitForSelector('[data-testid="transfer-state-in-progress"]', { timeout: 3000 })
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('In Progress')

      // Verify accepted state
      await page.waitForSelector('[data-testid="transfer-state-accepted"]', { timeout: 3000 })
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('Accepted')

      // Verify completed state
      await page.waitForSelector('[data-testid="transfer-state-completed"]', { timeout: 5000 })
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('Completed')
    })

    test('should show progress indicator during transfer', async ({ page }) => {
      // Make a call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Initiate transfer
      await page.click('[data-testid="transfer-button"]')
      await page.click('[data-testid="transfer-type-blind"]')
      await page.fill('[data-testid="transfer-target-input"]', '1002')
      await page.click('[data-testid="transfer-execute-button"]')

      // Verify progress indicator
      await expect(page.locator('[data-testid="transfer-progress-bar"]')).toBeVisible()

      // Verify progress updates
      const progressText = page.locator('[data-testid="transfer-progress-text"]')
      await expect(progressText).toContainText('%')
    })
  })

  test.describe('Transfer UI Integration', () => {
    test('should disable other call controls during transfer', async ({ page }) => {
      // Make a call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Initiate transfer
      await page.click('[data-testid="transfer-button"]')
      await page.click('[data-testid="transfer-type-blind"]')
      await page.fill('[data-testid="transfer-target-input"]', '1002')
      await page.click('[data-testid="transfer-execute-button"]')

      // Verify other controls are disabled
      await expect(page.locator('[data-testid="hold-button"]')).toBeDisabled()
      await expect(page.locator('[data-testid="mute-button"]')).toBeDisabled()
      await expect(page.locator('[data-testid="dtmf-button"]')).toBeDisabled()
    })

    test('should allow canceling transfer before completion', async ({ page }) => {
      // Make a call
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      // Initiate transfer
      await page.click('[data-testid="transfer-button"]')
      await page.click('[data-testid="transfer-type-blind"]')
      await page.fill('[data-testid="transfer-target-input"]', '1002')
      await page.click('[data-testid="transfer-execute-button"]')

      // Cancel transfer
      await page.click('[data-testid="transfer-cancel-button"]')

      // Verify transfer canceled
      await expect(page.locator('[data-testid="transfer-state"]')).toHaveText('Canceled')

      // Verify call still active
      await expect(page.locator('[data-testid="call-state"]')).toHaveText('Active')

      // Verify controls re-enabled
      await expect(page.locator('[data-testid="hold-button"]')).toBeEnabled()
    })

    test('should show transfer history', async ({ page }) => {
      // Make multiple transfers
      for (let i = 1; i <= 3; i++) {
        await page.fill('[data-testid="dialpad-input"]', `100${i}`)
        await page.click('[data-testid="dialpad-call-button"]')
        await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

        await page.click('[data-testid="transfer-button"]')
        await page.click('[data-testid="transfer-type-blind"]')
        await page.fill('[data-testid="transfer-target-input"]', `100${i + 1}`)
        await page.click('[data-testid="transfer-execute-button"]')

        await page.waitForSelector('[data-testid="transfer-state-completed"]', { timeout: 10000 })
      }

      // Open transfer history
      await page.click('[data-testid="transfer-history-button"]')

      // Verify history entries
      const historyItems = page.locator('[data-testid="transfer-history-item"]')
      await expect(historyItems).toHaveCount(3)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels for transfer controls', async ({ page }) => {
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      await page.click('[data-testid="transfer-button"]')

      // Verify ARIA labels
      await expect(page.locator('[data-testid="transfer-type-blind"]')).toHaveAttribute(
        'aria-label',
        'Blind transfer'
      )
      await expect(page.locator('[data-testid="transfer-type-attended"]')).toHaveAttribute(
        'aria-label',
        'Attended transfer'
      )
      await expect(page.locator('[data-testid="transfer-target-input"]')).toHaveAttribute(
        'aria-label',
        'Transfer target'
      )
    })

    test('should announce transfer state changes to screen readers', async ({ page }) => {
      await page.fill('[data-testid="dialpad-input"]', '1001')
      await page.click('[data-testid="dialpad-call-button"]')
      await page.waitForSelector('[data-testid="call-state-active"]', { timeout: 5000 })

      await page.click('[data-testid="transfer-button"]')
      await page.click('[data-testid="transfer-type-blind"]')
      await page.fill('[data-testid="transfer-target-input"]', '1002')
      await page.click('[data-testid="transfer-execute-button"]')

      // Verify live region for announcements
      const liveRegion = page.locator('[role="status"][aria-live="polite"]')
      await expect(liveRegion).toContainText('Transfer initiated')
    })
  })
})
