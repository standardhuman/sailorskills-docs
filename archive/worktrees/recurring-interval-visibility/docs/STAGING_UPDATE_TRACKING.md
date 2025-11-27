# Staging Environment - Documentation Update Tracking

**Created**: 2025-11-10
**Purpose**: Track which files need updates as staging environment is built

---

## 🔴 Critical Updates (Must Update Before Staging Launch)

### Core Workflow Documentation

- [ ] `/DEVELOPMENT_WORKFLOW.md`
  - Add staging deployment workflow
  - Update from: `local → production` to `local → staging → production`
  - Add branching strategy (feature → staging → main)
  - Document when to use staging vs production

- [ ] `/TESTING_PLATFORM_GUIDE.md`
  - **REWRITE** Layer 2 for staging instead of Vercel previews
  - Update test execution to run against staging URLs
  - Add staging database context
  - Remove/update Vercel preview polling approach

- [ ] `/.env.example`
  - Add staging environment variables:
    - `VITE_SUPABASE_URL_STAGING`
    - `VITE_SUPABASE_ANON_KEY_STAGING`
    - `SUPABASE_SERVICE_KEY_STAGING`
    - `DATABASE_URL_STAGING`
  - Document when to use staging vs production vars

### GitHub Actions Workflows

- [ ] `/.github/workflows/integration-tests.yml`
  - Add staging environment configuration
  - Run tests against staging database
  - Trigger on push to `staging` branch

- [ ] `/.github/workflows/smoke-tests.yml`
  - Add staging smoke tests
  - Run after staging deployments
  - Add all 13 staging service URLs

- [ ] **NEW:** `/.github/workflows/deploy-staging.yml`
  - Create workflow for staging branch deployments
  - Run tests before Vercel deploy confirmation
  - Post deployment status notifications

---

## 🟡 Important Updates (Update After Core Infrastructure)

### Playwright Configurations (25+ files)

**Root Level:**
- [ ] `/playwright.config.js`
  - Add staging baseURL configuration
  - Environment-based URL selection
  - Staging test user credentials

**Service-Specific (13 services):**
- [ ] `/sailorskills-login/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-operations/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-billing/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-portal/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-estimator/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-inventory/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-insight/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-settings/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-video/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-booking/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-marketing/playwright.config.js` or `.local.js`
- [ ] `/sailorskills-site/playwright.config.js` or `.local.js`

**Pattern for Updates:**
```javascript
const ENV = process.env.TEST_ENV || 'local';
const baseURLs = {
  local: 'http://localhost:5173',
  staging: 'https://[service]-staging.sailorskills.com',
  production: 'https://[service].sailorskills.com'
};
baseURL: baseURLs[ENV]
```

### Service Environment Files

- [ ] `/sailorskills-login/.env.example` - Add staging Supabase URL
- [ ] `/sailorskills-operations/.env.example` - Add staging vars
- [ ] `/sailorskills-billing/.env.example` - Add Stripe test keys for staging
- [ ] `/sailorskills-portal/.env.example` - Add staging vars
- [ ] `/sailorskills-estimator/.env.example` - Add staging vars
- [ ] `/sailorskills-inventory/.env.example` - Add staging vars
- [ ] `/sailorskills-insight/.env.example` - Add staging vars
- [ ] `/sailorskills-settings/.env.example` - Add staging vars
- [ ] `/sailorskills-video/.env.example` - Add staging vars
- [ ] `/sailorskills-booking/.env.example` - Add staging Google Calendar config
- [ ] `/sailorskills-marketing/.env.example` - Add staging vars
- [ ] `/sailorskills-site/.env.example` - Add staging vars

---

## 🟢 Nice-to-Have Updates (After Staging is Functional)

### Service READMEs (13 services)

