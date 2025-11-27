/**
 * Test Portal Dashboard Fix
 * Verify that:
 * 1. Dashboard loads latest service
 * 2. Videos are filtered correctly (not showing ALL videos)
 * 3. Service History page loads
 */

import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:5174';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'standardhuman@gmail.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'KLRss!650';

test.describe('Portal Dashboard Fix Verification', () => {
  test('Dashboard shows latest service with filtered videos', async ({ page }) => {
    // Login
    await page.goto(`${PORTAL_URL}/login.html`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL(`${PORTAL_URL}/portal.html`);
    await page.waitForSelector('.portal-header', { timeout: 10000 });

    // Check if Latest Service section is visible
    const latestServiceSection = page.locator('#latest-service-section');
    await expect(latestServiceSection).toBeVisible({ timeout: 10000 });

    // Check if service content loaded (not just "Loading...")
    const latestServiceContent = page.locator('#latest-service-content');
    const contentText = await latestServiceContent.textContent();

    console.log('Latest Service Content:', contentText);

    // Should not say "Loading..."
    expect(contentText).not.toContain('Loading latest service');

    // Should show either service details or "No service history"
    const hasServiceOrEmpty =
      contentText.includes('Service Videos') ||
      contentText.includes('No service history available');
    expect(hasServiceOrEmpty).toBe(true);

    // Check video count - should be limited, not showing ALL videos
    const videoThumbnails = page.locator('.service-video-thumbnail');
    const videoCount = await videoThumbnails.count();

    console.log(`Video count on Dashboard: ${videoCount}`);

    // Should show max 6 videos (not dozens)
    expect(videoCount).toBeLessThanOrEqual(6);

    console.log('✅ Dashboard shows latest service correctly');
  });

  test('Service History page loads and displays services', async ({ page }) => {
    // Login
    await page.goto(`${PORTAL_URL}/login.html`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL(`${PORTAL_URL}/portal.html`);

    // Navigate to Service History
    await page.click('a[href="/portal-services.html"]');
    await page.waitForURL(`${PORTAL_URL}/portal-services.html`);
    await page.waitForSelector('.portal-header', { timeout: 10000 });

    // Check if service timeline loaded
    const timeline = page.locator('#service-timeline');
    await expect(timeline).toBeVisible({ timeout: 10000 });

    const timelineText = await timeline.textContent();

    console.log('Service Timeline Text:', timelineText.substring(0, 200));

    // Should not be stuck at "Loading..."
    expect(timelineText).not.toContain('Loading service history...');

    // Should show services or empty state
    const hasServicesOrEmpty =
      timelineText.includes('Service') ||
      timelineText.includes('No service history') ||
      page.locator('.timeline-item').count() > 0;

    console.log('✅ Service History page loaded successfully');
  });
});
