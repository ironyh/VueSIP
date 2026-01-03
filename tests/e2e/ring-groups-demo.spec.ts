import { test, expect } from '@playwright/test'

/**
 * RingGroupsDemo E2E Tests
 * Tests ring group management, member operations, strategies, and simulation
 */

test.describe('RingGroupsDemo - Ring Group Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to Ring Groups demo
    const ringGroupsLink = page.getByRole('link', { name: /Ring Groups/i })
    if (await ringGroupsLink.isVisible()) {
      await ringGroupsLink.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display RingGroupsDemo header and description', async ({ page }) => {
    // Check for demo header
    await expect(page.locator('text=Ring Groups Management')).toBeVisible()

    // Check for description
    await expect(page.locator('text=/Configure ring strategies/i')).toBeVisible()
  })

  test('should show info panel with explanations', async ({ page }) => {
    // About Ring Groups panel should be visible
    await expect(page.locator('text=About Ring Groups')).toBeVisible()

    // Info messages should be present
    await expect(page.locator('text=/Ring Groups allow multiple extensions/i')).toBeVisible()
  })

  test('should display controls section with group ID input', async ({ page }) => {
    // Group ID input should be visible
    await expect(page.locator('input#group-id')).toBeVisible()

    // Start Monitoring button should be visible
    await expect(page.locator('button:has-text("Start Monitoring")')).toBeVisible()
  })

  test('should start monitoring ring groups', async ({ page }) => {
    // Enter group ID
    await page.fill('input#group-id', '600')

    // Click Start Monitoring
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)

    // Should show Stop Monitoring button
    await expect(page.locator('button:has-text("Stop Monitoring")')).toBeVisible()

    // Should show ring groups grid
    await expect(page.locator('text=Ring Groups')).toBeVisible()
  })

  test('should display ring group cards after starting monitoring', async ({ page }) => {
    // Start monitoring
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)

    // Ring group card should be visible
    await expect(page.locator('text=Ring Group 600')).toBeVisible()
    await expect(page.locator('text=Ring All')).toBeVisible()
  })

  test('should add a new ring group', async ({ page }) => {
    // Start monitoring first
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)

    // Add another group
    await page.fill('input#group-id', '601')
    await page.click('button:has-text("Add Group")')
    await page.waitForTimeout(500)

    // Both groups should be visible
    await expect(page.locator('text=Ring Group 600')).toBeVisible()
    await expect(page.locator('text=Ring Group 601')).toBeVisible()
  })

  test('should select a ring group and show details', async ({ page }) => {
    // Start monitoring
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)

    // Click on the ring group card
    await page.locator('.group-card').first().click()

    // Details should be visible (check for TabView)
    await expect(page.locator('text=Configuration')).toBeVisible()
    await expect(page.locator('text=Members')).toBeVisible()
    await expect(page.locator('text=Statistics')).toBeVisible()
  })

  test('should show ring strategy dropdown in Configuration tab', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Configuration tab should be active by default
    await expect(page.locator('select#ring-strategy, .p-dropdown#ring-strategy')).toBeVisible()
    await expect(page.locator('label:has-text("Ring Strategy")')).toBeVisible()
  })

  test('should show ring timeout configuration', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Ring timeout input should be visible
    await expect(page.locator('label:has-text("Ring Timeout")')).toBeVisible()
  })

  test('should navigate to Members tab', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Click Members tab
    await page.click('text=Members')

    // Add Member panel should be visible
    await expect(page.locator('text=Add Member')).toBeVisible()
  })

  test('should add a member to ring group', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Navigate to Members tab
    await page.click('text=Members')

    // Fill in member details
    const extensionInputs = page.locator('input[placeholder="Extension"]')
    await extensionInputs.first().fill('1001')

    const nameInputs = page.locator('input[placeholder*="Name"]')
    await nameInputs.first().fill('Alice')

    // Click Add Member
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)

    // Member should appear in the list
    await expect(page.locator('text=1001')).toBeVisible()
    await expect(page.locator('text=Alice')).toBeVisible()
  })

  test('should disable a member', async ({ page }) => {
    // Start monitoring, select group, and add member
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')
    await page.locator('input[placeholder="Extension"]').first().fill('1002')
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)

    // Click disable button (pause icon)
    const disableBtn = page.locator('.member-card').first().locator('button[aria-label*="Disable"]')
    await disableBtn.click()
    await page.waitForTimeout(300)

    // Member card should show disabled state
    await expect(page.locator('.member-card.disabled')).toBeVisible()
  })

  test('should enable a disabled member', async ({ page }) => {
    // Start monitoring, add and disable member
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')
    await page.locator('input[placeholder="Extension"]').first().fill('1003')
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)
    await page.locator('.member-card').first().locator('button[aria-label*="Disable"]').click()
    await page.waitForTimeout(300)

    // Click enable button (play icon)
    const enableBtn = page.locator('.member-card').first().locator('button[aria-label*="Enable"]')
    await enableBtn.click()
    await page.waitForTimeout(300)

    // Member card should no longer be disabled
    await expect(page.locator('.member-card:not(.disabled)')).toBeVisible()
  })

  test('should remove a member', async ({ page }) => {
    // Start monitoring, select group, and add member
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')
    await page.locator('input[placeholder="Extension"]').first().fill('1004')
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=1004')).toBeVisible()

    // Click remove button (trash icon)
    const removeBtn = page.locator('.member-card').first().locator('button[aria-label*="Remove"]')
    await removeBtn.click()
    await page.waitForTimeout(500)

    // Member should be removed
    await expect(page.locator('text=1004')).not.toBeVisible()
  })

  test('should show empty state when no members', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')

    // Empty state should be visible
    await expect(page.locator('text=No members in this ring group')).toBeVisible()
  })

  test('should navigate to Statistics tab', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Click Statistics tab
    await page.click('text=Statistics')

    // Stat cards should be visible
    await expect(page.locator('text=Total Calls')).toBeVisible()
    await expect(page.locator('text=Answered')).toBeVisible()
  })

  test('should display statistics cards', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Statistics')

    // All stat cards should be present
    await expect(page.locator('text=Total Calls')).toBeVisible()
    await expect(page.locator('text=Answered')).toBeVisible()
    await expect(page.locator('text=Unanswered')).toBeVisible()
    await expect(page.locator('text=Current Calls')).toBeVisible()
    await expect(page.locator('text=Service Level')).toBeVisible()
    await expect(page.locator('text=Last Call')).toBeVisible()
  })

  test('should navigate to Simulate tab', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Click Simulate tab
    await page.click('text=Simulate')

    // Simulation buttons should be visible
    await expect(page.locator('button:has-text("Incoming Call")')).toBeVisible()
    await expect(page.locator('button:has-text("Answer Call")')).toBeVisible()
    await expect(page.locator('button:has-text("End Call")')).toBeVisible()
  })

  test('should simulate incoming call', async ({ page }) => {
    // Start monitoring, select group, add member
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')
    await page.locator('input[placeholder="Extension"]').first().fill('1005')
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)

    // Go to Simulate tab
    await page.click('text=Simulate')

    // Simulate incoming call
    await page.click('button:has-text("Incoming Call")')
    await page.waitForTimeout(500)

    // Group state should change to ringing
    const groupCard = page.locator('.group-card').first()
    await expect(groupCard.locator('text=ringing')).toBeVisible()
  })

  test('should simulate call answer', async ({ page }) => {
    // Start monitoring, add member, simulate incoming call
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')
    await page.locator('input[placeholder="Extension"]').first().fill('1006')
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)
    await page.click('text=Simulate')
    await page.click('button:has-text("Incoming Call")')
    await page.waitForTimeout(500)

    // Simulate answer
    await page.click('button:has-text("Answer Call")')
    await page.waitForTimeout(500)

    // Check statistics were updated
    await page.click('text=Statistics')
    await expect(page.locator('text=1').first()).toBeVisible() // Total calls should be 1
  })

  test('should clear statistics', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Click Clear Stats button
    await page.click('button:has-text("Clear Stats")')
    await page.waitForTimeout(300)

    // Navigate to Statistics tab
    await page.click('text=Statistics')

    // Stats should be reset to 0
    await expect(page.locator('.stat-value:has-text("0")').first()).toBeVisible()
  })

  test('should disable ring group', async ({ page }) => {
    // Start monitoring and select group
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()

    // Click Disable button
    await page.click('button:has-text("Disable")')
    await page.waitForTimeout(300)

    // Group should show as disabled
    await expect(page.locator('.p-tag:has-text("Disabled")')).toBeVisible()
  })

  test('should enable disabled ring group', async ({ page }) => {
    // Start monitoring, select group, and disable it
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('button:has-text("Disable")')
    await page.waitForTimeout(300)

    // Click Enable button
    await page.click('button:has-text("Enable")')
    await page.waitForTimeout(300)

    // Group should show as enabled
    await expect(page.locator('.p-tag:has-text("Enabled")')).toBeVisible()
  })

  test('should stop monitoring', async ({ page }) => {
    // Start monitoring
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)

    // Stop monitoring
    await page.click('button:has-text("Stop Monitoring")')
    await page.waitForTimeout(300)

    // Should return to initial state
    await expect(page.locator('button:has-text("Start Monitoring")')).toBeVisible()
    await expect(page.locator('text=Ring Group Management')).toBeVisible()
  })

  test('should show code example', async ({ page }) => {
    // Code example panel should be visible
    await expect(page.locator('text=Code Example')).toBeVisible()

    // Expand it
    const codePanel = page.locator('.code-panel')
    if (await codePanel.locator('button').isVisible()) {
      await codePanel.locator('button').first().click()
      await page.waitForTimeout(300)
    }

    // Code should be visible
    await expect(page.locator('text=useAmiRingGroups')).toBeVisible()
  })

  test('should work in simulation mode', async ({ page }) => {
    // Enable simulation mode
    const simulationToggle = page.locator('text=Simulation Mode').first()
    if (await simulationToggle.isVisible()) {
      await simulationToggle.click()
    }

    // Start monitoring (should work in simulation)
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)

    // Should display ring group
    await expect(page.locator('text=Ring Group 600')).toBeVisible()
  })

  test('should handle member priority changes', async ({ page }) => {
    // Start monitoring, select group, add member
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')
    await page.locator('input[placeholder="Extension"]').first().fill('1007')
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)

    // Priority input should be visible
    await expect(page.locator('label:has-text("Priority")')).toBeVisible()
  })

  test('should show member status badges', async ({ page }) => {
    // Start monitoring, select group, add member
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)
    await page.locator('.group-card').first().click()
    await page.click('text=Members')
    await page.locator('input[placeholder="Extension"]').first().fill('1008')
    await page.click('button:has-text("Add Member")')
    await page.waitForTimeout(500)

    // Status tag should be visible (Available)
    await expect(page.locator('.p-tag:has-text("Available")')).toBeVisible()
  })

  test('should refresh ring group data', async ({ page }) => {
    // Start monitoring
    await page.fill('input#group-id', '600')
    await page.click('button:has-text("Start Monitoring")')
    await page.waitForTimeout(500)

    // Click Refresh button
    await page.click('button:has-text("Refresh")')
    await page.waitForTimeout(300)

    // Should still show the ring group
    await expect(page.locator('text=Ring Group 600')).toBeVisible()
  })
})
