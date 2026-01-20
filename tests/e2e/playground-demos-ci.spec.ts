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
    const demoIds = [
      'settings',
      'contacts',
      'agent-login',
      'ring-groups',
      'e911',
      'recording-management',
      'multi-line',
    ]

    for (const id of demoIds) {
      await page.locator(`[data-testid="example-item-${id}"]`).click()
      await expect(page).toHaveURL(new RegExp(`#${id}(/|$)`))
      await expect(page.locator('[data-testid="active-example-title"]')).toBeVisible()
      await expect(page.locator('[data-testid="demo-container"]')).toBeVisible()
      await expect(page.locator('.error-message')).toHaveCount(0)
    }
  })
})
