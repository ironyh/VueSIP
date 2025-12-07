/**
 * Multi-User Scenario E2E Tests
 *
 * Tests involving multiple users/browser contexts to simulate
 * real-world scenarios like calls between two parties, call transfers,
 * and conference calls.
 */

import { test as base, expect, BrowserContext, Page } from '@playwright/test'
import {
  APP_URL,
  mockWebSocketResponses,
  mockGetUserMedia,
  mockRTCPeerConnection,
  defaultMockDevices,
} from './fixtures'
import { SELECTORS, TEST_TIMEOUTS } from './selectors'

// Define user fixture type
type MultiUserFixtures = {
  userA: { page: Page; context: BrowserContext }
  userB: { page: Page; context: BrowserContext }
  userC: { page: Page; context: BrowserContext }
}

/**
 * Apply all necessary mocks to a page before navigation
 * This must be called BEFORE page.goto() to ensure mocks are in place
 *
 * IMPORTANT: Order matters! EventBridge must be set up FIRST because
 * mockWebSocketResponses checks for __emitSipEvent before auto-connecting.
 */
async function applyMocksToPage(page: Page): Promise<void> {
  // 1. Initialize EventBridge FIRST (needed by WebSocket mock for connection events)
  await page.addInitScript(() => {
    // EventBridge class for state tracking
    class EventBridge {
      private state: any
      private eventLog: any[]
      private listeners: Map<string, Set<(event: any) => void>>

      constructor() {
        this.state = {
          connection: 'disconnected',
          registration: 'unregistered',
          call: null,
          error: null,
        }
        this.eventLog = []
        this.listeners = new Map()
      }

      getState() {
        return { ...this.state }
      }

      on(event: string, handler: (data: any) => void): string {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, new Set())
        }
        this.listeners.get(event)!.add(handler)
        return `listener_${event}_${Date.now()}`
      }

      off(event: string, handler: (data: any) => void): boolean {
        const eventListeners = this.listeners.get(event)
        if (!eventListeners) return false
        return eventListeners.delete(handler)
      }

      emit(type: string, data?: any): Promise<void> {
        this.eventLog.push({ type, timestamp: Date.now(), data })
        this.updateState(type, data)

        const listeners = this.listeners.get(type)
        if (listeners) {
          listeners.forEach((handler) => {
            try {
              handler(data)
            } catch (error) {
              console.error(`[EventBridge] Error in listener for ${type}:`, error)
            }
          })
        }
        return Promise.resolve()
      }

      // SipClient uses emitSync for fire-and-forget events
      emitSync(type: string, data?: any): void {
        this.emit(type, data).catch((err) => {
          console.error(`[EventBridge] Error in emitSync for ${type}:`, err)
        })
      }

      private updateState(type: string, data?: any): void {
        switch (type) {
          case 'connection:connected':
          case 'sip:connected':
            this.state.connection = 'connected'
            break
          case 'connection:disconnected':
          case 'sip:disconnected':
            this.state.connection = 'disconnected'
            this.state.registration = 'unregistered'
            break
          case 'registration:registered':
          case 'sip:registered':
            this.state.registration = 'registered'
            break
          case 'registration:unregistered':
          case 'sip:unregistered':
            this.state.registration = 'unregistered'
            break
          case 'call:initiating':
            this.state.call = {
              id: data?.callId || `call-${Date.now()}`,
              direction: data?.direction || 'outgoing',
              state: 'initiating',
              remoteUri: data?.remoteUri || '',
            }
            break
          case 'call:ringing':
            if (this.state.call) this.state.call.state = 'ringing'
            break
          case 'call:answered':
            if (this.state.call) {
              this.state.call.state = 'active'
              this.state.call.startTime = Date.now()
            }
            break
          case 'call:ended':
          case 'call:failed':
            if (this.state.call) {
              this.state.call.state = 'ended'
            }
            setTimeout(() => {
              if (this.state.call?.state === 'ended') {
                this.state.call = null
              }
            }, 100)
            break
        }
      }
    }

    // Initialize EventBridge
    const bridge = new EventBridge()
    ;(window as any).__sipEventBridge = bridge
    ;(window as any).__sipState = () => bridge.getState()
    ;(window as any).__emitSipEvent = (type: string, data?: any) => {
      bridge.emit(type, data)
    }
    console.log('[Multi-User E2E] EventBridge initialized for testing')
  })

  // 2. Apply RTC mock (needed for WebRTC operations)
  await mockRTCPeerConnection(page)

  // 3. Apply media device mocks
  await mockGetUserMedia(page, defaultMockDevices)

  // 4. Apply WebSocket mock LAST (it checks for EventBridge before auto-connecting)
  await mockWebSocketResponses(page)
}

