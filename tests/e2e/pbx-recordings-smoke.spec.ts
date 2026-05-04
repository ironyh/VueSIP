/**
 * PBX Recordings integration smoke test (VueSIP-dpi.8).
 *
 * Verifies end-to-end: usePbxRecordings with mock provider → list renders →
 * click Play → getPlaybackUrl called → playback URL displayed.
 * Runs in CI on desktop Chrome (no mockSipServer).
 */

import { test, expect } from '@playwright/test'

const SMOKE_DEMO_HASH = '#pbx-recordings-smoke/demo'
const MOCK_PLAYBACK_URL = 'https://example.com/play/rec-1'

test.describe('PBX Recordings smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SMOKE_DEMO_HASH)
    await page.waitForLoadState('domcontentloaded')
  })

  test('list renders and Play resolves playback URL', async ({ page }) => {
    await expect(page.locator('[data-testid="pbx-recordings-smoke"]')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-testid="pbx-recordings-list"]')).toBeVisible({
      timeout: 20000,
    })

    await expect(page.getByTestId('recording-row-rec-1')).toBeVisible()
    await expect(page.getByTestId('play-button-rec-1')).toBeVisible()

    await page.getByTestId('play-button-rec-1').click()

    const lastPlayback = page.getByTestId('last-playback-url')
    await expect(lastPlayback).toContainText(MOCK_PLAYBACK_URL, { timeout: 5000 })
  })

  test('recordings list has at least one item', async ({ page }) => {
    await expect(page.locator('[data-testid="pbx-recordings-list"]')).toBeVisible({
      timeout: 20000,
    })
    const rows = page.getByTestId(/^recording-row-/)
    await expect(rows.first()).toBeVisible()
  })
})
