# Playwright Test Patterns Reference

Comprehensive guide to visual regression, integration, and smoke testing patterns.

## Visual Regression Testing

### Screenshot Strategy Matrix

| Category | What to Capture | Example | Frequency |
|----------|----------------|---------|-----------|
| **Key Pages** | Full page screenshots | Orders queue, billing dashboard, customer portal | Every major page |
| **Components** | Individual component screenshots | Modals, cards, forms, navigation | Reusable components |
| **States** | Different data states | Empty, loading, error, full, filtered | Each important state |
| **Responsive** | Multiple viewports | Desktop (1920x1080), Tablet (768x1024), Mobile (375x667) | All public-facing pages |
| **Interactions** | Before/after interactions | Modal open, dropdown expanded, tooltip visible | Interactive elements |

### Visual Test Best Practices

```javascript
// ✅ GOOD: Wait for stability before screenshot
test('page displays correctly', async ({ page }) => {
  await page.goto('/orders');
  await page.waitForSelector('[data-testid="orders-table"]');
  await page.waitForLoadState('networkidle'); // Wait for all network requests

  await expect(page).toHaveScreenshot('orders-full.png', {
    fullPage: true,
    maxDiffPixels: 100  // Tolerance for anti-aliasing
  });
});

// ❌ BAD: Screenshot too early, content still loading
test('page displays correctly', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveScreenshot('orders-full.png');  // Might be loading still
});
```

### Handling Dynamic Content

```javascript
// Mask dynamic content that changes each test run
test('dashboard with masked timestamps', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [
      page.locator('[data-testid="timestamp"]'),  // Mask timestamps
      page.locator('[data-testid="random-id"]')   // Mask random IDs
    ],
    maxDiffPixels: 100
  });
});
```

### Baseline Management Commands

```bash
# Generate all baselines (first time)
npx playwright test --update-snapshots

# Update specific test baselines
npx playwright test orders-queue --update-snapshots

# Review visual diffs
open tests/__screenshots__/__diff_output__/

# Run only visual tests
npx playwright test --grep @visual
```

## Cross-Service Integration Testing

### Integration Test Structure

```javascript
test.describe('Service A to Service B Flow', () => {
  let testCustomerId;
  let testRecordId;

  test.beforeEach(async () => {
    // Create fresh test data
    testCustomerId = await createTestCustomer({
      email: `test-${Date.now()}@example.test`
    });
  });

  test.afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testCustomerId);
  });

  test('complete workflow', async ({ page }) => {
    // 1. Create data in Service A
    // 2. Verify appears in database
    // 3. Verify appears in Service B UI
    // 4. Verify customer sees it in Portal
  });
});
```

### Database Validation Pattern

```javascript
// Verify database state after UI interaction
test('service completion creates invoice', async ({ page }) => {
  // Perform action in UI
  await page.goto(`/services/${serviceId}`);
  await page.click('[data-testid="complete-service"]');
  await expect(page.locator('[data-testid="success"]')).toBeVisible();

  // Verify database updated
  const invoices = await queryDatabase(
    'SELECT * FROM invoices WHERE customer_id = $1',
    [testCustomerId]
  );

  expect(invoices).toHaveLength(1);
  expect(invoices[0].amount).toBe(150);
  expect(invoices[0].status).toBe('pending');
});
```

### RLS Policy Validation Pattern

```javascript
test('customers cannot see other customers data', async ({ page }) => {
  // Create two customers
  const customer1 = await createTestCustomer({ email: 'c1@test.com' });
  const customer2 = await createTestCustomer({ email: 'c2@test.com' });

  // Create data for customer 1
  const invoice = await createTestInvoice({ customer_id: customer1 });

  // Login as customer 2
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'c2@test.com');
  await page.fill('[data-testid="password"]', 'test-password');
  await page.click('[data-testid="login"]');

  // Navigate to invoices page
  await page.goto('/invoices');

  // Verify customer 1's invoice is NOT visible
  await expect(page.locator(`[data-testid="invoice-${invoice.id}"]`))
    .not.toBeVisible();
});
```

## Smoke Test Patterns

### Critical Path Testing

```javascript
// Test the absolute minimum required for app to function
test.describe('Production Smoke Tests', () => {
  test('user can login and access dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', process.env.TEST_USER_EMAIL);
    await page.fill('[data-testid="password"]', process.env.TEST_USER_PASSWORD);
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('core API responds', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('database queries work', async ({ page }) => {
    await page.goto('/dashboard');
    // Should load data, not show error state
    await expect(page.locator('[data-testid="error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="data-container"]')).toBeVisible();
  });
});
```

