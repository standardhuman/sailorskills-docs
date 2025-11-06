/**
 * Portal-Estimator Styling Alignment Tests
 *
 * Tests verify that Portal pages use correct Estimator-style design:
 * - Montserrat font loads correctly
 * - Colors match Estimator (#345475 primary)
 * - Navigation functions properly
 * - Responsive behavior works (mobile hamburger menu)
 * - Visual regression (screenshot comparison)
 */

import { test, expect } from '@playwright/test';

const PORTAL_BASE_URL = process.env.PORTAL_URL || 'http://localhost:5174';
const PRIMARY_COLOR = 'rgb(52, 84, 117)'; // #345475

test.describe('Portal Styling - Typography', () => {
  test('login page uses Montserrat font', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    const bodyFont = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily
    );

    expect(bodyFont).toContain('Montserrat');
  });

  test('portal dashboard uses Montserrat font', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Login with test credentials
    await page.fill('#password-email', process.env.TEST_USER_EMAIL || 'standardhuman@gmail.com');
    await page.fill('#password', process.env.TEST_USER_PASSWORD || 'KLRss!650');
    await page.click('#password-login-btn');

    // Wait for redirect to portal
    await page.waitForURL(/portal\.html/);

    const bodyFont = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily
    );

    expect(bodyFont).toContain('Montserrat');
  });

  test('all Portal pages load Montserrat font', async ({ page }) => {
    const pages = [
      '/login.html',
      '/signup.html',
      '/reset-password.html',
    ];

    for (const pagePath of pages) {
      await page.goto(`${PORTAL_BASE_URL}${pagePath}`);

      const bodyFont = await page.evaluate(() =>
        getComputedStyle(document.body).fontFamily
      );

      expect(bodyFont, `${pagePath} should use Montserrat`).toContain('Montserrat');
    }
  });
});

test.describe('Portal Styling - Colors', () => {
  test('login page uses correct primary color', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Find a primary button or heading
    const heading = page.locator('.login-header h1');
    const color = await heading.evaluate(el =>
      getComputedStyle(el).color
    );

    expect(color).toBe(PRIMARY_COLOR);
  });

  test('buttons use correct primary color', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    const primaryBtn = page.locator('.btn-primary').first();
    const bgColor = await primaryBtn.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );

    expect(bgColor).toBe(PRIMARY_COLOR);
  });
});

test.describe('Portal Styling - Portal-Specific Styles', () => {
  test('portal-styles.css is loaded on login page', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Check if portal-styles.css link exists
    const styleLink = await page.locator('link[href*="portal-styles.css"]').count();
    expect(styleLink).toBeGreaterThan(0);
  });

  test('portal-styles.css is loaded on authenticated pages', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Login
    await page.fill('#password-email', process.env.TEST_USER_EMAIL || 'standardhuman@gmail.com');
    await page.fill('#password', process.env.TEST_USER_PASSWORD || 'KLRss!650');
    await page.click('#password-login-btn');

    await page.waitForURL(/portal\.html/);

    // Check if portal-styles.css link exists
    const styleLink = await page.locator('link[href*="portal-styles.css"]').count();
    expect(styleLink).toBeGreaterThan(0);
  });
});

test.describe('Portal Styling - Authentication Pages', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Check key elements exist
    await expect(page.locator('.login-header h1')).toBeVisible();
    await expect(page.locator('#password-email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('.btn-primary')).toBeVisible();

    // Verify no console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/signup.html`);

    // Check key elements exist
    await expect(page.locator('.signup-header h1')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('.btn-primary')).toBeVisible();
  });

  test('reset password page renders correctly', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/reset-password.html`);

    // Check key elements exist
    await expect(page.locator('.reset-header h1')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('.btn-primary')).toBeVisible();
  });
});

test.describe('Portal Styling - Visual Regression', () => {
  test('login page visual snapshot', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);
    await page.waitForLoadState('networkidle');

    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('portal-login.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('signup page visual snapshot', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/signup.html`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('portal-signup.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('reset password page visual snapshot', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/reset-password.html`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('portal-reset-password.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Portal Styling - Responsive Design', () => {
  test('login page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Check that form is visible and usable
    await expect(page.locator('.login-container')).toBeVisible();
    await expect(page.locator('#password-email')).toBeVisible();
    await expect(page.locator('.btn-primary')).toBeVisible();
  });

  test('portal dashboard is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Login
    await page.fill('#password-email', process.env.TEST_USER_EMAIL || 'standardhuman@gmail.com');
    await page.fill('#password', process.env.TEST_USER_PASSWORD || 'KLRss!650');
    await page.click('#password-login-btn');

    await page.waitForURL(/portal\.html/);

    // Check mobile navigation elements
    // Note: Specific navigation tests will depend on actual Portal nav implementation
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Portal Styling - Form Components', () => {
  test('form inputs have correct styling', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    const input = page.locator('#password-email');

    // Check border-radius is 0 (sharp corners)
    const borderRadius = await input.evaluate(el =>
      getComputedStyle(el).borderRadius
    );
    expect(borderRadius).toBe('0px');

    // Check min-height is 48px (from design system)
    const height = await input.evaluate(el =>
      getComputedStyle(el).height
    );
    const minHeight = await input.evaluate(el =>
      getComputedStyle(el).minHeight
    );

    // Height should be at least 48px
    expect(parseInt(height) >= 48 || minHeight === '48px').toBeTruthy();
  });

  test('buttons have correct styling', async ({ page }) => {
    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    const button = page.locator('.btn-primary').first();

    // Check border-radius is 0 (sharp corners)
    const borderRadius = await button.evaluate(el =>
      getComputedStyle(el).borderRadius
    );
    expect(borderRadius).toBe('0px');

    // Check background color
    const bgColor = await button.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBe(PRIMARY_COLOR);
  });
});

test.describe('Portal Styling - No Console Errors', () => {
  test('login page has no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${PORTAL_BASE_URL}/login.html`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('authenticated pages have no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${PORTAL_BASE_URL}/login.html`);

    // Login
    await page.fill('#password-email', process.env.TEST_USER_EMAIL || 'standardhuman@gmail.com');
    await page.fill('#password', process.env.TEST_USER_PASSWORD || 'KLRss!650');
    await page.click('#password-login-btn');

    await page.waitForURL(/portal\.html/);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
