# Automated Preview Testing Design

**Date:** 2025-10-29
**Status:** Approved
**Scope:** All Sailorskills services (operations, billing, portal, dashboard, inventory, video, booking, site)

## Problem Statement

Vercel preview deployments are protected by SSO authentication (HTTP 401), blocking automated Playwright tests from verifying functionality before merging PRs. This forces manual testing of preview deployments, creating a bottleneck in the development workflow.

**Current Blocker:**
- Preview URL returns HTTP 401 with `_vercel_sso_nonce` cookie
- Automated tests cannot authenticate through Vercel team SSO
- Manual testing required for every PR
- Risk of shipping bugs to production

**Goal:**
Build a reusable CI/CD system that automatically tests every PR preview deployment across all Sailorskills services.

---

## Architecture Overview

### Workflow Trigger
When code is pushed to a PR, two parallel events occur:
1. **Vercel:** Automatically deploys preview (existing behavior)
2. **GitHub Actions:** Workflow triggers and waits for Vercel deployment

### High-Level Flow
```
PR Push → Vercel Deploy (parallel) → Get Preview URL → Authenticate → Run Playwright → Report Results
          ↓
          GitHub Actions Workflow
```

### Key Components

**1. Vercel API Integration**
- Poll Vercel API for deployment status
- Fetch preview URL when deployment completes
- Match deployment by git commit SHA

**2. Deployment Protection Bypass**
- Use Vercel team token with bypass scope
- Authenticate Playwright browser to access SSO-protected previews
- App-level auth (standardhuman@gmail.com) handled by existing Playwright tests

**3. Playwright Test Runner**
- Execute existing test suite against dynamic preview URL
- No test rewrites required
- Leverage existing retry and screenshot config

**4. GitHub PR Integration**
- Display pass/fail status as GitHub check
- Block merges on test failures (optional)
- Upload test reports as artifacts for debugging

### Authentication Layers

**Layer 1: Vercel SSO (Deployment Protection)**
- Solved by: Vercel API token with bypass scope
- Used by: GitHub Actions workflow to access preview URL

**Layer 2: App Authentication (Supabase)**
- Solved by: Existing Playwright login flow (standardhuman@gmail.com)
- Unchanged from current test implementation

---

## Implementation Components

### 1. GitHub Workflow File

**File:** `.github/workflows/preview-test.yml`

**Trigger:**
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

**Workflow Steps:**
1. Checkout code
2. Wait for Vercel deployment (poll API until ready)
3. Get preview URL from Vercel API
4. Set up Node.js and install dependencies
5. Install Playwright browsers
6. Run Playwright tests against preview URL
7. Upload test report as GitHub artifact
8. Comment results on PR

**Job Configuration:**
- Runs on: `ubuntu-latest`
- Timeout: 20 minutes
- Concurrency: One workflow per PR branch (cancel in-progress on new push)

### 2. Required GitHub Secrets

Configure per repository in Settings → Secrets and variables → Actions:

- `VERCEL_TOKEN`: API token with "Full Access" or "Read Deployments" scope
- `VERCEL_ORG_ID`: Sailorskills team ID
- `VERCEL_PROJECT_ID`: Project-specific ID (differs per service)
- `VITE_SUPABASE_URL`: Test environment URL
- `VITE_SUPABASE_ANON_KEY`: Test environment key

**Security:**
- Secrets encrypted at rest by GitHub
- Only accessible to workflow runs
- Not exposed in logs

### 3. Playwright Configuration Update

**File:** `playwright.config.js`

**Change:**
```javascript
use: {
  baseURL: process.env.PREVIEW_URL || 'http://localhost:5173',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
}
```

**Impact:**
- Tests run against preview URL when `PREVIEW_URL` env var set
- Falls back to localhost for local development
- No other changes to test files required

### 4. Vercel API Helper Script

**File:** `scripts/wait-for-deployment.js`

