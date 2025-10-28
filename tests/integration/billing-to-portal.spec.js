/**
 * Integration Test: Billing → Portal Flow
 *
 * Tests invoice creation in Billing and visibility in customer Portal
 *
 * Flow:
 * 1. Admin creates invoice in Billing service
 * 2. Invoice saved to database (invoices table)
 * 3. Customer logs into Portal
 * 4. Customer can see their invoice
 * 5. RLS policies enforce data isolation (customer A cannot see customer B's invoices)
 *
 * Business Value: Ensures customers can view their billing information securely
 */

import { test, expect } from '@playwright/test';
import {
  createTestData,
  cleanupTestData,
  loginAsAdmin,
  loginAsCustomer,
  waitForSync,
  verifyInDatabase,
  getFromDatabase,
} from './test-helpers.js';

test.describe('Billing → Portal Integration', () => {
  let testData;
  let testDataCustomerB; // For RLS testing

  test.beforeAll(async () => {
    testData = await createTestData();
    testDataCustomerB = await createTestData('testB'); // Second customer for isolation testing
  });

  test.afterAll(async () => {
    await cleanupTestData(testData);
    await cleanupTestData(testDataCustomerB);
  });

  test('should create invoice in Billing and appear in Portal', async ({ page }) => {
    // TODO: Step 1 - Navigate to Billing
    await page.goto('https://sailorskills-billing.vercel.app');

    // TODO: Step 2 - Login as admin
    await loginAsAdmin(page);

    // TODO: Step 3 - Create invoice
    // - Select customer (testData.customer)
    // - Select boat (testData.boat)
    // - Add line items
    // - Set amount
    // - Save invoice

    // TODO: Step 4 - Wait for invoice to be created in database
    const invoiceCreated = await waitForSync(async () => {
      return await verifyInDatabase('invoices', {
        customer_id: testData.customer.id,
      });
    }, 30000);

    expect(invoiceCreated).toBeTruthy();

    // TODO: Step 5 - Get invoice details
    const invoice = await getFromDatabase('invoices', {
      customer_id: testData.customer.id,
    });

    expect(invoice).toBeTruthy();
    expect(invoice.boat_id).toBe(testData.boat.id);

    testData.invoiceId = invoice.id;
    testData.invoiceNumber = invoice.invoice_number;

    // TODO: Step 6 - Navigate to Portal
    await page.goto('https://portal.sailorskills.com');

    // TODO: Step 7 - Login as customer
    await loginAsCustomer(page, testData.customer.email, 'test-password');

    // TODO: Step 8 - Navigate to invoices page
    // await page.click('#invoices-link');

    // TODO: Step 9 - Verify invoice appears
    // await expect(page.locator(`[data-invoice-id="${invoice.id}"]`)).toBeVisible();
    // await expect(page.locator(`[data-invoice-id="${invoice.id}"]`)).toContainText(invoice.invoice_number);

    // PLACEHOLDER: Test is incomplete
    test.skip();
  });

  test('should enforce RLS policies (customer isolation)', async ({ page, context }) => {
    // TODO: Step 1 - Create invoice for Customer A
    // (Reuse invoice from previous test or create new one)

    // TODO: Step 2 - Create invoice for Customer B
    // Similar process but for testDataCustomerB

    // TODO: Step 3 - Login as Customer A
    await page.goto('https://portal.sailorskills.com');
    await loginAsCustomer(page, testData.customer.email, 'test-password');

    // TODO: Step 4 - Verify Customer A sees only their invoice
    // await page.goto('https://portal.sailorskills.com/invoices');
    // const customerAInvoices = await page.locator('.invoice-card').count();
    // expect(customerAInvoices).toBeGreaterThan(0);

    // TODO: Step 5 - Verify Customer A CANNOT see Customer B's invoice
    // await expect(page.locator(`[data-invoice-number="${testDataCustomerB.invoiceNumber}"]`)).not.toBeVisible();

    // TODO: Step 6 - Try direct URL access to Customer B's invoice (should be blocked)
    // await page.goto(`https://portal.sailorskills.com/invoice/${testDataCustomerB.invoiceId}`);
    // await expect(page.locator('.error-message')).toBeVisible();
    // OR should redirect to 404/403

    test.skip();
  });

  test('should update invoice status from Billing to Portal', async ({ page }) => {
    // TODO: Step 1 - Create invoice with status 'pending'
    // TODO: Step 2 - Verify status in Portal shows 'pending'
    // TODO: Step 3 - Update status to 'paid' in Billing
    // TODO: Step 4 - Verify status in Portal updates to 'paid'

    test.skip();
  });

  test('should show payment status and history', async ({ page }) => {
    // TODO: Step 1 - Create invoice with payment
    // TODO: Step 2 - Login to Portal as customer
    // TODO: Step 3 - Verify payment details visible
    // - Payment date
    // - Payment method
    // - Payment amount

    test.skip();
  });

  test('should link invoice to service log', async ({ page }) => {
    // TODO: Test bi-directional linkage (migration 015)
    // invoices.service_id → service_logs.id
    // service_logs.invoice_id → invoices.id

    test.skip();
  });
});
