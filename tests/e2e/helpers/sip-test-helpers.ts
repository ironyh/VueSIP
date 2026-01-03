/**
 * SIP Test Helpers
 *
 * Helper functions for E2E SIP testing scenarios
 */

import { Page } from '@playwright/test'

export async function setupTestEnvironment(page: Page) {
  // Navigate to the test app
  await page.goto('/')
  // Wait for app to be ready
  await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 })
}

export async function cleanupTestEnvironment(page: Page) {
  // Clean up any active connections or state
  await page.evaluate(() => {
    // Reset app state if needed
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function registerAccount(
  page: Page,
  config: {
    uri: string
    password: string
    username?: string
  }
) {
  // Fill in SIP registration form
  await page.fill('[data-testid="sip-uri"]', config.uri)
  await page.fill('[data-testid="sip-password"]', config.password)

  if (config.username) {
    await page.fill('[data-testid="sip-username"]', config.username)
  }

  // Click register button
  await page.click('[data-testid="register-btn"]')

  // Wait for registration success
  await page.waitForSelector('[data-testid="registration-status"][data-status="registered"]', {
    timeout: 5000,
  })
}

export async function makeCall(page: Page, number: string) {
  // Enter number
  await page.fill('[data-testid="dial-number"]', number)

  // Click call button
  await page.click('[data-testid="call-btn"]')

  // Wait for call to be initiated
  await page.waitForSelector('[data-testid="call-status"][data-status="calling"]', {
    timeout: 5000,
  })
}

export async function waitForCallState(page: Page, state: string, timeout = 5000) {
  // Wait for specific call state
  await page.waitForSelector(`[data-testid="call-status"][data-status="${state}"]`, { timeout })
}

export async function _answerCall(page: Page) {
  // Click answer button
  await page.click('[data-testid="answer-btn"]')

  // Wait for call to be established
  await waitForCallState(page, 'established')
}

export async function hangupCall(page: Page) {
  // Click hangup button
  await page.click('[data-testid="hangup-btn"]')

  // Wait for call to end
  await waitForCallState(page, 'idle')
}