**Purpose:**
- Poll `/v13/deployments/{id}` endpoint
- Wait until deployment `state === "READY"`
- Return preview URL when ready
- Exit with error if deployment fails

**Usage:**
```bash
node scripts/wait-for-deployment.js <commit-sha>
# Outputs: https://sailorskills-operations-abc123.vercel.app
```

**API Calls:**
1. `GET /v13/deployments?projectId={id}&teamId={org}&gitSource.sha={sha}`
2. Poll: `GET /v13/deployments/{deployment-id}` every 10 seconds
3. Return: `deployment.url` when ready

---

## Error Handling & Edge Cases

### Deployment Failures

**Scenario:** Vercel build fails (TypeScript errors, missing deps)

**Handling:**
- API returns `state: "ERROR"`
- Workflow detects failure and exits fast
- Error message: "Deployment failed, cannot run tests"
- Links to Vercel build logs for debugging

### Timeout Management

**Deployment Wait:**
- Timeout: 10 minutes
- Typical duration: 1-3 minutes
- Failure message: "Deployment timeout after 10 minutes"

**Playwright Tests:**
- Timeout: 15 minutes
- Typical duration: 2-5 minutes
- Uses existing Playwright timeout config

**Total Workflow:**
- Maximum duration: ~20 minutes
- Prevents runaway workflows consuming CI minutes

### Authentication Issues

**Vercel Token Invalid/Expired:**
- API returns 401/403
- Error: "Vercel authentication failed. Check VERCEL_TOKEN secret."
- Resolution: Regenerate token in Vercel dashboard, update GitHub secret

**App Login Failure:**
- Playwright detects login page not redirecting
- Error: "Application authentication failed for standardhuman@gmail.com"
- Distinguishable from Vercel SSO failure
- Existing Playwright error reporting

### Flaky Test Handling

**Retry Strategy:**
- Uses existing Playwright config: `retries: process.env.CI ? 2 : 0`
- Tests automatically retry on failure
- Workflow only fails after all retries exhausted

**Benefits:**
- Handles transient network issues
- Reduces false negatives from timing issues
- Balances reliability with CI time

### Network/API Failures

**Vercel API Unreachable:**
- Retry API calls 3x with exponential backoff (1s, 2s, 4s)
- Final failure: "Cannot reach Vercel API"
- Distinguishable from deployment failure

**Intermittent Failures:**
- Workflow logs show retry attempts
- Helps diagnose infrastructure vs code issues

### Concurrent PR Deployments

**Scenario:** Multiple PRs open simultaneously

**Handling:**
- Each PR gets unique deployment ID from Vercel
- Workflow fetches deployment by matching git commit SHA
- No conflicts between parallel test runs
- Each workflow execution isolated

### Test Reporting

**Playwright HTML Reports:**
- Generated on every test run
- Uploaded to GitHub as artifact (retention: 90 days)
- Accessible from PR "Actions" tab → Workflow run → Artifacts

**Screenshots/Videos:**
- Captured automatically on failure (existing config)
- Included in HTML report artifact
- Aids in debugging visual/timing issues

**PR Comments:**
- Bot comment on failure with test summary
- Links to full report artifact
- Example: "❌ 2 tests failed. View report →"

### Notification Strategy

**GitHub PR Checks:**
- Pass/fail status shows inline in PR
- Required check can block merges (configurable)
- Status visible in PR list view

**Team Notifications:**
- GitHub notifications for failed checks (based on user settings)
- No email spam on success
- Failed workflows trigger GitHub notification

---

## Setup Process & Rollout Strategy

### Initial Setup (One-Time, ~1 hour)

#### Step 1: Generate Vercel Token (15 min)

1. Navigate to Vercel dashboard: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions - Sailorskills Testing"
4. Scope: "Full Access" (or minimum: "Read Deployments")
5. Copy token (shown only once)
6. Store securely in password manager

