import { test, expect } from '@playwright/test';

test('debug app loading', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(msg.type() + ': ' + msg.text());
  });

  page.on('pageerror', error => {
    logs.push('PAGE ERROR: ' + error.message);
  });

  await page.goto('http://localhost:5173/?test=true');
  await page.waitForTimeout(3000);

  // Log all console messages
  console.log('\n=== CONSOLE LOGS ===');
  logs.slice(0, 50).forEach(log => console.log(log));

  // Check for the element
  const hasElement = await page.locator('[data-testid="sip-client"]').count();
  console.log('\n=== ELEMENT CHECK ===');
  console.log('sip-client element count:', hasElement);

  // Get page HTML
  const html = await page.content();
  console.log('\n=== PAGE HTML (first 1000 chars) ===');
  console.log(html.substring(0, 1000));

  // Assert the element exists
  expect(hasElement).toBeGreaterThan(0);
});
