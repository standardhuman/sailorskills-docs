const { test } = require('playwright/test');

test('Screenshot Billing interface', async ({ page }) => {
  console.log('🌐 Navigating to Billing service...');
  await page.goto('https://sailorskills-billing.vercel.app');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('📸 Taking screenshot...');
  await page.screenshot({ path: 'billing-interface.png', fullPage: true });
  console.log('✅ Screenshot saved: billing-interface.png');

  // Also get the HTML structure
  const bodyHTML = await page.locator('body').innerHTML();
  const fs = require('fs');
  fs.writeFileSync('billing-interface.html', bodyHTML);
  console.log('✅ HTML saved: billing-interface.html');
});