### Health Check Pattern

```javascript
test('service health checks', async ({ page }) => {
  const healthChecks = [
    { name: 'Database', url: '/api/health/database' },
    { name: 'Auth', url: '/api/health/auth' },
    { name: 'External API', url: '/api/health/external' }
  ];

  for (const check of healthChecks) {
    const response = await page.request.get(check.url);
    expect(response.ok(), `${check.name} health check failed`).toBeTruthy();
  }
});
```

## Test Data Management Patterns

### Test Data Lifecycle

```javascript
// Create → Use → Cleanup pattern
test.describe('Feature Tests', () => {
  const testDataIds = [];

  test.beforeAll(async () => {
    // Create shared test data for all tests
    const customer = await createTestCustomer();
    testDataIds.push(customer.id);
  });

  test.afterAll(async () => {
    // Clean up after all tests complete
    for (const id of testDataIds) {
      await cleanupTestData(id);
    }
  });

  test('test 1', async ({ page }) => {
    // Use shared test data
  });

  test('test 2', async ({ page }) => {
    // Use shared test data
  });
});
```

### Isolated Test Data Pattern

```javascript
// Each test gets fresh, isolated data
test.describe('Feature Tests', () => {
  let testCustomerId;

  test.beforeEach(async () => {
    // Fresh data for each test
    testCustomerId = await createTestCustomer();
  });

  test.afterEach(async () => {
    // Clean up after each test
    await cleanupTestData(testCustomerId);
  });

  test('test 1', async ({ page }) => {
    // Isolated data, no risk of pollution
  });
});
```

## Performance Optimization

### Parallel Test Execution

```javascript
// playwright.config.js
export default defineConfig({
  fullyParallel: true,  // Run tests in parallel
  workers: process.env.CI ? 2 : undefined,  // 2 workers on CI
});
```

### Test Sharding (for large suites)

```bash
# Split tests across multiple CI jobs
npx playwright test --shard=1/3  # Job 1 of 3
npx playwright test --shard=2/3  # Job 2 of 3
npx playwright test --shard=3/3  # Job 3 of 3
```

### Selective Test Running

```javascript
// Run only tests matching pattern
npx playwright test --grep @smoke      # Run smoke tests only
npx playwright test --grep @visual     # Run visual tests only
npx playwright test --grep-invert @slow  # Skip slow tests
```

## Debugging Failed Tests

### Screenshots and Traces

```javascript
// playwright.config.js
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',  // Capture screenshot on failure
    video: 'retain-on-failure',     // Capture video on failure
    trace: 'on-first-retry',        // Capture trace on retry
  },
});
```

### Headed Mode for Debugging

```bash
# Run tests with browser visible
npx playwright test --headed

# Debug mode with Playwright Inspector
npx playwright test --debug

# Run specific test in headed mode
npx playwright test orders-queue --headed
```

### Console Logs in Tests

```javascript
test('debug test', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.goto('/orders');

  // Take screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png' });
});
```

## Common Pitfalls

### ❌ Hard-coded Timeouts

```javascript
// BAD: Hard-coded wait
test('bad test', async ({ page }) => {
  await page.goto('/orders');
  await page.waitForTimeout(5000);  // Brittle!
  await expect(page.locator('[data-testid="table"]')).toBeVisible();
});

// GOOD: Wait for specific condition
test('good test', async ({ page }) => {
  await page.goto('/orders');
  await page.waitForSelector('[data-testid="table"]');  // Waits only as long as needed
  await expect(page.locator('[data-testid="table"]')).toBeVisible();
});
```

### ❌ Flaky Selectors

```javascript
// BAD: CSS class selectors (can change)
await page.click('.btn-primary');

// GOOD: data-testid attributes (stable)
await page.click('[data-testid="submit-button"]');
```

### ❌ Not Cleaning Up Test Data

```javascript
// BAD: No cleanup
test('creates invoice', async () => {
  const invoice = await createTestInvoice();
  // Test ends, invoice left in database
});

// GOOD: Always clean up
test('creates invoice', async () => {
  let invoiceId;
  try {
    const invoice = await createTestInvoice();
    invoiceId = invoice.id;
    // Test logic here
  } finally {
    if (invoiceId) {
      await cleanupInvoice(invoiceId);
    }
  }
});
```
