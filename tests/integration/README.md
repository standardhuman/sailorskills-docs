# Sailorskills Suite - Integration Tests

**Created:** 2025-10-28
**Purpose:** Cross-service integration testing for the Sailorskills suite
**Test Framework:** Playwright

---

## Overview

These integration tests verify that data flows correctly between services in the Sailorskills suite. Unlike unit tests (which test individual components) or e2e tests (which test single-service user flows), integration tests verify **cross-service data flows**.

---

## Test Coverage

### 1. Estimator → Operations Flow
**File:** `estimator-to-operations.spec.js`

**What It Tests:**
- Customer creates quote in Estimator
- Order appears in Operations pending queue
- Customer and boat data sync correctly
- Service order status lifecycle

**Business Value:** Ensures customer orders reach the field team

---

### 2. Billing → Portal Flow
**File:** `billing-to-portal.spec.js`

**What It Tests:**
- Invoice created in Billing service
- Invoice appears in customer Portal
- RLS policies enforce data isolation (customer A cannot see customer B's invoices)
- Payment status updates flow through correctly

**Business Value:** Ensures customers can view their invoices

---

### 3. Operations → Dashboard Flow
**File:** `operations-to-dashboard.spec.js`

**What It Tests:**
- Service log created in Operations
- Metrics update in Dashboard
- Revenue calculations accurate
- Service completion rates tracked

**Business Value:** Ensures accurate business analytics

---

### 4. Inventory → Operations Integration
**File:** `inventory-to-operations.spec.js`

**What It Tests:**
- Anode catalog synced from boatzincs.com
- Packing lists show correct stock levels
- Stock depletion after service completion
- Low stock alerts trigger correctly

**Business Value:** Ensures field team has necessary parts

---

## Running Tests

### Run All Integration Tests
```bash
# From repo root
npx playwright test tests/integration

# With UI mode (interactive)
npx playwright test tests/integration --ui

# With headed browser (see what's happening)
npx playwright test tests/integration --headed
```

### Run Specific Test Suite
```bash
npx playwright test tests/integration/estimator-to-operations.spec.js
npx playwright test tests/integration/billing-to-portal.spec.js
npx playwright test tests/integration/operations-to-dashboard.spec.js
npx playwright test tests/integration/inventory-to-operations.spec.js
```

### Run in CI Mode
```bash
CI=true npx playwright test tests/integration
```

---

## Test Structure

Each integration test follows this pattern:

```javascript
import { test, expect } from '@playwright/test';
import { cleanupTestData, createTestData } from './test-helpers.js';

test.describe('Service A → Service B Integration', () => {
  let testData;

  test.beforeAll(async () => {
    // Set up test data in database
    testData = await createTestData();
  });

  test.afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testData);
  });

  test('should flow data from Service A to Service B', async ({ page }) => {
    // 1. Create data in Service A
    await page.goto('https://service-a.com');
    // ... perform actions

    // 2. Verify data appears in Service B
    await page.goto('https://service-b.com');
    // ... verify expectations
  });
});
```

---

## Test Helpers

**File:** `test-helpers.js`

Provides utilities for:
- **Database setup/cleanup:** Create and remove test data
- **Authentication:** Login as admin or customer
- **Wait utilities:** Wait for data to sync between services
- **Verification:** Check database state directly

**Example Usage:**
```javascript
import { loginAsAdmin, loginAsCustomer, waitForSync, verifyInDatabase } from './test-helpers.js';

// Login as admin
await loginAsAdmin(page);

// Wait for data to sync between services
await waitForSync(() => {
  return verifyInDatabase('service_orders', { order_number: 'TEST-001' });
}, 30000); // 30 second timeout
```

---

## Database Access in Tests

Integration tests can query the database directly to verify data:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Verify order was created
const { data: orders } = await supabase
  .from('service_orders')
  .select('*')
  .eq('order_number', 'TEST-001');

expect(orders).toHaveLength(1);
```

---

## Test Data Management

### Strategy 1: Isolated Test Data
Create unique test data for each test run using timestamps or UUIDs:

```javascript
const timestamp = Date.now();
const testCustomer = {
  email: `test-customer-${timestamp}@example.com`,
  name: `Test Customer ${timestamp}`,
};
```

### Strategy 2: Cleanup After Tests
Always clean up test data in `afterAll` hooks:

```javascript
test.afterAll(async () => {
  // Delete test customer and cascading data
  await supabase
    .from('customers')
    .delete()
    .eq('email', testCustomer.email);
});
```

### Strategy 3: Test Database (Future)
Consider setting up a separate test database for integration tests to avoid polluting production data.

---

## Assertions

### UI Assertions
```javascript
// Element visible
await expect(page.locator('#order-123')).toBeVisible();

// Text content
await expect(page.locator('h1')).toContainText('Pending Orders');

// Count
await expect(page.locator('.order-card')).toHaveCount(5);
```

### Database Assertions
```javascript
// Record exists
const { data } = await supabase
  .from('service_orders')
  .select('*')
  .eq('id', orderId)
  .single();

expect(data).toBeTruthy();
expect(data.status).toBe('pending');
```

### Cross-Service Assertions
```javascript
// Verify data flows through services
const estimatorOrder = await getOrderFromEstimator(orderId);
const operationsOrder = await getOrderFromOperations(orderId);

expect(estimatorOrder.customer_id).toBe(operationsOrder.customer_id);
expect(estimatorOrder.boat_id).toBe(operationsOrder.boat_id);
```

---

## Debugging Failed Tests

### View Test Report
```bash
npx playwright show-report
```

### Run with Debug Mode
```bash
npx playwright test tests/integration --debug
```

### Check Screenshots/Videos
Failed tests automatically capture:
- Screenshots: `test-results/[test-name]/test-failed-1.png`
- Videos: `test-results/[test-name]/video.webm`
- Traces: `test-results/[test-name]/trace.zip`

### View Trace
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

---

## CI/CD Integration

Integration tests run automatically on:
- Pull requests to `main` branch
- Pushes to `main` branch
- Nightly scheduled runs (to catch regressions)

**GitHub Actions Workflow:** `.github/workflows/integration-tests.yml`

---

## Flaky Test Prevention

### Use Explicit Waits
```javascript
// ❌ Bad: Arbitrary timeout
await page.waitForTimeout(5000);

// ✅ Good: Wait for specific condition
await page.waitForSelector('#order-123');
await page.waitForLoadState('networkidle');
```

### Handle Async Operations
```javascript
// Wait for database sync with retry logic
await waitForSync(async () => {
  const { data } = await supabase
    .from('service_orders')
    .select('id')
    .eq('order_number', orderNumber);
  return data && data.length > 0;
}, 30000); // 30 second timeout
```

### Isolate Test Data
- Use unique identifiers per test run
- Clean up data after tests
- Avoid dependencies on existing production data

---

## Performance Considerations

Integration tests are slower than unit tests because they:
- Navigate real web pages
- Wait for network requests
- Interact with actual database
- Test multiple services

**Typical Times:**
- Unit test: 10-100ms
- E2E test: 1-5 seconds
- Integration test: 5-30 seconds

**Optimization Tips:**
- Run tests in parallel where possible (but watch for race conditions in shared database)
- Cache authentication sessions
- Minimize page navigations
- Use direct database queries instead of UI interactions where appropriate

---

## Maintenance

### When to Update Tests

**Add new tests when:**
- New service is added
- New cross-service feature is launched
- Critical user journey changes

**Update existing tests when:**
- Service URLs change
- Database schema changes
- Authentication flow changes
- Critical selectors change

**Review schedule:** Quarterly, or after major releases

---

## Troubleshooting

### Test Fails Locally But Passes in CI
- Check environment variables (are they set correctly?)
- Check for timing issues (local machine may be faster/slower)
- Check for database state differences

### Test Passes Locally But Fails in CI
- Check CI environment variables
- Check network restrictions in CI
- Review CI logs for clues

### Intermittent Failures
- Likely a timing/race condition
- Add explicit waits for specific conditions
- Check for async operations that haven't completed

---

## Related Documentation

- **[Service Relationship Diagram](../../docs/architecture/service-relationship-diagram.md)** - Understand data flow
- **[Database Schema ERD](../../docs/architecture/database-schema-erd.md)** - Database structure
- **[Table Ownership Matrix](../../TABLE_OWNERSHIP_MATRIX.md)** - Table owners and coordination
- **[PROJECT_STABILIZATION_PLAN.md](../../PROJECT_STABILIZATION_PLAN.md)** - Overall plan

---

## Future Improvements

- [ ] Add visual regression testing (screenshot comparison)
- [ ] Add performance benchmarks (measure response times)
- [ ] Add load testing (simulate multiple users)
- [ ] Set up dedicated test database
- [ ] Add test data seeding scripts
- [ ] Add integration with Playwright Test for VS Code

---

**Document Version:** 1.0
**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Next Review:** After integration tests are fully implemented
