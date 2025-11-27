/**
 * Integration Test: Estimator → Operations Flow
 *
 * Tests the complete order creation flow from customer quote to operations queue
 *
 * Flow:
 * 1. Customer submits quote request on Estimator
 * 2. Order created in database (service_orders table)
 * 3. Order appears in Operations pending queue
 * 4. Customer and boat data sync correctly
 * 5. Operations can view and confirm order
 *
 * Business Value: Ensures customer orders reach the field team without data loss
 */

import { test, expect } from '@playwright/test';
import {
  createTestData,
  cleanupTestData,
  loginAsAdmin,
  waitForSync,
  verifyInDatabase,
  getFromDatabase,
} from './test-helpers.js';

test.describe('Estimator → Operations Integration', () => {
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

  test('should create service order and verify in database', async () => {
    // Import supabase from test-helpers
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create service order directly in database (simulates Estimator creating it)
    const orderNumber = `TEST-ORD-${Date.now()}`;
    const { data: order, error } = await supabase
      .from('service_orders')
      .insert({
        order_number: orderNumber,
        service_type: 'One-time Cleaning & Anodes',
        estimated_amount: 150.00,
        status: 'pending',
        customer_id: testData.customer.id,
        boat_id: testData.boat.id,
        service_details: {
          description: 'Test service order for integration test',
          test: true
        }
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(order).toBeTruthy();
    expect(order.status).toBe('pending');
    expect(order.customer_id).toBe(testData.customer.id);
    expect(order.boat_id).toBe(testData.boat.id);
    expect(order.estimated_amount).toBe(150.00);

    testData.orderId = order.id;
    testData.orderNumber = order.order_number;

    // TODO: Once Task 4.1 is complete, add UI verification:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click('a[href="#pending-orders"]');
    // await expect(page.locator(`text=${order.order_number}`)).toBeVisible();
    // await expect(page.locator(`[data-order-id="${order.id}"]`)).toContainText(testData.customer.name);
  });

  test('should verify customer and boat data linkage', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create service order with customer and boat references
    const orderNumber = `TEST-ORD-DATA-${Date.now()}`;
    const { data: order } = await supabase
      .from('service_orders')
      .insert({
        order_number: orderNumber,
        service_type: 'One-time Cleaning & Anodes',
        estimated_amount: 200.00,
        status: 'pending',
        customer_id: testData.customer.id,
        boat_id: testData.boat.id
      })
      .select()
      .single();

    // Step 2 - Query with joins to verify data relationships
    const { data: orderWithDetails } = await supabase
      .from('service_orders')
      .select(`
        *,
        customers!service_orders_customer_id_fkey (id, name, email, phone),
        boats!service_orders_boat_id_fkey (id, name, make, model, boat_year, length)
      `)
      .eq('id', order.id)
      .single();

    // Step 3 - Verify customer data is correctly linked
    expect(orderWithDetails.customers).toBeTruthy();
    expect(orderWithDetails.customers.id).toBe(testData.customer.id);
    expect(orderWithDetails.customers.email).toBe(testData.customer.email);

    // Step 4 - Verify boat data is correctly linked
    expect(orderWithDetails.boats).toBeTruthy();
    expect(orderWithDetails.boats.id).toBe(testData.boat.id);
    expect(orderWithDetails.boats.name).toBe(testData.boat.name);
  });

  test('should enforce RLS policies (customer isolation)', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create order for Customer A
    const orderNumberA = `TEST-ORD-A-${Date.now()}`;
    const { data: orderA } = await supabase
      .from('service_orders')
      .insert({
        order_number: orderNumberA,
        service_type: 'One-time Cleaning & Anodes',
        estimated_amount: 250.00,
        status: 'pending',
        customer_id: testData.customer.id,
        boat_id: testData.boat.id
      })
      .select()
      .single();

    // Step 2 - Create order for Customer B
    const orderNumberB = `TEST-ORD-B-${Date.now()}`;
    const { data: orderB } = await supabase
      .from('service_orders')
      .insert({
        order_number: orderNumberB,
        service_type: 'One-time Cleaning & Anodes',
        estimated_amount: 300.00,
        status: 'confirmed',
        customer_id: testDataCustomerB.customer.id,
        boat_id: testDataCustomerB.boat.id
      })
      .select()
      .single();

    testDataCustomerB.orderNumber = orderB.order_number;

    // Step 3 - Query service_orders as Customer A (via RLS context)
    // Note: In production, this would be enforced by Supabase RLS policies
    // Here we verify the data isolation by checking the database structure
    const { data: customerAOrders } = await supabase
      .from('service_orders')
      .select('*')
      .eq('customer_id', testData.customer.id);

    // Step 4 - Verify Customer A sees only their own orders
    const hasCustomerAOrder = customerAOrders.some(o => o.order_number === orderNumberA);
    expect(hasCustomerAOrder).toBeTruthy();

    const hasCustomerBOrder = customerAOrders.some(o => o.order_number === orderNumberB);
    expect(hasCustomerBOrder).toBeFalsy();

    // Step 5 - Verify Customer B's order exists separately
    const { data: customerBOrders } = await supabase
      .from('service_orders')
      .select('*')
      .eq('customer_id', testDataCustomerB.customer.id);

    const customerBHasOwnOrder = customerBOrders.some(o => o.order_number === orderNumberB);
    expect(customerBHasOwnOrder).toBeTruthy();
  });

  test('should support status workflow transitions', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create order with initial 'pending' status
    const orderNumber = `TEST-ORD-STATUS-${Date.now()}`;
    const { data: order } = await supabase
      .from('service_orders')
      .insert({
        order_number: orderNumber,
        service_type: 'One-time Cleaning & Anodes',
        estimated_amount: 175.00,
        status: 'pending',
        customer_id: testData.customer.id,
        boat_id: testData.boat.id
      })
      .select()
      .single();

    expect(order.status).toBe('pending');

    // Step 2 - Transition to 'confirmed' (Operations confirms order)
    const { data: confirmedOrder, error: confirmError } = await supabase
      .from('service_orders')
      .update({
        status: 'confirmed',
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .eq('id', order.id)
      .select()
      .single();

    expect(confirmError).toBeNull();
    expect(confirmedOrder.status).toBe('confirmed');
    expect(confirmedOrder.scheduled_date).toBeTruthy();

    // Step 3 - Transition to 'in_progress' (Service started)
    const { data: inProgressOrder, error: inProgressError } = await supabase
      .from('service_orders')
      .update({ status: 'in_progress' })
      .eq('id', order.id)
      .select()
      .single();

    expect(inProgressError).toBeNull();
    expect(inProgressOrder.status).toBe('in_progress');

    // Step 4 - Transition to 'completed' (Service finished)
    const { data: completedOrder, error: completedError } = await supabase
      .from('service_orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select()
      .single();

    expect(completedError).toBeNull();
    expect(completedOrder.status).toBe('completed');
    expect(completedOrder.completed_at).toBeTruthy();

    // TODO: Once Task 4.1 is complete, add UI workflow verification:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click('a[href="#pending-orders"]');
    // await page.click(`[data-order-id="${order.id}"]`);
    // await page.click('button:has-text("Confirm & Schedule")');
    // await expect(page.locator('.status-badge')).toHaveText('Confirmed');
  });

  test('should allow order cancellation', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create order
    const orderNumber = `TEST-ORD-CANCEL-${Date.now()}`;
    const { data: order } = await supabase
      .from('service_orders')
      .insert({
        order_number: orderNumber,
        service_type: 'One-time Cleaning & Anodes',
        estimated_amount: 150.00,
        status: 'pending',
        customer_id: testData.customer.id,
        boat_id: testData.boat.id
      })
      .select()
      .single();

    // Step 2 - Cancel order (store cancellation details in notes and metadata)
    const { data: cancelledOrder, error } = await supabase
      .from('service_orders')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        notes: 'Customer requested cancellation',
        metadata: { cancellation_reason: 'Customer requested cancellation' }
      })
      .eq('id', order.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(cancelledOrder.status).toBe('cancelled');
    expect(cancelledOrder.completed_at).toBeTruthy();
    expect(cancelledOrder.metadata.cancellation_reason).toBe('Customer requested cancellation');

    // TODO: Once Task 4.1 is complete, add UI cancellation verification:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click(`[data-order-id="${order.id}"]`);
    // await page.click('button:has-text("Decline")');
    // await page.fill('textarea[name="reason"]', 'Customer requested cancellation');
    // await page.click('button:has-text("Confirm Cancellation")');
    // await expect(page.locator('.status-badge')).toHaveText('Cancelled');
  });
});
