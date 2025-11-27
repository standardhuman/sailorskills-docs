/**
 * Test: Unified Service Report (Latest Service + Videos)
 * Checks console logs and verifies video integration
 */

import { test } from '@playwright/test';

const TEST_EMAIL = 'standardhuman@gmail.com';
const TEST_PASSWORD = 'KLRss!650';
const BASE_URL = 'http://localhost:5174';

test('Debug unified service report with videos', async ({ page }) => {
  // Capture all console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture errors
  page.on('pageerror', err => {
    console.log(`🔴 ERROR: ${err.message}`);
  });

  // Navigate and login
  await page.goto(`${BASE_URL}/login.html`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/portal.html`, { timeout: 10000 });

  console.log('\n⏳ Waiting for service data to load...');
  await page.waitForTimeout(5000); // Give time for async video loading

  console.log('\n📊 CHECKING LATEST SERVICE SECTION:');

  // Check Latest Service content
  const serviceContent = await page.locator('#latest-service-content').innerHTML();

  // Check for videos section
  const hasVideosHeader = serviceContent.includes('📹 Service Videos');
  console.log(`  Videos header in Latest Service: ${hasVideosHeader ? '✅ FOUND' : '❌ MISSING'}`);

  if (hasVideosHeader) {
    const videoThumbnails = await page.locator('#latest-service-content .service-video-thumbnail').count();
    console.log(`  Video thumbnails: ${videoThumbnails}`);
  }

  // Check anode/propeller console logs
  console.log('\n📊 CHECKING CONSOLE LOGS FOR ANODE/PROPELLER DATA:');
  console.log('  (Check console output above for anode/propeller logs)');

  // Check if separate videos section is hidden
  const videosSectionDisplay = await page.locator('#videos-section').evaluate(el => el.style.display);
  console.log(`\n📹 Separate videos section display: ${videosSectionDisplay || 'default'}`);

  // Take screenshot
  await page.screenshot({ path: 'test-unified-report.png', fullPage: true });
  console.log('\n✓ Screenshot saved: test-unified-report.png');
});
