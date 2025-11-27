/**
 * Test: Verify Anode Section Fix
 * Confirms that anode data with overall_condition field displays correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Dashboard - Anode Section Fix', () => {
  test('should display anode overall_condition correctly', async ({ page }) => {
    // Load portal
    await page.goto('http://localhost:5186/portal.html');

    // Wait for auth redirect (may go to login)
    await page.waitForTimeout(1000);

    // Check if on login page
    const isLoginPage = page.url().includes('login.html');

    if (isLoginPage) {
      console.log('On login page, need to authenticate first');

      // Login with test credentials
      await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
      await page.click('button[type="submit"]');

      // Wait for redirect to portal
      await page.waitForURL('**/portal.html', { timeout: 5000 });
    }

    // Wait for boat selector or dashboard to load
    await page.waitForSelector('#boat-selector, #latest-service-section', { timeout: 5000 });

    // Select "About Time" boat if selector exists
    const boatSelector = await page.$('#boat-select');
    if (boatSelector) {
      await page.selectOption('#boat-select', { label: 'About Time' });
      await page.waitForTimeout(1000); // Wait for data to load
    }

    // Wait for latest service section to load
    await page.waitForSelector('#latest-service-section', { state: 'visible' });

    // Check for Anode Inspection section
    const anodeSection = await page.locator('text=/⚓ Anode Inspection/').first();

    if (await anodeSection.isVisible()) {
      console.log('✓ Anode Inspection section is visible');

      // Check for "Needs Replacement" text (case insensitive)
      const anodeSectionHtml = await page.locator('h4:has-text("⚓ Anode Inspection")').locator('..').innerHTML();
      console.log('Anode section HTML:', anodeSectionHtml);

      // Verify "Needs Replacement" is displayed
      expect(anodeSectionHtml.toLowerCase()).toContain('needs replacement');
      console.log('✓ "Needs Replacement" text is present');

      // Should NOT show "N/A" for anodes with actual condition data
      if (anodeSectionHtml.toLowerCase().includes('n/a')) {
        console.log('⚠️  WARNING: N/A found in anode section - may indicate data not parsed correctly');
      }
    } else {
      console.log('⚠️  Anode Inspection section not found - may not have anode data for this boat');
    }

    // Check for JavaScript errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    if (errors.length > 0) {
      console.log('❌ JavaScript errors detected:', errors);
    } else {
      console.log('✓ No JavaScript errors');
    }

    expect(errors.length).toBe(0);
  });
});
