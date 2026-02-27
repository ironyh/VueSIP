import { test, expect } from '@playwright/test'

/**
 * E911Demo E2E Tests
 * Tests emergency services configuration, compliance monitoring, and emergency call handling
 */

test.describe('E911Demo - Emergency Services', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to E911 demo
    const e911Link = page.getByRole('link', { name: /E911/i })
    if (await e911Link.isVisible()) {
      await e911Link.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display E911 demo header and compliance warning', async ({ page }) => {
    // Check for demo header
    await expect(page.locator('text=E911 Emergency Services')).toBeVisible()

    // Check for production deployment notice
    await expect(page.locator('text=/Production Deployment Notice/i')).toBeVisible()
  })

  test('should show compliance status with issues when not configured', async ({ page }) => {
    // Compliance status should be visible
    await expect(page.locator('text=Compliance Status')).toBeVisible()

    // Should show issues detected initially (no locations configured)
    const statusTag = page.locator('.status-tag')
    await expect(statusTag).toBeVisible()

    // Should show issue count or warning state
    const complianceCard = page.locator('.compliance-status-card')
    await expect(complianceCard).toBeVisible()
  })

  test('should navigate between tabs (Locations, Recipients, Settings, Logs)', async ({ page }) => {
    // Click Locations tab
    await page.click('text=📍 Locations')
    await expect(page.locator('text=Emergency Locations')).toBeVisible()

    // Click Recipients tab
    await page.click('text=👤 Recipients')
    await expect(page.locator('text=Notification Recipients')).toBeVisible()

    // Click Settings tab
    await page.click('text=⚙️ Settings')
    await expect(page.locator('text=E911 Configuration')).toBeVisible()

    // Click Logs tab
    await page.click('text=📋 Logs')
    await expect(page.locator('text=Compliance Logs')).toBeVisible()
  })

  test('should add a new emergency location', async ({ page }) => {
    // Navigate to Locations tab
    await page.click('text=📍 Locations')

    // Click Add Location button
    await page.click('button:has-text("Add Location")')

    // Dialog should appear
    await expect(page.locator('text=Add Emergency Location')).toBeVisible()

    // Fill in location form
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Test Office')
    await page.fill('input[placeholder="123 Main Street"]', '123 Test Street')
    await page.fill('input[placeholder="Anytown"]', 'Test City')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '94105')
    await page.fill('input[placeholder="1001, 1002, 1003"]', '1001, 1002')

    // Submit the form
    await page.click('button:has-text("Add Location")')

    // Location should appear in the list
    await expect(page.locator('text=Test Office')).toBeVisible()
    await expect(page.locator('text=123 Test Street Test City CA 94105')).toBeVisible()
  })

  test('should set a location as default', async ({ page }) => {
    // First add a location
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Default Office')
    await page.fill('input[placeholder="123 Main Street"]', '456 Main St')
    await page.fill('input[placeholder="Anytown"]', 'San Francisco')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '94102')
    await page.click('button:has-text("Add Location")')

    // Set as default
    await page.click('button:has-text("Set Default")')

    // Should show Default badge
    await expect(page.locator('.location-card >> text=Default')).toBeVisible()
  })

  test('should verify a location', async ({ page }) => {
    // Add a location first
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Verified Office')
    await page.fill('input[placeholder="123 Main Street"]', '789 Verified St')
    await page.fill('input[placeholder="Anytown"]', 'Oakland')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '94601')
    await page.click('button:has-text("Add Location")')

    // Verify the location
    await page.click('button:has-text("Verify")')

    // Should show Verified badge
    await expect(page.locator('.location-card >> text=Verified')).toBeVisible()
  })

  test('should remove a location', async ({ page }) => {
    // Add a location
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Temp Office')
    await page.fill('input[placeholder="123 Main Street"]', '999 Temp St')
    await page.fill('input[placeholder="Anytown"]', 'Berkeley')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '94704')
    await page.click('button:has-text("Add Location")')
    await expect(page.locator('text=Temp Office')).toBeVisible()

    // Remove the location
    const removeButton = page.locator(
      '.location-card:has-text("Temp Office") >> button:has-text("Remove")'
    )
    await removeButton.click()

    // Location should be removed
    await expect(page.locator('text=Temp Office')).not.toBeVisible()
  })

  test('should add a notification recipient', async ({ page }) => {
    // Navigate to Recipients tab
    await page.click('text=👤 Recipients')

    // Click Add Recipient
    await page.click('button:has-text("Add Recipient")')

    // Dialog should appear
    await expect(page.locator('text=Add Notification Recipient')).toBeVisible()

    // Fill in recipient form
    await page.fill('input[placeholder="Security Team, Front Desk"]', 'Security Team')
    await page.fill('input[type="email"]', 'security@test.com')
    await page.fill('input[placeholder="+15551234567"]', '+15551234567')

    // Submit the form
    await page.click('button:has-text("Add Recipient")')

    // Recipient should appear in the list
    await expect(page.locator('text=Security Team')).toBeVisible()
    await expect(page.locator('text=security@test.com')).toBeVisible()
  })

  test('should disable and enable a recipient', async ({ page }) => {
    // Add a recipient first
    await page.click('text=👤 Recipients')
    await page.click('button:has-text("Add Recipient")')
    await page.fill('input[placeholder="Security Team, Front Desk"]', 'Front Desk')
    await page.fill('input[type="email"]', 'frontdesk@test.com')
    await page.click('button:has-text("Add Recipient")')

    // Disable the recipient
    await page.click('.recipient-card:has-text("Front Desk") >> button:has-text("Disable")')

    // Card should show disabled state
    await expect(page.locator('.recipient-card.disabled:has-text("Front Desk")')).toBeVisible()

    // Enable the recipient
    await page.click('.recipient-card:has-text("Front Desk") >> button:has-text("Enable")')

    // Card should no longer be disabled
    await expect(
      page.locator('.recipient-card:not(.disabled):has-text("Front Desk")')
    ).toBeVisible()
  })

  test('should send test notification', async ({ page }) => {
    // Add a recipient
    await page.click('text=👤 Recipients')
    await page.click('button:has-text("Add Recipient")')
    await page.fill('input[placeholder="Security Team, Front Desk"]', 'Test Recipient')
    await page.fill('input[type="email"]', 'test@test.com')
    await page.click('button:has-text("Add Recipient")')

    // Listen for alert dialog
    page.on('dialog', (dialog) => dialog.accept())

    // Send test notification
    await page.click('button:has-text("Send Test Notification")')
  })

  test('should update E911 settings', async ({ page }) => {
    // Navigate to Settings tab
    await page.click('text=⚙️ Settings')

    // Update callback number
    await page.fill('input[placeholder="+15551234567"]', '+15559876543')

    // Toggle settings
    const directDialingCheckbox = page.locator('#directDialing')
    const onSiteCheckbox = page.locator('#onSiteNotification')

    // Ensure checkboxes are visible before interacting
    await expect(directDialingCheckbox).toBeVisible()
    await expect(onSiteCheckbox).toBeVisible()

    // Listen for alert dialog
    page.on('dialog', (dialog) => dialog.accept())

    // Save settings
    await page.click('button:has-text("Save Settings")')
  })

  test('should simulate an emergency call', async ({ page }) => {
    // Add a location first (required for call association)
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Call Test Office')
    await page.fill('input[placeholder="123 Main Street"]', '111 Call St')
    await page.fill('input[placeholder="Anytown"]', 'San Jose')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '95110')
    await page.fill('input[placeholder="1001, 1002, 1003"]', '1001')
    await page.click('button:has-text("Add Location")')

    // Scroll to simulation section
    await page.locator('text=🧪 Test Emergency Call').scrollIntoViewIfNeeded()

    // Fill in extension
    await page.fill('.simulation-form input[placeholder="1001"]', '1001')

    // Simulate call
    await page.click('.simulation-form >> button:has-text("Simulate Call")')

    // Should show active emergency alert
    await expect(page.locator('text=ACTIVE EMERGENCY')).toBeVisible()
    await expect(page.locator('text=1001')).toBeVisible()

    // End the call
    await page.click('button:has-text("End Call")')

    // Alert should be removed
    await expect(page.locator('text=ACTIVE EMERGENCY')).not.toBeVisible()
  })

  test('should show compliance logs after actions', async ({ page }) => {
    // Perform an action that logs (add location)
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Logged Office')
    await page.fill('input[placeholder="123 Main Street"]', '222 Log St')
    await page.fill('input[placeholder="Anytown"]', 'Palo Alto')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '94301')
    await page.click('button:has-text("Add Location")')

    // Navigate to Logs tab
    await page.click('text=📋 Logs')

    // Should show log entry
    await expect(page.locator('.log-entry')).toBeVisible()
    await expect(page.locator('text=Location added')).toBeVisible()
  })

  test('should export logs as JSON', async ({ page }) => {
    // Add a location to generate a log
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Export Test')
    await page.fill('input[placeholder="123 Main Street"]', '333 Export St')
    await page.fill('input[placeholder="Anytown"]', 'Mountain View')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '94040')
    await page.click('button:has-text("Add Location")')

    // Navigate to Logs tab
    await page.click('text=📋 Logs')

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export JSON")')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toBe('e911-compliance-logs.json')
  })

  test('should export logs as CSV', async ({ page }) => {
    // Add a location to generate a log
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'CSV Test')
    await page.fill('input[placeholder="123 Main Street"]', '444 CSV St')
    await page.fill('input[placeholder="Anytown"]', 'Sunnyvale')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '94086')
    await page.click('button:has-text("Add Location")')

    // Navigate to Logs tab
    await page.click('text=📋 Logs')

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export CSV")')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toBe('e911-compliance-logs.csv')
  })

  test('should show empty state when no locations configured', async ({ page }) => {
    // Navigate to Locations tab
    await page.click('text=📍 Locations')

    // Should show empty state
    await expect(page.locator('text=No Locations Configured')).toBeVisible()
    await expect(
      page.locator('text=Add dispatchable locations to enable compliant E911')
    ).toBeVisible()
  })

  test('should show empty state when no recipients configured', async ({ page }) => {
    // Navigate to Recipients tab
    await page.click('text=👤 Recipients')

    // Should show empty state
    await expect(page.locator('text=No Recipients Configured')).toBeVisible()
    await expect(page.locator("text=/Kari's Law compliance/i")).toBeVisible()
  })

  test('should display code example', async ({ page }) => {
    // Scroll to code example
    await page.locator('text=Code Example').scrollIntoViewIfNeeded()

    // Code block should be visible
    await expect(page.locator('.code-block')).toBeVisible()
    await expect(page.locator('text=useSipE911')).toBeVisible()
  })

  test('should work in simulation mode', async ({ page }) => {
    // Enable simulation mode
    const simulationToggle = page.locator('text=Simulation Mode').first()
    if (await simulationToggle.isVisible()) {
      await simulationToggle.click()
    }

    // Add a location (should work in simulation mode)
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Sim Office')
    await page.fill('input[placeholder="123 Main Street"]', '555 Sim St')
    await page.fill('input[placeholder="Anytown"]', 'Cupertino')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '95014')
    await page.click('button:has-text("Add Location")')

    // Location should appear
    await expect(page.locator('text=Sim Office')).toBeVisible()
  })

  test('should achieve full compliance after configuration', async ({ page }) => {
    // Add a location
    await page.click('text=📍 Locations')
    await page.click('button:has-text("Add Location")')
    await page.fill('input[placeholder="Main Office, Floor 3"]', 'Compliance Office')
    await page.fill('input[placeholder="123 Main Street"]', '777 Comply St')
    await page.fill('input[placeholder="Anytown"]', 'Santa Clara')
    await page.fill('input[placeholder="CA"]', 'CA')
    await page.fill('input[placeholder="12345"]', '95050')
    await page.click('button:has-text("Add Location")')

    // Verify the location
    await page.click('button:has-text("Verify")')

    // Add a recipient
    await page.click('text=👤 Recipients')
    await page.click('button:has-text("Add Recipient")')
    await page.fill('input[placeholder="Security Team, Front Desk"]', 'Compliance Team')
    await page.fill('input[type="email"]', 'compliance@test.com')
    await page.click('button:has-text("Add Recipient")')

    // Configure settings
    await page.click('text=⚙️ Settings')
    await page.fill('input[placeholder="+15551234567"]', '+15551111111')

    // Ensure compliance checkboxes are checked
    const directDialing = page.locator('#directDialing')
    const onSite = page.locator('#onSiteNotification')
    const dispatchable = page.locator('#dispatchableLocation')

    if (!(await directDialing.isChecked())) await directDialing.check()
    if (!(await onSite.isChecked())) await onSite.check()
    if (!(await dispatchable.isChecked())) await dispatchable.check()

    page.on('dialog', (dialog) => dialog.accept())
    await page.click('button:has-text("Save Settings")')

    // Scroll to top to check compliance status
    await page.locator('text=Compliance Status').first().scrollIntoViewIfNeeded()

    // Should show compliant status
    await expect(page.locator('text=System Compliant')).toBeVisible()
  })
})
