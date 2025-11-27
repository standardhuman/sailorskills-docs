import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestServiceLog, cleanupTestData } from '../helpers/test-data.js';
import { queryDatabase } from '../helpers/db-utils.js';

/**
 * Cross-Service Integration Test Template
 *
 * Tests complete data flows across multiple services
 * Validates database consistency and UI updates
 */

test.describe('Cross-Service Integration Tests', () => {
  let testCustomerId;
  let testServiceLogId;

  test.beforeEach(async () => {
    // Create test data before each test
    testCustomerId = await createTestCustomer({
      email: `test-${Date.now()}@example.test`,
      name: 'Integration Test Customer'
    });
  });

  test.afterEach(async () => {
    // Clean up test data after each test
    if (testCustomerId) {
      await cleanupTestData(testCustomerId);
    }
  });

  test('data flows from Service A to Service B', async ({ page }) => {
    // 1. Create data in Service A (via database helper)
    testServiceLogId = await createTestServiceLog({
      customer_id: testCustomerId,
      service_type: 'Example Service',
      status: 'in_progress'
    });

    // 2. Navigate to Service A and complete the workflow
    await page.goto(`https://service-a.example.com/services/${testServiceLogId}`);
    await page.fill('[data-testid="field-1"]', 'value1');
    await page.fill('[data-testid="field-2"]', 'value2');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // 3. Verify data created in database
    const records = await queryDatabase(
      'SELECT * FROM table_b WHERE customer_id = $1 AND service_log_id = $2',
      [testCustomerId, testServiceLogId]
    );
    expect(records).toHaveLength(1);
    expect(records[0].field_1).toBe('value1');
    expect(records[0].field_2).toBe('value2');

    // 4. Verify data appears in Service B UI
    await page.goto('https://service-b.example.com/records');
    await expect(page.locator(`[data-testid="record-${records[0].id}"]`)).toBeVisible();

    // 5. Verify customer sees data in Customer Portal
    await page.goto('https://portal.example.com/records');
    await expect(page.locator(`[data-testid="record-${records[0].id}"]`)).toBeVisible();
  });

  test('data consistency across services', async ({ page }) => {
    // Create test data
    const testData = await createTestServiceLog({
      customer_id: testCustomerId,
      service_type: 'Consistency Test',
      amount: 150.00
    });

    // Verify same data displays identically across services
    await page.goto(`https://service-a.example.com/records/${testData.id}`);
    const serviceAAmount = await page.locator('[data-testid="amount"]').textContent();

    await page.goto(`https://service-b.example.com/records/${testData.id}`);
    const serviceBAmount = await page.locator('[data-testid="amount"]').textContent();

    expect(serviceAAmount).toBe(serviceBAmount);
    expect(serviceAAmount).toContain('150.00');
  });

  test('RLS policies isolate customer data', async ({ page }) => {
    // Create two test customers
    const customer1 = await createTestCustomer({ email: 'customer1@test.com' });
    const customer2 = await createTestCustomer({ email: 'customer2@test.com' });

    // Create data for customer 1
    const customer1Data = await createTestServiceLog({
      customer_id: customer1,
      service_type: 'Customer 1 Service'
    });

    // Authenticate as customer 2 and verify they cannot see customer 1's data
    await page.goto('https://portal.example.com/login');
    await page.fill('[data-testid="email"]', 'customer2@test.com');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login-button"]');

    // Navigate to records page
    await page.goto('https://portal.example.com/records');

    // Verify customer 1's data is NOT visible
    await expect(page.locator(`[data-testid="record-${customer1Data.id}"]`)).not.toBeVisible();

    // Clean up both customers
    await cleanupTestData(customer1);
    await cleanupTestData(customer2);
  });
});

/**
 * Usage Notes:
 *
 * 1. Integration tests validate complete workflows across services
 * 2. Always use test data helpers with cleanup
 * 3. Test both database consistency and UI updates
 * 4. Include RLS policy validation for multi-tenant systems
 * 5. Run integration tests when shared packages or database changes
 */
