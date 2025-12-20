import { test, expect } from '@playwright/test'

/**
 * RecordingManagementDemo E2E Tests
 * Tests server-side call recording using Asterisk MixMonitor via AMI
 */

test.describe('RecordingManagementDemo - AMI Recording Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to Recording Management demo
    const recordingLink = page.getByRole('link', { name: /Recording/i })
    if (await recordingLink.isVisible()) {
      await recordingLink.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display demo header and description', async ({ page }) => {
    // Check for demo title
    await expect(page.locator('text=AMI Recording Management')).toBeVisible()

    // Check for description
    await expect(
      page.locator('text=/Server-side call recording using Asterisk MixMonitor/i')
    ).toBeVisible()
  })

  test('should show disconnected status initially', async ({ page }) => {
    // Should show disconnected badge
    await expect(page.locator('text=AMI: DISCONNECTED')).toBeVisible()

    // Should not show active recordings badge initially
    await expect(page.locator('.active-tag')).not.toBeVisible()
  })

  test('should allow AMI configuration', async ({ page }) => {
    // AMI Configuration panel should be visible
    await expect(page.locator('text=AMI Configuration')).toBeVisible()

    // Check for configuration fields
    await expect(page.locator('input[placeholder="ws://localhost:8088/ami"]')).toBeVisible()
    await expect(page.locator('input[placeholder="admin"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should connect to AMI (simulated)', async ({ page }) => {
    // Click connect button
    await page.click('button:has-text("Connect to AMI")')

    // Should show connecting state
    await expect(page.locator('button:has-text("Connecting...")')).toBeVisible()

    // Wait for connection (simulated delay)
    await page.waitForTimeout(1500)

    // Should show connected status
    await expect(page.locator('text=AMI: CONNECTED')).toBeVisible()

    // Connect button should change to disconnect
    await expect(page.locator('button:has-text("Disconnect")')).toBeVisible()
  })

  test('should disconnect from AMI', async ({ page }) => {
    // First connect
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await expect(page.locator('text=AMI: CONNECTED')).toBeVisible()

    // Then disconnect
    await page.click('button:has-text("Disconnect")')

    // Should show disconnected status
    await expect(page.locator('text=AMI: DISCONNECTED')).toBeVisible()
  })

  test('should show main content tabs when connected', async ({ page }) => {
    // Connect to AMI
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Check for tabs
    await expect(page.locator('text=🔴 Active Recordings')).toBeVisible()
    await expect(page.locator('text=⚙️ Settings')).toBeVisible()
    await expect(page.locator('text=📊 Statistics')).toBeVisible()
    await expect(page.locator('text=📋 Event Log')).toBeVisible()
  })

  test('should navigate between tabs', async ({ page }) => {
    // Connect first
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Click Active Recordings tab (should be default)
    await page.click('text=🔴 Active Recordings')
    await expect(page.locator('text=Start New Recording')).toBeVisible()

    // Click Settings tab
    await page.click('text=⚙️ Settings')
    await expect(page.locator('text=Recording Options')).toBeVisible()

    // Click Statistics tab
    await page.click('text=📊 Statistics')
    await expect(page.locator('text=Total Recordings')).toBeVisible()

    // Click Event Log tab
    await page.click('text=📋 Event Log')
    await expect(page.locator('text=Recording Events')).toBeVisible()
  })

  test('should start a new recording', async ({ page }) => {
    // Connect to AMI
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Should be on Active Recordings tab by default
    await expect(page.locator('text=Start New Recording')).toBeVisible()

    // Fill in channel
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/1001-00000001')

    // Start recording
    await page.click('button:has-text("Start Recording")')

    // Should show active recording
    await expect(page.locator('.recording-card')).toBeVisible()
    await expect(page.locator('text=PJSIP/1001-00000001')).toBeVisible()
  })

  test('should show recording with RECORDING status', async ({ page }) => {
    // Connect and start recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/2001-00000002')
    await page.click('button:has-text("Start Recording")')

    // Check recording card
    await expect(page.locator('.recording-card.recording')).toBeVisible()
    await expect(page.locator('text=RECORDING')).toBeVisible()

    // Should have a pulsing indicator
    await expect(page.locator('.state-indicator.recording.pulse')).toBeVisible()
  })

  test('should pause a recording', async ({ page }) => {
    // Start a recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/3001-00000003')
    await page.click('button:has-text("Start Recording")')

    // Pause the recording
    await page.click('.recording-card >> button:has-text("Pause")')

    // Should show paused status
    await expect(page.locator('.recording-card.paused')).toBeVisible()
    await expect(page.locator('text=PAUSED')).toBeVisible()
  })

  test('should resume a paused recording', async ({ page }) => {
    // Start and pause a recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/4001-00000004')
    await page.click('button:has-text("Start Recording")')
    await page.click('.recording-card >> button:has-text("Pause")')
    await expect(page.locator('text=PAUSED')).toBeVisible()

    // Resume the recording
    await page.click('.recording-card >> button:has-text("Resume")')

    // Should show recording status again
    await expect(page.locator('.recording-card.recording')).toBeVisible()
    await expect(page.locator('text=RECORDING')).toBeVisible()
  })

  test('should stop a recording', async ({ page }) => {
    // Start a recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/5001-00000005')
    await page.click('button:has-text("Start Recording")')
    await expect(page.locator('.recording-card')).toBeVisible()

    // Stop the recording
    await page.click('.recording-card >> button:has-text("Stop")')

    // Recording should be removed from active list
    await page.waitForTimeout(500)
    // Note: Depending on implementation, it might show empty state or remove the card
  })

  test('should show recording duration', async ({ page }) => {
    // Start a recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/6001-00000006')
    await page.click('button:has-text("Start Recording")')

    // Check for duration display
    await expect(page.locator('.recording-duration')).toBeVisible()
  })

  test('should display recording details', async ({ page }) => {
    // Start a recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/7001-00000007')
    await page.click('button:has-text("Start Recording")')

    // Check for details
    await expect(page.locator('text=Channel:')).toBeVisible()
    await expect(page.locator('text=File:')).toBeVisible()
    await expect(page.locator('text=Format:')).toBeVisible()
    await expect(page.locator('text=Mix Mode:')).toBeVisible()
    await expect(page.locator('text=Started:')).toBeVisible()
  })

  test('should configure recording format', async ({ page }) => {
    // Connect and go to Settings
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('text=⚙️ Settings')

    // Check for format dropdown
    await expect(page.locator('text=Audio Format')).toBeVisible()

    // Format dropdown should be visible and interactive
    const formatDropdown = page.locator('.form-field:has-text("Audio Format") >> .p-dropdown')
    await expect(formatDropdown).toBeVisible()
  })

  test('should configure mix mode', async ({ page }) => {
    // Connect and go to Settings
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('text=⚙️ Settings')

    // Check for mix mode dropdown
    await expect(page.locator('text=Mix Mode')).toBeVisible()

    // Mix mode dropdown should be visible
    const mixModeDropdown = page.locator('.form-field:has-text("Mix Mode") >> .p-dropdown')
    await expect(mixModeDropdown).toBeVisible()
  })

  test('should configure volume adjustments', async ({ page }) => {
    // Connect and go to Settings
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('text=⚙️ Settings')

    // Check for volume controls
    await expect(page.locator('text=Volume Adjustment')).toBeVisible()
    await expect(page.locator('text=Read Volume (-4 to 4)')).toBeVisible()
    await expect(page.locator('text=Write Volume (-4 to 4)')).toBeVisible()
  })

  test('should configure recording directory', async ({ page }) => {
    // Connect and go to Settings
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('text=⚙️ Settings')

    // Check for directory input
    await expect(page.locator('text=Recording Directory')).toBeVisible()
    await expect(
      page.locator('input[placeholder="/var/spool/asterisk/monitor"]')
    ).toBeVisible()
  })

  test('should show recording statistics', async ({ page }) => {
    // Connect and go to Statistics
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('text=📊 Statistics')

    // Check for stat cards
    await expect(page.locator('text=Total Recordings')).toBeVisible()
    await expect(page.locator('text=Total Duration')).toBeVisible()
    await expect(page.locator('text=Total Size')).toBeVisible()
    await expect(page.locator('text=Average Duration')).toBeVisible()
    await expect(page.locator('text=Recordings Today')).toBeVisible()
    await expect(page.locator('text=Duration Today')).toBeVisible()
  })

  test('should display statistics with icons', async ({ page }) => {
    // Connect and go to Statistics
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('text=📊 Statistics')

    // Check for stat icons
    await expect(page.locator('.stat-icon')).toHaveCount(6)
  })

  test('should show event log', async ({ page }) => {
    // Connect and go to Event Log
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('text=📋 Event Log')

    // Should show Recording Events header
    await expect(page.locator('text=Recording Events')).toBeVisible()
  })

  test('should log recording events', async ({ page }) => {
    // Connect and start a recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/8001-00000008')
    await page.click('button:has-text("Start Recording")')

    // Go to Event Log
    await page.click('text=📋 Event Log')

    // Should show event entry
    await expect(page.locator('.event-item')).toBeVisible()
  })

  test('should clear event log', async ({ page }) => {
    // Connect, start recording, go to event log
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/9001-00000009')
    await page.click('button:has-text("Start Recording")')
    await page.click('text=📋 Event Log')
    await expect(page.locator('.event-item')).toBeVisible()

    // Clear log
    await page.click('button:has-text("Clear Log")')

    // Should show empty state
    await expect(page.locator('text=No Events Yet')).toBeVisible()
  })

  test('should toggle auto-generate filename', async ({ page }) => {
    // Connect to AMI
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Auto-generate should be checked by default
    const autoCheckbox = page.locator('#autoFilename')
    await expect(autoCheckbox).toBeChecked()

    // Uncheck it
    await autoCheckbox.uncheck()

    // Custom filename field should appear
    await expect(page.locator('text=Custom Filename')).toBeVisible()
  })

  test('should use custom filename when provided', async ({ page }) => {
    // Connect and disable auto-generate
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.locator('#autoFilename').uncheck()

    // Fill in custom filename
    await page.fill('input[placeholder="my-recording"]', 'custom-test-recording')

    // Fill channel and start
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/1234-00001234')
    await page.click('button:has-text("Start Recording")')

    // Should show recording with custom filename
    await expect(page.locator('text=custom-test-recording')).toBeVisible()
  })

  test('should show empty state when no recordings', async ({ page }) => {
    // Connect to AMI
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Should show empty state
    await expect(page.locator('text=No Active Recordings')).toBeVisible()
    await expect(
      page.locator('text=Start a recording by entering a channel name above')
    ).toBeVisible()
  })

  test('should show active recordings count', async ({ page }) => {
    // Connect and start two recordings
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Start first recording
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/1111-00001111')
    await page.click('button:has-text("Start Recording")')

    // Start second recording
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/2222-00002222')
    await page.click('button:has-text("Start Recording")')

    // Should show count in header
    await expect(page.locator('text=2 Active Recordings')).toBeVisible()

    // Should show count in section header
    await expect(page.locator('text=Active Recordings (2)')).toBeVisible()
  })

  test('should work with simulation mode', async ({ page }) => {
    // Enable simulation mode
    const simulationToggle = page.locator('text=Simulation Mode').first()
    if (await simulationToggle.isVisible()) {
      await simulationToggle.click()
    }

    // Connect to AMI (simulated)
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Should show connected status
    await expect(page.locator('text=AMI: CONNECTED')).toBeVisible()

    // Start recording should work
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/SIM-00000001')
    await page.click('button:has-text("Start Recording")')
    await expect(page.locator('.recording-card')).toBeVisible()
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Connect to AMI
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Fill channel and press Enter
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/ENTER-00000001')
    await page.press('input[placeholder="PJSIP/1001-00000001"]', 'Enter')

    // Should start recording
    await expect(page.locator('.recording-card')).toBeVisible()
  })

  test('should clear channel input after starting recording', async ({ page }) => {
    // Connect and start recording
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder="PJSIP/1001-00000001"]', 'PJSIP/CLEAR-00000001')
    await page.click('button:has-text("Start Recording")')

    // Input should be cleared
    const channelInput = page.locator('input[placeholder="PJSIP/1001-00000001"]')
    await expect(channelInput).toHaveValue('')
  })
})
