import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone', 'camera']
  });

  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('PlaygroundApp') || text.includes('BasicCallDemo') ||
        text.includes('credential') || text.includes('password') ||
        text.includes('SIP') || text.includes('connect')) {
      console.log('🖥️  BROWSER:', text);
    }
  });

  console.log('📱 Opening playground...');
  await page.goto('http://localhost:5173');

  await page.waitForTimeout(2000);

  console.log('✏️  Filling in credentials...');

  // Fill WebSocket Server URI - Use sip.telenurse.se which IS in host_wss ACL
  await page.fill('#server-uri', 'wss://sip.telenurse.se/ws');

  // Fill SIP URI
  await page.fill('#sip-uri', 'sip:102@pbx.telenurse.se');

  // Fill Password
  await page.fill('#password', '73b2d6d795d3a6df70816a013a4e8c91');

  // Fill Display Name
  await page.fill('#display-name', 'Arash Molavi');

  console.log('✅ Credentials filled');
  console.log('   URI: wss://sip.telenurse.se/ws');
  console.log('   SIP: sip:102@pbx.telenurse.se');
  console.log('   Display: Arash Molavi');
  console.log('   Password: 73b2d6d795d3a6df70816a013a4e8c91');

  await page.waitForTimeout(1000);

  console.log('🔌 Clicking Connect button...');
  const connectButton = page.locator('button').filter({ hasText: /connect/i }).first();
  await connectButton.click();

  console.log('⏳ Waiting for registration (up to 30 seconds)...');

  // Wait for registration - look specifically in the status bar
  let registered = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);

    // Look for registration status in the status bar
    const statusBar = await page.locator('.status-bar').textContent().catch(() => '');

    // Check for exact "Registered" text NOT "Not Registered"
    if (statusBar.includes('Registered') && !statusBar.includes('Not Registered')) {
      console.log(`✅ Registration successful after ${i + 1} seconds!`);
      registered = true;
      break;
    }

    if (i % 5 === 0) {
      console.log(`⏳ Still waiting... (${i} seconds elapsed)`);
    }
  }

  if (!registered) {
    console.log('⚠️  Timeout waiting for registration after 30 seconds');
  }

  // Final check
  const statusBarText = await page.locator('.status-bar').textContent().catch(() => 'Status bar not found');
  console.log('📊 Final Status Bar Text:', statusBarText);

  // Take screenshot
  await page.screenshot({ path: './sip-connection-test.png', fullPage: true });
  console.log('📸 Screenshot saved to ./sip-connection-test.png');

  console.log('\n⏸️  Keeping browser open for 30 seconds so you can inspect...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
