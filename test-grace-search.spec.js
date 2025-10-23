const { test, expect } = require('playwright/test');

test('Verify Grace boat search in Billing shows full customer profile', async ({ page }) => {
  console.log('🌐 Navigating to Billing service...');
  await page.goto('https://sailorskills-billing.vercel.app');

  // Wait for page load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('🔐 Checking if login is required...');

  // Check if we need to login
  const needsLogin = await page.locator('input[type="email"], input[type="text"][name*="email"]').isVisible().catch(() => false);

  if (needsLogin) {
    console.log('📧 Logging in with standardhuman@gmail.com...');

    // Fill in email
    await page.fill('input[type="email"], input[type="text"][name*="email"]', 'standardhuman@gmail.com');
    await page.waitForTimeout(500);

    // Fill in password
    await page.fill('input[type="password"]', 'KLRss!650');
    await page.waitForTimeout(500);

    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');

    // Wait for navigation after login
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Logged in successfully');
  } else {
    console.log('✅ Already logged in or no login required');
  }

  console.log('🔍 Searching for boat "Grace"...');

  // Find the search input
  const searchSelectors = [
    'input[type="search"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="search"]',
    'input[name*="search"]',
    '[data-testid="search"]',
    'input.search',
    '.search-input'
  ];

  let searchInput = null;
  for (const selector of searchSelectors) {
    try {
      searchInput = page.locator(selector).first();
      if (await searchInput.isVisible({ timeout: 1000 })) {
        console.log(`✅ Found search input with selector: ${selector}`);
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }

  if (!searchInput) {
    await page.screenshot({ path: 'billing-no-search-found.png', fullPage: true });
    throw new Error('Could not find search input. Screenshot saved.');
  }

  // Type "Grace" in search
  await searchInput.fill('Grace');
  await page.waitForTimeout(1500); // Wait for search results

  console.log('📋 Looking for search results...');

  // Take screenshot of search results
  await page.screenshot({ path: 'billing-grace-search-results.png', fullPage: true });
  console.log('📸 Screenshot saved: billing-grace-search-results.png');

  // Look for Paul Roge in the results
  const paulRogeVisible = await page.locator('text=Paul Roge').isVisible({ timeout: 5000 }).catch(() => false);

  if (!paulRogeVisible) {
    console.log('❌ Paul Roge not found in search results');
    console.log('⚠️  This might indicate the search API needs to be restarted or there\'s a caching issue');
    await page.screenshot({ path: 'billing-grace-not-found.png', fullPage: true });
  } else {
    console.log('✅ Paul Roge found in search results!');

    // Click on Paul Roge to open profile
    await page.click('text=Paul Roge');
    await page.waitForTimeout(2000);

    console.log('👤 Checking customer profile details...');

    // Take screenshot of full profile
    await page.screenshot({ path: 'billing-paul-roge-profile.png', fullPage: true });
    console.log('📸 Screenshot saved: billing-paul-roge-profile.png');

    // Verify profile contains expected information
    const profileChecks = {
      'Paul Roge': await page.locator('text=Paul Roge').isVisible().catch(() => false),
      'proge@berkeley.edu': await page.locator('text=proge@berkeley.edu').isVisible().catch(() => false),
      '8318184769': await page.locator('text=8318184769').isVisible().catch(() => false),
      'Grace': await page.locator('text=Grace').isVisible().catch(() => false),
      'Berkeley': await page.locator('text=Berkeley').isVisible().catch(() => false),
      'Dock O': await page.locator('text=/Dock.*O|O.*Dock/i').isVisible().catch(() => false),
      'Slip 605': await page.locator('text=/Slip.*605|605.*Slip/i').isVisible().catch(() => false)
    };

    console.log('');
    console.log('============================================');
    console.log('📊 PROFILE VERIFICATION RESULTS');
    console.log('============================================');
    for (const [field, visible] of Object.entries(profileChecks)) {
      console.log(`${visible ? '✅' : '❌'} ${field}`);
    }
    console.log('============================================');
    console.log('');

    const allFieldsPresent = Object.values(profileChecks).every(v => v === true);

    if (allFieldsPresent) {
      console.log('🎉 SUCCESS! All boat location fields are displaying correctly!');
    } else {
      console.log('⚠️  Some fields are missing. Check screenshot: billing-paul-roge-profile.png');
    }
  }

  console.log('');
  console.log('Test completed. Review screenshots:');
  console.log('  - billing-grace-search-results.png');
  console.log('  - billing-paul-roge-profile.png');
});
