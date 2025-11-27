---
name: testing-platform
description: Use when setting up comprehensive automated testing for web applications - addresses visual regression, deployment validation, cross-service integration testing, and database schema validation. Provides four-layer testing architecture (pre-commit, CI/CD, post-deploy, visual/integration) with ready-to-use templates and scripts. Use when testing gaps exist or when building testing infrastructure from scratch.
---

# Testing Platform

## Overview

Build a comprehensive, automated testing platform for web applications using a four-layer architecture. This skill provides templates, scripts, and workflows for pre-commit hooks, CI/CD pipelines with Playwright, post-deployment validation, visual regression testing, cross-service integration tests, and database schema validation.

## When to Use This Skill

Use this skill when:
- Setting up automated testing for a new web application
- Current testing is inadequate (visual bugs slip through, deployment issues, cross-service problems)
- Need to test multi-service architectures with shared databases
- Want to validate database migrations and RLS policies automatically
- Building repeatable testing workflow for all features
- User asks: "Set up comprehensive testing" or "Help me test this feature properly"

## Quick Start: Which Layers Do You Need?

Most projects need all four layers, but start with what addresses immediate pain points:

1. **Layer 1: Pre-Commit Hooks** → Catch errors before code leaves developer's machine
2. **Layer 2: CI/CD Pipeline** → Validate PRs with Playwright, visual regression, database tests
3. **Layer 3: Post-Deployment** → Smoke tests after production deployment
4. **Layer 4: Visual & Integration** → Screenshot comparison and cross-service data flow validation

**Decision tree:**
- Need to test cross-service data flows? → **Start with Layer 4 (integration tests)**
- Want to catch bugs before commits? → **Start with Layer 1 (pre-commit hooks)**
- Need automated PR validation? → **Start with Layer 2 (CI/CD)**
- Want production health checks? → **Start with Layer 3 (smoke tests)**

Most projects implement in order: Layer 1 → Layer 2 → Layer 4 → Layer 3

## Core Architecture

Read `references/testing-platform-architecture.md` for complete architecture documentation.

**The Four Layers:**

```
Developer Workstation (Pre-Commit)
  ↓ Push to PR
CI/CD Pipeline (PR Validation with Playwright + Visual Regression)
  ↓ Merge to main
Deployment Validation (Post-Deploy Smoke Tests)
  ↓ Feature live
Visual Regression & Integration Tests (Ongoing validation)
```

**Timeline:** Commit → Production in ~15-20 minutes (mostly automated)

## Implementation Workflow

### Layer 1: Pre-Commit Hooks

Setup Husky + lint-staged to catch issues before commits.

**Steps:**
1. Copy template: `assets/config-templates/pre-commit` to `.husky/pre-commit`
2. Add lint-staged config from `assets/config-templates/package.json-lint-staged` to `package.json`
3. Install dependencies:
   ```bash
   npm install --save-dev husky lint-staged
   npx husky install
   chmod +x .husky/pre-commit
   ```

4. Test: Make a commit with lint errors → should be blocked

**Performance target:** <30 seconds for typical commit

### Layer 2: CI/CD Pipeline

Setup GitHub Actions to run Playwright tests on PR creation.

**Steps:**
1. Read `references/ci-cd-setup-guide.md` for complete setup instructions
2. Copy workflows:
   ```bash
   cp assets/github-workflows/test-pr.yml .github/workflows/
   cp assets/github-workflows/smoke-tests.yml .github/workflows/
   ```

3. Add GitHub secrets:
   - `TEST_DATABASE_URL` - Test database connection
   - `VITE_SUPABASE_URL` - Test Supabase URL
   - `VITE_SUPABASE_ANON_KEY` - Test Supabase key
   - `PRODUCTION_URL` - Production URL for smoke tests

4. Customize workflow:
   - Edit `filters` in `test-pr.yml` to match your services
   - Update service names in matrix

