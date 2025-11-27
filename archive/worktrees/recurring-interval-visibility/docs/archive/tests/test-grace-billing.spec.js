const { test } = require('playwright/test');

test('Search for Grace in Billing and verify full profile', async ({ page }) => {
  console.log('🌐 Navigating to Billing service...');
  await page.goto('https://sailorskills-billing.vercel.app');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('🎯 Clicking on "One-Time Cleaning" service type...');
  await page.click('text=One-Time Cleaning');
  await page.waitForTimeout(2000);

  console.log('📸 Taking screenshot after service selection...');
  await page.screenshot({ path: 'billing-after-service-selection.png', fullPage: true });

  console.log('🔍 Looking for search input...');

  // Wait for search input to appear
  const searchInput = page.locator('input[type="search"], input[type="text"]:visible, input[placeholder*="search" i]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });

  console.log('✅ Search input found, typing "Grace"...');
  await searchInput.fill('Grace');
  await page.waitForTimeout(2000); // Wait for search results

  console.log('📸 Taking screenshot of search results...');
  await page.screenshot({ path: 'billing-grace-search-results.png', fullPage: true });

  // Check if Paul Roge appears
  const paulRogeVisible = await page.locator('text=Paul Roge').isVisible({ timeout: 3000 }).catch(() => false);

  if (paulRogeVisible) {
    console.log('✅ Paul Roge found! Clicking to view profile...');
    await page.click('text=Paul Roge');
    await page.waitForTimeout(2000);

    console.log('📸 Taking screenshot of full profile...');
    await page.screenshot({ path: 'billing-paul-roge-profile.png', fullPage: true });

    // Check for boat details
    const checks = {
      'Name: Paul Roge': await page.locator('text=Paul Roge').isVisible().catch(() => false),
      'Email: proge@berkeley.edu': await page.locator('text=proge@berkeley.edu').isVisible().catch(() => false),
      'Phone: 8318184769': await page.locator('text=8318184769').isVisible().catch(() => false),
      'Boat: Grace': await page.locator('text=Grace').isVisible().catch(() => false),
      'Marina: Berkeley': await page.locator('text=Berkeley').isVisible().catch(() => false)
    };

    console.log('');
    console.log('============================================');
    console.log('📊 CUSTOMER PROFILE VERIFICATION');
    console.log('============================================');
    for (const [field, visible] of Object.entries(checks)) {
      console.log(`${visible ? '✅' : '❌'} ${field}`);
    }
    console.log('============================================');
    console.log('');

    const allPresent = Object.values(checks).every(v => v);
    if (allPresent) {
      console.log('🎉 SUCCESS! All customer and boat data is displaying!');
    } else {
      console.log('⚠️  Some data missing - check screenshot: billing-paul-roge-profile.png');
    }

  } else {
    console.log('❌ Paul Roge NOT found in search results');
    console.log('⚠️  Possible reasons:');
    console.log('   - Search API may need cache clear/restart');
    console.log('   - Vercel function may need redeploy');
    console.log('   - Check screenshot: billing-grace-search-results.png');

    // Also try searching by name
    console.log('');
    console.log('🔄 Trying search by "Paul" instead...');
    await searchInput.fill('Paul');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'billing-paul-search-results.png', fullPage: true });

    const paulByName = await page.locator('text=Paul Roge').isVisible({ timeout: 3000 }).catch(() => false);
    if (paulByName) {
      console.log('✅ Found by searching "Paul" - boat name search may need API restart');
    } else {
      console.log('❌ Not found by "Paul" either - check screenshots');
    }
  }

  console.log('');
  console.log('📁 Screenshots saved:');
  console.log('   - billing-after-service-selection.png');
  console.log('   - billing-grace-search-results.png');
  console.log('   - billing-paul-search-results.png');
  if (paulRogeVisible) {
    console.log('   - billing-paul-roge-profile.png');
  }
});
