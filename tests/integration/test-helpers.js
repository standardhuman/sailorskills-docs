/**
 * Sailorskills Integration Test Helpers
 *
 * Utilities for cross-service integration testing
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client (uses environment variables)
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://fzygakldvvzxmahkdylq.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

/**
 * Authentication Helpers
 */

export async function loginAsAdmin(page) {
  // Assumes page is already on a page with login form
  await page.fill('[name="email"], #admin-email', 'standardhuman@gmail.com');
  await page.fill('[name="password"], #admin-password', 'KLRss!650');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

export async function loginAsCustomer(page, email, password) {
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for data sync between services
 *
 * @param {Function} condition - Async function that returns true when condition is met
 * @param {number} timeout - Max wait time in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<boolean>} - True if condition met, false if timeout
 */
export async function waitForSync(condition, timeout = 30000, interval = 1000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return true;
      }
    } catch (error) {
      // Condition check failed, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Database Query Helpers
 */

export async function verifyInDatabase(table, filters) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .match(filters);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data && data.length > 0;
}

export async function getFromDatabase(table, filters) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .match(filters)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found (expected)
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data;
}

export async function countInDatabase(table, filters = {}) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .match(filters);

  if (error) {
    throw new Error(`Database count failed: ${error.message}`);
  }

  return count;
}

/**
 * Test Data Management
 */

export function generateTestData(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    timestamp,
    random,
    customer: {
      email: `${prefix}-customer-${timestamp}-${random}@example.com`,
      name: `Test Customer ${timestamp}`,
      phone: '555-0123',
    },
    boat: {
      name: `Test Boat ${timestamp}`,
      make: 'Test Make',
      model: 'Test Model',
      boat_year: 2020,
      length: 35,
      hull_material: 'fiberglass',
    },
    orderNumber: `TEST-${timestamp}-${random}`,
  };
}

export async function createTestData() {
  const testData = generateTestData();

  // Create customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert(testData.customer)
    .select()
    .single();

  if (customerError) {
    throw new Error(`Failed to create test customer: ${customerError.message}`);
  }

  testData.customer.id = customer.id;

  // Create boat
  const { data: boat, error: boatError } = await supabase
    .from('boats')
    .insert({
      ...testData.boat,
      customer_id: customer.id,
    })
    .select()
    .single();

  if (boatError) {
    throw new Error(`Failed to create test boat: ${boatError.message}`);
  }

  testData.boat.id = boat.id;

  return testData;
}

export async function cleanupTestData(testData) {
  if (!testData) return;

  // Delete boat (cascades to related records)
  if (testData.boat?.id) {
    await supabase
      .from('boats')
      .delete()
      .eq('id', testData.boat.id);
  }

  // Delete customer (cascades to related records)
  if (testData.customer?.id) {
    await supabase
      .from('customers')
      .delete()
      .eq('id', testData.customer.id);
  }

  // Clean up by email as backup
  if (testData.customer?.email) {
    await supabase
      .from('customers')
      .delete()
      .eq('email', testData.customer.email);
  }
}

/**
 * Service-Specific Helpers
 */

export async function createOrderInEstimator(page, testData) {
  // TODO: Implement order creation flow
  // Navigate to Estimator, fill out quote form, submit
  throw new Error('Not implemented: createOrderInEstimator');
}

export async function verifyOrderInOperations(page, orderNumber) {
  // TODO: Implement verification
  // Navigate to Operations, check pending orders queue
  throw new Error('Not implemented: verifyOrderInOperations');
}

export async function createInvoiceInBilling(page, serviceLogId) {
  // TODO: Implement invoice creation
  // Navigate to Billing, create invoice from service log
  throw new Error('Not implemented: createInvoiceInBilling');
}

export async function verifyInvoiceInPortal(page, customerEmail, invoiceNumber) {
  // TODO: Implement verification
  // Login as customer, check invoices page
  throw new Error('Not implemented: verifyInvoiceInPortal');
}

export async function completeServiceInOperations(page, orderId) {
  // TODO: Implement service completion
  // Navigate to Operations, complete service log
  throw new Error('Not implemented: completeServiceInOperations');
}

export async function verifyMetricsInDashboard(page, expectedMetrics) {
  // TODO: Implement metrics verification
  // Navigate to Dashboard, check analytics widgets
  throw new Error('Not implemented: verifyMetricsInDashboard');
}

export async function checkStockInInventory(page, anodeId) {
  // TODO: Implement stock check
  // Navigate to Inventory, check anode stock level
  throw new Error('Not implemented: checkStockInInventory');
}

export async function verifyPackingListInOperations(page, boatId) {
  // TODO: Implement packing list verification
  // Navigate to Operations, check packing list shows correct anodes
  throw new Error('Not implemented: verifyPackingListInOperations');
}
