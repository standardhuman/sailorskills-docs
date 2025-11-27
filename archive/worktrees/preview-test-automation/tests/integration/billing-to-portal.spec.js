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
    // Import supabase from test-helpers
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create invoice directly in database (simulates Billing service creating it)
    const invoiceNumber = `TEST-INV-${Date.now()}`;
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: testData.customer.id,
        boat_id: testData.boat.id,
        amount: 150.00,
        status: 'pending',
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        service_details: {
          description: 'Test service for integration test',
          test: true
        }
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(invoice).toBeTruthy();

    testData.invoiceId = invoice.id;
    testData.invoiceNumber = invoice.invoice_number;

    // Step 2 - Navigate to Portal
    await page.goto('https://sailorskills-portal.vercel.app');
    await page.waitForLoadState('networkidle');

    // Step 3 - Login as customer
    await page.fill('input[name="email"]', testData.customer.email);
    await page.fill('input[name="password"]', 'KLRss!650');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Step 4 - Navigate to invoices page
    await page.click('a:has-text("Invoices")');
    await page.waitForLoadState('networkidle');

    // Step 5 - Wait for invoice to appear (may take a moment for RLS to apply)
    await page.waitForTimeout(2000);

    // Step 6 - Verify invoice appears in the list
    const invoiceVisible = await page.locator(`text=${invoiceNumber}`).isVisible();
    expect(invoiceVisible).toBeTruthy();

    // Step 7 - Verify invoice amount is displayed
    const amountVisible = await page.locator('text=/\\$150\\.00/').isVisible();
    expect(amountVisible).toBeTruthy();
  });

  test('should enforce RLS policies (customer isolation)', async ({ page, context }) => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create invoice for Customer A
    const invoiceNumberA = `TEST-INV-A-${Date.now()}`;
    const { data: invoiceA } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumberA,
        customer_id: testData.customer.id,
        boat_id: testData.boat.id,
        amount: 200.00,
        status: 'pending',
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    // Step 2 - Create invoice for Customer B
    const invoiceNumberB = `TEST-INV-B-${Date.now()}`;
    const { data: invoiceB } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumberB,
        customer_id: testDataCustomerB.customer.id,
        boat_id: testDataCustomerB.boat.id,
        amount: 300.00,
        status: 'paid',
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    testDataCustomerB.invoiceNumber = invoiceB.invoice_number;

    // Step 3 - Login as Customer A
    await page.goto('https://sailorskills-portal.vercel.app');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testData.customer.email);
    await page.fill('input[name="password"]', 'KLRss!650');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Step 4 - Navigate to invoices
    await page.click('a:has-text("Invoices")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 5 - Verify Customer A sees their own invoice
    const customerAInvoiceVisible = await page.locator(`text=${invoiceNumberA}`).isVisible();
    expect(customerAInvoiceVisible).toBeTruthy();

    // Step 6 - Verify Customer A CANNOT see Customer B's invoice
    const customerBInvoiceVisible = await page.locator(`text=${invoiceNumberB}`).isVisible();
    expect(customerBInvoiceVisible).toBeFalsy();

    // Step 7 - Verify by checking the page content doesn't contain Customer B's invoice number
    const pageContent = await page.content();
    expect(pageContent).not.toContain(invoiceNumberB);
  });

  test('should update invoice status from Billing to Portal', async ({ page }) => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create invoice with status 'pending'
    const invoiceNumber = `TEST-INV-STATUS-${Date.now()}`;
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: testData.customer.id,
        boat_id: testData.boat.id,
        amount: 175.00,
        status: 'pending',
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    // Step 2 - Login to Portal and verify status shows 'pending'
    await page.goto('https://sailorskills-portal.vercel.app');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testData.customer.email);
    await page.fill('input[name="password"]', 'KLRss!650');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.click('a:has-text("Invoices")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify PENDING status is visible
    const pendingStatusVisible = await page.locator('text=/PENDING/i').isVisible();
    expect(pendingStatusVisible).toBeTruthy();

    // Step 3 - Update status to 'paid' in database (simulates Billing service updating it)
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', invoice.id);

    expect(updateError).toBeNull();

    // Step 4 - Refresh page and verify status updates to 'paid'
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const paidStatusVisible = await page.locator('text=/PAID/i').isVisible();
    expect(paidStatusVisible).toBeTruthy();
  });

  test('should show payment status and history', async ({ page }) => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create invoice with payment
    const invoiceNumber = `TEST-INV-PAYMENT-${Date.now()}`;
    const paidDate = new Date().toISOString();
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: testData.customer.id,
        boat_id: testData.boat.id,
        amount: 225.00,
        status: 'paid',
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paid_at: paidDate,
        payment_method: 'stripe',
        payment_reference: 'ch_test_123456'
      })
      .select()
      .single();

    // Step 2 - Login to Portal as customer
    await page.goto('https://sailorskills-portal.vercel.app');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testData.customer.email);
    await page.fill('input[name="password"]', 'KLRss!650');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.click('a:has-text("Invoices")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 3 - Verify payment details visible
    // Verify PAID status
    const paidStatusVisible = await page.locator('text=/PAID/i').isVisible();
    expect(paidStatusVisible).toBeTruthy();

    // Verify invoice number appears
    const invoiceNumberVisible = await page.locator(`text=${invoiceNumber}`).isVisible();
    expect(invoiceNumberVisible).toBeTruthy();

    // Verify amount is displayed
    const amountVisible = await page.locator('text=/\\$225\\.00/').isVisible();
    expect(amountVisible).toBeTruthy();
  });

  test('should link invoice to service log', async ({ page }) => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create a service log
    const { data: serviceLog } = await supabase
      .from('service_logs')
      .insert({
        customer_id: testData.customer.id,
        boat_id: testData.boat.id,
        service_date: new Date().toISOString(),
        service_type: 'inspection',
        notes: 'Test service log for integration test'
      })
      .select()
      .single();

    // Step 2 - Create invoice linked to service log (bi-directional)
    const invoiceNumber = `TEST-INV-LINKED-${Date.now()}`;
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: testData.customer.id,
        boat_id: testData.boat.id,
        service_id: serviceLog.id, // Link invoice → service_log
        amount: 185.00,
        status: 'pending',
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    // Step 3 - Update service log with invoice_id (complete bi-directional link)
    const { error: updateError } = await supabase
      .from('service_logs')
      .update({ invoice_id: invoice.id })
      .eq('id', serviceLog.id);

    expect(updateError).toBeNull();

    // Step 4 - Verify bi-directional linkage in database
    const { data: verifyInvoice } = await supabase
      .from('invoices')
      .select('*, service_logs(id, service_date)')
      .eq('id', invoice.id)
      .single();

    expect(verifyInvoice.service_id).toBe(serviceLog.id);
    expect(verifyInvoice.service_logs).toBeTruthy();

    const { data: verifyServiceLog } = await supabase
      .from('service_logs')
      .select('*, invoices(id, invoice_number)')
      .eq('id', serviceLog.id)
      .single();

    expect(verifyServiceLog.invoice_id).toBe(invoice.id);
    expect(verifyServiceLog.invoices).toBeTruthy();
  });
});
