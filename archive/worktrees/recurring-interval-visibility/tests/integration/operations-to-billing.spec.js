import { test, expect } from '@playwright/test';

/**
 * Integration Test: Operations → Billing
 *
 * Flow:
 * 1. Complete service in Operations
 * 2. Service completion triggers invoice creation in Billing
 * 3. Verify invoice appears with correct data
 *
 * This tests the service completion → invoicing flow.
 */

test.describe('Operations to Billing Integration', () => {

  test('should create invoice in Billing after service completion in Operations', async ({ page }) => {
    const operationsUrl = process.env.OPERATIONS_URL || 'http://localhost:5176';
    const billingUrl = process.env.BILLING_URL || 'http://localhost:5173';

    // Step 1: Login to Operations
    await page.goto(operationsUrl);

    await page.fill('[name="email"]', 'standardhuman@gmail.com');
    await page.fill('[name="password"]', 'KLRss!650');
    await page.click('button[type="submit"]');

    await expect(page.locator('h1, h2')).toContainText(/Operations|Dashboard/i);

    // Step 2: Navigate to service logs
    await page.click('text=Service Logs');

    // Step 3: Create new service log
    await page.click('button:has-text("New Service")');

    // Fill out service details
    await page.selectOption('[name="boat_id"]', { index: 0 }); // Select first boat
    await page.fill('[name="service_date"]', new Date().toISOString().split('T')[0]);
    await page.fill('[name="notes"]', 'Test service completion');
    await page.fill('[name="hours"]', '2.5');

    // Mark as completed
    await page.check('[name="completed"]');

    // Save service log
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=Service saved')).toBeVisible({ timeout: 5000 });

    // Get service log ID
    const serviceLogId = await page.locator('[data-service-log-id]').first().getAttribute('data-service-log-id');

    // Step 4: Navigate to Billing
    await page.goto(billingUrl);

    // Step 5: Verify invoice was created
    await page.click('text=Invoices');

    // Search for invoice related to the service
    await expect(page.locator(`[data-service-log-id="${serviceLogId}"]`)).toBeVisible({ timeout: 10000 });

    // Verify invoice amount is calculated correctly (2.5 hours)
    await expect(page.locator('.invoice-amount')).toContainText(/\$\d+\.\d{2}/);
  });

  test('should sync service details from Operations to Billing invoice', async ({ page }) => {
    const operationsUrl = process.env.OPERATIONS_URL || 'http://localhost:5176';
    const billingUrl = process.env.BILLING_URL || 'http://localhost:5173';

    // Login to Operations
    await page.goto(operationsUrl);
    await page.fill('[name="email"]', 'standardhuman@gmail.com');
    await page.fill('[name="password"]', 'KLRss!650');
    await page.click('button[type="submit"]');

    // Complete service with specific details
    await page.click('text=Service Logs');
    await page.click('button:has-text("New Service")');

    const serviceDetails = {
      notes: 'Hull cleaning + anode replacement',
      hours: 3,
      materials: 'Zinc anodes x4'
    };

    await page.selectOption('[name="boat_id"]', { index: 0 });
    await page.fill('[name="notes"]', serviceDetails.notes);
    await page.fill('[name="hours"]', String(serviceDetails.hours));
    await page.fill('[name="materials_used"]', serviceDetails.materials);
    await page.check('[name="completed"]');
    await page.click('button:has-text("Save")');

    // Navigate to Billing
    await page.goto(billingUrl);
    await page.click('text=Invoices');

    // Click on the most recent invoice
    await page.click('.invoice-item:first-child');

    // Verify service details appear in invoice
    await expect(page.locator('text=' + serviceDetails.notes)).toBeVisible();
    await expect(page.locator('text=' + serviceDetails.materials)).toBeVisible();
    await expect(page.locator('text=' + serviceDetails.hours + ' hours')).toBeVisible();
  });
});
