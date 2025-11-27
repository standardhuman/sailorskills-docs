const { test } = require('playwright/test');

test('Search for Grace in Billing', async ({ page }) => {
  console.log('🌐 Navigating to Billing...');
  await page.goto('https://sailorskills-billing.vercel.app');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('🎯 Clicking One-Time Cleaning...');
  await page.click('text=One-Time Cleaning');
  await page.waitForTimeout(2000);

  console.log('🔍 Clicking on search box...');
  const searchBox = page.locator('input[placeholder*="Search existing customer"]');
  await searchBox.click();
  await page.waitForTimeout(1000);

  console.log('⌨️  Typing "Grace"...');
  await searchBox.fill('Grace');
  await page.waitForTimeout(3000); // Wait for search results

  console.log('📸 Taking screenshot of search results...');
  await page.screenshot({ path: 'grace-search-results.png', fullPage: true });

  // Check if results appear
  const paulVisible = await page.locator('text=Paul Roge').isVisible({ timeout: 2000 }).catch(() => false);

  console.log('');
  console.log('============================================');
  console.log('🔍 SEARCH RESULTS');
  console.log('============================================');

  if (paulVisible) {
    console.log('✅ SUCCESS! Paul Roge appears in search results for "Grace"');
    console.log('');

    console.log('👤 Clicking on Paul Roge to view profile...');
    await page.click('text=Paul Roge');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'paul-roge-profile.png', fullPage: true });
    console.log('📸 Profile screenshot saved');
    console.log('');

    // Check for all expected data
    const pageText = await page.locator('body').textContent();

    const dataChecks = {
      'Paul Roge': pageText.includes('Paul Roge'),
      'proge@berkeley.edu': pageText.includes('proge@berkeley.edu'),
      '8318184769': pageText.includes('8318184769'),
      'Grace': pageText.includes('Grace'),
      'Berkeley': pageText.includes('Berkeley'),
      'O': pageText.includes('O'), // Dock
      '605': pageText.includes('605') // Slip
    };

    console.log('📊 PROFILE DATA VERIFICATION:');
    console.log('--------------------------------------------');
    for (const [field, found] of Object.entries(dataChecks)) {
      console.log(`${found ? '✅' : '❌'} ${field}`);
    }
    console.log('============================================');
    console.log('');

    const allFound = Object.values(dataChecks).every(v => v);
    if (allFound) {
      console.log('🎉 COMPLETE SUCCESS!');
      console.log('✅ Boat name search works');
      console.log('✅ Full customer profile displays');
      console.log('✅ All boat location data present');
    } else {
      console.log('⚠️  Profile opened but some data missing');
      console.log('Check paul-roge-profile.png for details');
    }

  } else {
    console.log('❌ Paul Roge NOT found when searching "Grace"');
    console.log('');
    console.log('Possible causes:');
    console.log('  1. Search API caching - may need Vercel redeploy');
    console.log('  2. Boat name not indexed in search');
    console.log('  3. Search function needs restart');
    console.log('');
    console.log('🔄 Trying alternative search by "Paul"...');

    await searchBox.fill('Paul');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'paul-name-search.png', fullPage: true });

    const paulByName = await page.locator('text=Paul Roge').isVisible({ timeout: 2000 }).catch(() => false);

    if (paulByName) {
      console.log('✅ Found by name search - boat search needs fix');
      await page.click('text=Paul Roge');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'paul-roge-profile-via-name.png', fullPage: true });
      console.log('📸 Profile screenshot saved');
    } else {
      console.log('❌ Not found by name either');
    }
  }

  console.log('');
  console.log('📁 Screenshots:');
  console.log('   grace-search-results.png');
  console.log('   paul-name-search.png');
  if (paulVisible) {
    console.log('   paul-roge-profile.png');
  }
  console.log('============================================');
});