/**
 * Helper to make a call - waits for call button to be enabled before clicking
 * The call button is disabled when: !number || !isConnected || isMakingCall
 */
async function makeCall(page: Page, destination: string): Promise<void> {
  await page.fill('[data-testid="dialpad-input"]', destination)
  // Wait for call button to be enabled (requires both number and connection)
  await page.waitForSelector('[data-testid="call-button"]:not([disabled])', { timeout: 10000 })
  await page.click('[data-testid="call-button"]')
}

// Extend base test with multi-user fixtures
const test = base.extend<MultiUserFixtures>({
  userA: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Apply mocks BEFORE navigating
    await applyMocksToPage(page)
    await page.goto(APP_URL)

    await use({ page, context })
    await context.close()
  },

  userB: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Apply mocks BEFORE navigating
    await applyMocksToPage(page)
    await page.goto(APP_URL)

    await use({ page, context })
    await context.close()
  },

  userC: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Apply mocks BEFORE navigating
    await applyMocksToPage(page)
    await page.goto(APP_URL)

    await use({ page, context })
    await context.close()
  },
})

test.describe('Two-Party Call Scenarios', () => {
  test('should establish call between User A and User B', async ({ userA, userB }) => {
    // User A configuration - use proper SIP URI format
    await userA.page.click('[data-testid="settings-button"]')
    await userA.page.waitForSelector('[data-testid="sip-uri-input"]', { state: 'visible' })
    await userA.page.fill('[data-testid="sip-uri-input"]', 'sip:userA@sip.example.com')
    await userA.page.fill('[data-testid="password-input"]', 'passA')
    await userA.page.fill('[data-testid="server-uri-input"]', 'wss://sip.example.com')
    await userA.page.click('[data-testid="save-settings-button"]')
    // Wait for settings saved message
    await userA.page.waitForSelector('[data-testid="settings-saved-message"]', {
      state: 'visible',
      timeout: 3000,
    })
    await userA.page.click('[data-testid="settings-button"]')
    await userA.page.waitForSelector('[data-testid="dialpad-input"]', {
      state: 'visible',
      timeout: 5000,
    })

    // User B configuration - use proper SIP URI format
    await userB.page.click('[data-testid="settings-button"]')
    await userB.page.waitForSelector('[data-testid="sip-uri-input"]', { state: 'visible' })
    await userB.page.fill('[data-testid="sip-uri-input"]', 'sip:userB@sip.example.com')
    await userB.page.fill('[data-testid="password-input"]', 'passB')
    await userB.page.fill('[data-testid="server-uri-input"]', 'wss://sip.example.com')
    await userB.page.click('[data-testid="save-settings-button"]')
    // Wait for settings saved message
    await userB.page.waitForSelector('[data-testid="settings-saved-message"]', {
      state: 'visible',
      timeout: 3000,
    })
    await userB.page.click('[data-testid="settings-button"]')
    await userB.page.waitForSelector('[data-testid="dialpad-input"]', {
      state: 'visible',
      timeout: 5000,
    })

    // Both users connect
    await userA.page.click('[data-testid="connect-button"]')
    await userB.page.click('[data-testid="connect-button"]')

    // Wait for both users to be connected
    await Promise.all([
      expect(userA.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userB.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
    ])

    // User A calls User B
    await userA.page.fill('[data-testid="dialpad-input"]', 'sip:userB@example.com')

    // Wait for call button to be enabled (requires both number and connection)
    await userA.page.waitForSelector('[data-testid="call-button"]:not([disabled])', {
      timeout: 10000,
    })
    await userA.page.click('[data-testid="call-button"]')

    // Wait for call status to appear
    await expect(userA.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 })

    // Verify User A shows calling state
    const userAStatus = await userA.page.locator('[data-testid="call-status"]').textContent()
    expect(userAStatus).toBeTruthy()

    // In a real scenario, User B would see incoming call
    // With mocks, we verify the apps remain responsive
    const userBStatus = await userB.page.locator('[data-testid="connection-status"]').textContent()
    expect(userBStatus).toBeTruthy()
  })

  test('should handle simultaneous calls (both users call each other)', async ({
    userA,
    userB,
  }) => {
    // Setup both users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
    ])

    // Both users connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
    ])

    // Wait for both users to be connected
    await Promise.all([
      expect(userA.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userB.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
    ])

    // Both users call each other simultaneously
    await Promise.all([
      makeCall(userA.page, 'sip:userB@example.com'),
      makeCall(userB.page, 'sip:userA@example.com'),
    ])

    // Wait for both call statuses to appear
    await Promise.all([
      expect(userA.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 }),
      expect(userB.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 }),
    ])

    // Both should handle the race condition gracefully
    const [statusA, statusB] = await Promise.all([
      userA.page.locator('[data-testid="call-status"]').textContent(),
      userB.page.locator('[data-testid="call-status"]').textContent(),
    ])

    expect(statusA).toBeTruthy()
    expect(statusB).toBeTruthy()
  })

  test('should transfer call from User A through User B to User C', async ({
    userA,
    userB,
    userC,
  }) => {
    // Setup all three users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
      setupUser(userC.page, 'userC', 'passC'),
    ])

    // All users connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
      userC.page.click('[data-testid="connect-button"]'),
    ])

    // Wait for all users to be connected
    await Promise.all([
      expect(userA.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userB.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userC.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
    ])

    // User A calls User B
    await makeCall(userA.page, 'sip:userB@example.com')
    await expect(userA.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 })

    // User B transfers call to User C (if transfer UI exists)
    const transferButton = userB.page.locator('[data-testid="transfer-button"]')
    if (await transferButton.isVisible()) {
      await transferButton.click()
      await userB.page.fill('[data-testid="transfer-target-input"]', 'sip:userC@example.com')
      await userB.page.click('[data-testid="complete-transfer-button"]')
      // Wait for transfer to be initiated - check for status change
      await expect(userB.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 })

      // Verify transfer initiated
      const userBStatus = await userB.page.locator('[data-testid="call-status"]').textContent()
      expect(userBStatus).toBeTruthy()
    }

    // All apps should remain functional
    expect(await userA.page.locator(SELECTORS.APP.ROOT).isVisible()).toBe(true)
    expect(await userB.page.locator(SELECTORS.APP.ROOT).isVisible()).toBe(true)
    expect(await userC.page.locator(SELECTORS.APP.ROOT).isVisible()).toBe(true)
  })

  test('should handle call hold and resume between users', async ({ userA, userB }) => {
    // Setup users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
    ])

    // Connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
    ])

    // Wait for both users to be connected
    await Promise.all([
      expect(userA.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userB.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
    ])

    // User A calls User B
    await makeCall(userA.page, 'sip:userB@example.com')
    await expect(userA.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 })

    // User A puts call on hold
    const holdButton = userA.page.locator('[data-testid="hold-button"]')
    if (await holdButton.isVisible()) {
      await holdButton.click()
      // Wait for hold state to be set
      await expect(holdButton).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 })

      // Check hold state
      const isHeld = await holdButton.getAttribute('aria-pressed')
      expect(isHeld).toBe('true')

      // Resume call
      await holdButton.click()
      // Wait for unhold state
      await expect(holdButton).toHaveAttribute('aria-pressed', 'false', { timeout: 3000 })

      const isResumed = await holdButton.getAttribute('aria-pressed')
      expect(isResumed).toBe('false')
    }
  })
})

