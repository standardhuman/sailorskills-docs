# Testing Platform Architecture Reference

This document provides the complete architecture for the four-layer testing platform.

## The Four Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Developer Workstation (Pre-Commit)                 │
│ • Fixed local dev environment                               │
│ • Pre-commit hooks (Husky + lint-staged)                    │
│ • Fast tests + linting (~30 seconds)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: CI/CD Pipeline (PR Validation)                     │
│ • GitHub Actions on PR create/update                        │
│ • Playwright against Vercel preview                         │
│ • Visual regression (screenshot comparison)                 │
│ • Database migration validation                             │
│ • Cross-service integration tests                           │
│ • Parallel execution (~3-5 minutes)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Deployment Validation (Post-Deploy)                │
│ • Automated smoke tests after deployment                    │
│ • Critical path testing (auth, navigation, core features)   │
│ • Database connectivity + RLS verification                  │
│ • Service health checks                                     │
│ • Alerts on failure (~1-2 minutes)                          │
└─────────────────────────────────────────────────────────────┐
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Visual Regression & Integration                    │
│ • Playwright visual testing (built-in screenshots)          │
│ • Cross-service data flow validation                        │
│ • Database schema validation                                │
│ • Test data management utilities                            │
└─────────────────────────────────────────────────────────────┘
```

## Complete Developer Workflow

```
Developer makes changes locally
  ↓
Pre-commit hook runs (linting, type check) - 30s
  ↓
Push to feature branch, create PR
  ↓
Vercel creates preview deployment
  ↓
GitHub Actions triggers:
  - Service-specific Playwright tests (parallel) - 3-5 min
  - Visual regression tests (parallel)
  - Cross-service integration tests
  - Database migration validation
  ↓
All tests pass → PR approved → Merge to main
  ↓
Vercel deploys to production
  ↓
Post-deployment smoke tests run - 2 min
  ↓
✅ Feature live, all validations passed
```

## Key Design Decisions

1. **Real Environments, Not Mocks**
   - All tests run against real Vercel preview deployments
   - No mocked services or stubbed databases
   - Catches environment-specific issues that mocks miss

2. **Playwright Built-in Visual Testing**
   - Use `toHaveScreenshot()` API (no third-party service)
   - Baseline screenshots stored in git repo
   - Visual diffs generated automatically on failures

3. **Dedicated Test Data Strategy**
   - Test customer accounts (email: `test-customer-*@example.test`)
   - Data tagged with `is_test: true` for easy identification
   - Automated cleanup scripts after test runs
   - Isolated test schema for destructive migration tests

4. **Parallel CI/CD Execution**
   - Service-specific tests run in parallel
   - Visual regression, integration, and unit tests run concurrently
   - Reduces total CI time while increasing coverage

## Timeline Breakdown

| Stage | Duration | Blocking? | When |
|-------|----------|-----------|------|
| **Local dev** | Continuous | No | Development phase |
| **Pre-commit hook** | ~30 seconds | Yes | At commit time |
| **Vercel preview deploy** | ~2 minutes | Yes (for tests) | PR created/updated |
| **CI/CD tests** | ~3-5 minutes | Yes (for merge) | After preview ready |
| **PR review** | Variable | Yes | Before merge |
| **Production deploy** | ~2 minutes | No | After merge |
| **Smoke tests** | ~2 minutes | No (alert only) | After production deploy |

**Total time from commit to production:** ~15-20 minutes (mostly automated)

## Failure Handling Matrix

| Failure Stage | Impact | Recovery Action | Notification |
|--------------|--------|-----------------|--------------|
| **Pre-commit** | Can't commit | Fix locally, retry commit | Console error |
| **CI/CD** | Can't merge PR | Fix in branch, push, tests re-run | PR comment with details |
| **Visual regression** | Can't merge PR | Review diffs, update baselines if intentional | PR comment with screenshot diffs |
| **Integration test** | Can't merge PR | Fix cross-service issue, retry | PR comment + test logs |
| **Smoke test** | Production deployed but unhealthy | Investigate + rollback if needed | Email/Slack alert |
