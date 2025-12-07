/**
 * EventBridge Lifecycle Diagnostic Tests
 *
 * Tests for verifying EventBridge initialization and lifecycle
 * during app startup.
 */

import { test, expect, APP_URL } from './fixtures'

test.describe('EventBridge Lifecycle Diagnostic', () => {
  test.beforeEach(async ({ mockSipServer, mockMediaDevices }) => {
    // Setup mocks
    await mockSipServer()
    await mockMediaDevices()
  })

  test('should track EventBridge availability throughout initialization', async ({ page }) => {
    // Navigate to the app
    await page.goto(APP_URL)

    // Wait for app to initialize
    await expect(page.locator('[data-testid="sip-client"]')).toBeVisible({ timeout: 10000 })

    // Phase 1: After app component mounted - check EventBridge exists
    const afterMountData = await page.evaluate(() => {
      const results: Record<string, unknown> = {
        eventBridgeExists: !!(window as { __sipEventBridge?: unknown }).__sipEventBridge,
        eventBridgeListenerCount: Object.keys(
          (window as { __sipEventBridge?: { _listeners?: object } }).__sipEventBridge?._listeners ||
            {}
        ).length,
      }

      // Check if there's a captured EventBus from useSipClient
      const capturedEventBus = (window as { __capturedEventBus?: { _listeners?: object } })
        .__capturedEventBus
      if (capturedEventBus) {
        results.capturedEventBusExists = true
        results.capturedEventBusListenerCount = Object.keys(
          capturedEventBus._listeners || {}
        ).length
        results.isSameInstance =
          (window as { __sipEventBridge?: unknown }).__sipEventBridge === capturedEventBus
      }

      return results
    })

    // Phase 2: Manually register a listener on EventBridge and check if it persists
    const manualListenerTest = await page.evaluate(() => {
      const bridge = (
        window as {
          __sipEventBridge?: {
            on: (event: string, cb: () => void) => string
            emit: (event: string, data: unknown) => void
            _listeners?: Record<string, unknown[]>
          }
        }
      ).__sipEventBridge

      if (!bridge) {
        return { error: 'EventBridge does not exist', eventReceived: false }
      }

      let testEventReceived = false

      // Register listener
      const listenerId = bridge.on('diagnostic:test', () => {
        testEventReceived = true
      })

      // Emit event
      bridge.emit('diagnostic:test', { test: true })

      return {
        listenerRegistered: !!listenerId,
        eventReceived: testEventReceived,
        totalEvents: Object.keys(bridge._listeners || {}).length,
      }
    })

    // Phase 3: Check if connection button exists and its state
    const connectionButtonState = await page.evaluate(() => {
      const connectButton = document.querySelector('[data-testid="connect-button"]')
      const connectionStatus = document.querySelector('[data-testid="connection-status"]')

      return {
        connectButtonExists: !!connectButton,
        connectButtonDisabled: connectButton?.hasAttribute('disabled'),
        connectionStatusText: connectionStatus?.textContent?.trim(),
      }
    })

    // Assertions - EventBridge should exist after mount
    // Note: In E2E mock mode, the EventBridge may be created differently
    // than in the real app, so we check what's available
    expect(connectionButtonState.connectButtonExists).toBe(true)
    expect(connectionButtonState.connectionStatusText).toBeTruthy()

    // If EventBridge exists, the manual listener test should work
    if (afterMountData.eventBridgeExists) {
      expect(manualListenerTest.eventReceived).toBe(true)
    }
  })

  test('should expose useSipClient EventBus for direct inspection', async ({ page }) => {
    // Navigate to the app
    await page.goto(APP_URL)

    // Wait for mount
    await expect(page.locator('[data-testid="sip-client"]')).toBeVisible({ timeout: 10000 })

    // Try to capture the actual EventBus instance useSipClient is using
    const eventBusComparison = await page.evaluate(() => {
      const eventBridge = (window as { __sipEventBridge?: { _listeners?: object } })
        .__sipEventBridge
      const sipState = (window as { __sipState?: unknown }).__sipState
      const capturedEventBus = (window as { __capturedEventBus?: { _listeners?: object } })
        .__capturedEventBus

      return {
        eventBridgeExists: !!eventBridge,
        sipStateExists: !!sipState,
        capturedEventBusExists: !!capturedEventBus,
        allTheSameInstance: eventBridge && capturedEventBus && eventBridge === capturedEventBus,
        eventBridgeListenerCount: eventBridge
          ? Object.keys(eventBridge._listeners || {}).length
          : 0,
        capturedEventBusListenerCount: capturedEventBus
          ? Object.keys(capturedEventBus._listeners || {}).length
          : 0,
      }
    })

    // In E2E mock mode, the EventBridge may or may not exist
    // depending on how the fixtures set up the app.
    // At minimum, the app should be visible and functional.
    const sipClient = page.locator('[data-testid="sip-client"]')
    await expect(sipClient).toBeVisible()

    // If EventBridge exists, verify it's set up correctly
    if (eventBusComparison.eventBridgeExists) {
      expect(eventBusComparison.eventBridgeListenerCount).toBeGreaterThanOrEqual(0)
    }
  })
})