Update each service README with staging deployment section:
- [ ] `/sailorskills-login/README.md` - Add staging URL, deployment process
- [ ] `/sailorskills-operations/README.md`
- [ ] `/sailorskills-billing/README.md`
- [ ] `/sailorskills-portal/README.md`
- [ ] `/sailorskills-estimator/README.md`
- [ ] `/sailorskills-inventory/README.md`
- [ ] `/sailorskills-insight/README.md`
- [ ] `/sailorskills-settings/README.md`
- [ ] `/sailorskills-video/README.md`
- [ ] `/sailorskills-booking/README.md`
- [ ] `/sailorskills-marketing/README.md`
- [ ] `/sailorskills-site/README.md`

### Testing Guides (Service-Specific)

- [ ] `/sailorskills-billing/MANUAL_TESTING_GUIDE.md` - Add staging testing steps
- [ ] `/sailorskills-insight/TESTING_GUIDE.md` - Update for staging
- [ ] `/sailorskills-inventory/TESTING-GUIDE.md` - Update for staging
- [ ] `/sailorskills-operations/TESTING.md` - Add staging environment
- [ ] `/sailorskills-portal/TESTING_VIDEOS.md` - Update staging URLs
- [ ] `/sailorskills-shared/TESTING_GUIDE.md` - General staging testing

### Deployment Documentation

- [ ] `/sailorskills-portal/DEPLOYMENT_CHECKLIST.md` - Add staging pre-production step
- [ ] `/sailorskills-site/VERCEL_DEPLOYMENT.md` - Add staging deployment section

---

## 📝 New Documentation to Create

### Phase 9 Deliverables

- [ ] `/STAGING_WORKFLOW.md` (NEW)
  - Comprehensive staging environment guide
  - How to deploy to staging
  - Testing checklist for staging
  - When to use staging vs production
  - How to refresh staging database
  - Troubleshooting staging issues
  - Staging URLs quick reference

- [ ] `/docs/STAGING_QUICK_REFERENCE.md` (NEW)
  - All staging URLs in table format
  - Test user credentials for staging
  - Common tasks (deploy, test, rollback)
  - Troubleshooting FAQ

- [ ] `/scripts/sync-staging-db.mjs` (NEW)
  - Script documentation inline
  - Usage examples
  - Scheduling options

- [ ] `/scripts/seed-staging-data.sql` (NEW)
  - Documented test data structure
  - Customer/boat/service examples

---

## 📊 Progress Tracking

### By Phase

- **Phase 1 (Cleanup)**: ✅ Complete
- **Phase 2 (Database)**: ⏳ Pending
- **Phase 3 (Git)**: ⏳ Pending
- **Phase 4 (Vercel)**: ⏳ Pending
- **Phase 5 (DNS)**: ⏳ Pending
- **Phase 6 (SSO)**: ⏳ Pending
- **Phase 7 (Playwright)**: ⏳ Pending
- **Phase 8 (GitHub Actions)**: ⏳ Pending
- **Phase 9 (Documentation)**: ⏳ Pending
- **Phase 10 (Testing)**: ⏳ Pending
- **Phase 11 (Training)**: ⏳ Pending

### By Category

- **Core Workflow Docs**: 0/3 updated
- **GitHub Actions**: 0/3 updated
- **Playwright Configs**: 0/13 updated
- **Service .env files**: 0/12 updated
- **Service READMEs**: 0/12 updated
- **Testing Guides**: 0/6 updated
- **New Documentation**: 0/4 created

---

## 🎯 Update Priority Order

1. **Foundation** (Before any staging deployment):
   - Create staging database
   - Configure Vercel environment variables
   - Set up DNS records

2. **Core Documentation** (For team to use staging):
   - STAGING_WORKFLOW.md
   - DEVELOPMENT_WORKFLOW.md updates
   - .env.example updates

3. **Testing Infrastructure** (To validate staging):
   - Playwright configs
   - GitHub Actions workflows
   - Test credentials

4. **Polish** (After staging is functional):
   - Service READMEs
   - Testing guides
   - Quick reference guides

---

**Last Updated**: 2025-11-10
**Next Review**: After each phase completion