5. Set up Playwright in each service:
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install chromium
   cp assets/config-templates/playwright.config.js ./
   ```

6. Create test templates from `assets/playwright-templates/`:
   - Copy `visual-regression.spec.js` to `tests/visual/`
   - Copy `integration.spec.js` to `tests/`
   - Copy `smoke.spec.js` to `tests/smoke/`
   - Copy test helpers from `assets/test-helpers/` to `tests/helpers/`

7. Test: Create PR, verify GitHub Actions runs

**Performance target:** ~3-5 minutes for PR validation

### Layer 3: Post-Deployment Smoke Tests

Run critical-path tests after production deployment.

**Already included** in `assets/github-workflows/smoke-tests.yml`

**Customize:**
- Edit smoke test scenarios in `tests/smoke/`
- Add alerting (Slack, email) in workflow `Notify on failure` step

**Performance target:** <2 minutes after deployment

### Layer 4: Visual Regression & Integration Testing

Add screenshot comparison and cross-service data flow validation.

**Visual Regression:**
1. Read `references/playwright-test-patterns.md` for test patterns
2. Write tests using `toHaveScreenshot()` API
3. Tag with `@visual` to run separately
4. Generate baselines: `npx playwright test --update-snapshots`
5. Update baselines when design changes intentionally

**Integration Testing:**
1. Read `references/database-testing.md` for database test patterns
2. Create test data utilities (templates in `assets/test-helpers/`)
3. Write cross-service flow tests (template in `assets/playwright-templates/integration.spec.js`)
4. Always clean up test data in `afterEach`

**Database Validation:**
1. Use scripts in `scripts/`:
   - `validate-schema.mjs` - Compare actual vs expected schema
   - `test-rls-policies.mjs` - Validate Row-Level Security policies
   - `apply-migration-dry-run.mjs` - Test migrations without committing
   - `create-test-data.mjs` - Generate test data
   - `cleanup-test-data.mjs` - Clean up test data

2. Run in CI/CD (already configured in `test-pr.yml`)

## Using the Bundled Scripts

### Schema Validation

```bash
# First run generates baseline
DATABASE_URL="postgresql://..." node scripts/validate-schema.mjs

# Save output to references/expected-schema.json
# Subsequent runs compare against baseline
```

### RLS Policy Testing

```bash
# Test Row-Level Security policies
DATABASE_URL="postgresql://..." node scripts/test-rls-policies.mjs

# Verifies:
# 1. RLS enabled on critical tables
# 2. Policies exist for SELECT, INSERT, UPDATE, DELETE
# 3. Basic customer isolation test
```

### Migration Dry-Run

```bash
# Test migration without committing changes
node scripts/apply-migration-dry-run.mjs path/to/migration.sql

# Validates syntax, then rolls back
```

### Test Data Management

```bash
# Create test data
TEST_SCENARIO_ID=my-test-123 node scripts/create-test-data.mjs

# Clean up specific scenario
TEST_SCENARIO_ID=my-test-123 node scripts/cleanup-test-data.mjs

# Clean up ALL test data (use with caution!)
CLEANUP_ALL=true node scripts/cleanup-test-data.mjs
```

## Test Patterns and Best Practices

### Visual Regression Pattern

```javascript
test('page displays correctly @visual', async ({ page }) => {
  await page.goto('/your-page');
  await page.waitForSelector('[data-testid="main-content"]');

  await expect(page).toHaveScreenshot('page-full.png', {
    fullPage: true,
    maxDiffPixels: 100  // Tolerance for minor differences
  });
});
```

Read `references/playwright-test-patterns.md` for comprehensive patterns.

### Cross-Service Integration Pattern

```javascript
test('data flows from Service A to Service B', async ({ page }) => {
  // 1. Create test data
  const customerId = await createTestCustomer();

  // 2. Perform action in Service A
  await page.goto('/service-a/action');
  await page.click('[data-testid="submit"]');

  // 3. Verify database updated
  const records = await queryDatabase(
    'SELECT * FROM table WHERE customer_id = $1',
    [customerId]
  );
  expect(records).toHaveLength(1);

  // 4. Verify appears in Service B
  await page.goto('/service-b/records');
  await expect(page.locator(`[data-testid="record-${records[0].id}"]`))
    .toBeVisible();

  // 5. Cleanup
  await cleanupTestData(customerId);
});
```

### Database Validation Pattern

```javascript
test('migration preserves data integrity', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert test data
    await client.query('INSERT INTO customers ...');

    // Apply migration
    await client.query(migrationSQL);

    // Verify data intact
    const result = await client.query('SELECT * FROM customers ...');
    expect(result.rows[0].email).toBe('test@example.com');

    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});