#### Step 2: Get Vercel IDs (10 min)

**Organization ID:**
```bash
vercel teams list
# Or: Check URL in dashboard → https://vercel.com/{org-slug}
```

**Project IDs (for each service):**
```bash
vercel projects list
# Or: Project Settings → General → Project ID
```

**Document these IDs:**
- sailorskills-operations: `prj_xxx`
- sailorskills-billing: `prj_yyy`
- sailorskills-portal: `prj_zzz`
- (repeat for all services)

#### Step 3: Configure GitHub Secrets (10 min)

For **sailorskills-operations** repo:

1. Go to: Repository Settings → Secrets and variables → Actions
2. Click "New repository secret" for each:
   - Name: `VERCEL_TOKEN`, Value: [token from Step 1]
   - Name: `VERCEL_ORG_ID`, Value: [org ID from Step 2]
   - Name: `VERCEL_PROJECT_ID`, Value: [operations project ID]
   - Name: `VITE_SUPABASE_URL`, Value: [test environment URL]
   - Name: `VITE_SUPABASE_ANON_KEY`, Value: [test environment key]

**Note:** `VERCEL_TOKEN` and `VERCEL_ORG_ID` are identical across all repos. `VERCEL_PROJECT_ID` differs per service.

#### Step 4: Create Workflow Files (20 min)

**In sailorskills-operations repo:**

1. Create `.github/workflows/preview-test.yml` (workflow definition)
2. Create `scripts/wait-for-deployment.js` (Vercel API helper)
3. Update `playwright.config.js` (dynamic baseURL)
4. Commit to feature branch:
   ```bash
   git add .github/workflows/preview-test.yml scripts/wait-for-deployment.js playwright.config.js
   git commit -m "feat: add automated preview testing workflow"
   git push
   ```

#### Step 5: Test on Current PR (20 min)

1. Push workflow files to `feature/pending-orders-queue` branch
2. Navigate to: GitHub → Actions tab
3. Watch workflow execute in real-time
4. Verify steps complete:
   - ✅ Checkout code
   - ✅ Wait for deployment (shows preview URL)
   - ✅ Install dependencies
   - ✅ Run Playwright tests
   - ✅ Upload report artifact
5. Check PR for status badge
6. If failures, review workflow logs for debugging

**Troubleshooting Common Issues:**
- "Vercel authentication failed" → Check `VERCEL_TOKEN` secret
- "Deployment timeout" → Check Vercel build logs for errors
- "Tests failed" → Download artifact for detailed report

### Rollout to Other Services

#### Phase 1: Pilot (sailorskills-operations)
**Timeline:** Current PR (pending-orders-queue)

- Set up workflow on operations repo
- Run for 1-2 PRs to validate
- Document any issues or improvements
- Iterate on workflow based on learnings

**Success Criteria:**
- Workflow runs successfully on PR push
- Tests execute against preview URL
- Results reported accurately in PR
- No false positives/negatives

#### Phase 2: Expand to Critical Services
**Timeline:** Next 2 weeks

Copy workflow to high-risk services:

1. **sailorskills-billing** (payment processing - highest risk)
2. **sailorskills-portal** (customer-facing)
3. **sailorskills-estimator** (lead intake - revenue critical)

**For each service:**
```bash
# Copy workflow files
cp .github/workflows/preview-test.yml ../sailorskills-billing/.github/workflows/
cp scripts/wait-for-deployment.js ../sailorskills-billing/scripts/

# Update GitHub secrets
# Navigate to billing repo → Settings → Secrets → Actions
# Add VERCEL_PROJECT_ID for billing project
# (VERCEL_TOKEN and VERCEL_ORG_ID already set if org-level)

# Test with next PR in that repo
```

**Validation:** Run at least one PR through each service before proceeding.

#### Phase 3: Complete Rollout
**Timeline:** Following month

Extend to remaining services:

