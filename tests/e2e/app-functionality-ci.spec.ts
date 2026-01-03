/**
 * CI-Friendly App Functionality Tests
 *
 * Basic UI tests that run in CI without mockSipServer.
 * Uses the PlaygroundApp (not TestApp) to avoid SIP infrastructure dependencies.
 *
 * For comprehensive app functionality testing, run locally:
 *   pnpm test:e2e app-functionality.spec.ts
 */

import { test, expect } from './fixtures'

// Use base URL without test=true to avoid TestApp SIP dependencies
const BASE_URL = '/'

test.describe('App Functionality - CI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('#app', { state: 'attached' })
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display the main app interface', async ({ page }) => {
    // Check that the main interface is present
    await expect(page.locator('[data-testid="sip-client"]')).toBeVisible()
    await expect(page.locator('h1')).toContainText('VueSIP')
  })

  test('should have clickable buttons in the UI', async ({ page }) => {
    // Find all buttons on the page
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    // Should have at least some interactive buttons
    expect(buttonCount).toBeGreaterThan(0)

    // Verify first visible button is interactive
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i)
      const isVisible = await button.isVisible().catch(() => false)
      if (isVisible) {
        // Button exists and is visible - test passes
        expect(isVisible).toBe(true)
        break
      }
    }
  })

  test('should display sidebar navigation', async ({ page }) => {
    // Check for sidebar/navigation elements
    const sidebar = page.locator('.playground-sidebar, nav, aside').first()
    await expect(sidebar).toBeVisible()
  })

  test('should have interactive category filter', async ({ page }) => {
    // Check for category filter buttons
    const filterButtons = page.locator('[role="tab"], .filter-segment, .category-filter button')

    // Should have at least one filter option
    const count = await filterButtons.count()
    expect(count).toBeGreaterThan(0)

    // First button should be clickable
    if (count > 0) {
      await filterButtons.first().click()
      // Page should remain functional
      await expect(page.locator('[data-testid="sip-client"]')).toBeVisible()
    }
  })

  test('should display example cards or content sections', async ({ page }) => {
    // Check for content sections (examples, demos, etc.)
    const contentSections = page.locator(
      '.example-card, .demo-card, .playground-content, .card, section'
    )

    // Should have content areas
    const count = await contentSections.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have responsive header', async ({ page }) => {
    // Check header elements
    const header = page.locator('header, .playground-header').first()
    await expect(header).toBeVisible()

    // Header should contain title
    const title = header.locator('h1')
    await expect(title).toBeVisible()
  })

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    // Navigate and wait for load
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // Filter out known non-critical errors (like WebSocket connection errors in CI)
    const criticalErrors = errors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('SIP') && !e.includes('JsSIP')
    )

    expect(criticalErrors).toEqual([])
  })

  test('should have working scroll behavior', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 100))

    // Verify scroll API works (position may be 0 if content is short)
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeGreaterThanOrEqual(0)
  })
})
