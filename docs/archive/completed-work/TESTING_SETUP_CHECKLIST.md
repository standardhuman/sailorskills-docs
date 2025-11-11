# Testing Platform Setup Checklist
**Created:** 2025-10-29

## ✅ Completed Setup

- [x] GitHub Actions workflows created (`.github/workflows/`)
  - [x] `test-pr.yml` - PR validation pipeline
  - [x] `smoke-tests.yml` - Post-deployment smoke tests
- [x] Database validation scripts (` scripts/`)
  - [x] `validate-schema.mjs`
  - [x] `test-rls-policies.mjs`
  - [x] `apply-migration-dry-run.mjs`
  - [x] `create-test-data.mjs`
  - [x] `cleanup-test-data.mjs`
- [x] Playwright setup in sailorskills-portal
  - [x] Playwright installed (`@playwright/test`)
  - [x] `playwright.config.js` configured
  - [x] Test templates created (`tests/visual/`, `tests/smoke/`)
  - [x] Test helpers created (`tests/helpers/`)
- [x] Pre-commit hooks in sailorskills-portal
  - [x] Husky installed and configured
  - [x] lint-staged configured
  - [x] Prettier installed
- [x] Comprehensive documentation created
  - [x] `TESTING_PLATFORM_GUIDE.md`

## ⏳ Pending Configuration

### 1. GitHub Secrets (REQUIRED)

**Add these secrets in GitHub repository settings:**

Go to: `https://github.com/[owner]/sailorskills-repos/settings/secrets/actions`

```
☑ TEST_DATABASE_URL ✅ COMPLETE
   Value: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@...
   Get from: Supabase Dashboard → Project Settings → Database → Connection String (Transaction pooler)

☑ VITE_SUPABASE_URL ✅ COMPLETE
   Value: https://[PROJECT_REF].supabase.co
   Get from: Supabase Dashboard → Project Settings → API → Project URL

☑ VITE_SUPABASE_ANON_KEY ✅ COMPLETE
   Value: eyJhbGc...
   Get from: Supabase Dashboard → Project Settings → API → Project API keys (anon/public)

☑ PRODUCTION_URL ✅ COMPLETE
   Value: https://portal.sailorskills.com
   (Or your production URL for smoke tests)

☑ SUPABASE_SERVICE_ROLE_KEY ✅ COMPLETE (Added: 2025-10-29)
   Value: eyJhbGc... (service_role JWT - very long)
   Get from: Supabase Dashboard → Project Settings → API → Service Role key
   Purpose: Full database access for integration tests (bypasses RLS)
   See: SERVICE_ROLE_KEY_SETUP.md for details
```

### 2. Test Database Setup (RECOMMENDED)

**Option A: Create Separate Test Project (Recommended)**
```
☐ Create new Supabase project named "sailorskills-test"
☐ Copy schema from production (via migrations or pg_dump)
☐ Use this project's connection string for TEST_DATABASE_URL
☐ Benefits: Complete isolation, can reset freely
```

**Option B: Use Production DB with Test Accounts**
```
☐ Create test customer accounts with email pattern: test-*@sailorskills.test
☐ Flag with is_test: true in database
☐ Use production connection string for TEST_DATABASE_URL
☐ Caution: Ensure RLS policies prevent cross-contamination
```

### 3. Vercel Integration Verification

```
☐ Verify Vercel is connected to GitHub repository
☐ Verify Vercel auto-deploys PRs (check project settings)
☐ Create test PR to verify preview deployments work
☐ Confirm GitHub Actions can detect Vercel previews
```

### 4. First Test Run

**After adding secrets, test the workflow:**

```bash
☐ Create a test branch
   git checkout -b test-ci-setup

☐ Make a small change
   echo "# Test" >> README.md

☐ Commit with pre-commit hook test
   git add README.md
   git commit -m "test: verify CI/CD pipeline"

☐ Push and create PR
   git push origin test-ci-setup
   # Create PR on GitHub

☐ Watch GitHub Actions run
   # Check Actions tab in GitHub

☐ Verify all jobs pass:
   - detect-changes
   - wait-for-vercel
   - test-service (if portal changed)
   - visual-regression
   - test-database (if migrations changed)

☐ Review test results and artifacts

☐ Close/merge test PR
```

### 5. Expand to Other Services

**For each Sailorskills service:**

```
☐ sailorskills-billing
   - Copy Playwright setup from portal
   - Add service-specific tests
   - Update package.json with pre-commit hooks

☐ sailorskills-operations
   - Copy Playwright setup
   - Add admin-specific test scenarios
   - Set up pre-commit hooks

☐ sailorskills-dashboard
   - Copy Playwright setup
   - Add analytics/reporting tests
   - Set up pre-commit hooks

☐ sailorskills-inventory
   - Copy Playwright setup
   - Add inventory management tests
   - Set up pre-commit hooks
```

### 6. Baseline Screenshot Generation

**For services with visual regression tests:**

```
☐ Run tests to generate baselines
   cd sailorskills-portal
   npx playwright test --update-snapshots

☐ Review generated screenshots
   ls tests/__screenshots__/

☐ Commit baselines to git
   git add tests/__screenshots__/
   git commit -m "chore: add visual regression baselines"
```

### 7. Team Onboarding

```
☐ Share TESTING_PLATFORM_GUIDE.md with team
☐ Demonstrate pre-commit hooks in action
☐ Show how to read CI/CD test results
☐ Explain how to update visual regression baselines
☐ Document any project-specific testing patterns
```

## 🚀 Quick Start Commands

### Run Tests Locally
```bash
cd sailorskills-portal
npx playwright test                    # All tests
npx playwright test --grep @visual     # Visual regression only
npx playwright test --headed           # Watch tests run
npx playwright test --debug            # Debug mode
```

### Update Visual Baselines
```bash
npx playwright test --update-snapshots
git add tests/__screenshots__/
git commit -m "chore: update visual baselines"
```

### Database Validation
```bash
# From repo root
source db-env.sh  # Load DATABASE_URL

# Validate schema
node scripts/validate-schema.mjs

# Test RLS policies
node scripts/test-rls-policies.mjs

# Test migration
node scripts/apply-migration-dry-run.mjs supabase/migrations/migration.sql
```

## 📊 Success Criteria

You'll know the testing platform is working when:

✅ Pre-commit hooks block commits with formatting issues
✅ PR creation triggers GitHub Actions automatically
✅ Vercel preview deployments are detected and tested
✅ Visual regression tests compare against baselines
✅ Database migrations are validated before merge
✅ Smoke tests run after production deployment
✅ Test failures provide clear, actionable feedback

## ⚠️ Important Notes

1. **Never commit secrets** - Always use GitHub Secrets for sensitive data
2. **Test data isolation** - Use `is_test: true` flags and unique email patterns
3. **Visual baseline updates** - Require PR review when updating screenshots
4. **Database migrations** - Always test with dry-run script first
5. **Cost monitoring** - Check GitHub Actions usage monthly (free tier: 2,000 min/month)

## 🆘 Troubleshooting

See `TESTING_PLATFORM_GUIDE.md` → Troubleshooting section for common issues and solutions.

---

**Next Step:** Configure GitHub Secrets (Section 1 above), then run first test (Section 4)

**Questions?** See `TESTING_PLATFORM_GUIDE.md` or ask in team chat.
