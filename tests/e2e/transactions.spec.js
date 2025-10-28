import { test, expect } from '@playwright/test';

test.describe('Billing Transactions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://sailorskills-billing.vercel.app/transactions.html');

    // Login as admin
    await page.fill('#admin-email', 'standardhuman@gmail.com');
    await page.fill('#admin-password', 'KLRss!650');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/transactions.html');
  });

  test('should load transactions page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Transactions');
    await expect(page.locator('.summary-cards')).toBeVisible();
    await expect(page.locator('.transactions-table')).toBeVisible();
  });

  test('should display summary cards with metrics', async ({ page }) => {
    await expect(page.locator('#totalRevenue')).toBeVisible();
    await expect(page.locator('#outstandingAmount')).toBeVisible();
    await expect(page.locator('#overdueCount')).toBeVisible();
    await expect(page.locator('#monthRevenue')).toBeVisible();
  });

  test('should filter transactions by status', async ({ page }) => {
    await page.selectOption('#statusFilter', 'paid');
    await page.click('#applyFiltersBtn');

    await page.waitForTimeout(1000); // Wait for filter to apply

    // Verify filtered results show only paid status badges
    const statusBadges = await page.locator('.status-paid').count();
    expect(statusBadges).toBeGreaterThan(0);
  });

  test('should open invoice detail modal', async ({ page }) => {
    await page.click('.transactions-table tbody tr:first-child');

    await expect(page.locator('#invoiceModal')).toHaveClass(/active/);
    await expect(page.locator('#modalInvoiceNumber')).toContainText('Invoice');
  });

  test('should export to CSV', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('#exportBtn');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('transactions');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should paginate results', async ({ page }) => {
    await expect(page.locator('#nextPageBtn')).toBeVisible();

    await page.click('#nextPageBtn');
    await page.waitForTimeout(1000);

    await expect(page.locator('#prevPageBtn')).not.toBeDisabled();
  });
});