4. **sailorskills-dashboard** (analytics)
5. **sailorskills-inventory** (inventory management)
6. **sailorskills-video** (video workflows)
7. **sailorskills-booking** (training scheduling)
8. **sailorskills-site** (marketing site)

**Lower priority due to:**
- Less frequent changes
- Lower risk of breaking changes
- Non-customer-facing (dashboard, inventory, video)
- Static content (site)

### Reusability Pattern

**Copy Workflow to New Service:**
```bash
# 1. Copy workflow files
cd /path/to/sailorskills-repos
cp sailorskills-operations/.github/workflows/preview-test.yml \
   sailorskills-[service]/.github/workflows/

cp sailorskills-operations/scripts/wait-for-deployment.js \
   sailorskills-[service]/scripts/

# 2. Update playwright.config.js in target repo
# Add: baseURL: process.env.PREVIEW_URL || 'http://localhost:5173'

# 3. Configure GitHub secrets in target repo
# Add VERCEL_PROJECT_ID for that specific service

# 4. Push and test
cd sailorskills-[service]
git add .github/workflows/ scripts/
git commit -m "feat: add automated preview testing"
git push

# Done! Workflow runs automatically on next PR
```

**Future Optimization:**
Centralize helper scripts in `sailorskills-shared`:
- `@sailorskills/shared/ci/wait-for-deployment.js`
- Import from shared package instead of duplicating
- Single source of truth for CI utilities

### Maintenance & Updates

**Workflow Updates:**
- Improve workflow file based on learnings
- Copy updated version to other repos
- Announce changes in team Slack/docs

**Token Rotation:**
- Regenerate `VERCEL_TOKEN` annually (security best practice)
- Update GitHub secret once
- Change propagates to all workflow runs immediately

**Adding New Services:**
- Follow reusability pattern above
- Takes ~15 minutes per new service

**Monitoring:**
- Review GitHub Actions usage in billing dashboard monthly
- Optimize workflow if approaching free tier limits

---

## Cost & Performance

### GitHub Actions Minutes

**Free Tier:**
- Public repos: 2,000 minutes/month
- Private repos: 500 minutes/month (per pricing tier)

**Per Test Run:**
- Deployment wait: ~1-2 minutes
- Test execution: ~2-5 minutes
- Total: ~5 minutes average

**Capacity:**
- Public repos: ~400 PR tests/month on free tier
- Private repos: ~100 PR tests/month on free tier

**Current Development Pace:**
- ~20-30 PRs/month across all services
- ~100-150 CI minutes/month
- Well within free tier capacity

**If Exceeding Free Tier:**
- GitHub Actions paid plans: $0.008/minute
- Example: 1,000 extra minutes = $8/month
- Negligible cost for CI automation

### Vercel API Rate Limits

**Limits:**
- Hobby plan: 100 requests/hour
- Pro plan: 300 requests/hour

**Workflow Usage:**
- ~5-10 API calls per test run (deployment polling)
- ~20-30 PRs/month = ~150-300 API calls/month
- Average: ~5-10 calls/hour
- Well within limits

### Test Execution Time

**Current Manual Testing:**
- Per PR: ~10-15 minutes manual verification
- Context switching overhead
- Risk of missing edge cases

**Automated Testing:**
- Per PR: ~5 minutes (fully automated)
- Zero developer time required
- Comprehensive test coverage guaranteed

**Time Savings:**
- ~10 minutes saved per PR
- 20 PRs/month = ~200 minutes/month (3.3 hours)
- Compounds across team and services

---

## Success Metrics

### Technical Metrics

**Workflow Reliability:**
- Target: >95% successful workflow execution
- Measure: GitHub Actions success rate
- Track: False positives/negatives

**Test Coverage:**
- Target: All critical user flows tested per PR
- Measure: Playwright test count and assertions
- Track: Coverage gaps discovered in production

