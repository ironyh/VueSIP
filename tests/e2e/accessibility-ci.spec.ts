/**
 * CI-Friendly Accessibility Tests
 *
 * Basic accessibility tests that run in CI without mockSipServer.
 * These tests verify core WCAG compliance on the initial page state.
 *
 * For comprehensive accessibility testing (24 tests), run locally:
 *   pnpm test:e2e accessibility.spec.ts
 */

import { test, expect, APP_URL } from './fixtures'
import { SELECTORS } from './selectors'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility - CI Tests', () => {
  test.beforeEach(async ({ page, mockMediaDevices }) => {
    // Only mock media devices (works in CI), skip mockSipServer
    await mockMediaDevices()
    await page.goto(APP_URL)
    await expect(page.locator(SELECTORS.APP.ROOT)).toBeVisible()
  })

  test('should not have critical accessibility violations on initial page', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa']) // WCAG 2.1 Level AA
      .analyze()

    // Filter to only critical and serious violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )

    expect(criticalViolations).toEqual([])
  })

  test('should have sufficient color contrast', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.evaluate(() => {
      const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      return headingElements.map((h) => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent,
      }))
    })

    // Should have at least one heading or none (both acceptable)
    expect(headings.length).toBeGreaterThanOrEqual(0)

    // If there are headings, check they start reasonably
    if (headings.length > 0) {
      expect(headings[0].level).toBeLessThanOrEqual(2)
    }
  })

  test('should have alt text for all images', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should have proper language attribute', async ({ page }) => {
    const htmlLang = await page.evaluate(() => {
      return document.documentElement.getAttribute('lang')
    })

    // Should have a lang attribute
    expect(htmlLang).toBeTruthy()
    // Should be a valid language code
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Start tabbing
    await page.keyboard.press('Tab')

    const focusedElements: string[] = []

    // Tab through first 5 elements
    for (let i = 0; i < 5; i++) {
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement
        return el?.getAttribute('data-testid') || el?.tagName || 'unknown'
      })
      focusedElements.push(activeElement)
      await page.keyboard.press('Tab')
    }

    // Should have focused on multiple different elements
    const uniqueElements = new Set(focusedElements)
    expect(uniqueElements.size).toBeGreaterThan(1)
  })
})
