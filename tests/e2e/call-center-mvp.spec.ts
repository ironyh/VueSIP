import { test, expect } from './fixtures'

const CALL_CENTER_URL = 'http://localhost:5174/?test=true'

test.describe('Call Center MVP smoke', () => {
  test.beforeEach(async ({ page, mockSipServer, mockMediaDevices }) => {
    await mockSipServer()
    await mockMediaDevices()
    await page.goto(CALL_CENTER_URL)
  })

  test('supports queue answer, wrap-up, callback selection, and supervisor visibility', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Smoke is validated in Chromium only')

    await expect(page.getByTestId('call-center-login')).toBeVisible()

    await page.getByTestId('call-center-username').fill('1001')
    await page.getByTestId('call-center-password').fill('testpassword')
    await page.getByTestId('call-center-display-name').fill('Agent Smoke')
    await page.getByTestId('call-center-connect').click()

    await expect(page.getByTestId('call-center-dashboard')).toBeVisible({ timeout: 15000 })

    await page.getByTestId('agent-status-available').click()

    const queueRow = page.locator('[data-testid^="queue-row-"]').first()
    await expect(queueRow).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('callback-worklist')).toBeVisible()
    await expect(page.getByTestId('supervisor-board')).toBeVisible()

    await page.locator('[data-testid^="queue-answer-"]').first().click()
    await expect(page.getByTestId('call-center-active-call')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('call-center-hangup').click()
    await expect(page.getByTestId('call-center-wrap-up')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('wrap-up-disposition').selectOption('callback_required')
    await page.getByTestId('wrap-up-notes').fill('Smoke wrap-up note')
    await page.getByTestId('wrap-up-callback-toggle').check()
    await page.getByTestId('wrap-up-complete').click()

    const callbackRow = page.locator('[data-testid^="callback-row-"]').first()
    await expect(callbackRow).toBeVisible({ timeout: 10000 })

    await page.locator('[data-testid^="callback-select-"]').first().click()
    await page.getByTestId('callback-start').click()
    await expect(page.getByTestId('call-center-active-call')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('call-center-hangup').click()
    await expect(page.getByTestId('call-center-wrap-up')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('wrap-up-cancel').click()

    const reassignButton = page.locator('[data-testid^="supervisor-reassign-"]').first()
    await expect(reassignButton).toBeVisible()
    await reassignButton.click()

    await expect(page.getByTestId('supervisor-board')).toContainText('supervisor-queue')
  })
})
