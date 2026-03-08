/**
 * Playground SIP Onboarding
 *
 * Verifies that there is an obvious CTA in the Playground
 * that takes the user directly to the SIP connection manager.
 */

import { test, expect } from './fixtures'

const PLAYGROUND_URL = '/'

test.describe('Playground SIP Onboarding', () => {
  test('should expose a clear Configure SIP Connection CTA', async ({ page }) => {
    await page.goto(PLAYGROUND_URL)

    // Wait for playground shell to be visible
    await page.waitForSelector('[data-testid="sip-client"]', { state: 'visible', timeout: 30000 })

    const cta = page.getByTestId('playground-connect-cta')
    await expect(cta).toBeVisible()
    await expect(cta).toContainText(/configure sip connection|connect your sip account/i)

    await cta.click()

    // Selecting the Settings example should update the hash to #settings
    await expect(page).toHaveURL(/#settings(\/|$)?/)

    // The SIP Connection Manager panel should now be visible in the demo area
    await expect(page.getByTestId('connection-manager-panel')).toBeVisible()
  })
})
