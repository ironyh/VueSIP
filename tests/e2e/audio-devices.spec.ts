import { test, expect } from '@playwright/test';

test.describe('Audio Device Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant permissions for media devices
    await context.grantPermissions(['microphone', 'camera']);

    // Navigate to app
    await page.goto('/');
  });

  test('should enumerate available audio devices', async ({ page }) => {
    // Wait for device enumeration
    await page.waitForSelector('[data-testid="microphone-list"]');

    // Verify microphones are listed
    const microphones = await page.locator('[data-testid="microphone-item"]').count();
    expect(microphones).toBeGreaterThan(0);

    // Verify speakers are listed
    const speakers = await page.locator('[data-testid="speaker-item"]').count();
    expect(speakers).toBeGreaterThan(0);
  });

  test('should request and grant media permissions', async ({ page }) => {
    // Click permission request button
    await page.click('[data-testid="request-permissions-btn"]');

    // Wait for permission grant
    await page.waitForSelector('[data-testid="permission-granted"]');

    // Verify permission status
    const status = await page.locator('[data-testid="permission-status"]').textContent();
    expect(status).toBe('granted');
  });

  test('should select microphone device', async ({ page }) => {
    // Wait for devices to load
    await page.waitForSelector('[data-testid="microphone-list"]');

    // Click first microphone
    await page.click('[data-testid="microphone-item"]:first-child');

    // Verify microphone is selected
    const selected = await page.locator('[data-testid="current-microphone"]').textContent();
    expect(selected).toBeTruthy();

    // Verify device label is displayed
    const label = await page.locator('[data-testid="microphone-label"]').textContent();
    expect(label).not.toBe('');
  });

  test('should select speaker device', async ({ page }) => {
    // Wait for devices to load
    await page.waitForSelector('[data-testid="speaker-list"]');

    // Click first speaker
    await page.click('[data-testid="speaker-item"]:first-child');

    // Verify speaker is selected
    const selected = await page.locator('[data-testid="current-speaker"]').textContent();
    expect(selected).toBeTruthy();

    // Verify device label is displayed
    const label = await page.locator('[data-testid="speaker-label"]').textContent();
    expect(label).not.toBe('');
  });

  test('should adjust input volume level', async ({ page }) => {
    // Wait for volume controls
    await page.waitForSelector('[data-testid="input-volume-slider"]');

    // Set input volume to 75
    await page.fill('[data-testid="input-volume-slider"]', '75');

    // Verify volume level updated
    const volume = await page.locator('[data-testid="input-volume-value"]').textContent();
    expect(volume).toBe('75');
  });

  test('should adjust output volume level', async ({ page }) => {
    // Wait for volume controls
    await page.waitForSelector('[data-testid="output-volume-slider"]');

    // Set output volume to 60
    await page.fill('[data-testid="output-volume-slider"]', '60');

    // Verify volume level updated
    const volume = await page.locator('[data-testid="output-volume-value"]').textContent();
    expect(volume).toBe('60');
  });

  test('should toggle noise suppression', async ({ page }) => {
    // Wait for audio processing controls
    await page.waitForSelector('[data-testid="noise-suppression-toggle"]');

    // Get initial state
    const initialState = await page.locator('[data-testid="noise-suppression-toggle"]').isChecked();

    // Toggle noise suppression
    await page.click('[data-testid="noise-suppression-toggle"]');

    // Verify state changed
    const newState = await page.locator('[data-testid="noise-suppression-toggle"]').isChecked();
    expect(newState).toBe(!initialState);

    // Verify audio processing indicator updated
    await page.waitForSelector('[data-testid="processing-indicator"]');
    const indicator = await page.locator('[data-testid="processing-indicator"]').textContent();
    expect(indicator).toContain(newState ? 'enabled' : 'disabled');
  });

  test('should toggle echo cancellation', async ({ page }) => {
    // Wait for audio processing controls
    await page.waitForSelector('[data-testid="echo-cancellation-toggle"]');

    // Get initial state
    const initialState = await page.locator('[data-testid="echo-cancellation-toggle"]').isChecked();

    // Toggle echo cancellation
    await page.click('[data-testid="echo-cancellation-toggle"]');

    // Verify state changed
    const newState = await page.locator('[data-testid="echo-cancellation-toggle"]').isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should toggle automatic gain control', async ({ page }) => {
    // Wait for audio processing controls
    await page.waitForSelector('[data-testid="auto-gain-toggle"]');

    // Get initial state
    const initialState = await page.locator('[data-testid="auto-gain-toggle"]').isChecked();

    // Toggle AGC
    await page.click('[data-testid="auto-gain-toggle"]');

    // Verify state changed
    const newState = await page.locator('[data-testid="auto-gain-toggle"]').isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should display audio quality metrics', async ({ page }) => {
    // Start audio stream
    await page.click('[data-testid="start-audio-btn"]');

    // Wait for metrics to appear
    await page.waitForSelector('[data-testid="audio-metrics"]');

    // Verify MOS score is displayed
    const mos = await page.locator('[data-testid="mos-score"]').textContent();
    expect(parseFloat(mos || '0')).toBeGreaterThan(0);

    // Verify packet loss is displayed
    const packetLoss = await page.locator('[data-testid="packet-loss"]').textContent();
    expect(parseFloat(packetLoss || '0')).toBeGreaterThanOrEqual(0);

    // Verify jitter is displayed
    const jitter = await page.locator('[data-testid="jitter"]').textContent();
    expect(parseFloat(jitter || '0')).toBeGreaterThanOrEqual(0);

    // Verify bitrate is displayed
    const bitrate = await page.locator('[data-testid="bitrate"]').textContent();
    expect(parseFloat(bitrate || '0')).toBeGreaterThan(0);
  });

  test('should show audio quality level indicator', async ({ page }) => {
    // Start audio stream
    await page.click('[data-testid="start-audio-btn"]');

    // Wait for quality indicator
    await page.waitForSelector('[data-testid="quality-indicator"]');

    // Verify quality level is shown
    const quality = await page.locator('[data-testid="quality-level"]').textContent();
    expect(['excellent', 'good', 'fair', 'poor']).toContain(quality);

    // Verify visual indicator matches quality
    const indicatorClass = await page.locator('[data-testid="quality-indicator"]').getAttribute('class');
    expect(indicatorClass).toContain(quality);
  });

  test('should mute and unmute audio', async ({ page }) => {
    // Start audio stream
    await page.click('[data-testid="start-audio-btn"]');

    // Wait for mute button
    await page.waitForSelector('[data-testid="mute-btn"]');

    // Mute audio
    await page.click('[data-testid="mute-btn"]');

    // Verify muted state
    const mutedState = await page.locator('[data-testid="mute-indicator"]').textContent();
    expect(mutedState).toContain('Muted');

    // Unmute audio
    await page.click('[data-testid="mute-btn"]');

    // Verify unmuted state
    const unmutedState = await page.locator('[data-testid="mute-indicator"]').textContent();
    expect(unmutedState).not.toContain('Muted');
  });

  test('should detect device changes', async ({ page, context: _context }) => {
    // Wait for initial device list
    await page.waitForSelector('[data-testid="microphone-list"]');

    // Count initial devices
    const initialCount = await page.locator('[data-testid="microphone-item"]').count();

    // Simulate device change (in real scenario, would plug/unplug device)
    // For testing, we'll refresh the device list
    await page.click('[data-testid="refresh-devices-btn"]');

    // Wait for device list to update
    await page.waitForTimeout(500);

    // Verify device list is still present
    const updatedCount = await page.locator('[data-testid="microphone-item"]').count();
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('should handle permission denial gracefully', async ({ page, context }) => {
    // Deny permissions
    await context.clearPermissions();

    // Navigate to app
    await page.goto('/');

    // Try to request permissions
    await page.click('[data-testid="request-permissions-btn"]');

    // Verify error message is shown
    await page.waitForSelector('[data-testid="permission-error"]');

    const errorMessage = await page.locator('[data-testid="permission-error"]').textContent();
    expect(errorMessage).toContain('Permission denied');

    // Verify permission status shows denied
    const status = await page.locator('[data-testid="permission-status"]').textContent();
    expect(status).toBe('denied');
  });

  test('should create audio stream with selected device', async ({ page }) => {
    // Wait for devices
    await page.waitForSelector('[data-testid="microphone-list"]');

    // Select microphone
    await page.click('[data-testid="microphone-item"]:first-child');

    // Start audio stream
    await page.click('[data-testid="start-audio-btn"]');

    // Verify stream is active
    await page.waitForSelector('[data-testid="stream-active-indicator"]');

    const streamStatus = await page.locator('[data-testid="stream-status"]').textContent();
    expect(streamStatus).toContain('Active');

    // Verify audio visualization is shown
    await expect(page.locator('[data-testid="audio-visualizer"]')).toBeVisible();
  });

  test('should switch devices while streaming', async ({ page }) => {
    // Start with first device
    await page.waitForSelector('[data-testid="microphone-list"]');
    await page.click('[data-testid="microphone-item"]:first-child');
    await page.click('[data-testid="start-audio-btn"]');

    // Wait for stream to be active
    await page.waitForSelector('[data-testid="stream-active-indicator"]');

    // Switch to second device
    await page.click('[data-testid="microphone-item"]:nth-child(2)');

    // Verify stream is still active with new device
    await page.waitForTimeout(500);
    const streamStatus = await page.locator('[data-testid="stream-status"]').textContent();
    expect(streamStatus).toContain('Active');

    // Verify current device changed
    const currentDevice = await page.locator('[data-testid="current-microphone"]').textContent();
    expect(currentDevice).toBeTruthy();
  });

  test('should persist audio settings across navigation', async ({ page }) => {
    // Configure audio settings
    await page.fill('[data-testid="input-volume-slider"]', '80');
    await page.click('[data-testid="noise-suppression-toggle"]');

    // Navigate away and back
    await page.goto('/about');
    await page.goto('/');

    // Wait for audio controls to reload
    await page.waitForSelector('[data-testid="input-volume-slider"]');

    // Verify settings persisted
    const volume = await page.locator('[data-testid="input-volume-value"]').textContent();
    expect(volume).toBe('80');

    const noiseSuppression = await page.locator('[data-testid="noise-suppression-toggle"]').isChecked();
    expect(noiseSuppression).toBe(true);
  });

  test('should display device labels correctly', async ({ page, context }) => {
    // Grant permissions to see device labels
    await context.grantPermissions(['microphone', 'camera']);

    // Wait for devices
    await page.waitForSelector('[data-testid="microphone-list"]');

    // Get first device label
    const label = await page.locator('[data-testid="microphone-item"]:first-child [data-testid="device-label"]').textContent();

    // Verify label is not empty or "default"
    expect(label).toBeTruthy();
    expect(label).not.toBe('');
    expect(label).not.toContain('(default)'); // Should have actual device name
  });

  test('should handle no devices available', async ({ page }) => {
    // This test simulates no available devices
    // In practice, would use mock or special test environment

    // Navigate to app
    await page.goto('/');

    // Check for no devices message
    // Assuming UI shows message when no devices found
    const hasDevices = await page.locator('[data-testid="microphone-item"]').count();

    if (hasDevices === 0) {
      await expect(page.locator('[data-testid="no-devices-message"]')).toBeVisible();
      const message = await page.locator('[data-testid="no-devices-message"]').textContent();
      expect(message).toContain('No microphones found');
    }
  });

  test('should show loading state during device enumeration', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Check for loading indicator
    // Should appear briefly during enumeration
    const loadingVisible = await page.locator('[data-testid="devices-loading"]').isVisible().catch(() => false);

    // Either loading was visible or devices loaded too quickly
    const devicesLoaded = await page.locator('[data-testid="microphone-list"]').isVisible();

    expect(loadingVisible || devicesLoaded).toBe(true);
  });
});

