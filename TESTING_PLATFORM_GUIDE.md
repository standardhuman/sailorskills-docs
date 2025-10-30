# Testing Platform Guide
**Date:** 2025-10-29
**Status:** Active
**Applies to:** All Sailorskills services

## Overview

This repository uses a comprehensive four-layer testing platform for automated testing, visual regression, cross-service integration validation, and database schema testing.

## The Four Layers

```
Layer 1: Pre-Commit Hooks (30s)
  ↓ Push to PR
Layer 2: CI/CD Pipeline (3-5 min)
  ↓ Merge to main
Layer 3: Post-Deploy Smoke Tests (2 min)
  ↓ Feature live
Layer 4: Visual Regression & Integration Tests (ongoing)
```

**Total time from commit to production:** ~15-20 minutes (mostly automated)

---

## Quick Start

### For Developers

**Before committing:**
```bash
# Pre-commit hooks run automatically
git add .
git commit -m "feat: add new feature"  # Husky runs lint-staged automatically
```

**Creating a PR:**
1. Push your branch to GitHub
2. Create PR - GitHub Actions automatically runs:
   - Playwright tests against Vercel preview
   - Visual regression tests
   - Database schema validation (if migrations changed)
   - Cross-service integration tests (if shared package changed)
3. Review test results in PR checks
4. Merge when all tests pass

**After deployment:**
- Smoke tests run automatically
- Check GitHub Actions for results

### For New Features

1. Write Playwright tests first (TDD approach)
2. Run tests locally: `npx playwright test`
3. Commit with pre-commit hooks
4. Create PR → CI/CD validates
5. Merge → Auto-deploy → Smoke tests

---

## Layer 1: Pre-Commit Hooks

**Purpose:** Catch errors before code leaves developer's machine

**What Runs:**
- Prettier formatting on modified files
- Linting (if configured)
- Performance: ~30 seconds

**Setup (already done in sailorskills-portal):**
```bash
npm install --save-dev husky lint-staged prettier
npx husky install
```

**Bypass (emergencies only):**
```bash
git commit --no-verify -m "emergency fix"
```

---

## Layer 2: CI/CD Pipeline

**Purpose:** Validate PRs automatically before merge

**Workflow File:** `.github/workflows/test-pr.yml`

**What It Does:**
1. **Detect Changes** - Determines which services changed
2. **Wait for Vercel** - Waits for preview deployment
3. **Run Tests** - Playwright tests against preview URL
4. **Visual Regression** - Screenshot comparison for UI changes
5. **Integration Tests** - Cross-service data flow validation
6. **Database Tests** - Schema validation, RLS policies, migration dry-runs

**Services Monitored:**
- `sailorskills-portal`
- `sailorskills-billing`
- `sailorskills-operations`
- `sailorskills-dashboard`
- `sailorskills-inventory`
- `sailorskills-shared` (triggers all service tests)

**Triggers:**
- PR created/updated
- Manual workflow dispatch

---

## Layer 3: Post-Deployment Smoke Tests

**Purpose:** Validate production deployment health

**Workflow File:** `.github/workflows/smoke-tests.yml`

**What It Tests:**
- Authentication flow
- Critical page navigation
- Database connectivity
- Core user paths

**Triggers:**
- Push to `main` branch (after deployment)
- Manual workflow dispatch

**Performance:** <2 minutes

---

## Layer 4: Visual Regression & Integration

### Visual Regression Testing

**Purpose:** Catch UI/visual regressions automatically

**How It Works:**
1. Tests tagged with `@visual` take screenshots
2. Compare against baseline screenshots
3. Fail if differences exceed threshold
4. Upload diff images as artifacts

**Example Test:**
```javascript
test('Orders Queue displays correctly @visual', async ({ page }) => {
  await page.goto('/orders');
  await page.waitForSelector('[data-testid="orders-table"]');

  await expect(page).toHaveScreenshot('orders-queue.png', {
    fullPage: true,
    maxDiffPixels: 100
  });
});
```

**Update Baselines:**
```bash
npx playwright test --update-snapshots
git add tests/__screenshots__/
git commit -m "chore: update visual regression baselines"
```

### Cross-Service Integration Tests

**Purpose:** Validate data flows across services

**Example:**
```javascript
test('Service completion creates Portal invoice', async () => {
  // 1. Create service in Operations
  // 2. Mark complete with costs
  // 3. Verify invoice created in database
  // 4. Check appears in Billing UI
  // 5. Verify customer sees in Portal
});
```

**Location:** `tests/integration/`

### Database Validation

**Scripts (in `scripts/`):**
- `validate-schema.mjs` - Compare actual vs expected schema
- `test-rls-policies.mjs` - Validate Row-Level Security
- `apply-migration-dry-run.mjs` - Test migrations safely
- `create-test-data.mjs` - Generate test data
- `cleanup-test-data.mjs` - Remove test data

**Usage:**
```bash
# Schema validation
DATABASE_URL="postgresql://..." node scripts/validate-schema.mjs

# RLS policy testing
DATABASE_URL="postgresql://..." node scripts/test-rls-policies.mjs

# Migration dry-run
node scripts/apply-migration-dry-run.mjs supabase/migrations/migration.sql
```

---

## GitHub Secrets Configuration

**Required secrets** (add in GitHub repo Settings → Secrets):

```
TEST_DATABASE_URL           # Test Supabase database connection
VITE_SUPABASE_URL          # Test environment Supabase URL
VITE_SUPABASE_ANON_KEY     # Test environment anon key
PRODUCTION_URL              # Production URL for smoke tests
```

### How to Add Secrets

1. Go to repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret name and value
4. Click "Add secret"

