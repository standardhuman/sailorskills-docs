import { test, expect } from '@playwright/test';

test.describe('Settings Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Listen for console messages to capture errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
      console.log(`[Browser Console - ${msg.type()}]:`, msg.text());
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error('[Page Error]:', error);
    });

    // Go to login page
    console.log('\n🔍 Navigating to production login page...');
    await page.goto('https://sailorskills-settings.vercel.app/login.html');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if environment variables are loaded
    const envCheck = await page.evaluate(() => {
      return {
        hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      };
    });
    console.log('\n📊 Environment check:', envCheck);

    // Fill in login form
    console.log('\n📝 Filling login form...');
    await page.fill('#email', 'standardhuman@gmail.com');
    await page.fill('#password', 'KLRss!650');

    // Take screenshot before submitting
    await page.screenshot({ path: 'tests/screenshots/before-login.png', fullPage: true });
    console.log('📸 Screenshot saved: before-login.png');

    // Click login button
    console.log('\n🔐 Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait a bit for any errors or redirect
    await page.waitForTimeout(3000);

    // Take screenshot after submitting
    await page.screenshot({ path: 'tests/screenshots/after-login.png', fullPage: true });
    console.log('📸 Screenshot saved: after-login.png');

    // Check current URL
    const currentUrl = page.url();
    console.log('\n📍 Current URL:', currentUrl);

    // Check for error messages
    const errorElement = await page.locator('#error.show');
    const hasError = await errorElement.count() > 0;

    if (hasError) {
      const errorText = await errorElement.textContent();
      console.error('\n❌ Login error displayed:', errorText);
    }

    // Print all console messages
    console.log('\n📋 All console messages:');
    consoleMessages.forEach(msg => {
      console.log(`  [${msg.type}] ${msg.text}`);
    });

    // Assert login was successful (should redirect to dashboard)
    expect(currentUrl).toContain('/src/views/dashboard.html');
  });

  test('should show environment variables in console', async ({ page }) => {
    await page.goto('https://sailorskills-settings.vercel.app/login.html');
    await page.waitForLoadState('networkidle');

    // Check supabase client initialization
    const clientInfo = await page.evaluate(() => {
      // This should be available from the environment check log
      return {
        timestamp: new Date().toISOString()
      };
    });

    console.log('Client info:', clientInfo);
  });
});
