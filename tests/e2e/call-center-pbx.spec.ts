/**
 * Call-center → real PBX integration e2e.
 *
 * Connects the call-center example app to a live FreePBX/Asterisk via SIP+AMI,
 * and asserts the connected state plus the admin responsibility matrix. This is
 * the opt-in counterpart to call-center-mvp.spec.ts (which uses a mock SIP
 * server): it exercises the real integration that broke twice during manual
 * verification (SIP URI normalization, currentQueueCall reference).
 *
 * Self-skips unless VUESIP_TEST_WS_URL + VUESIP_TEST_SIP_* are set, so it stays
 * silent on machines and CI without PBX access. Run with:
 *   VUESIP_TEST_WS_URL=wss://... VUESIP_TEST_SIP_DOMAIN=... \
 *   VUESIP_TEST_SIP_USER=1001 VUESIP_TEST_SIP_PASSWORD=... \
 *   VUESIP_TEST_AMI_WS_URL=wss://.../ami pnpm test:e2e -- call-center-pbx
 *
 * NOTE: requires the PBX WSS endpoint to be healthy (a 503 from the HAProxy
 * WebSocket frontend will fail SIP connect with "Connection failed" — that is
 * an infrastructure issue, not an app bug). The AMI WebSocket and SIP must both
 * be reachable for the connected-mode assertions.
 */

import { test, expect } from './fixtures'

const wsUrl = process.env.VUESIP_TEST_WS_URL
const sipDomain = process.env.VUESIP_TEST_SIP_DOMAIN
const sipUser = process.env.VUESIP_TEST_SIP_USER
const sipPassword = process.env.VUESIP_TEST_SIP_PASSWORD
const amiWsUrl = process.env.VUESIP_TEST_AMI_WS_URL
const displayName = process.env.VUESIP_TEST_SIP_DISPLAY_NAME ?? 'PBX Test Agent'

const enabled = wsUrl && sipDomain && sipUser && sipPassword && amiWsUrl ? true : false

const CALL_CENTER_URL = 'http://localhost:5174/'

test.describe('Call-center → real PBX', () => {
  test.skip(!enabled, 'requires VUESIP_TEST_WS_URL/SIP_*/AMI_WS_URL env vars')

  test('connects via SIP+AMI and shows the Connected mode', async ({ page }) => {
    test.skip(true, 'placeholder')
    void page
  })
})

// Actual suite — only defined when enabled, to avoid running setup work otherwise.
if (enabled) {
  test.describe('Call-center → real PBX (connected)', () => {
    test.beforeEach(async ({ page, mockMediaDevices }) => {
      // Mock getUserMedia — Playwright chromium has no mic, and JsSIP fails to
      // start without it. This is the same setup the mock-SIP MVP suite uses.
      await mockMediaDevices()

      // Capture browser logs/errors so failures surface the PBX connection reason.
      page.on('console', (m) => {
        if (m.type() === 'error') console.log('[browser error]', m.text().slice(0, 200))
      })
      page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)))

      await page.goto(CALL_CENTER_URL)
      await page.waitForLoadState('domcontentloaded')

      // Fill the connection panel with PBX credentials.
      await page.fill('#server', wsUrl!)
      await page.fill('#username', sipUser!)
      await page.fill('#password', sipPassword!)
      await page.fill('#displayName', displayName)
      await page.fill('#amiUrl', amiWsUrl!)
      await page
        .getByRole('button', { name: /connect/i })
        .first()
        .click()

      // Wait for the workspace to render (SIP register + AMI connect happen here).
      await expect(page.locator('.header-pill', { hasText: /Connected/i })).toBeVisible({
        timeout: 20000,
      })
    })

    test('SystemStatus shows the Connected badge', async ({ page }) => {
      await expect(page.locator('.mode-badge')).toHaveText('Connected')
      await expect(page.locator('.mode-badge.connected')).toBeVisible()
    })

    test('agent workspace renders without errors after connect', async ({ page }) => {
      // The dashboard content block is present once connected.
      await expect(page.locator('.dashboard-content')).toBeVisible()
      // No error overlay should be visible. (Toast notifications use role="alert"
      // for accessibility even on success, so we only flag actual error text.)
      const alerts = page.locator('.error-overlay, [role="alert"]')
      const count = await alerts.count()
      for (let i = 0; i < count; i++) {
        const text = (await alerts.nth(i).textContent()) ?? ''
        // A success toast ("Connected to call center...") is fine; failure words are not.
        expect(text.toLowerCase()).not.toMatch(/connection failed|failed to|error:/)
      }
    })

    test('admin responsibility matrix renders role columns with inbound lines', async ({
      page,
    }) => {
      await page.locator('button.view-tab:has-text("Admin")').first().click()
      await expect(page.locator('.assignment-matrix')).toBeVisible({ timeout: 5000 })

      // The eight default roles should be present as columns.
      const expectedRoles = [
        'Sjuksköterska',
        'Undersköterska',
        'Sjukgymnast',
        'Arbetsterapeut',
        'Läkare',
        'Kurator',
        'Dietist',
        'Chef',
      ]
      for (const label of expectedRoles) {
        await expect(page.locator('.role-col-label', { hasText: label })).toBeVisible()
      }

      // Each role column shows its inbound line name.
      const inboundLines = await page.locator('.role-col-queue').allTextContents()
      expect(inboundLines.length).toBeGreaterThanOrEqual(8)
      expect(inboundLines.some((l) => l.includes('sjukskoterska-linjen'))).toBe(true)
      expect(inboundLines.some((l) => l.includes('lakare-linjen'))).toBe(true)
    })

    test('admin matrix shows seeded patients and coverage stats', async ({ page }) => {
      await page.locator('button.view-tab:has-text("Admin")').first().click()
      await expect(page.locator('.matrix-table tbody tr').first()).toBeVisible()
      // Footer coverage count is present and parses as "N / M".
      const footer = await page.locator('.footer-count').first().textContent()
      expect(footer).toMatch(/\d+\s*\/\s*\d+/)
    })
  })
}
