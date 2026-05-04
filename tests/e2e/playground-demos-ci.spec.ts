/**
 * Playground Demo Navigation - CI Tests
 *
 * Keep these tests lightweight and resilient:
 * - Validate that selecting key demos works
 * - Avoid asserting on brittle copy / deep UI structure
 */

import { test, expect } from './fixtures'

const PLAYGROUND_URL = '/'

test.describe('Playground Demo Navigation - CI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAYGROUND_URL)
    await page.waitForSelector('#app', { state: 'attached' })
    await page.waitForSelector('[data-testid="sip-client"]', { state: 'visible', timeout: 30000 })
    await page.waitForLoadState('networkidle')
  })

  test('should switch between key demos via sidebar', async ({ page }) => {
    // These demos were migrated to PrimeVue and historically lacked E2E coverage.
    // Keep assertions minimal: route updates, demo container mounts, no generic error state.
    const demoIds = [
      'ai-insights',
      'call-session-pip',
      'click-to-call',
      'call-history',
      'codec-policy',
      'e911',
      'permission-failures',
      'picture-in-picture',
      'pjsip',
      'session-persistence',
      'settings',
      'user-management',
      'video-call',
      'call-quality',
      'conference-call',
      'connection-recovery',
      'network-simulator',
      'screen-sharing',
      'call-waiting',
      'toolbar-layouts',
      'paging',
      'feature-codes',
    ]

    for (const id of demoIds) {
      await page.locator(`[data-testid="example-item-${id}"]`).click()
      await expect(page).toHaveURL(new RegExp(`#${id}(/|$)`))
      await expect(page.locator('[data-testid="active-example-title"]')).toBeVisible()
      await expect(page.locator('[data-testid="demo-container"]')).toBeVisible()
      await expect(page.locator('.error-message')).toHaveCount(0)
    }
  })

  test('should preload sandbox credentials from settings demo', async ({ page }) => {
    await page.locator('[data-testid="example-item-settings"]').click()
    await expect(page).toHaveURL(/#settings(\/|$)/)
    await expect(page.locator('[data-testid="connection-manager-panel"]')).toBeVisible()

    await page.getByLabel('Add new connection').click({ force: true })
    await expect(page.getByText('Load sandbox preset', { exact: true })).toBeVisible()

    await page.getByText('Load sandbox preset', { exact: true }).click({ force: true })

    await expect(page.locator('#conn-uri')).toHaveValue('wss://localhost:18089/ws')
    await expect(page.locator('#conn-sip-uri')).toHaveValue(/^sip:demo[1-6]@localhost$/)
    await expect(page.locator('#conn-password')).toHaveValue(/^sandbox-demo[1-6]$/)
  })
})
