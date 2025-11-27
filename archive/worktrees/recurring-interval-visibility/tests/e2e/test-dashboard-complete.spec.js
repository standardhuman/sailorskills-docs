/**
 * Test: Portal Dashboard Complete Feature Test
 * Verifies dashboard displays latest service, videos, and formatted dates
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'standardhuman@gmail.com';
const TEST_PASSWORD = 'KLRss!650';
const BASE_URL = 'http://localhost:5174';

test('Dashboard displays latest service and videos correctly', async ({ page }) => {
  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.log(`🔴 Page Error: ${err.message}`);
  });

  // Navigate to login page
  await page.goto(`${BASE_URL}/login.html`);
  await page.waitForLoadState('networkidle');
  console.log('✓ Login page loaded');

  // Log in
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/portal.html`, { timeout: 10000 });
  console.log('✓ Successfully logged in and redirected to dashboard');

  // Wait for dashboard to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for async data loading

  // Check for JavaScript/page errors
  expect(pageErrors.length).toBe(0);
  console.log('✓ No page errors detected');

  // Check Latest Service section is visible
  const latestServiceSection = page.locator('#latest-service-section');
  await expect(latestServiceSection).toBeVisible();
  console.log('✓ Latest Service section is visible');

  // Check for service date (formatted by formatDate function)
  const serviceDate = page.locator('#latest-service-content').first();
  const dateText = await serviceDate.textContent();
  console.log(`  Service date text: ${dateText?.substring(0, 100)}...`);

  // Check if date contains expected format (e.g., "January 15, 2025" from imported formatDate)
  // The imported formatDate uses month: 'long', so we should see full month names
  const hasFormattedDate = dateText?.match(/\w+ \d+, \d{4}/); // Matches "Month DD, YYYY"
  expect(hasFormattedDate).toBeTruthy();
  console.log('✓ Date is properly formatted with imported formatDate');

  // Check for videos inside Latest Service section (unified report)
  const videosHeader = page.locator('#latest-service-content h4:has-text("Service Videos")');
  const hasVideosSection = await videosHeader.count() > 0;

  if (hasVideosSection) {
    console.log('✓ Videos integrated into Latest Service section');

    // Check for video thumbnails
    const videoThumbnails = await page.locator('#latest-service-content .service-video-thumbnail').count();
    console.log(`✓ Found ${videoThumbnails} video thumbnail(s) in unified report`);

    if (videoThumbnails > 0) {
      // Verify play overlay exists
      const playOverlay = await page.locator('#latest-service-content .video-play-overlay').first();
      await expect(playOverlay).toBeVisible();
      console.log('✓ Play overlay visible on videos');
    }
  } else {
    console.log('ℹ No videos in this service (may not have playlist data)');
  }

  // Verify separate videos section is hidden (videos now in unified report)
  const separateVideosSection = page.locator('#videos-section');
  const videosSectionStyle = await separateVideosSection.evaluate(el => window.getComputedStyle(el).display);
  expect(videosSectionStyle).toBe('none');
  console.log('✓ Separate videos section correctly hidden (unified report active)');

  // Take screenshot
  await page.screenshot({ path: 'test-dashboard-complete.png', fullPage: true });
  console.log('✓ Screenshot saved: test-dashboard-complete.png');

  // Final check: No critical console errors
  const criticalErrors = consoleErrors.filter(err =>
    !err.includes('404') && // Ignore 404s for favicon, etc.
    !err.includes('GoTrueClient') // Ignore Supabase multi-instance warning
  );
  expect(criticalErrors.length).toBe(0);
  console.log('✓ No critical console errors');

  console.log('\n✅ Dashboard test passed - all features working correctly!');
});
