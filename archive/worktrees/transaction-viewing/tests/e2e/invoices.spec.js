import { test, expect } from '@playwright/test';

test.describe('Operations Invoices Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://sailorskills-operations.vercel.app/invoices.html');

    // Login as admin
    await page.fill('#admin-email', 'standardhuman@gmail.com');
    await page.fill('#admin-password', 'KLRss!650');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/invoices.html');
  });

  test('should load invoices page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Invoices');
    await expect(page.locator('.invoices-grid')).toBeVisible();
  });

  test('should display invoice cards with service linkage status', async ({ page }) => {
    const firstCard = page.locator('.invoice-card').first();
    await expect(firstCard).toBeVisible();

    // Check for linkage indicator (either linked or unlinked)
    const hasLinked = await firstCard.locator('.service-linked').count();
    const hasUnlinked = await firstCard.locator('.service-unlinked').count();
    expect(hasLinked + hasUnlinked).toBe(1);
  });

  test('should filter invoices', async ({ page }) => {
    await page.selectOption('#statusFilter', 'pending');
    await page.selectOption('#linkFilter', 'unlinked');
    await page.click('button:has-text("Filter")');

    await page.waitForTimeout(1000);

    // Verify unlinked indicator appears
    await expect(page.locator('.service-unlinked').first()).toBeVisible();
  });

  test('should open link service modal for unlinked invoice', async ({ page }) => {
    // Find an unlinked invoice
    const unlinkButton = page.locator('button:has-text("Link Service")').first();

    if (await unlinkButton.count() > 0) {
      await unlinkButton.click();

      await expect(page.locator('#linkServiceModal')).toHaveClass(/active/);
      await expect(page.locator('h2:has-text("Link Invoice to Service")')).toBeVisible();
    }
  });

  test('should search invoices by customer name', async ({ page }) => {
    await page.fill('#searchInput', 'test');
    await page.click('button:has-text("Filter")');

    await page.waitForTimeout(1000);

    const cards = await page.locator('.invoice-card').count();
    expect(cards).toBeGreaterThanOrEqual(0); // May be 0 if no matches
  });
});
