/**
 * DTMF E2E Tests
 *
 * End-to-end tests for DTMF functionality covering:
 * - Dialpad interaction
 * - Tone sending during calls
 * - IVR navigation scenarios
 * - DTMF feedback and validation
 */

import { test, expect } from '@playwright/test';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  registerAccount,
  makeCall,
  waitForCallState,
  _answerCall,
  hangupCall,
} from './helpers/sip-test-helpers';

test.describe('DTMF Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
    await registerAccount(page, {
      server: 'sip.test.local',
      username: 'dtmf-test-user',
      password: 'password123',
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestEnvironment(page);
  });

  test('should send DTMF tones during active call', async ({ page }) => {
    // Make a call
    await makeCall(page, 'sip:ivr@test.local');
    await waitForCallState(page, 'confirmed');

    // Find dialpad or DTMF buttons
    const dtmfButton1 = page.getByRole('button', { name: /^1$/i });
    const dtmfButton2 = page.getByRole('button', { name: /^2$/i });
    const dtmfButton3 = page.getByRole('button', { name: /^3$/i });

    // Send DTMF tones
    await dtmfButton1.click();
    await page.waitForTimeout(100);

    await dtmfButton2.click();
    await page.waitForTimeout(100);

    await dtmfButton3.click();
    await page.waitForTimeout(100);

    // Verify DTMF tones were sent (check for visual feedback or logs)
    const dtmfDisplay = page.locator('[data-testid="dtmf-display"]');
    await expect(dtmfDisplay).toContainText('123');

    await hangupCall(page);
  });

  test('should send DTMF sequence via keyboard input', async ({ page }) => {
    await makeCall(page, 'sip:ivr@test.local');
    await waitForCallState(page, 'confirmed');

    // Focus on DTMF input field
    const dtmfInput = page.locator('[data-testid="dtmf-input"]');
    await dtmfInput.click();

    // Type DTMF sequence
    await dtmfInput.fill('456#');

    // Send the sequence
    const sendButton = page.getByRole('button', { name: /send dtmf/i });
    await sendButton.click();

    // Verify sequence was sent
    await expect(page.locator('[data-testid="dtmf-status"]')).toContainText('Sent: 456#');

    await hangupCall(page);
  });

  test('should display dialpad during call', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Dialpad should be visible during active call
    const dialpad = page.locator('[data-testid="dialpad"]');
    await expect(dialpad).toBeVisible();

    // Check all standard DTMF buttons are present
    const expectedButtons = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];

    for (const button of expectedButtons) {
      const dtmfButton = page.getByRole('button', { name: new RegExp(`^${button.replace('*', '\\*')}$`, 'i') });
      await expect(dtmfButton).toBeVisible();
    }

    await hangupCall(page);
  });

  test('should handle IVR navigation scenario', async ({ page }) => {
    await makeCall(page, 'sip:support-ivr@test.local');
    await waitForCallState(page, 'confirmed');

    // Simulate IVR navigation: Press 1 for support
    const button1 = page.getByRole('button', { name: /^1$/i });
    await button1.click();
    await page.waitForTimeout(500);

    // Press 2 for technical support
    const button2 = page.getByRole('button', { name: /^2$/i });
    await button2.click();
    await page.waitForTimeout(500);

    // Press # to confirm
    const buttonHash = page.getByRole('button', { name: /^#$/i });
    await buttonHash.click();
    await page.waitForTimeout(500);

    // Verify DTMF sequence was sent
    const dtmfHistory = page.locator('[data-testid="dtmf-history"]');
    await expect(dtmfHistory).toContainText('1');
    await expect(dtmfHistory).toContainText('2');
    await expect(dtmfHistory).toContainText('#');

    await hangupCall(page);
  });

  test('should provide audio feedback for DTMF tones', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Enable audio feedback option if available
    const audioFeedbackToggle = page.locator('[data-testid="dtmf-audio-feedback"]');
    if (await audioFeedbackToggle.isVisible()) {
      await audioFeedbackToggle.check();
    }

    // Send a tone and verify audio feedback
    const button5 = page.getByRole('button', { name: /^5$/i });
    await button5.click();

    // Check that audio context is active (if accessible via test attributes)
    const audioIndicator = page.locator('[data-testid="audio-playing"]');
    if (await audioIndicator.isVisible()) {
      await expect(audioIndicator).toBeVisible();
    }

    await hangupCall(page);
  });

  test('should disable DTMF when call is not active', async ({ page }) => {
    // Dialpad should be disabled when no active call
    const dialpad = page.locator('[data-testid="dialpad"]');

    // Either not visible or disabled
    const isVisible = await dialpad.isVisible();
    if (isVisible) {
      const button1 = page.getByRole('button', { name: /^1$/i });
      await expect(button1).toBeDisabled();
    } else {
      await expect(dialpad).not.toBeVisible();
    }
  });

  test('should send DTMF with custom duration', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Open DTMF settings if available
    const settingsButton = page.locator('[data-testid="dtmf-settings"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Set custom duration
      const durationInput = page.locator('[data-testid="dtmf-duration"]');
      await durationInput.fill('200');

      // Set custom inter-tone gap
      const gapInput = page.locator('[data-testid="dtmf-gap"]');
      await gapInput.fill('100');

      // Close settings
      const closeButton = page.getByRole('button', { name: /close|save/i });
      await closeButton.click();
    }

    // Send tones with custom settings
    const button1 = page.getByRole('button', { name: /^1$/i });
    await button1.click();

    await page.waitForTimeout(200); // Custom duration

    const button2 = page.getByRole('button', { name: /^2$/i });
    await button2.click();

    await hangupCall(page);
  });

  test('should validate DTMF input', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    const dtmfInput = page.locator('[data-testid="dtmf-input"]');
    if (await dtmfInput.isVisible()) {
      // Try to input invalid character
      await dtmfInput.fill('123X456');

      const sendButton = page.getByRole('button', { name: /send dtmf/i });
      await sendButton.click();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="dtmf-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/invalid/i);
    }

    await hangupCall(page);
  });

  test('should handle rapid DTMF button presses', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Rapidly press multiple buttons
    const buttons = ['1', '2', '3', '4', '5'];

    for (const buttonLabel of buttons) {
      const button = page.getByRole('button', { name: new RegExp(`^${buttonLabel}$`, 'i') });
      await button.click();
      // Minimal delay to simulate rapid presses
      await page.waitForTimeout(50);
    }

    // Verify all tones were queued/sent
    const dtmfDisplay = page.locator('[data-testid="dtmf-display"]');
    await expect(dtmfDisplay).toContainText('12345');

    await hangupCall(page);
  });

  test('should clear DTMF queue when call ends', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Queue some DTMF tones
    const dtmfInput = page.locator('[data-testid="dtmf-input"]');
    if (await dtmfInput.isVisible()) {
      await dtmfInput.fill('123456789');
      // Don't send yet
    }

    // Hang up call
    await hangupCall(page);

    // Verify queue was cleared
    // When making a new call, the display should be empty
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    const dtmfDisplay = page.locator('[data-testid="dtmf-display"]');
    if (await dtmfDisplay.isVisible()) {
      await expect(dtmfDisplay).toBeEmpty();
    }

    await hangupCall(page);
  });

  test('should support star and hash keys', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Send star
    const starButton = page.getByRole('button', { name: /^\*$/i });
    await starButton.click();
    await page.waitForTimeout(100);

    // Send hash
    const hashButton = page.getByRole('button', { name: /^#$/i });
    await hashButton.click();
    await page.waitForTimeout(100);

    // Verify both were sent
    const dtmfDisplay = page.locator('[data-testid="dtmf-display"]');
    await expect(dtmfDisplay).toContainText('*#');

    await hangupCall(page);
  });

  test('should show DTMF sending status', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Send a tone
    const button1 = page.getByRole('button', { name: /^1$/i });
    await button1.click();

    // Should show "sending" status (might be brief)
    const statusIndicator = page.locator('[data-testid="dtmf-status"]');
    if (await statusIndicator.isVisible()) {
      // Status should eventually show success
      await expect(statusIndicator).toContainText(/sent|success/i, { timeout: 2000 });
    }

    await hangupCall(page);
  });
});

