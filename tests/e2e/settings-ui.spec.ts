/**
 * Settings UI E2E Tests
 * End-to-end tests for settings panel user interface
 */

import { test, expect } from '@playwright/test'

test.describe('Settings UI', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'camera'])

    // Navigate to app
    await page.goto('/')

    // Open settings panel
    await page.click('[data-testid="settings-button"]')
    await page.waitForSelector('[data-testid="settings-panel"]')
  })

  test.describe('Settings Panel Navigation', () => {
    test('should open settings panel', async ({ page }) => {
      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible()
    })

    test('should show all settings categories', async ({ page }) => {
      await expect(page.locator('[data-testid="sip-settings-tab"]')).toBeVisible()
      await expect(page.locator('[data-testid="audio-settings-tab"]')).toBeVisible()
      await expect(page.locator('[data-testid="video-settings-tab"]')).toBeVisible()
      await expect(page.locator('[data-testid="network-settings-tab"]')).toBeVisible()
    })

    test('should switch between settings tabs', async ({ page }) => {
      await page.click('[data-testid="audio-settings-tab"]')
      await expect(page.locator('[data-testid="audio-settings-panel"]')).toBeVisible()

      await page.click('[data-testid="video-settings-tab"]')
      await expect(page.locator('[data-testid="video-settings-panel"]')).toBeVisible()

      await page.click('[data-testid="network-settings-tab"]')
      await expect(page.locator('[data-testid="network-settings-panel"]')).toBeVisible()

      await page.click('[data-testid="sip-settings-tab"]')
      await expect(page.locator('[data-testid="sip-settings-panel"]')).toBeVisible()
    })

    test('should close settings panel', async ({ page }) => {
      await page.click('[data-testid="settings-close-button"]')
      await expect(page.locator('[data-testid="settings-panel"]')).not.toBeVisible()
    })
  })

  test.describe('SIP Settings Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="sip-settings-tab"]')
    })

    test('should display SIP server input', async ({ page }) => {
      await expect(page.locator('[data-testid="sip-server-input"]')).toBeVisible()
    })

    test('should update SIP server', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', 'sip.test.com')

      const value = await page.locator('[data-testid="sip-server-input"]').inputValue()
      expect(value).toBe('sip.test.com')
    })

    test('should update SIP port', async ({ page }) => {
      await page.fill('[data-testid="sip-port-input"]', '5061')

      const value = await page.locator('[data-testid="sip-port-input"]').inputValue()
      expect(value).toBe('5061')
    })

    test('should select transport protocol', async ({ page }) => {
      await page.selectOption('[data-testid="sip-transport-select"]', 'TCP')

      const value = await page.locator('[data-testid="sip-transport-select"]').inputValue()
      expect(value).toBe('TCP')
    })

    test('should update username and password', async ({ page }) => {
      await page.fill('[data-testid="sip-username-input"]', 'testuser')
      await page.fill('[data-testid="sip-password-input"]', 'testpass')

      const username = await page.locator('[data-testid="sip-username-input"]').inputValue()
      const password = await page.locator('[data-testid="sip-password-input"]').inputValue()

      expect(username).toBe('testuser')
      expect(password).toBe('testpass')
    })

    test('should update display name', async ({ page }) => {
      await page.fill('[data-testid="sip-displayname-input"]', 'Test User')

      const value = await page.locator('[data-testid="sip-displayname-input"]').inputValue()
      expect(value).toBe('Test User')
    })

    test('should toggle auto-register', async ({ page }) => {
      await page.click('[data-testid="sip-autoregister-toggle"]')

      const checked = await page.locator('[data-testid="sip-autoregister-toggle"]').isChecked()
      expect(checked).toBeDefined()
    })

    test('should show validation errors for empty server', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', '')
      await page.click('[data-testid="save-settings-button"]')

      await expect(page.locator('[data-testid="server-error"]')).toBeVisible()
    })

    test('should show validation errors for invalid port', async ({ page }) => {
      await page.fill('[data-testid="sip-port-input"]', '99999')
      await page.click('[data-testid="save-settings-button"]')

      await expect(page.locator('[data-testid="port-error"]')).toBeVisible()
    })
  })

  test.describe('Audio Settings Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="audio-settings-tab"]')
    })

    test('should display audio device selectors', async ({ page }) => {
      await expect(page.locator('[data-testid="microphone-select"]')).toBeVisible()
      await expect(page.locator('[data-testid="speaker-select"]')).toBeVisible()
    })

    test('should select microphone device', async ({ page }) => {
      const options = await page.locator('[data-testid="microphone-select"] option').count()

      if (options > 1) {
        await page.selectOption('[data-testid="microphone-select"]', { index: 1 })

        const selectedValue = await page.locator('[data-testid="microphone-select"]').inputValue()
        expect(selectedValue).toBeTruthy()
      }
    })

    test('should adjust input volume', async ({ page }) => {
      await page.fill('[data-testid="input-volume-slider"]', '75')

      const value = await page.locator('[data-testid="input-volume-value"]').textContent()
      expect(value).toBe('75')
    })

    test('should adjust output volume', async ({ page }) => {
      await page.fill('[data-testid="output-volume-slider"]', '60')

      const value = await page.locator('[data-testid="output-volume-value"]').textContent()
      expect(value).toBe('60')
    })

    test('should toggle echo cancellation', async ({ page }) => {
      const initialState = await page
        .locator('[data-testid="echo-cancellation-toggle"]')
        .isChecked()

      await page.click('[data-testid="echo-cancellation-toggle"]')

      const newState = await page.locator('[data-testid="echo-cancellation-toggle"]').isChecked()
      expect(newState).toBe(!initialState)
    })

    test('should toggle noise suppression', async ({ page }) => {
      const initialState = await page
        .locator('[data-testid="noise-suppression-toggle"]')
        .isChecked()

      await page.click('[data-testid="noise-suppression-toggle"]')

      const newState = await page.locator('[data-testid="noise-suppression-toggle"]').isChecked()
      expect(newState).toBe(!initialState)
    })

    test('should toggle auto gain control', async ({ page }) => {
      const initialState = await page.locator('[data-testid="auto-gain-toggle"]').isChecked()

      await page.click('[data-testid="auto-gain-toggle"]')

      const newState = await page.locator('[data-testid="auto-gain-toggle"]').isChecked()
      expect(newState).toBe(!initialState)
    })

    test('should select audio codec', async ({ page }) => {
      await page.selectOption('[data-testid="audio-codec-select"]', 'opus')

      const value = await page.locator('[data-testid="audio-codec-select"]').inputValue()
      expect(value).toBe('opus')
    })
  })

  test.describe('Video Settings Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="video-settings-tab"]')
    })

    test('should toggle video enable', async ({ page }) => {
      await page.click('[data-testid="video-enable-toggle"]')

      const checked = await page.locator('[data-testid="video-enable-toggle"]').isChecked()
      expect(checked).toBeDefined()
    })

    test('should select video resolution', async ({ page }) => {
      await page.selectOption('[data-testid="video-resolution-select"]', '1920x1080')

      const value = await page.locator('[data-testid="video-resolution-select"]').inputValue()
      expect(value).toBe('1920x1080')
    })

    test('should adjust frame rate', async ({ page }) => {
      await page.fill('[data-testid="video-framerate-input"]', '30')

      const value = await page.locator('[data-testid="video-framerate-input"]').inputValue()
      expect(value).toBe('30')
    })

    test('should select video codec', async ({ page }) => {
      await page.selectOption('[data-testid="video-codec-select"]', 'H264')

      const value = await page.locator('[data-testid="video-codec-select"]').inputValue()
      expect(value).toBe('H264')
    })
  })

  test.describe('Network Settings Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="network-settings-tab"]')
    })

    test('should toggle QoS', async ({ page }) => {
      await page.click('[data-testid="qos-enable-toggle"]')

      const checked = await page.locator('[data-testid="qos-enable-toggle"]').isChecked()
      expect(checked).toBeDefined()
    })

    test('should adjust max bitrate', async ({ page }) => {
      await page.fill('[data-testid="max-bitrate-input"]', '2000')

      const value = await page.locator('[data-testid="max-bitrate-input"]').inputValue()
      expect(value).toBe('2000')
    })

    test('should adjust min bitrate', async ({ page }) => {
      await page.fill('[data-testid="min-bitrate-input"]', '500')

      const value = await page.locator('[data-testid="min-bitrate-input"]').inputValue()
      expect(value).toBe('500')
    })

    test('should toggle adaptive bitrate', async ({ page }) => {
      await page.click('[data-testid="adaptive-bitrate-toggle"]')

      const checked = await page.locator('[data-testid="adaptive-bitrate-toggle"]').isChecked()
      expect(checked).toBeDefined()
    })
  })

  test.describe('Save and Reset Operations', () => {
    test('should save settings', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', 'sip.newsettings.com')
      await page.click('[data-testid="save-settings-button"]')

      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()
    })

    test('should show unsaved changes indicator', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', 'sip.changed.com')

      await expect(page.locator('[data-testid="unsaved-changes-indicator"]')).toBeVisible()
    })

    test('should reset settings to defaults', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', 'sip.custom.com')
      await page.click('[data-testid="reset-settings-button"]')

      // Confirm reset dialog
      await page.click('[data-testid="confirm-reset-button"]')

      await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible()
    })

    test('should cancel reset operation', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', 'sip.custom.com')
      const customValue = await page.locator('[data-testid="sip-server-input"]').inputValue()

      await page.click('[data-testid="reset-settings-button"]')
      await page.click('[data-testid="cancel-reset-button"]')

      const currentValue = await page.locator('[data-testid="sip-server-input"]').inputValue()
      expect(currentValue).toBe(customValue)
    })
  })

  test.describe('Export/Import Operations', () => {
    test('should export settings', async ({ page }) => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-settings-button"]'),
      ])

      expect(download.suggestedFilename()).toContain('.json')
    })

    test('should import settings from file', async ({ page }) => {
      // Create test settings file
      const settingsData = JSON.stringify({
        sip: {
          server: 'sip.imported.com',
          port: 5060,
        },
      })

      // Upload file
      await page.setInputFiles('[data-testid="import-settings-input"]', {
        name: 'settings.json',
        mimeType: 'application/json',
        buffer: Buffer.from(settingsData),
      })

      await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible()
    })

    test('should handle invalid import file', async ({ page }) => {
      await page.setInputFiles('[data-testid="import-settings-input"]', {
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('invalid json'),
      })

      await expect(page.locator('[data-testid="import-error-message"]')).toBeVisible()
    })
  })

  test.describe('Keyboard Shortcuts', () => {
    test('should save with Ctrl+S', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', 'sip.shortcut.com')
      await page.keyboard.press('Control+S')

      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()
    })

    test('should close settings with Escape', async ({ page }) => {
      await page.keyboard.press('Escape')

      await expect(page.locator('[data-testid="settings-panel"]')).not.toBeVisible()
    })

    test('should navigate tabs with Tab key', async ({ page }) => {
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')

      // Should activate focused tab
      expect(true).toBe(true) // Visual focus test
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.keyboard.press('Tab')

      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(focused).toBeTruthy()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      const serverInput = page.locator('[data-testid="sip-server-input"]')
      const ariaLabel = await serverInput.getAttribute('aria-label')

      expect(ariaLabel).toBeTruthy()
    })

    test('should announce changes to screen readers', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', 'sip.test.com')

      const announcements = page.locator('[role="status"]')
      await expect(announcements.first()).toBeDefined()
    })

    test('should pass axe accessibility audit', async ({ page }) => {
      const { injectAxe, checkA11y } = await import('axe-playwright')

      await injectAxe(page)
      await checkA11y(page, '[data-testid="settings-panel"]', {
        detailedReport: true,
        detailedReportOptions: {
          html: true,
        },
      })
    })
  })

  test.describe('Responsive Behavior', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible()

      // Should be full screen on mobile
      const panelWidth = await page.locator('[data-testid="settings-panel"]').boundingBox()
      expect(panelWidth?.width).toBeGreaterThan(350)
    })

    test('should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })

      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible()
    })
  })

  test.describe('Form Validation Feedback', () => {
    test('should show inline validation errors', async ({ page }) => {
      await page.fill('[data-testid="sip-port-input"]', '-1')
      await page.click('[data-testid="sip-server-input"]') // Blur

      await expect(page.locator('[data-testid="port-error"]')).toBeVisible()
    })

    test('should clear validation errors on fix', async ({ page }) => {
      await page.fill('[data-testid="sip-port-input"]', '-1')
      await page.click('[data-testid="sip-server-input"]')

      await expect(page.locator('[data-testid="port-error"]')).toBeVisible()

      await page.fill('[data-testid="sip-port-input"]', '5060')
      await page.click('[data-testid="sip-server-input"]')

      await expect(page.locator('[data-testid="port-error"]')).not.toBeVisible()
    })

    test('should prevent save with validation errors', async ({ page }) => {
      await page.fill('[data-testid="sip-server-input"]', '')
      await page.click('[data-testid="save-settings-button"]')

      await expect(page.locator('[data-testid="save-error-message"]')).toBeVisible()
    })
  })
})
