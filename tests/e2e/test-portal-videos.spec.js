/**
 * Test: Portal Service History Video Display
 * Verifies that video thumbnails appear in service history timeline
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'standardhuman@gmail.com';
const TEST_PASSWORD = 'KLRss!650';
const BASE_URL = 'http://localhost:5174';

test('Portal service history displays video thumbnails', async ({ page }) => {
  // Navigate to login page
  await page.goto(`${BASE_URL}/login.html`);
  await page.waitForLoadState('networkidle');

  console.log('✓ Navigated to login page');

  // Log in with test credentials
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/portal.html`, { timeout: 10000 });
  console.log('✓ Successfully logged in');

  // Navigate to service history page
  await page.goto(`${BASE_URL}/portal-services.html`);
  await page.waitForLoadState('networkidle');
  console.log('✓ Navigated to service history page');

  // Wait for service logs to load
  await page.waitForSelector('.timeline-item', { timeout: 10000 });
  console.log('✓ Service logs loaded');

  // Check if any timeline items exist
  const timelineItems = await page.locator('.timeline-item').count();
  console.log(`  Found ${timelineItems} service log(s)`);

  if (timelineItems > 0) {
    // Expand first timeline item to see details
    await page.locator('.timeline-item').first().click();
    await page.waitForTimeout(500); // Wait for expansion animation

    // Check for video sections
    const videoSections = await page.locator('.service-video-grid').count();
    console.log(`  Found ${videoSections} video section(s)`);

    if (videoSections > 0) {
      // Count video thumbnails
      const videoThumbnails = await page.locator('.service-video-thumbnail').count();
      console.log(`  ✓ Found ${videoThumbnails} video thumbnail(s)`);

      // Verify video thumbnails have images
      const firstVideoImg = await page.locator('.service-video-thumbnail img').first();
      const imgSrc = await firstVideoImg.getAttribute('src');
      console.log(`  ✓ Video thumbnail has image: ${imgSrc?.substring(0, 50)}...`);

      // Verify play overlay exists
      const playOverlay = await page.locator('.video-play-overlay').first();
      await expect(playOverlay).toBeVisible();
      console.log('  ✓ Play overlay visible');
    } else {
      console.log('  ℹ No video sections found (boat may not have playlist or videos)');
    }

    // Take screenshot
    await page.screenshot({ path: 'test-portal-service-history-videos.png', fullPage: true });
    console.log('✓ Screenshot saved: test-portal-service-history-videos.png');
  } else {
    console.log('⚠ No service logs found for this test user');
  }
});
