/**
 * Multi-line Support E2E Tests
 *
 * End-to-end testing scenarios for multi-line functionality
 */

import { test, expect } from '@playwright/test'

test.describe('Multi-line Support E2E', () => {
  test.describe('Line Management', () => {
    test('should add and display multiple lines', async ({ page }) => {
      await page.goto('/')

      // Navigate to multi-line settings
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      // Add first line
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:line1@example.com')
      await page.fill('[data-testid="line-password-input"]', 'password1')
      await page.fill('[data-testid="line-displayname-input"]', 'Business Line')
      await page.click('[data-testid="save-line-button"]')

      // Verify first line is displayed
      await expect(page.locator('[data-testid="line-list"]')).toContainText('Business Line')
      await expect(page.locator('[data-testid="line-list"]')).toContainText('sip:line1@example.com')

      // Add second line
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:line2@example.com')
      await page.fill('[data-testid="line-password-input"]', 'password2')
      await page.fill('[data-testid="line-displayname-input"]', 'Personal Line')
      await page.click('[data-testid="save-line-button"]')

      // Verify both lines are displayed
      await expect(page.locator('[data-testid="line-item"]')).toHaveCount(2)
      await expect(page.locator('[data-testid="line-list"]')).toContainText('Personal Line')
    })

    test('should remove a line', async ({ page }) => {
      await page.goto('/')

      // Setup: Add two lines
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      // Add lines
      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.click('[data-testid="save-line-button"]')
      }

      // Remove first line
      await page.locator('[data-testid="line-item"]').first().hover()
      await page.click('[data-testid="remove-line-button"]').first()
      await page.click('[data-testid="confirm-remove-button"]')

      // Verify line was removed
      await expect(page.locator('[data-testid="line-item"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="line-list"]')).toContainText('Line 2')
      await expect(page.locator('[data-testid="line-list"]')).not.toContainText('Line 1')
    })

    test('should prevent removing line with active call', async ({ page }) => {
      await page.goto('/')

      // Setup: Add line and make a call
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:line1@example.com')
      await page.fill('[data-testid="line-password-input"]', 'password1')
      await page.fill('[data-testid="line-displayname-input"]', 'Test Line')
      await page.click('[data-testid="save-line-button"]')

      // Make a call
      await page.click('[data-testid="dialpad-button"]')
      await page.fill('[data-testid="phone-input"]', '1234567890')
      await page.click('[data-testid="call-button"]')

      // Try to remove line
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.locator('[data-testid="line-item"]').first().hover()
      await page.click('[data-testid="remove-line-button"]')

      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Cannot remove line with active call'
      )
    })
  })

  test.describe('Line Registration', () => {
    test('should register a line manually', async ({ page }) => {
      await page.goto('/')

      // Add line without auto-register
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:line1@example.com')
      await page.fill('[data-testid="line-password-input"]', 'password1')
      await page.fill('[data-testid="line-displayname-input"]', 'Test Line')
      await page.uncheck('[data-testid="auto-register-checkbox"]')
      await page.click('[data-testid="save-line-button"]')

      // Verify unregistered state
      await expect(page.locator('[data-testid="line-status"]')).toHaveText('Unregistered')

      // Register manually
      await page.click('[data-testid="register-line-button"]')

      // Wait for registration
      await expect(page.locator('[data-testid="line-status"]')).toHaveText('Registering', {
        timeout: 1000
      })
      await expect(page.locator('[data-testid="line-status"]')).toHaveText('Registered', {
        timeout: 3000
      })
    })

    test('should auto-register line on startup', async ({ page }) => {
      await page.goto('/')

      // Add line with auto-register
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:line1@example.com')
      await page.fill('[data-testid="line-password-input"]', 'password1')
      await page.fill('[data-testid="line-displayname-input"]', 'Auto Line')
      await page.check('[data-testid="auto-register-checkbox"]')
      await page.click('[data-testid="save-line-button"]')

      // Verify auto-registration
      await expect(page.locator('[data-testid="line-status"]')).toHaveText('Registered', {
        timeout: 3000
      })
    })

    test('should show registration error', async ({ page }) => {
      await page.goto('/')

      // Add line with invalid credentials
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:invalid@example.com')
      await page.fill('[data-testid="line-password-input"]', 'wrong')
      await page.fill('[data-testid="line-displayname-input"]', 'Invalid Line')
      await page.click('[data-testid="save-line-button"]')

      // Register
      await page.click('[data-testid="register-line-button"]')

      // Verify error
      await expect(page.locator('[data-testid="line-status"]')).toHaveText('Error', {
        timeout: 3000
      })
      await expect(page.locator('[data-testid="line-error"]')).toContainText('Invalid credentials')
    })
  })

  test.describe('Line Switching', () => {
    test('should switch between lines', async ({ page }) => {
      await page.goto('/')

      // Add two lines
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.click('[data-testid="save-line-button"]')
      }

      // Verify first line is active
      await expect(page.locator('[data-testid="line-item"]').first()).toHaveAttribute(
        'data-active',
        'true'
      )

      // Switch to second line
      await page.locator('[data-testid="line-item"]').nth(1).click()

      // Verify second line is now active
      await expect(page.locator('[data-testid="line-item"]').nth(1)).toHaveAttribute(
        'data-active',
        'true'
      )
      await expect(page.locator('[data-testid="active-line-indicator"]')).toContainText('Line 2')
    })

    test('should use active line for outgoing calls', async ({ page }) => {
      await page.goto('/')

      // Setup two lines
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.click('[data-testid="save-line-button"]')
      }

      // Switch to second line
      await page.locator('[data-testid="line-item"]').nth(1).click()

      // Make a call
      await page.click('[data-testid="dialpad-button"]')
      await page.fill('[data-testid="phone-input"]', '1234567890')
      await page.click('[data-testid="call-button"]')

      // Verify call is on second line
      await expect(page.locator('[data-testid="call-line-label"]')).toContainText('Line 2')
    })

    test('should maintain calls when switching lines', async ({ page }) => {
      await page.goto('/')

      // Setup two lines
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.click('[data-testid="save-line-button"]')
      }

      // Make call on first line
      await page.click('[data-testid="dialpad-button"]')
      await page.fill('[data-testid="phone-input"]', '1111111111')
      await page.click('[data-testid="call-button"]')

      // Switch to second line
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.locator('[data-testid="line-item"]').nth(1).click()

      // Make call on second line
      await page.click('[data-testid="dialpad-button"]')
      await page.fill('[data-testid="phone-input"]', '2222222222')
      await page.click('[data-testid="call-button"]')

      // Verify both calls exist
      await expect(page.locator('[data-testid="active-call"]')).toHaveCount(2)

      // Switch back to first line
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.locator('[data-testid="line-item"]').first().click()

      // Verify first line call is still active
      await expect(page.locator('[data-testid="call-line-label"]').first()).toContainText('Line 1')
    })
  })

  test.describe('Multi-call Scenarios', () => {
    test('should handle multiple simultaneous calls on different lines', async ({ page }) => {
      await page.goto('/')

      // Setup three lines
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.click('[data-testid="save-line-button"]')
      }

      // Make calls on all three lines
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="settings-button"]')
        await page.click('[data-testid="multi-line-tab"]')
        await page.locator('[data-testid="line-item"]').nth(i - 1).click()
        await page.click('[data-testid="dialpad-button"]')
        await page.fill('[data-testid="phone-input"]', `${i}${i}${i}${i}${i}${i}${i}${i}${i}${i}`)
        await page.click('[data-testid="call-button"]')
      }

      // Verify all calls are active
      await expect(page.locator('[data-testid="active-call"]')).toHaveCount(3)

      // Verify call list shows correct line associations
      for (let i = 1; i <= 3; i++) {
        await expect(
          page.locator('[data-testid="active-call"]').nth(i - 1).locator('[data-testid="call-line-label"]')
        ).toContainText(`Line ${i}`)
      }
    })

    test('should display per-line call counts', async ({ page }) => {
      await page.goto('/')

      // Setup two lines
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.click('[data-testid="save-line-button"]')
      }

      // Make two calls on first line
      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="dialpad-button"]')
        await page.fill('[data-testid="phone-input"]', `111111111${i}`)
        await page.click('[data-testid="call-button"]')
      }

      // Switch to second line and make one call
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.locator('[data-testid="line-item"]').nth(1).click()
      await page.click('[data-testid="dialpad-button"]')
      await page.fill('[data-testid="phone-input"]', '2222222222')
      await page.click('[data-testid="call-button"]')

      // Verify call counts
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      await expect(page.locator('[data-testid="line-call-count"]').first()).toHaveText('2')
      await expect(page.locator('[data-testid="line-call-count"]').nth(1)).toHaveText('1')
    })
  })

  test.describe('Line Priority and Routing', () => {
    test('should route incoming call to highest priority line', async ({ page }) => {
      await page.goto('/')

      // Setup lines with different priorities
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')

      const priorities = [3, 1, 2] // Line 2 has highest priority (1)
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.fill('[data-testid="line-priority-input"]', priorities[i - 1].toString())
        await page.click('[data-testid="save-line-button"]')
      }

      // Simulate incoming call
      await page.click('[data-testid="simulate-incoming-button"]')

      // Verify call routed to Line 2 (priority 1)
      await expect(page.locator('[data-testid="incoming-call-line"]')).toContainText('Line 2')
    })

    test('should route to least active line when strategy is least_active', async ({ page }) => {
      await page.goto('/')

      // Setup routing strategy
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.click('[data-testid="routing-settings-button"]')
      await page.selectOption('[data-testid="routing-strategy-select"]', 'least_active')
      await page.click('[data-testid="save-routing-button"]')

      // Add two lines
      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="add-line-button"]')
        await page.fill('[data-testid="line-uri-input"]', `sip:line${i}@example.com`)
        await page.fill('[data-testid="line-password-input"]', `password${i}`)
        await page.fill('[data-testid="line-displayname-input"]', `Line ${i}`)
        await page.click('[data-testid="save-line-button"]')
      }

      // Make call on first line
      await page.click('[data-testid="dialpad-button"]')
      await page.fill('[data-testid="phone-input"]', '1111111111')
      await page.click('[data-testid="call-button"]')

      // Simulate incoming call
      await page.click('[data-testid="simulate-incoming-button"]')

      // Verify call routed to Line 2 (least active)
      await expect(page.locator('[data-testid="incoming-call-line"]')).toContainText('Line 2')
    })
  })

  test.describe('Visual Indicators', () => {
    test('should show active line indicator', async ({ page }) => {
      await page.goto('/')

      // Add line
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:line1@example.com')
      await page.fill('[data-testid="line-password-input"]', 'password1')
      await page.fill('[data-testid="line-displayname-input"]', 'Active Line')
      await page.click('[data-testid="save-line-button"]')

      // Verify active indicator
      await expect(page.locator('[data-testid="active-line-badge"]')).toBeVisible()
      await expect(page.locator('[data-testid="active-line-indicator"]')).toContainText(
        'Active Line'
      )
    })

    test('should show registration status badges', async ({ page }) => {
      await page.goto('/')

      // Add line
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="multi-line-tab"]')
      await page.click('[data-testid="add-line-button"]')
      await page.fill('[data-testid="line-uri-input"]', 'sip:line1@example.com')
      await page.fill('[data-testid="line-password-input"]', 'password1')
      await page.fill('[data-testid="line-displayname-input"]', 'Test Line')
      await page.uncheck('[data-testid="auto-register-checkbox"]')
      await page.click('[data-testid="save-line-button"]')

      // Verify unregistered badge
      await expect(page.locator('[data-testid="line-status-badge"]')).toHaveClass(/unregistered/)

      // Register
      await page.click('[data-testid="register-line-button"]')

      // Verify registering badge
      await expect(page.locator('[data-testid="line-status-badge"]')).toHaveClass(/registering/)

      // Verify registered badge
      await expect(page.locator('[data-testid="line-status-badge"]')).toHaveClass(/registered/, {
        timeout: 3000
      })
    })
  })
})