**Feedback Speed:**
- Target: Test results within 10 minutes of PR push
- Measure: Workflow duration from trigger to completion
- Track: Deployment wait time, test execution time

### Business Impact

**Deployment Confidence:**
- Catch bugs before production
- Reduce rollback frequency
- Faster merge-to-production cycle

**Developer Productivity:**
- Eliminate manual preview testing
- Reduce context switching
- Focus on building features

**Quality Improvement:**
- Consistent test execution (no human skip)
- Early detection of regressions
- Comprehensive edge case coverage

### Monitoring & Iteration

**Weekly Review (First Month):**
- Check workflow success rates
- Review failed runs for patterns
- Optimize timeout/retry settings

**Monthly Review (Ongoing):**
- Analyze CI minute usage
- Identify flaky tests
- Update workflow based on team feedback

**Continuous Improvement:**
- Add new test scenarios as issues discovered
- Optimize workflow for speed
- Share learnings across services

---

## Future Enhancements

### Phase 2 Improvements (After Initial Rollout)

**1. Visual Regression Testing**
- Integrate Percy or Chromatic for screenshot comparisons
- Catch unintended UI changes automatically
- Useful for design system updates

**2. Performance Testing**
- Add Lighthouse CI to workflow
- Track page load times, accessibility scores
- Prevent performance regressions

**3. Cross-Browser Testing**
- Run tests on Firefox, Safari (Playwright supports all)
- Currently only Chromium for speed
- Add as needed for critical flows

**4. Deployment Previews for Dependencies**
- Test with multiple database states (migrations)
- Test with different feature flag configurations
- More comprehensive integration testing

### Phase 3 Optimizations (Long-Term)

**1. Centralized CI Utilities**
- Move `wait-for-deployment.js` to `sailorskills-shared`
- Create shared GitHub Actions (composite actions)
- Single source of truth for all services

**2. Parallel Test Execution**
- Shard Playwright tests across multiple workers
- Reduce test duration from 5 min → 2 min
- Useful as test suite grows

**3. Intelligent Test Selection**
- Only run tests affected by code changes
- Analyze git diff to determine relevant test files
- Faster feedback for small changes

**4. Production Smoke Tests**
- Run subset of tests against production after deploy
- Final safety net for critical flows
- Separate workflow triggered on main branch push

---

## References & Resources

### Documentation
- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI Documentation](https://playwright.dev/docs/ci)

### Key Concepts
- **Deployment Protection:** Vercel feature requiring team SSO for preview access
- **Bypass Token:** API token with permission to access protected deployments
- **GitHub Check:** Status indicator shown in PR (pass/fail/pending)
- **Artifact:** File uploaded by workflow (test reports, screenshots)

### Example Repositories (Reference)
- [Vercel + GitHub Actions Example](https://github.com/vercel/examples/tree/main/ci-cd)
- [Playwright GitHub Actions Setup](https://playwright.dev/docs/ci-github-actions)

### Team Resources
- Vercel Dashboard: https://vercel.com/sailorskills
- GitHub Actions Usage: Repository → Insights → Actions
- Playwright Docs: https://playwright.dev

---

## Appendix: Workflow YAML Template

```yaml
name: Test Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test-preview:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Wait for Vercel deployment
        id: deployment
        run: |
          PREVIEW_URL=$(node scripts/wait-for-deployment.js ${{ github.event.pull_request.head.sha }})
          echo "preview_url=$PREVIEW_URL" >> $GITHUB_OUTPUT
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        run: npx playwright test
        env:
          PREVIEW_URL: ${{ steps.deployment.outputs.preview_url }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 90

      - name: Comment PR with results
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Preview tests failed. [View report](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})'
            })
```

---

## Document History

- **2025-10-29:** Initial design approved after brainstorming session
- **Author:** Claude Code (with Brian)
- **Reviewers:** Brian (Sailorskills owner)
- **Status:** Ready for implementation