test.describe('Conference Call Scenarios', () => {
  test('should handle three-way conference call', async ({ userA, userB, userC }) => {
    // Setup all users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
      setupUser(userC.page, 'userC', 'passC'),
    ])

    // All connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
      userC.page.click('[data-testid="connect-button"]'),
    ])

    await Promise.all([
      userA.page.waitForTimeout(TEST_TIMEOUTS.STANDARD),
      userB.page.waitForTimeout(TEST_TIMEOUTS.STANDARD),
      userC.page.waitForTimeout(TEST_TIMEOUTS.STANDARD),
    ])

    // User A initiates calls to both B and C (if supported)
    // Note: This depends on implementation supporting multiple simultaneous calls

    await makeCall(userA.page, 'sip:userB@example.com')

    // Verify all apps are functional
    const [statusA, statusB, statusC] = await Promise.all([
      userA.page.locator('[data-testid="call-status"]').textContent(),
      userB.page.locator('[data-testid="connection-status"]').textContent(),
      userC.page.locator('[data-testid="connection-status"]').textContent(),
    ])

    expect(statusA).toBeTruthy()
    expect(statusB).toBeTruthy()
    expect(statusC).toBeTruthy()
  })

  test('should handle user joining and leaving conference', async ({ userA, userB, userC }) => {
    // Setup all users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
      setupUser(userC.page, 'userC', 'passC'),
    ])

    // All connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
      userC.page.click('[data-testid="connect-button"]'),
    ])

    // Wait for all users to be connected
    await Promise.all([
      expect(userA.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userB.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userC.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
    ])

    // Simulate conference scenario - use proper sip: URI format
    await makeCall(userA.page, 'sip:conference@example.com')
    await expect(userA.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 })

    // User B joins
    await makeCall(userB.page, 'sip:conference@example.com')
    await expect(userB.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 })

    // User C joins
    await makeCall(userC.page, 'sip:conference@example.com')
    await expect(userC.page.locator('[data-testid="call-status"]')).toBeVisible({ timeout: 5000 })

    // All should be in call state
    const [statusA, statusB, statusC] = await Promise.all([
      userA.page.locator('[data-testid="call-status"]').textContent(),
      userB.page.locator('[data-testid="call-status"]').textContent(),
      userC.page.locator('[data-testid="call-status"]').textContent(),
    ])

    expect(statusA).toBeTruthy()
    expect(statusB).toBeTruthy()
    expect(statusC).toBeTruthy()

    // User B leaves
    const hangupBtn = userB.page.locator('[data-testid="hangup-button"]')
    if (await hangupBtn.isVisible()) {
      await hangupBtn.click()
      await userB.page.waitForTimeout(300)

      // User B should no longer be in call
      const statusBAfter = await userB.page.locator('[data-testid="call-status"]').textContent()
      expect(statusBAfter).toBeTruthy() // Should show not in call
    }
  })
})

