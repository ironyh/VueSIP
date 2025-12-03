import { chromium } from '@playwright/test';

async function checkToolbar() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to playground...');
    await page.goto('http://localhost:5176/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Extra wait for Vue components

    // Take a screenshot
    const screenshotPath = '/home/irony/code/VueSIP/toolbar-check.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Check if CallToolbar is visible
    const toolbar = await page.locator('.call-toolbar');
    const toolbarVisible = await toolbar.isVisible();
    console.log(`\n✓ CallToolbar visible: ${toolbarVisible}`);

    // Check toolbar background
    if (toolbarVisible) {
      const background = await toolbar.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.background || styles.backgroundColor;
      });
      console.log(`✓ Toolbar background: ${background.substring(0, 80)}...`);
    }

    // Check for status items
    const statusItems = await page.locator('.status-item').all();
    console.log(`✓ Status items found: ${statusItems.length}`);

    // Get status text for each item
    for (let i = 0; i < statusItems.length; i++) {
      const text = await statusItems[i].innerText();
      const dotColor = await statusItems[i].locator('.status-dot').evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.log(`  - Status ${i + 1}: "${text}" (dot color: ${dotColor})`);
    }

    // Check call info section
    const callInfo = await page.locator('.call-info');
    const callInfoVisible = await callInfo.isVisible();
    const callInfoText = await callInfo.innerText();
    console.log(`✓ Call info visible: ${callInfoVisible}`);
    console.log(`  - Text: "${callInfoText}"`);

    // Check text visibility by measuring contrast
    const statusLabel = await page.locator('.status-label').first();
    const textStyles = await statusLabel.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        textShadow: styles.textShadow
      };
    });
    console.log(`✓ Status text styles:`, textStyles);

    // Check if status dots are visible
    const dots = await page.locator('.status-dot').all();
    for (let i = 0; i < dots.length; i++) {
      const dotStyles = await dots[i].evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          backgroundColor: styles.backgroundColor,
          boxShadow: styles.boxShadow
        };
      });
      console.log(`✓ Status dot ${i + 1} styles:`, dotStyles);
    }

    console.log('\n✅ All checks completed successfully!');

  } catch (error) {
    console.error('❌ Error during checks:', error);
  } finally {
    await browser.close();
  }
}

checkToolbar();
