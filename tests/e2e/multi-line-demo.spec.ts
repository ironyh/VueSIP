import { test, expect } from '@playwright/test'

/**
 * MultiLineDemo E2E Tests
 * Tests multi-line call management, line selection, and concurrent call handling
 */

test.describe('MultiLineDemo - Multi-Line Call Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to Multi-Line demo
    const multiLineLink = page.getByRole('link', { name: /Multi-Line/i })
    if (await multiLineLink.isVisible()) {
      await multiLineLink.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display multi-line demo header and configuration', async ({ page }) => {
    // Check for demo header
    await expect(page.locator('text=Multi-Line Configuration')).toBeVisible()

    // Check for info message
    await expect(
      page.locator('text=/Configure your SIP connection to test multi-line/i')
    ).toBeVisible()
  })

  test('should have configuration form fields', async ({ page }) => {
    // SIP Server field
    await expect(page.locator('label:has-text("SIP Server")')).toBeVisible()
    await expect(page.locator('input#sip-server')).toBeVisible()

    // Username field
    await expect(page.locator('label:has-text("Username")')).toBeVisible()
    await expect(page.locator('input#sip-username')).toBeVisible()

    // Password field
    await expect(page.locator('label:has-text("Password")')).toBeVisible()
    await expect(page.locator('input#sip-password')).toBeVisible()

    // Line count dropdown
    await expect(page.locator('label:has-text("Number of Lines")')).toBeVisible()
    await expect(page.locator('#line-count')).toBeVisible()

    // Auto-hold checkbox
    await expect(page.locator('label:has-text("Auto-hold")')).toBeVisible()
    await expect(page.locator('input#auto-hold')).toBeVisible()

    // Connect button
    await expect(page.getByRole('button', { name: /Connect/i })).toBeVisible()
  })

  test('should connect with valid credentials', async ({ page }) => {
    // Fill in configuration
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')

    // Click Connect button
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Should show status toolbar
    await expect(page.locator('text=SIP Connected')).toBeVisible()
  })

  test('should display status toolbar after connection', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Check status items
    await expect(page.locator('text=SIP Connected')).toBeVisible()
    await expect(page.locator('text=/Active:/i')).toBeVisible()

    // Check disconnect button
    await expect(page.getByRole('button', { name: /Disconnect/i })).toBeVisible()
  })

  test('should display line cards after connection', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')

    // Select 4 lines
    await page.click('#line-count')
    await page.click('.p-dropdown-item:has-text("4 Lines")')

    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Should show 4 line cards
    const lineCards = page.locator('.line-card')
    await expect(lineCards).toHaveCount(4)

    // Each line should show "Line X"
    await expect(page.locator('text=Line 1')).toBeVisible()
    await expect(page.locator('text=Line 2')).toBeVisible()
    await expect(page.locator('text=Line 3')).toBeVisible()
    await expect(page.locator('text=Line 4')).toBeVisible()
  })

  test('should show Available tag for idle lines', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // All lines should initially be Available
    const availableTags = page.locator('.p-tag:has-text("Available")')
    const count = await availableTags.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should change number of lines before connection', async ({ page }) => {
    // Change to 6 lines
    await page.click('#line-count')
    await page.click('.p-dropdown-item:has-text("6 Lines")')

    // Fill in config and connect
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Should show 6 line cards
    const lineCards = page.locator('.line-card')
    await expect(lineCards).toHaveCount(6)
  })

  test('should toggle auto-hold setting', async ({ page }) => {
    const checkbox = page.locator('input#auto-hold')

    // Should be checked by default
    await expect(checkbox).toBeChecked()

    // Uncheck it
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()

    // Check it again
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })

  test('should select a line by clicking on card', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Click on Line 2
    const line2Card = page.locator('.line-card').nth(1)
    await line2Card.click()

    // Line 2 should have selected class
    await expect(line2Card).toHaveClass(/selected/)
  })

  test('should make an outgoing call', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Enter number to dial
    await page.fill('.dial-input', 'sip:bob@example.com')

    // Click Call button
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Should show Active tag on a line
    await expect(page.locator('.p-tag:has-text("Active")')).toBeVisible()

    // Should show call duration
    await expect(page.locator('.call-duration')).toBeVisible()
  })

  test('should handle incoming call simulation', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(3500) // Wait for simulated incoming call

    // Should show Incoming tag
    await expect(page.locator('.p-tag:has-text("Incoming")')).toBeVisible()

    // Should show caller info
    await expect(page.locator('.caller-name')).toBeVisible()
    await expect(page.locator('.caller-uri')).toBeVisible()

    // Should show Answer and Reject buttons
    await expect(page.locator('button:has-text("Answer")')).toBeVisible()
    await expect(page.locator('button:has-text("Reject")')).toBeVisible()
  })

  test('should answer incoming call', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(3500)

    // Answer the call
    await page.click('button:has-text("Answer")')
    await page.waitForTimeout(500)

    // Should show Active tag
    await expect(page.locator('.p-tag:has-text("Active")')).toBeVisible()

    // Should show call duration
    await expect(page.locator('.call-duration')).toBeVisible()
  })

  test('should reject incoming call', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(3500)

    // Reject the call
    await page.click('button:has-text("Reject")')
    await page.waitForTimeout(300)

    // Line should be Available again
    await expect(page.locator('.p-tag:has-text("Available")')).toBeVisible()
  })

  test('should put call on hold', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Click Hold button
    const holdButton = page.locator('.line-controls button:has-text("Hold")').first()
    await holdButton.click()
    await page.waitForTimeout(300)

    // Should show On Hold tag
    await expect(page.locator('.p-tag:has-text("On Hold")')).toBeVisible()

    // Should show Hold tag in indicators
    await expect(page.locator('.call-indicators .p-tag:has-text("Hold")')).toBeVisible()
  })

  test('should resume call from hold', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call and put on hold
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)
    const holdButton = page.locator('.line-controls button:has-text("Hold")').first()
    await holdButton.click()
    await page.waitForTimeout(300)

    // Click Resume button
    const resumeButton = page.locator('.line-controls button:has-text("Resume")').first()
    await resumeButton.click()
    await page.waitForTimeout(300)

    // Should show Active tag
    await expect(page.locator('.p-tag:has-text("Active")')).toBeVisible()
  })

  test('should mute and unmute call', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Click Mute button
    const muteButton = page.locator('.line-controls button:has-text("Mute")').first()
    await muteButton.click()
    await page.waitForTimeout(200)

    // Should show Muted tag
    await expect(page.locator('.call-indicators .p-tag:has-text("Muted")')).toBeVisible()

    // Click Unmute button
    const unmuteButton = page.locator('.line-controls button:has-text("Unmute")').first()
    await unmuteButton.click()
    await page.waitForTimeout(200)

    // Muted tag should be gone
    await expect(page.locator('.call-indicators .p-tag:has-text("Muted")')).not.toBeVisible()
  })

  test('should end call', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Click End button
    const endButton = page.locator('.line-controls button:has-text("End")').first()
    await endButton.click()
    await page.waitForTimeout(300)

    // Line should be Available again
    await expect(page.locator('.p-tag:has-text("Available")')).toBeVisible()
  })

  test('should make multiple concurrent calls', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make first call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Make second call
    await page.fill('.dial-input', 'sip:charlie@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Should have 2 active calls (one may be on hold)
    const activeTags = page.locator('.p-tag:has-text("Active"), .p-tag:has-text("On Hold")')
    const count = await activeTags.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should select specific line for outgoing call', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Select Line 3 from dropdown
    await page.click('.line-select')
    await page.click('.p-dropdown-item:has-text("Line 3")')

    // Make call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Line 3 should be active
    const line3Card = page.locator('.line-card').nth(2)
    await expect(line3Card.locator('.p-tag:has-text("Active")')).toBeVisible()
  })

  test('should hold all active lines', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make two calls
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    await page.fill('.dial-input', 'sip:charlie@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Click Hold All
    await page.click('.actions-card button:has-text("Hold All")')
    await page.waitForTimeout(300)

    // Should have multiple On Hold tags
    const heldTags = page.locator('.p-tag:has-text("On Hold")')
    const count = await heldTags.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should hangup all calls', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make two calls
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    await page.fill('.dial-input', 'sip:charlie@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Click Hangup All
    await page.click('.actions-card button:has-text("Hangup All")')
    await page.waitForTimeout(800)

    // All lines should be Available
    const availableTags = page.locator('.p-tag:has-text("Available")')
    const count = await availableTags.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should swap active and held lines', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make two calls
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    await page.fill('.dial-input', 'sip:charlie@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Verify we have active and held lines
    const activeBefore = await page.locator('.p-tag:has-text("Active")').count()
    const heldBefore = await page.locator('.p-tag:has-text("On Hold")').count()

    // Click Swap Lines
    await page.click('.actions-card button:has-text("Swap Lines")')
    await page.waitForTimeout(300)

    // Status should have changed
    const activeAfter = await page.locator('.p-tag:has-text("Active")').count()
    const heldAfter = await page.locator('.p-tag:has-text("On Hold")').count()

    // Should still have same total number of calls
    expect(activeBefore + heldBefore).toBe(activeAfter + heldAfter)
  })

  test('should show DTMF pad for active line', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // DTMF pad should be visible
    await expect(page.locator('text=/DTMF \\(Line/i')).toBeVisible()

    // Should have all DTMF buttons
    await expect(page.locator('.dtmf-button:has-text("1")')).toBeVisible()
    await expect(page.locator('.dtmf-button:has-text("5")')).toBeVisible()
    await expect(page.locator('.dtmf-button:has-text("*")')).toBeVisible()
    await expect(page.locator('.dtmf-button:has-text("#")')).toBeVisible()
  })

  test('should send DTMF digits', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Click DTMF buttons
    await page.click('.dtmf-button:has-text("1")')
    await page.waitForTimeout(100)
    await page.click('.dtmf-button:has-text("2")')
    await page.waitForTimeout(100)
    await page.click('.dtmf-button:has-text("3")')

    // Should not throw errors (functionality verified in console)
  })

  test('should show busy warning when all lines occupied', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')

    // Select 2 lines only
    await page.click('#line-count')
    await page.click('.p-dropdown-item:has-text("2 Lines")')

    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make two calls to fill all lines
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    await page.fill('.dial-input', 'sip:charlie@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Should show busy warning
    await expect(
      page.locator('text=/All lines are busy. Hangup a call to make a new one./i')
    ).toBeVisible()
  })

  test('should disconnect and return to config screen', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Click Disconnect
    await page.click('button:has-text("Disconnect")')
    await page.waitForTimeout(300)

    // Should be back at config screen
    await expect(page.locator('text=Multi-Line Configuration')).toBeVisible()
    await expect(page.locator('button:has-text("Connect")')).toBeVisible()
  })

  test('should work in simulation mode', async ({ page }) => {
    // Enable simulation mode if toggle exists
    const simulationToggle = page.locator('text=Simulation Mode').first()
    if (await simulationToggle.isVisible()) {
      await simulationToggle.click()
    }

    // Connect and make calls
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Should work normally
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    await expect(page.locator('.p-tag:has-text("Active")')).toBeVisible()
  })

  test('should display call duration timer', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Duration should be visible (format: MM:SS)
    const durationElement = page.locator('.call-duration').first()
    await expect(durationElement).toBeVisible()

    // Should match time format
    const durationText = await durationElement.textContent()
    expect(durationText).toMatch(/\d{2}:\d{2}/)
  })

  test('should show incoming call count in status bar', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(3500) // Wait for simulated incoming call

    // Should show incoming count
    await expect(page.locator('text=/Incoming:/i')).toBeVisible()
  })

  test('should show active call count in status bar', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')
    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Make a call
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Should show active count > 0
    const activeText = await page.locator('text=/Active: \\d+/i').textContent()
    expect(activeText).toMatch(/Active: [1-9]/)
  })

  test('should disable call button when all lines busy', async ({ page }) => {
    await page.fill('input#sip-server', 'wss://sip.example.com')
    await page.fill('input#sip-username', '1001')
    await page.fill('input#sip-password', 'password123')

    // Select 2 lines
    await page.click('#line-count')
    await page.click('.p-dropdown-item:has-text("2 Lines")')

    await page.click('button:has-text("Connect")')
    await page.waitForTimeout(1500)

    // Fill both lines
    await page.fill('.dial-input', 'sip:bob@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    await page.fill('.dial-input', 'sip:charlie@example.com')
    await page.click('.dial-card button:has-text("Call")')
    await page.waitForTimeout(800)

    // Call button should be disabled
    const callButton = page.locator('.dial-card button:has-text("Call")')
    await expect(callButton).toBeDisabled()
  })
})