```

Read `references/database-testing.md` for complete database testing patterns.

## Troubleshooting

### CI/CD Tests Fail Waiting for Vercel

**Problem:** "Timeout waiting for Vercel deployment"

**Solution:**
- Verify Vercel connected to GitHub repository
- Check Vercel auto-deploys PRs
- Increase timeout in workflow (default 300s)

### Visual Tests Always Fail in CI

**Problem:** Screenshot diffs always show differences

**Solution:**
```javascript
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 200,  // Increase tolerance
  maxDiffPixelRatio: 0.05
});

// Disable animations
await page.emulateMedia({ reducedMotion: 'reduce' });
```

### Database Connection Fails

**Problem:** Tests fail with connection errors

**Solution:**
- Verify `TEST_DATABASE_URL` secret is correct
- Test connection: `psql "$TEST_DATABASE_URL" -c "SELECT 1"`
- Check database allows GitHub Actions IPs

Read `references/ci-cd-setup-guide.md` for comprehensive troubleshooting.

## Resources

### scripts/
Executable utilities for database testing and test data management:
- `validate-schema.mjs` - Compare actual vs expected database schema
- `test-rls-policies.mjs` - Validate Row-Level Security policies
- `apply-migration-dry-run.mjs` - Test migrations without committing
- `create-test-data.mjs` - Generate test data with cleanup tags
- `cleanup-test-data.mjs` - Remove test data by scenario ID

### references/
Comprehensive documentation loaded as needed:
- `testing-platform-architecture.md` - Complete four-layer architecture
- `playwright-test-patterns.md` - Visual regression, integration, smoke test patterns
- `database-testing.md` - Schema validation, RLS testing, migration validation
- `ci-cd-setup-guide.md` - GitHub Actions setup, troubleshooting, optimization

### assets/
Templates and boilerplate code ready to copy:
- `github-workflows/` - Complete GitHub Actions workflow files
  - `test-pr.yml` - PR validation pipeline
  - `smoke-tests.yml` - Post-deployment smoke tests
- `playwright-templates/` - Test templates
  - `visual-regression.spec.js` - Screenshot comparison tests
  - `integration.spec.js` - Cross-service integration tests
  - `smoke.spec.js` - Production smoke tests
- `config-templates/` - Configuration files
  - `playwright.config.js` - Optimized Playwright config
  - `pre-commit` - Husky pre-commit hook
  - `package.json-lint-staged` - lint-staged configuration
- `test-helpers/` - Utility modules
  - `db-utils.js` - Database query helpers
  - `test-data.js` - Test data creation and cleanup utilities

## Success Metrics

After implementation, track:
- **Test coverage:** >80% of critical user paths
- **CI/CD time:** <5 minutes per PR
- **Production incidents:** Reduce by 50% in first quarter
- **Time to detect issues:** <5 minutes via smoke tests

## Common Workflow Examples

### Example 1: Setting Up Testing for New Feature

```
1. Create feature branch with worktree
2. Implement feature
3. Write Playwright tests using templates
4. Run tests locally: npx playwright test
5. Commit (pre-commit hook runs)
6. Push and create PR
7. CI/CD runs all tests automatically
8. Review visual diffs if any
9. Merge when tests pass
10. Smoke tests run after deployment
```

### Example 2: Adding Visual Regression to Existing Feature

```
1. Copy visual-regression.spec.js template
2. Customize for your pages/components
3. Generate baselines: npx playwright test --update-snapshots
4. Commit baseline screenshots
5. Future changes will compare against baselines
6. Update baselines when design changes intentionally
```

### Example 3: Validating Database Migration

```
1. Write migration SQL file
2. Test locally: node scripts/apply-migration-dry-run.mjs path/to/migration.sql
3. Create rollback script
4. Add to supabase/migrations/
5. Create PR → CI/CD runs migration validation automatically
6. Review schema validation results
7. Merge when validated
```