### Test Database Setup

**Option 1: Separate Supabase Project (Recommended)**
- Create new Supabase project for testing
- Use connection string as `TEST_DATABASE_URL`
- Complete isolation from production

**Option 2: Test Schema in Production DB**
- Less ideal but works
- Use test customer accounts with `is_test: true` flag

---

## Test File Structure

### Service-Level Tests (e.g., sailorskills-portal/)

```
sailorskills-portal/
├── tests/
│   ├── visual/
│   │   └── visual-regression.spec.js      # Visual tests
│   ├── smoke/
│   │   └── smoke.spec.js                  # Smoke tests
│   ├── helpers/
│   │   ├── db-utils.js                    # Database helpers
│   │   └── test-data.js                   # Test data utilities
│   └── *.spec.js                          # Feature tests
├── playwright.config.js                    # Playwright config
└── package.json                            # Dependencies
```

### Root-Level Scripts

```
scripts/
├── validate-schema.mjs                     # Schema validation
├── test-rls-policies.mjs                   # RLS policy tests
├── apply-migration-dry-run.mjs            # Migration testing
├── create-test-data.mjs                   # Test data generation
└── cleanup-test-data.mjs                  # Test data cleanup
```

---

## Common Workflows

### Adding Visual Regression to a Page

1. Create test in `tests/visual/`:
```javascript
test('page displays correctly @visual', async ({ page }) => {
  await page.goto('/my-page');
  await page.waitForSelector('[data-testid="main"]');
  await expect(page).toHaveScreenshot('my-page.png', {
    fullPage: true,
    maxDiffPixels: 100
  });
});
```

2. Generate baseline: `npx playwright test --update-snapshots`
3. Commit baseline screenshots
4. Future changes auto-compare against baseline

### Testing a Database Migration

1. Write migration: `supabase/migrations/20251029_add_table.sql`
2. Test locally:
```bash
node scripts/apply-migration-dry-run.mjs supabase/migrations/20251029_add_table.sql
```
3. Create PR → CI/CD runs migration validation automatically
4. Review schema validation results in PR checks
5. Merge when validated

### Creating Cross-Service Integration Test

1. Create test in `tests/integration/`:
```javascript
test('data flows from Service A to Service B', async () => {
  const customerId = await createTestCustomer();
  // Test data flow across services
  await cleanupTestData(customerId);
});
```

2. Run locally against test database
3. Runs automatically in CI when shared package or DB changes

---

## Troubleshooting

### CI/CD Tests Fail "Timeout Waiting for Vercel"

**Problem:** Workflow can't find Vercel preview deployment

**Solutions:**
- Verify Vercel connected to GitHub repo
- Check Vercel auto-deploys PRs (should be default)
- Increase timeout in `.github/workflows/test-pr.yml` (default 300s)

### Visual Tests Always Fail in CI

**Problem:** Screenshot differences every run

**Solutions:**
```javascript
// Increase tolerance
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 200,  // More lenient
  maxDiffPixelRatio: 0.05
});

// Disable animations
await page.emulateMedia({ reducedMotion: 'reduce' });
```

### Database Connection Fails

**Problem:** Tests can't connect to database

**Solutions:**
- Verify `TEST_DATABASE_URL` secret is correct
- Test connection: `psql "$TEST_DATABASE_URL" -c "SELECT 1"`
- Check database allows GitHub Actions IPs
- Ensure Supabase project is active

### Pre-Commit Hook Too Slow

**Problem:** Commits take >30 seconds

**Solutions:**
- Hooks only run on staged files (by design)
- Check what's in `lint-staged` config
- Consider removing slow checks
- Bypass with `--no-verify` if urgent

---

## Performance Metrics

### Current Benchmarks

| Stage | Duration | Blocking? |
|-------|----------|-----------|
| Pre-commit hook | ~30 seconds | Yes |
| Vercel preview deploy | ~2 minutes | Yes (for tests) |
| CI/CD test suite | ~3-5 minutes | Yes (for merge) |
| PR review | Variable | Yes |
| Production deploy | ~2 minutes | No |
| Smoke tests | ~2 minutes | No (alert only) |

**Total commit → production:** ~15-20 minutes

### Cost Analysis

- **GitHub Actions:** Free tier (2,000 min/month)
- **Estimated usage:** ~300 min/month
- **Well within free tier** ✅

---

## Success Metrics

Track these metrics to measure testing platform effectiveness:

- **Test coverage:** >80% of critical user paths
- **CI/CD time:** <5 minutes per PR
- **Production incidents:** Reduce by 50% in first quarter
- **Time to detect issues:** <5 minutes via smoke tests
- **False positive rate:** <5%

---

## Next Steps

### For Individual Services

To add testing platform to other services:

1. **Copy Playwright setup:**
```bash
cd sailorskills-[service]/
npm install --save-dev @playwright/test
cp ../sailorskills-portal/playwright.config.js ./
cp -r ../sailorskills-portal/tests ./
```

2. **Set up pre-commit hooks:**
```bash
npm install --save-dev husky lint-staged prettier
# Copy config from sailorskills-portal/package.json
```

3. **Write service-specific tests**

### Expanding Test Coverage

- Add integration tests for new data flows
- Expand visual regression to all public pages
- Add performance testing (Lighthouse CI)
- Implement E2E user journey tests

---

## Resources

- **Playwright Documentation:** https://playwright.dev/
- **GitHub Actions Documentation:** https://docs.github.com/en/actions
- **Supabase Testing Guide:** https://supabase.com/docs/guides/database/testing

---

**Questions?** Check the testing-platform skill documentation or ask in team chat.

**Last Updated:** 2025-10-29
**Owner:** Development Team
