import { test, expect } from '@playwright/test'

/**
 * ContactsDemo E2E Tests
 * Tests contact management, groups, search, import/export functionality
 */

test.describe('ContactsDemo - Contact Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to Contacts demo
    const contactsLink = page.getByRole('link', { name: /Contacts/i })
    if (await contactsLink.isVisible()) {
      await contactsLink.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display ContactsDemo header and description', async ({ page }) => {
    // Check for demo header
    await expect(page.locator('text=Contacts/Phonebook Demo')).toBeVisible()

    // Check for description
    await expect(
      page.locator('text=/Manage contacts stored in Asterisk/i')
    ).toBeVisible()
  })

  test('should show AMI configuration panel when not connected', async ({ page }) => {
    // Configuration panel should be visible
    await expect(page.locator('text=AMI Configuration')).toBeVisible()

    // AMI URL input should be present
    await expect(page.locator('input#ami-url')).toBeVisible()

    // Connect button should be present
    await expect(page.locator('button:has-text("Connect to AMI")')).toBeVisible()
  })

  test('should enable Connect button when URL is provided', async ({ page }) => {
    const connectBtn = page.locator('button:has-text("Connect to AMI")')

    // Initially disabled (no URL)
    await expect(connectBtn).toBeDisabled()

    // Enter URL
    await page.fill('input#ami-url', 'ws://localhost:8080')

    // Should be enabled now
    await expect(connectBtn).toBeEnabled()
  })

  test('should show status toolbar after connecting', async ({ page }) => {
    // Enter URL and connect (simulation mode)
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Status toolbar should be visible
    await expect(page.locator('text=AMI Connected')).toBeVisible()
    await expect(page.locator('text=/\\d+ Contacts/i')).toBeVisible()
    await expect(page.locator('text=/\\d+ Groups/i')).toBeVisible()
  })

  test('should display groups sidebar', async ({ page }) => {
    // Connect first
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Groups sidebar should be visible
    await expect(page.locator('text=Groups').first()).toBeVisible()

    // Default groups should be present
    await expect(page.locator('button:has-text("Default")')).toBeVisible()
  })

  test('should show empty state when no contacts exist', async ({ page }) => {
    // Connect first
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Empty state should be visible
    await expect(page.locator('text=No Contacts Found')).toBeVisible()
    await expect(page.locator('text=/Add your first contact/i')).toBeVisible()
  })

  test('should open Add Contact dialog', async ({ page }) => {
    // Connect first
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Click Add Contact
    await page.click('button:has-text("Add Contact")')

    // Dialog should appear
    await expect(page.locator('text=Add Contact').nth(1)).toBeVisible()
    await expect(page.locator('input#contact-name')).toBeVisible()
    await expect(page.locator('input#contact-number')).toBeVisible()
  })

  test('should require name and phone number for contact', async ({ page }) => {
    // Connect and open dialog
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')

    // Save button should be disabled initially
    const saveBtn = page.locator('.p-dialog-footer button:has-text("Save")')
    await expect(saveBtn).toBeDisabled()

    // Fill only name
    await page.fill('input#contact-name', 'John Doe')
    await expect(saveBtn).toBeDisabled()

    // Fill phone number
    await page.fill('input#contact-number', '+1234567890')
    await expect(saveBtn).toBeEnabled()
  })

  test('should add a new contact', async ({ page }) => {
    // Connect
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Open Add Contact dialog
    await page.click('button:has-text("Add Contact")')

    // Fill in contact details
    await page.fill('input#contact-name', 'John Doe')
    await page.fill('input#contact-number', '+1234567890')
    await page.fill('input#contact-email', 'john@example.com')
    await page.fill('input#contact-company', 'Acme Corp')

    // Save contact
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Contact should appear in the list
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=+1234567890')).toBeVisible()
    await expect(page.locator('text=john@example.com')).toBeVisible()
  })

  test('should edit a contact', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Jane Smith')
    await page.fill('input#contact-number', '+9876543210')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Click edit button (pencil icon)
    const editBtn = page.locator('.contact-card').first().locator('button[aria-label*="Edit"]')
    await editBtn.click()

    // Dialog should show with existing data
    await expect(page.locator('text=Edit Contact')).toBeVisible()
    await expect(page.locator('input#contact-name')).toHaveValue('Jane Smith')

    // Update name
    await page.fill('input#contact-name', 'Jane Doe')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Updated name should be visible
    await expect(page.locator('text=Jane Doe')).toBeVisible()
  })

  test('should delete a contact with confirmation', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Delete Test')
    await page.fill('input#contact-number', '+1111111111')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Click delete button (trash icon)
    const deleteBtn = page.locator('.contact-card').first().locator('button[aria-label*="Delete"]')
    await deleteBtn.click()

    // Confirmation dialog should appear
    await expect(page.locator('text=Delete Contact')).toBeVisible()
    await expect(page.locator('text=Delete Test')).toBeVisible()

    // Confirm deletion
    await page.click('.p-dialog-footer button:has-text("Delete")')
    await page.waitForTimeout(500)

    // Contact should be removed
    await expect(page.locator('text=Delete Test')).not.toBeVisible()
  })

  test('should cancel contact deletion', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Keep This')
    await page.fill('input#contact-number', '+2222222222')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Click delete button
    const deleteBtn = page.locator('.contact-card').first().locator('button[aria-label*="Delete"]')
    await deleteBtn.click()

    // Cancel deletion
    await page.click('.p-dialog-footer button:has-text("Cancel")')

    // Contact should still be visible
    await expect(page.locator('text=Keep This')).toBeVisible()
  })

  test('should search contacts by name', async ({ page }) => {
    // Connect and add multiple contacts
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Add first contact
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Alice Johnson')
    await page.fill('input#contact-number', '+1111111111')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Add second contact
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Bob Smith')
    await page.fill('input#contact-number', '+2222222222')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Search for Alice
    await page.fill('input[placeholder="Search contacts..."]', 'Alice')

    // Only Alice should be visible
    await expect(page.locator('text=Alice Johnson')).toBeVisible()
    await expect(page.locator('text=Bob Smith')).not.toBeVisible()
  })

  test('should search contacts by phone number', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Search Test')
    await page.fill('input#contact-number', '+9999999999')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Search by phone number
    await page.fill('input[placeholder="Search contacts..."]', '9999')

    // Contact should be visible
    await expect(page.locator('text=Search Test')).toBeVisible()
  })

  test('should show empty state when search has no results', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Test Contact')
    await page.fill('input#contact-number', '+1234567890')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Search for non-existent contact
    await page.fill('input[placeholder="Search contacts..."]', 'NonExistent')

    // Empty state should show
    await expect(page.locator('text=No Contacts Found')).toBeVisible()
    await expect(page.locator('text=Try a different search term')).toBeVisible()
  })

  test('should add a new group', async ({ page }) => {
    // Connect
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Add new group
    const groupInput = page.locator('.add-group input')
    await groupInput.fill('Friends')
    await page.click('.add-group button')

    // New group should appear in the list
    await expect(page.locator('button:has-text("Friends")')).toBeVisible()
  })

  test('should filter contacts by group', async ({ page }) => {
    // Connect and add group
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.locator('.add-group input').fill('Work')
    await page.click('.add-group button')
    await page.waitForTimeout(300)

    // Add contact to Work group
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Work Contact')
    await page.fill('input#contact-number', '+1111111111')
    await page.selectOption('select#contact-group', 'Work')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Add contact to Default group
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Default Contact')
    await page.fill('input#contact-number', '+2222222222')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Click Work group filter
    await page.click('button:has-text("Work")')

    // Only Work contact should be visible
    await expect(page.locator('text=Work Contact')).toBeVisible()
    await expect(page.locator('text=Default Contact')).not.toBeVisible()
  })

  test('should show contact count per group', async ({ page }) => {
    // Connect
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Add a contact (goes to Default group)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Test')
    await page.fill('input#contact-number', '+1234567890')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Default group should show count of 1
    const defaultGroupBtn = page.locator('button:has-text("Default")').first()
    await expect(defaultGroupBtn).toContainText('1')
  })

  test('should display contact avatar with initials', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'John Doe')
    await page.fill('input#contact-number', '+1234567890')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Avatar should show "JD"
    await expect(page.locator('.contact-avatar:has-text("JD")')).toBeVisible()
  })

  test('should show group badge on contact card', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Test')
    await page.fill('input#contact-number', '+1234567890')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Group badge should be visible
    await expect(page.locator('.p-tag:has-text("Default")')).toBeVisible()
  })

  test('should export contacts as JSON', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Export Test')
    await page.fill('input#contact-number', '+1234567890')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export")')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/^contacts-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('should show import button', async ({ page }) => {
    // Connect
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Import button should be visible
    await expect(page.locator('button:has-text("Import")')).toBeVisible()
  })

  test('should disconnect from AMI', async ({ page }) => {
    // Connect first
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Click disconnect
    await page.click('button:has-text("Disconnect")')

    // Should return to configuration panel
    await expect(page.locator('text=AMI Configuration')).toBeVisible()
    await expect(page.locator('input#ami-url')).toBeVisible()
  })

  test('should close dialog with Cancel button', async ({ page }) => {
    // Connect and open dialog
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')

    // Dialog should be visible
    await expect(page.locator('text=Add Contact').nth(1)).toBeVisible()

    // Click Cancel
    await page.click('.p-dialog-footer button:has-text("Cancel")')

    // Dialog should be closed
    await expect(page.locator('text=Add Contact').nth(1)).not.toBeVisible()
  })

  test('should show all contact fields in dialog', async ({ page }) => {
    // Connect and open dialog
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')

    // All form fields should be present
    await expect(page.locator('input#contact-name')).toBeVisible()
    await expect(page.locator('input#contact-number')).toBeVisible()
    await expect(page.locator('input#contact-email')).toBeVisible()
    await expect(page.locator('input#contact-company')).toBeVisible()
    await expect(page.locator('select#contact-group')).toBeVisible()
    await expect(page.locator('textarea#contact-notes')).toBeVisible()
  })

  test('should work in simulation mode', async ({ page }) => {
    // Enable simulation mode
    const simulationToggle = page.locator('text=Simulation Mode').first()
    if (await simulationToggle.isVisible()) {
      await simulationToggle.click()
    }

    // Connect (should work in simulation)
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)

    // Add contact (should work in simulation)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Sim Contact')
    await page.fill('input#contact-number', '+1234567890')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Contact should appear
    await expect(page.locator('text=Sim Contact')).toBeVisible()
  })

  test('should show call button with phone icon', async ({ page }) => {
    // Connect and add contact
    await page.fill('input#ami-url', 'ws://localhost:8080')
    await page.click('button:has-text("Connect to AMI")')
    await page.waitForTimeout(1500)
    await page.click('button:has-text("Add Contact")')
    await page.fill('input#contact-name', 'Call Test')
    await page.fill('input#contact-number', '+1234567890')
    await page.click('.p-dialog-footer button:has-text("Save")')
    await page.waitForTimeout(500)

    // Call button (phone icon) should be visible
    const callBtn = page.locator('.contact-card').first().locator('button[aria-label*="Call"]')
    await expect(callBtn).toBeVisible()
  })
})