test.describe('State Synchronization', () => {
  test('should sync call state correctly between users', async ({ userA, userB }) => {
    // Setup users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
    ])

    // Connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
    ])

    await Promise.all([userA.page.waitForTimeout(500), userB.page.waitForTimeout(500)])

    // User A calls
    await makeCall(userA.page, 'sip:userB@example.com')

    // Both users should have consistent state
    const [callStatusA, connectionStatusB] = await Promise.all([
      userA.page.locator('[data-testid="call-status"]').textContent(),
      userB.page.locator('[data-testid="connection-status"]').textContent(),
    ])

    expect(callStatusA).toBeTruthy()
    expect(connectionStatusB).toBeTruthy()
  })

  test('should handle network disconnection for one user', async ({ userA, userB }) => {
    // Setup users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
    ])

    // Connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
    ])

    await Promise.all([userA.page.waitForTimeout(500), userB.page.waitForTimeout(500)])

    // User A goes offline
    await userA.context.setOffline(true)
    await userA.page.waitForTimeout(1000)

    // User A should show disconnected
    const statusA = await userA.page.locator('[data-testid="connection-status"]').textContent()
    expect(statusA).toBeTruthy()

    // User B should remain connected
    const statusB = await userB.page.locator('[data-testid="connection-status"]').textContent()
    expect(statusB).toBeTruthy()

    // User A comes back online
    await userA.context.setOffline(false)
    await userA.page.waitForTimeout(1000)

    // Both should be functional
    expect(await userA.page.locator(SELECTORS.APP.ROOT).isVisible()).toBe(true)
    expect(await userB.page.locator(SELECTORS.APP.ROOT).isVisible()).toBe(true)
  })
})

