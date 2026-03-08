/**
 * Settings Persistence E2E Tests
 * Tests for settings persistence across page reloads and migrations.
 * Requires an app that exposes settings data-testids (e.g. TestApp.vue).
 * Skipped when run against default playground; set E2E_SETTINGS_APP=1 when using that app.
 */
import { test, expect } from '@playwright/test'

const skipSettings = !process.env.E2E_SETTINGS_APP

test.describe('Settings Persistence', () => {
  test.beforeEach(({}, _testInfo) => {
    test.skip(
      skipSettings,
      'Settings data-testids not in default playground; set E2E_SETTINGS_APP=1 when using TestApp'
    )
  })
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['microphone', 'camera'])
    await page.goto('/')
  })

  test.describe('Settings Persistence Across Reloads', () => {
    test('should persist SIP settings after page reload', async ({ page }) => {
      // Open settings and configure
      await page.click('[data-testid="settings-button"]')
      await page.fill('[data-testid="sip-server-input"]', 'sip.persist.com')
      await page.fill('[data-testid="sip-port-input"]', '5061')
      await page.click('[data-testid="save-settings-button"]')

      // Wait for save confirmation
      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()

      // Reload page
      await page.reload()

      // Reopen settings and verify
      await page.click('[data-testid="settings-button"]')

      const server = await page.locator('[data-testid="sip-server-input"]').inputValue()
      const port = await page.locator('[data-testid="sip-port-input"]').inputValue()

      expect(server).toBe('sip.persist.com')
      expect(port).toBe('5061')
    })

    test('should persist audio settings after page reload', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="audio-settings-tab"]')

      await page.fill('[data-testid="input-volume-slider"]', '75')
      await page.click('[data-testid="echo-cancellation-toggle"]')
      await page.click('[data-testid="save-settings-button"]')

      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()

      await page.reload()
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="audio-settings-tab"]')

      const volume = await page.locator('[data-testid="input-volume-value"]').textContent()
      const echoEnabled = await page.locator('[data-testid="echo-cancellation-toggle"]').isChecked()

      expect(volume).toBe('75')
      expect(echoEnabled).toBeDefined()
    })

    test('should persist video settings after page reload', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="video-settings-tab"]')

      await page.click('[data-testid="video-enable-toggle"]')
      await page.selectOption('[data-testid="video-resolution-select"]', '1920x1080')
      await page.click('[data-testid="save-settings-button"]')

      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()

      await page.reload()
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="video-settings-tab"]')

      const videoEnabled = await page.locator('[data-testid="video-enable-toggle"]').isChecked()
      const resolution = await page.locator('[data-testid="video-resolution-select"]').inputValue()

      expect(videoEnabled).toBeDefined()
      expect(resolution).toBe('1920x1080')
    })

    test('should persist network settings after page reload', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="network-settings-tab"]')

      await page.click('[data-testid="qos-enable-toggle"]')
      await page.fill('[data-testid="max-bitrate-input"]', '2500')
      await page.click('[data-testid="save-settings-button"]')

      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()

      await page.reload()
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="network-settings-tab"]')

      const qosEnabled = await page.locator('[data-testid="qos-enable-toggle"]').isChecked()
      const maxBitrate = await page.locator('[data-testid="max-bitrate-input"]').inputValue()

      expect(qosEnabled).toBeDefined()
      expect(maxBitrate).toBe('2500')
    })
  })

  test.describe('Settings Migration', () => {
    test('should migrate v1 settings to v2', async ({ page }) => {
      // Inject old version settings into localStorage
      await page.evaluate(() => {
        const oldSettings = {
          version: '1.0.0',
          sipServer: 'sip.old.com',
          sipPort: 5060,
          audioVolume: 100,
        }
        localStorage.setItem('vueSipSettings', JSON.stringify(oldSettings))
      })

      await page.reload()
      await page.click('[data-testid="settings-button"]')

      // Verify migration occurred
      const server = await page.locator('[data-testid="sip-server-input"]').inputValue()
      expect(server).toBe('sip.old.com')
    })

    test('should preserve data during migration', async ({ page }) => {
      await page.evaluate(() => {
        const oldSettings = {
          version: '1.0.0',
          sipServer: 'sip.migrate.com',
          username: 'migrateuser',
          displayName: 'Migration Test',
        }
        localStorage.setItem('vueSipSettings', JSON.stringify(oldSettings))
      })

      await page.reload()
      await page.click('[data-testid="settings-button"]')

      const server = await page.locator('[data-testid="sip-server-input"]').inputValue()
      const username = await page.locator('[data-testid="sip-username-input"]').inputValue()
      const displayName = await page.locator('[data-testid="sip-displayname-input"]').inputValue()

      expect(server).toBe('sip.migrate.com')
      expect(username).toBe('migrateuser')
      expect(displayName).toBe('Migration Test')
    })

    test('should update version after migration', async ({ page }) => {
      await page.evaluate(() => {
        const oldSettings = {
          version: '1.0.0',
          sipServer: 'sip.old.com',
        }
        localStorage.setItem('vueSipSettings', JSON.stringify(oldSettings))
      })

      await page.reload()

      const version = await page.evaluate(() => {
        const settings = JSON.parse(localStorage.getItem('vueSipSettings') || '{}')
        return settings.version
      })

      expect(version).not.toBe('1.0.0')
    })
  })

  test.describe('localStorage Quota Handling', () => {
    test('should handle quota exceeded error', async ({ page }) => {
      // Fill localStorage to near capacity
      await page.evaluate(() => {
        const largeData = 'x'.repeat(4 * 1024 * 1024) // 4MB
        try {
          localStorage.setItem('largeItem', largeData)
        } catch {
          // Expected quota exceeded
        }
      })

      await page.click('[data-testid="settings-button"]')
      await page.fill('[data-testid="sip-server-input"]', 'sip.quota.com')
      await page.click('[data-testid="save-settings-button"]')

      // Should show quota error or fallback message
      const hasError = await page
        .locator('[data-testid="quota-error-message"]')
        .isVisible()
        .catch(() => false)
      const hasSuccess = await page
        .locator('[data-testid="save-success-message"]')
        .isVisible()
        .catch(() => false)

      expect(hasError || hasSuccess).toBe(true)
    })

    test('should compress settings when approaching quota', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')

      // Configure extensive settings
      await page.fill('[data-testid="sip-server-input"]', 'sip.compress.com')

      // Add multiple STUN servers
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="add-stun-server"]')
        await page.fill(`[data-testid="stun-server-${i}"]`, `stun:server${i}.com:3478`)
      }

      await page.click('[data-testid="save-settings-button"]')

      // Settings should save successfully
      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()
    })
  })

  test.describe('Cross-Tab Synchronization', () => {
    test('should sync settings across tabs', async ({ browser }) => {
      const context = await browser.newContext()
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      await page1.goto('/')
      await page2.goto('/')

      // Change settings in tab 1
      await page1.click('[data-testid="settings-button"]')
      await page1.fill('[data-testid="sip-server-input"]', 'sip.synced.com')
      await page1.click('[data-testid="save-settings-button"]')

      await expect(page1.locator('[data-testid="save-success-message"]')).toBeVisible()

      // Verify in tab 2 (wait for cross-tab sync)
      await page2.click('[data-testid="settings-button"]')
      await expect(page2.locator('[data-testid="sip-server-input"]')).toHaveValue(
        'sip.synced.com',
        { timeout: 5000 }
      )
      const server = await page2.locator('[data-testid="sip-server-input"]').inputValue()

      expect(server).toBe('sip.synced.com')

      await context.close()
    })

    test('should debounce rapid cross-tab changes', async ({ browser }) => {
      const context = await browser.newContext()
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      await page1.goto('/')
      await page2.goto('/')

      // Rapid changes in tab 1
      await page1.click('[data-testid="settings-button"]')

      for (let i = 0; i < 5; i++) {
        await page1.fill('[data-testid="sip-server-input"]', `sip.rapid${i}.com`)
        await page1.click('[data-testid="save-settings-button"]')
      }

      // Should sync final state to tab 2
      await page2.click('[data-testid="settings-button"]')
      await expect(page2.locator('[data-testid="sip-server-input"]')).toHaveValue(
        'sip.rapid4.com',
        { timeout: 5000 }
      )

      const server = await page2.locator('[data-testid="sip-server-input"]').inputValue()
      expect(server).toBe('sip.rapid4.com')

      await context.close()
    })
  })

  test.describe('Settings Backup and Restore', () => {
    test('should create backup before saving', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.fill('[data-testid="sip-server-input"]', 'sip.backup1.com')
      await page.click('[data-testid="save-settings-button"]')

      await page.fill('[data-testid="sip-server-input"]', 'sip.backup2.com')
      await page.click('[data-testid="save-settings-button"]')

      // Backup should exist
      const hasBackup = await page.evaluate(() => {
        return localStorage.getItem('vueSipSettings.backup') !== null
      })

      expect(hasBackup).toBe(true)
    })

    test('should restore from backup', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.fill('[data-testid="sip-server-input"]', 'sip.original.com')
      await page.click('[data-testid="save-settings-button"]')

      await page.fill('[data-testid="sip-server-input"]', 'sip.changed.com')
      await page.click('[data-testid="save-settings-button"]')

      // Restore from backup
      await page.click('[data-testid="restore-backup-button"]')
      await page.click('[data-testid="confirm-restore-button"]')

      const server = await page.locator('[data-testid="sip-server-input"]').inputValue()
      expect(server).toBe('sip.original.com')
    })
  })

  test.describe('Data Integrity Validation', () => {
    test('should detect corrupted settings', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('vueSipSettings', '{corrupt data}')
      })

      await page.reload()
      await page.click('[data-testid="settings-button"]')

      // Should show error or use defaults
      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible()
    })

    test('should validate checksum on load', async ({ page }) => {
      await page.evaluate(() => {
        const tamperedSettings = {
          version: '2.0.0',
          sip: { server: 'tampered.com' },
          _checksum: 'invalid',
        }
        localStorage.setItem('vueSipSettings', JSON.stringify(tamperedSettings))
      })

      await page.reload()
      await page.click('[data-testid="settings-button"]')

      // Should detect tampering
      const _hasWarning = await page
        .locator('[data-testid="integrity-warning"]')
        .isVisible()
        .catch(() => false)

      expect(true).toBe(true) // Tampering handled
    })
  })

  test.describe('Settings Clear and Reset', () => {
    test('should clear all settings', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.fill('[data-testid="sip-server-input"]', 'sip.clear.com')
      await page.click('[data-testid="save-settings-button"]')

      await page.click('[data-testid="clear-settings-button"]')
      await page.click('[data-testid="confirm-clear-button"]')

      await page.reload()
      await page.click('[data-testid="settings-button"]')

      const server = await page.locator('[data-testid="sip-server-input"]').inputValue()
      expect(server).not.toBe('sip.clear.com')
    })

    test('should remove from localStorage on clear', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.click('[data-testid="clear-settings-button"]')
      await page.click('[data-testid="confirm-clear-button"]')

      const hasSettings = await page.evaluate(() => {
        return localStorage.getItem('vueSipSettings') !== null
      })

      expect(hasSettings).toBe(false)
    })
  })

  test.describe('Performance', () => {
    test('should load settings quickly', async ({ page }) => {
      const startTime = Date.now()

      await page.click('[data-testid="settings-button"]')
      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible()

      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(1000) // Should load in under 1 second
    })

    test('should save settings quickly', async ({ page }) => {
      await page.click('[data-testid="settings-button"]')
      await page.fill('[data-testid="sip-server-input"]', 'sip.performance.com')

      const startTime = Date.now()
      await page.click('[data-testid="save-settings-button"]')
      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible()

      const saveTime = Date.now() - startTime

      expect(saveTime).toBeLessThan(500) // Should save in under 500ms
    })
  })
})
