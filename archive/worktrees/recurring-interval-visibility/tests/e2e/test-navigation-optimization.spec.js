/**
 * Navigation Optimization Test
 * Tests the optimized tier navigation structure with grouped dropdowns
 */

import { test, expect } from '@playwright/test';

const OPERATIONS_URL = process.env.OPERATIONS_URL || 'http://localhost:5173';
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'standardhuman@gmail.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'KLRss!650';

test.describe('Navigation Optimization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to Operations and login
        await page.goto(OPERATIONS_URL);

        // Wait for login form
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });

        // Login
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for navigation to load
        await page.waitForSelector('.global-nav', { timeout: 10000 });
    });

    test('Settings icon appears in tier 1 navigation', async ({ page }) => {
        // Check that Settings is in top-nav-actions
        const settingsLink = page.locator('.top-nav-actions .settings-link');
        await expect(settingsLink).toBeVisible();

        // Verify it has the settings icon
        const settingsIcon = settingsLink.locator('.settings-icon');
        await expect(settingsIcon).toHaveText('⚙️');
    });

    test('Tier 2 navigation has exactly 5 items', async ({ page }) => {
        // Count direct links and dropdowns in tier 2
        const directLinks = page.locator('.global-nav > a');
        const dropdowns = page.locator('.global-nav > .nav-dropdown');

        const directLinkCount = await directLinks.count();
        const dropdownCount = await dropdowns.count();

        // Should have 3 direct links (Operations, Billing, Insight) + 2 dropdowns
        expect(directLinkCount + dropdownCount).toBe(5);
    });

    test('Tier 2 has correct navigation items', async ({ page }) => {
        // Check for Operations link
        const operationsLink = page.locator('.global-nav a[href*="operations"]');
        await expect(operationsLink).toBeVisible();
        await expect(operationsLink).toHaveText('OPERATIONS');

        // Check for Billing link
        const billingLink = page.locator('.global-nav a[href*="billing"]');
        await expect(billingLink).toBeVisible();
        await expect(billingLink).toHaveText('BILLING');

        // Check for Insight link
        const insightLink = page.locator('.global-nav a[href*="insight"]');
        await expect(insightLink).toBeVisible();
        await expect(insightLink).toHaveText('INSIGHT');

        // Check for Customer Tools dropdown
        const customerToolsDropdown = page.locator('.nav-dropdown-toggle:has-text("CUSTOMER TOOLS")');
        await expect(customerToolsDropdown).toBeVisible();

        // Check for Admin Tools dropdown
        const adminToolsDropdown = page.locator('.nav-dropdown-toggle:has-text("ADMIN TOOLS")');
        await expect(adminToolsDropdown).toBeVisible();
    });

    test('Customer Tools dropdown contains correct items', async ({ page }) => {
        // Click Customer Tools dropdown
        const dropdown = page.locator('.nav-dropdown-toggle:has-text("CUSTOMER TOOLS")');
        await dropdown.click();

        // Wait for dropdown to open
        await page.waitForSelector('.nav-dropdown.open', { timeout: 2000 });

        // Check dropdown items
        const dropdownMenu = page.locator('.nav-dropdown:has-text("CUSTOMER TOOLS") .nav-dropdown-menu');

        await expect(dropdownMenu.locator('a[href*="marketing"]')).toBeVisible();
        await expect(dropdownMenu.locator('a[href*="estimator"]')).toBeVisible();
        await expect(dropdownMenu.locator('a[href*="portal"]')).toBeVisible();
        await expect(dropdownMenu.locator('a[href*="booking"]')).toBeVisible();
    });

    test('Admin Tools dropdown contains correct items', async ({ page }) => {
        // Click Admin Tools dropdown
        const dropdown = page.locator('.nav-dropdown-toggle:has-text("ADMIN TOOLS")');
        await dropdown.click();

        // Wait for dropdown to open
        await page.waitForSelector('.nav-dropdown.open', { timeout: 2000 });

        // Check dropdown items
        const dropdownMenu = page.locator('.nav-dropdown:has-text("ADMIN TOOLS") .nav-dropdown-menu');

        await expect(dropdownMenu.locator('a[href*="inventory"]')).toBeVisible();
        await expect(dropdownMenu.locator('a[href*="video"]')).toBeVisible();
    });

    test('Dropdown closes when clicking outside', async ({ page }) => {
        // Open dropdown
        const dropdown = page.locator('.nav-dropdown-toggle:has-text("CUSTOMER TOOLS")');
        await dropdown.click();

        // Verify it's open
        await expect(page.locator('.nav-dropdown.open')).toBeVisible();

        // Click outside (on the logo)
        await page.click('.nav-logo');

        // Verify it's closed
        await expect(page.locator('.nav-dropdown.open')).not.toBeVisible();
    });

    test('Navigation fits on tablet screen without overflow', async ({ page }) => {
        // Set viewport to tablet size (1024x768)
        await page.setViewportSize({ width: 1024, height: 768 });

        // Check that navigation is visible
        const globalNav = page.locator('.global-nav');
        await expect(globalNav).toBeVisible();

        // Verify no horizontal scrollbar on navigation container
        const scrollWidth = await globalNav.evaluate(el => el.scrollWidth);
        const clientWidth = await globalNav.evaluate(el => el.clientWidth);

        // scrollWidth should not exceed clientWidth (no overflow)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // +5 for rounding
    });

    test('Mobile hamburger menu shows dropdowns correctly', async ({ page }) => {
        // Set viewport to mobile size
        await page.setViewportSize({ width: 375, height: 667 });

        // Click hamburger menu
        await page.click('#ss-hamburger-menu');

        // Wait for menu to open
        await page.waitForSelector('.global-header.mobile-menu-open', { timeout: 2000 });

        // Click Customer Tools dropdown
        const dropdown = page.locator('.nav-dropdown-toggle:has-text("CUSTOMER TOOLS")');
        await dropdown.click();

        // Verify dropdown menu is visible
        const dropdownMenu = page.locator('.nav-dropdown:has-text("CUSTOMER TOOLS") .nav-dropdown-menu');
        await expect(dropdownMenu).toBeVisible();

        // Verify dropdown items are visible
        await expect(dropdownMenu.locator('a[href*="marketing"]')).toBeVisible();
    });

    test('Settings link navigates correctly', async ({ page }) => {
        const settingsLink = page.locator('.top-nav-actions .settings-link');

        // Get the href
        const href = await settingsLink.getAttribute('href');
        expect(href).toContain('sailorskills-settings');
    });

    test('Tier 2 gap is reduced for better spacing', async ({ page }) => {
        // Get the computed gap value
        const globalNav = page.locator('.global-nav');
        const gap = await globalNav.evaluate(el => {
            return window.getComputedStyle(el).gap;
        });

        // Verify gap is 24px (reduced from 40px)
        expect(gap).toBe('24px');
    });
});
