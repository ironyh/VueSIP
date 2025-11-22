/**
 * Shared Setup Utilities for E2E Tests
 * 
 * Provides optimized setup functions that can be reused across tests
 * to reduce redundant initialization overhead.
 */

import { Page } from '@playwright/test'
import { APP_URL } from './fixtures'

/**
 * Shared setup that can be reused across multiple tests
 * Sets up mocks and navigates to the app
 * 
 * Use this in beforeAll for tests that can share page state
 */
export async function sharedAppSetup(
  page: Page,
  mockSipServer: () => Promise<void>,
  mockMediaDevices: () => Promise<void>
) {
  // Setup mocks (these persist across tests in the same context)
  await mockSipServer()
  await mockMediaDevices()
  
  // Navigate to app (only if not already there)
  const currentUrl = page.url()
  if (!currentUrl.includes(APP_URL)) {
    await page.goto(APP_URL)
  }
}

/**
 * Quick setup for read-only tests that can share state
 * Returns true if setup was needed, false if already set up
 */
export async function quickSetupIfNeeded(
  page: Page,
  mockSipServer: () => Promise<void>,
  mockMediaDevices: () => Promise<void>
): Promise<boolean> {
  const currentUrl = page.url()
  const needsSetup = !currentUrl.includes(APP_URL)
  
  if (needsSetup) {
    await sharedAppSetup(page, mockSipServer, mockMediaDevices)
  }
  
  return needsSetup
}

