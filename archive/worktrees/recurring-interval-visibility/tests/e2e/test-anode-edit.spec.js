import { test, expect } from '@playwright/test';

test.describe('Anode Replacement Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to operations and login
    await page.goto('https://ops.sailorskills.com');

    // Login
    await page.fill('input[type="email"]', 'standardhuman@gmail.com');
    await page.fill('input[type="password"]', 'KLRss!650');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
  });

  test('should display anode replacements in service history modal', async ({ page }) => {
    // Navigate to boats page
    await page.click('a[href*="boats"]');
    await page.waitForLoadState('networkidle');

    // Search for "About Time" boat
    await page.fill('input[placeholder*="Search"]', 'About Time');
    await page.waitForTimeout(1000);

    // Click on the boat to open detail panel
    await page.click('text=About Time');
    await page.waitForTimeout(1000);

    // Click "Service History" button
    await page.click('button:has-text("Service History")');
    await page.waitForTimeout(1000);

    // Verify the modal shows anode conditions section
    await expect(page.locator('text=⚓ Anode Conditions:')).toBeVisible();

    // Verify we see replaced status
    await expect(page.locator('text=Status: Replaced')).toBeVisible();

    // Verify we see anode names
    await expect(page.locator('text=R-2 Rudder/Trim Tab Zinc Anode')).toBeVisible();
  });

  test('should allow editing anode replacement status', async ({ page }) => {
    // Navigate to boats page
    await page.click('a[href*="boats"]');
    await page.waitForLoadState('networkidle');

    // Search for "About Time" boat
    await page.fill('input[placeholder*="Search"]', 'About Time');
    await page.waitForTimeout(1000);

    // Click on the boat
    await page.click('text=About Time');
    await page.waitForTimeout(1000);

    // Click "Service History" button
    await page.click('button:has-text("Service History")');
    await page.waitForTimeout(1000);

    // Click the edit button on the latest service log (pencil icon)
    await page.click('button.edit-service-log-modal-btn');
    await page.waitForTimeout(1000);

    // Verify the edit form has the "Anodes Installed/Replaced" section
    await expect(page.locator('h4:has-text("Anodes Installed/Replaced")')).toBeVisible();

    // Verify we see the existing anode replacements
    const anodeReplacementFields = page.locator('.anode-replacement-field');
    await expect(anodeReplacementFields).toHaveCount(3); // Should have 3 anodes from About Time

    // Check that the first anode has "replaced" status
    const firstAnodeStatus = page.locator('#anode-replacement-0-status');
    await expect(firstAnodeStatus).toHaveValue('replaced');

    // Change the first anode status from "replaced" to "inspected"
    await firstAnodeStatus.selectOption('inspected');

    // Change the quantity
    const firstAnodeQty = page.locator('#anode-replacement-0-quantity');
    await firstAnodeQty.fill('2');

    // Submit the form
    await page.click('button:has-text("Update Service Log")');
    await page.waitForTimeout(2000);

    // Verify success message
    await expect(page.locator('text=Service log updated successfully')).toBeVisible();

    // Reopen the service history to verify changes were saved
    await page.click('button:has-text("Service History")');
    await page.waitForTimeout(1000);

    // Click edit again
    await page.click('button.edit-service-log-modal-btn');
    await page.waitForTimeout(1000);

    // Verify the changes persisted
    await expect(firstAnodeStatus).toHaveValue('inspected');
    await expect(firstAnodeQty).toHaveValue('2');
  });

  test('should allow adding new anode replacements', async ({ page }) => {
    // Navigate to boats page
    await page.click('a[href*="boats"]');
    await page.waitForLoadState('networkidle');

    // Search for "About Time" boat
    await page.fill('input[placeholder*="Search"]', 'About Time');
    await page.waitForTimeout(1000);

    // Click on the boat
    await page.click('text=About Time');
    await page.waitForTimeout(1000);

    // Click "Service History" button
    await page.click('button:has-text("Service History")');
    await page.waitForTimeout(1000);

    // Click the edit button
    await page.click('button.edit-service-log-modal-btn');
    await page.waitForTimeout(1000);

    // Count initial anode replacement fields
    const initialCount = await page.locator('.anode-replacement-field').count();

    // Click "Add Anode Replacement" button
    await page.click('button:has-text("+ Add Anode Replacement")');
    await page.waitForTimeout(500);

    // Verify a new field was added
    const newCount = await page.locator('.anode-replacement-field').count();
    expect(newCount).toBe(initialCount + 1);

    // Fill in the new anode replacement
    await page.selectOption(`#anode-replacement-${initialCount}-location`, 'keel');
    await page.selectOption(`#anode-replacement-${initialCount}-position`, 'centerline');
    await page.selectOption(`#anode-replacement-${initialCount}-status`, 'replaced');
    await page.fill(`#anode-replacement-${initialCount}-quantity`, '1');
    await page.fill(`#anode-replacement-${initialCount}-name`, 'Test Keel Anode');

    // Submit the form
    await page.click('button:has-text("Update Service Log")');
    await page.waitForTimeout(2000);

    // Verify success
    await expect(page.locator('text=Service log updated successfully')).toBeVisible();
  });

  test('should allow removing anode replacements', async ({ page }) => {
    // Navigate to boats page
    await page.click('a[href*="boats"]');
    await page.waitForLoadState('networkidle');

    // Search for "About Time" boat
    await page.fill('input[placeholder*="Search"]', 'About Time');
    await page.waitForTimeout(1000);

    // Click on the boat
    await page.click('text=About Time');
    await page.waitForTimeout(1000);

    // Click "Service History" button
    await page.click('button:has-text("Service History")');
    await page.waitForTimeout(1000);

    // Click the edit button
    await page.click('button.edit-service-log-modal-btn');
    await page.waitForTimeout(1000);

    // Count initial anode replacement fields
    const initialCount = await page.locator('.anode-replacement-field').count();

    if (initialCount > 1) {
      // Click the remove button (X) on the first anode replacement
      await page.click('.anode-replacement-field:first-child button.btn-danger');
      await page.waitForTimeout(500);

      // Verify field was removed
      const newCount = await page.locator('.anode-replacement-field').count();
      expect(newCount).toBe(initialCount - 1);
    }
  });
});
