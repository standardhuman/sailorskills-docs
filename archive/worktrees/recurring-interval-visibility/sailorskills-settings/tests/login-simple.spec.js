import { test, expect } from '@playwright/test';

test('Login to Settings service', async ({ page }) => {
  // Capture all console output
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      console.log(`❌ [Console Error]: ${text}`);
    } else if (type === 'log') {
      console.log(`📝 [Console Log]: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  [Console Warning]: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`🔥 [Page Error]: ${error.message}`);
  });

  console.log('\n🌐 Navigating to login page...');
  await page.goto('https://sailorskills-settings.vercel.app/login.html');

  await page.waitForLoadState('domcontentloaded');
  console.log('✅ Page loaded');

  // Take screenshot of login page
  await page.screenshot({ path: 'tests/screenshots/01-login-page.png', fullPage: true });

  // Fill in credentials
  console.log('\n📝 Entering credentials...');
  await page.fill('input[type="email"]', 'standardhuman@gmail.com');
  await page.fill('input[type="password"]', 'KLRss!650');

  await page.screenshot({ path: 'tests/screenshots/02-filled-form.png', fullPage: true });

  // Click submit and wait for network activity
  console.log('\n🔐 Clicking login button...');

  // Start waiting for navigation before clicking
  const navigationPromise = page.waitForURL('**/dashboard.html', {
    timeout: 10000,
    waitUntil: 'domcontentloaded'
  }).catch(() => {
    console.log('⚠️  Did not navigate to dashboard');
    return null;
  });

  await page.click('button[type="submit"]');

  // Wait for either navigation or timeout
  await Promise.race([
    navigationPromise,
    page.waitForTimeout(5000)
  ]);

  await page.screenshot({ path: 'tests/screenshots/03-after-submit.png', fullPage: true });

  // Check where we are
  const currentUrl = page.url();
  console.log(`\n📍 Current URL: ${currentUrl}`);

  // Check for error message
  const errorVisible = await page.locator('#error.show').isVisible().catch(() => false);

  if (errorVisible) {
    const errorText = await page.locator('#error').textContent();
    console.log(`\n❌ Error message: ${errorText}`);
  }

  // Print success or failure
  if (currentUrl.includes('dashboard.html')) {
    console.log('\n✅ Login successful! Redirected to dashboard');
  } else {
    console.log('\n❌ Login failed - still on login page');
  }
});
