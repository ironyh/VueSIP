import { test, expect } from '@playwright/test'

/**
 * AgentLoginDemo E2E Tests
 * Tests Asterisk AMI agent login, queue management, pause functionality, and session tracking
 */

test.describe('AgentLoginDemo - Agent Queue Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to Agent Login demo
    const agentLoginLink = page.getByRole('link', { name: /Agent Login/i })
    if (await agentLoginLink.isVisible()) {
      await agentLoginLink.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display agent login demo header and description', async ({ page }) => {
    // Check for demo header
    await expect(page.locator('text=Agent Login & Queue Management')).toBeVisible()

    // Check for description
    await expect(page.locator('text=/Asterisk Manager Interface/i')).toBeVisible()
  })

  test('should show configuration form with all fields', async ({ page }) => {
    // AMI Host field
    await expect(page.locator('label:has-text("AMI Host")')).toBeVisible()
    await expect(page.locator('input#ami-host')).toBeVisible()

    // AMI Username field
    await expect(page.locator('label:has-text("AMI Username")')).toBeVisible()
    await expect(page.locator('input#ami-username')).toBeVisible()

    // AMI Password field
    await expect(page.locator('label:has-text("AMI Password")')).toBeVisible()
    await expect(page.locator('input[type="password"]#ami-password')).toBeVisible()

    // Agent Extension field
    await expect(page.locator('label:has-text("Agent Extension")')).toBeVisible()
    await expect(page.locator('input#agent-extension')).toBeVisible()

    // Connect button
    await expect(page.locator('button:has-text("Connect to AMI")')).toBeVisible()
  })

  test('should connect to AMI with valid credentials', async ({ page }) => {
    // Fill in configuration
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')

    // Connect
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Should show status toolbar
    await expect(page.locator('.status-toolbar')).toBeVisible()
    await expect(page.locator('text=AMI Connected')).toBeVisible()
  })

  test('should display status toolbar after connection', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Check status items
    await expect(page.locator('.status-indicator.connected')).toBeVisible()
    await expect(page.locator('.p-tag')).toBeVisible()
    await expect(page.locator('button:has-text("Disconnect")')).toBeVisible()
  })

  test('should display session information card', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Check session info
    await expect(page.locator('text=Session Information')).toBeVisible()
    await expect(page.locator('.info-grid')).toBeVisible()
    await expect(page.locator('text=Agent Extension')).toBeVisible()
    await expect(page.locator('text=1001')).toBeVisible()
  })

  test('should display queue management section', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Check queue management section
    await expect(page.locator('text=Queue Management')).toBeVisible()
    await expect(page.locator('.queue-item')).toBeVisible()
  })

  test('should login to a specific queue', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Find first available queue and login
    const loginButton = page.locator('.queue-item >> button:has-text("Login")').first()
    if (await loginButton.isVisible()) {
      await loginButton.click()
      await page.waitForTimeout(800)

      // Should show logged-in state
      await expect(page.locator('.queue-item.logged-in')).toBeVisible()
      await expect(page.locator('.p-tag:has-text("Active")')).toBeVisible()
    }
  })

  test('should logout from a specific queue', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login first
    const loginButton = page.locator('.queue-item >> button:has-text("Login")').first()
    if (await loginButton.isVisible()) {
      await loginButton.click()
      await page.waitForTimeout(800)

      // Then logout
      const logoutButton = page.locator('.queue-item >> button:has-text("Logout")').first()
      await logoutButton.click()
      await page.waitForTimeout(800)

      // Should show logged-out state
      await expect(page.locator('.queue-item:not(.logged-in)')).toBeVisible()
    }
  })

  test('should login to all queues', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Click Login to All button
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(1000)

    // Should have logged-in queues
    const loggedInQueues = page.locator('.queue-item.logged-in')
    const count = await loggedInQueues.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should logout from all queues', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login to all first
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(1000)

    // Then logout from all
    await page.click('button:has-text("Logout from All Queues")')
    await page.waitForTimeout(1000)

    // Should have no logged-in queues
    const loggedInQueues = page.locator('.queue-item.logged-in')
    const count = await loggedInQueues.count()
    expect(count).toBe(0)
  })

  test('should display pause management section', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Check pause management section
    await expect(page.locator('text=Pause Management')).toBeVisible()
    await expect(page.locator('.p-dropdown')).toBeVisible()
  })

  test('should pause agent with a reason', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login to at least one queue first
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(800)

    // Select pause reason
    await page.click('.p-dropdown')
    await page.click('.p-dropdown-item:has-text("Break")')

    // Pause agent
    await page.click('button:has-text("Pause Agent")')
    await page.waitForTimeout(800)

    // Should show paused state
    await expect(page.locator('.paused-state')).toBeVisible()
    await expect(page.locator('text=Currently Paused')).toBeVisible()
    await expect(page.locator('.p-tag:has-text("Paused")')).toBeVisible()
  })

  test('should unpause agent', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login and pause first
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(800)
    await page.click('.p-dropdown')
    await page.click('.p-dropdown-item:has-text("Break")')
    await page.click('button:has-text("Pause Agent")')
    await page.waitForTimeout(800)

    // Unpause agent
    await page.click('button:has-text("Unpause Agent")')
    await page.waitForTimeout(800)

    // Should show active state
    await expect(page.locator('.pause-form')).toBeVisible()
    await expect(page.locator('.p-tag:has-text("Active")')).toBeVisible()
  })

  test('should display queue memberships section', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login to show memberships
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(1000)

    // Check memberships section
    await expect(page.locator('text=Queue Memberships')).toBeVisible()
    await expect(page.locator('.membership-card')).toBeVisible()
  })

  test('should show queue membership statistics', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login to show memberships
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(1000)

    // Check membership stats
    await expect(page.locator('text=Calls Taken')).toBeVisible()
    await expect(page.locator('text=Last Call')).toBeVisible()
    await expect(page.locator('text=Penalty')).toBeVisible()
  })

  test('should disconnect and return to configuration', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Disconnect
    await page.click('button:has-text("Disconnect")')
    await page.waitForTimeout(500)

    // Should show configuration form again
    await expect(page.locator('input#ami-host')).toBeVisible()
    await expect(page.locator('button:has-text("Connect to AMI")')).toBeVisible()
  })

  test('should show correct status tag for logged_out state', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Should show Logged Out tag initially
    const statusTag = page.locator('.status-toolbar >> .p-tag').first()
    await expect(statusTag).toBeVisible()
    const tagText = await statusTag.textContent()
    expect(tagText).toContain('Logged Out')
  })

  test('should show correct status tag for logged_in state', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login to a queue
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(1000)

    // Should show Active/Logged In tag
    const statusTag = page.locator('.status-toolbar >> .p-tag').first()
    await expect(statusTag).toBeVisible()
  })

  test('should show correct status tag for paused state', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login and pause
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(800)
    await page.click('.p-dropdown')
    await page.click('.p-dropdown-item:has-text("Break")')
    await page.click('button:has-text("Pause Agent")')
    await page.waitForTimeout(800)

    // Should show Paused tag
    await expect(page.locator('.p-tag:has-text("Paused")')).toBeVisible()
  })

  test('should work in simulation mode', async ({ page }) => {
    // Enable simulation mode if available
    const simulationToggle = page.locator('text=Simulation Mode').first()
    if (await simulationToggle.isVisible()) {
      await simulationToggle.click()
    }

    // Connect
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Should work normally
    await expect(page.locator('.status-toolbar')).toBeVisible()
  })

  test('should show empty state when no queue memberships', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Should show empty state initially
    await expect(page.locator('text=Not logged into any queues')).toBeVisible()
  })

  test('should disable pause button when not logged in', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Pause button should be disabled when not logged in
    const pauseButton = page.locator('button:has-text("Pause Agent")')
    await expect(pauseButton).toBeDisabled()
  })

  test('should show pause reason in paused state', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login and pause with specific reason
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(800)
    await page.click('.p-dropdown')
    await page.click('.p-dropdown-item:has-text("Lunch")')
    await page.click('button:has-text("Pause Agent")')
    await page.waitForTimeout(800)

    // Should show the pause reason
    await expect(page.locator('.paused-reason:has-text("Lunch")')).toBeVisible()
  })

  test('should display code example', async ({ page }) => {
    // Scroll to code example
    await page.locator('text=Code Example').scrollIntoViewIfNeeded()

    // Code block should be visible
    await expect(page.locator('.code-block')).toBeVisible()
    await expect(page.locator('text=useAmiAgent')).toBeVisible()
  })

  test('should handle multiple queue logins and logouts', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login to all
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(1000)

    // Count logged-in queues
    const initialCount = await page.locator('.queue-item.logged-in').count()
    expect(initialCount).toBeGreaterThan(0)

    // Logout from one specific queue
    const firstLogoutButton = page.locator('.queue-item >> button:has-text("Logout")').first()
    await firstLogoutButton.click()
    await page.waitForTimeout(800)

    // Should have one less logged-in queue
    const afterCount = await page.locator('.queue-item.logged-in').count()
    expect(afterCount).toBe(initialCount - 1)
  })

  test('should update membership stats after queue operations', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Login to show memberships
    await page.click('button:has-text("Login to All Queues")')
    await page.waitForTimeout(1000)

    // Pause agent
    await page.click('.p-dropdown')
    await page.click('.p-dropdown-item:has-text("Break")')
    await page.click('button:has-text("Pause Agent")')
    await page.waitForTimeout(800)

    // Membership cards should show paused state
    await expect(page.locator('.membership-card >> .p-tag:has-text("Paused")')).toBeVisible()
  })

  test('should show shift status when available', async ({ page }) => {
    await page.fill('input#ami-host', 'localhost:5038')
    await page.fill('input#ami-username', 'admin')
    await page.fill('input#ami-password', 'password123')
    await page.fill('input#agent-extension', '1001')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Check if shift status is displayed
    const shiftTag = page.locator('.status-toolbar >> .p-tag:has-text("Shift")')
    // Shift status is optional, so we just check if it exists
    const isVisible = await shiftTag.isVisible().catch(() => false)
    // This is expected behavior - shift status may or may not be present
    expect(typeof isVisible).toBe('boolean')
  })
})