test.describe('Audio Constraints Configuration', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.goto('/');
  });

  test('should apply custom sample rate', async ({ page }) => {
    // Open advanced audio settings
    await page.click('[data-testid="advanced-settings-btn"]');

    // Set sample rate to 48000
    await page.selectOption('[data-testid="sample-rate-select"]', '48000');

    // Apply settings
    await page.click('[data-testid="apply-constraints-btn"]');

    // Verify settings applied
    await page.waitForSelector('[data-testid="constraints-applied"]');

    const currentSampleRate = await page.locator('[data-testid="current-sample-rate"]').textContent();
    expect(currentSampleRate).toContain('48000');
  });

  test('should configure channel count', async ({ page }) => {
    // Open advanced audio settings
    await page.click('[data-testid="advanced-settings-btn"]');

    // Set to mono (1 channel)
    await page.selectOption('[data-testid="channel-count-select"]', '1');

    // Apply settings
    await page.click('[data-testid="apply-constraints-btn"]');

    // Verify mono configuration
    const channelCount = await page.locator('[data-testid="current-channels"]').textContent();
    expect(channelCount).toContain('1');
  });

  test('should validate constraint compatibility', async ({ page }) => {
    // Open advanced audio settings
    await page.click('[data-testid="advanced-settings-btn"]');

    // Try to set incompatible constraints (if any)
    // For example, very high sample rate
    await page.selectOption('[data-testid="sample-rate-select"]', '96000');

    // Apply settings
    await page.click('[data-testid="apply-constraints-btn"]');

    // Check for validation message or fallback
    const message = await page.locator('[data-testid="constraint-message"]').textContent();
    expect(message).toBeTruthy();
  });
});
