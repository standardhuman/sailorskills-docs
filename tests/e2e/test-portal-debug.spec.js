/**
 * Debug Test: Portal Service History
 * Checks for JavaScript errors and console messages
 */

import { test } from '@playwright/test';

const TEST_EMAIL = 'standardhuman@gmail.com';
const TEST_PASSWORD = 'KLRss!650';
const BASE_URL = 'http://localhost:5174';

test('Debug portal service history page', async ({ page }) => {
  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Console Warning: ${text}`);
    } else {
      console.log(`  Console ${type}: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', err => {
    console.log(`🔴 Page Error: ${err.message}`);
    console.log(`  Stack: ${err.stack}`);
  });

  // Navigate to login page
  await page.goto(`${BASE_URL}/login.html`);
  await page.waitForLoadState('networkidle');
  console.log('✓ Login page loaded');

  // Log in
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(`${BASE_URL}/portal.html`, { timeout: 10000 });
  console.log('✓ Login successful, redirected to dashboard');

  // Navigate to service history
  await page.goto(`${BASE_URL}/portal-services.html`);
  await page.waitForLoadState('networkidle');
  console.log('✓ Service history page loaded');

  // Wait a bit to capture all console messages
  await page.waitForTimeout(3000);

  // Check page content
  const pageContent = await page.content();
  console.log('\n📄 Page contains:');
  console.log(`  - "Service History": ${pageContent.includes('Service History')}`);
  console.log(`  - "timeline-item": ${pageContent.includes('timeline-item')}`);
  console.log(`  - "Loading": ${pageContent.includes('Loading')}`);
  console.log(`  - "No service": ${pageContent.includes('No service')}`);

  // Take screenshot
  await page.screenshot({ path: 'test-portal-debug.png', fullPage: true });
  console.log('\n✓ Screenshot saved: test-portal-debug.png');

  // Check for any visible error messages
  const errorMessages = await page.locator('.empty-state, .error, [style*="color: var(--ss-error"]').allTextContents();
  if (errorMessages.length > 0) {
    console.log('\n⚠️  Error messages found:');
    errorMessages.forEach(msg => console.log(`  - ${msg}`));
  }
});