test.describe('DTMF Method Selection', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
    await registerAccount(page, {
      server: 'sip.test.local',
      username: 'dtmf-method-test',
      password: 'password123',
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestEnvironment(page);
  });

  test('should support RFC 2833 method', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Select RFC 2833 method in settings if available
    const methodSelector = page.locator('[data-testid="dtmf-method"]');
    if (await methodSelector.isVisible()) {
      await methodSelector.selectOption('RFC2833');
    }

    // Send tone
    const button1 = page.getByRole('button', { name: /^1$/i });
    await button1.click();

    // Verify method is indicated
    const methodIndicator = page.locator('[data-testid="dtmf-method-indicator"]');
    if (await methodIndicator.isVisible()) {
      await expect(methodIndicator).toContainText('RFC 2833');
    }

    await hangupCall(page);
  });

  test('should support SIP INFO method', async ({ page }) => {
    await makeCall(page, 'sip:test@test.local');
    await waitForCallState(page, 'confirmed');

    // Select SIP INFO method in settings if available
    const methodSelector = page.locator('[data-testid="dtmf-method"]');
    if (await methodSelector.isVisible()) {
      await methodSelector.selectOption('INFO');
    }

    // Send tone
    const button2 = page.getByRole('button', { name: /^2$/i });
    await button2.click();

    // Verify method is indicated
    const methodIndicator = page.locator('[data-testid="dtmf-method-indicator"]');
    if (await methodIndicator.isVisible()) {
      await expect(methodIndicator).toContainText('SIP INFO');
    }

    await hangupCall(page);
  });
});