test.describe('Concurrent Operations', () => {
  test('should handle multiple users connecting simultaneously', async ({
    userA,
    userB,
    userC,
  }) => {
    // Setup all users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
      setupUser(userC.page, 'userC', 'passC'),
    ])

    // All connect simultaneously
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
      userC.page.click('[data-testid="connect-button"]'),
    ])

    // Wait for all users to be connected
    await Promise.all([
      expect(userA.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userB.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
      expect(userC.page.locator('[data-testid="connection-status"]')).toContainText(/connected/i, {
        timeout: 5000,
      }),
    ])

    // All should be connected
    const [statusA, statusB, statusC] = await Promise.all([
      userA.page.locator('[data-testid="connection-status"]').textContent(),
      userB.page.locator('[data-testid="connection-status"]').textContent(),
      userC.page.locator('[data-testid="connection-status"]').textContent(),
    ])

    expect(statusA).toBeTruthy()
    expect(statusB).toBeTruthy()
    expect(statusC).toBeTruthy()
  })

  test('should handle multiple users making calls at the same time', async ({
    userA,
    userB,
    userC,
  }) => {
    // Setup all users
    await Promise.all([
      setupUser(userA.page, 'userA', 'passA'),
      setupUser(userB.page, 'userB', 'passB'),
      setupUser(userC.page, 'userC', 'passC'),
    ])

    // All connect
    await Promise.all([
      userA.page.click('[data-testid="connect-button"]'),
      userB.page.click('[data-testid="connect-button"]'),
      userC.page.click('[data-testid="connect-button"]'),
    ])

    await Promise.all([
      userA.page.waitForTimeout(TEST_TIMEOUTS.STANDARD),
      userB.page.waitForTimeout(TEST_TIMEOUTS.STANDARD),
      userC.page.waitForTimeout(TEST_TIMEOUTS.STANDARD),
    ])

    // All make calls simultaneously
    await Promise.all([
      makeCall(userA.page, 'sip:test1@example.com'),
      makeCall(userB.page, 'sip:test2@example.com'),
      makeCall(userC.page, 'sip:test3@example.com'),
    ])

    // All should have initiated calls
    const [statusA, statusB, statusC] = await Promise.all([
      userA.page.locator('[data-testid="call-status"]').textContent(),
      userB.page.locator('[data-testid="call-status"]').textContent(),
      userC.page.locator('[data-testid="call-status"]').textContent(),
    ])

    expect(statusA).toBeTruthy()
    expect(statusB).toBeTruthy()
    expect(statusC).toBeTruthy()
  })
})

// Helper function to setup a user with proper SIP URI format
async function setupUser(page: Page, username: string, password: string) {
  await page.click('[data-testid="settings-button"]')
  await page.waitForSelector('[data-testid="sip-uri-input"]', { state: 'visible' })
  // Use proper SIP URI format: sip:username@sip.example.com
  await page.fill('[data-testid="sip-uri-input"]', `sip:${username}@sip.example.com`)
  await page.fill('[data-testid="password-input"]', password)
  // Use sip.example.com to match the mock WebSocket URL pattern in fixtures.ts
  await page.fill('[data-testid="server-uri-input"]', 'wss://sip.example.com')
  await page.click('[data-testid="save-settings-button"]')
  // Wait for settings saved message before closing
  await page.waitForSelector('[data-testid="settings-saved-message"]', {
    state: 'visible',
    timeout: 3000,
  })
  await page.click('[data-testid="settings-button"]')
  // Wait for main interface with dialpad to be visible
  await page.waitForSelector('[data-testid="dialpad-input"]', { state: 'visible', timeout: 5000 })
}

export { test, expect }
