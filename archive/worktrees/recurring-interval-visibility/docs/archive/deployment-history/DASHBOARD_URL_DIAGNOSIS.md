# Dashboard URL Navigation Issue - Diagnostic Report

**Date:** 2025-11-03
**Issue:** Two different URLs showing different dashboard versions

---

## Executive Summary

The sailorskills-dashboard repository has been **rebranded to sailorskills-insight**, but there are **two separate Vercel deployments** pointing to the same GitHub repository:

1. **sailorskills-insight.vercel.app** - Deployed from `main` branch (OLD version without efficiency metrics)
2. **sailorskills-dashboard.vercel.app** - Deployed from `feature/efficiency-metrics` branch (NEW version with efficiency widget)

---

## Test Results

### Screenshots Captured

**sailorskills-insight.vercel.app/dashboard:**
- Shows: Revenue, Bookings, Customers, Inventory widgets (4 widgets)
- Missing: Efficiency Metrics widget
- Status: OLD dashboard layout

**sailorskills-dashboard.vercel.app/dashboard:**
- Shows: Revenue, Bookings, Customers, Inventory, **Efficiency Metrics** widgets (5 widgets)
- Status: NEW dashboard layout with efficiency metrics

### Widget Comparison

| Feature | Insight URL | Dashboard URL |
|---------|-------------|---------------|
| Revenue Widget | ✅ Present | ✅ Present |
| Bookings Widget | ✅ Present | ✅ Present |
| Customers Widget | ✅ Present | ✅ Present |
| Inventory Widget | ✅ Present | ✅ Present |
| **Efficiency Metrics Widget** | ❌ Missing | ✅ Present |
| Efficiency Period Selector | ❌ Missing | ✅ Present (30/7/90 days/YTD) |
| Service Type Breakdown | ❌ Missing | ✅ Present |

---

## Root Cause Analysis

### 1. Repository Configuration

The local repository shows:
```bash
Git Remote: https://github.com/standardhuman/sailorskills-insight.git
Current Branch: main
Feature Branch: feature/efficiency-metrics (13 commits ahead of main)
```

### 2. Branch Differences

**Commits on feature/efficiency-metrics not in main:**
- 329b7f2 debug: add detailed logging for efficiency widget queries
- a26c661 fix: use authenticated Supabase client from auth module
- 0f2848e debug: add logging to diagnose initialization issue
- f408e1e fix: resolve race condition in dashboard initialization
- 45b61ff fix: dispatch admin-authenticated event to trigger dashboard initialization
- d219eed docs: add efficiency metrics implementation plan
- 379c977 feat: implement service type breakdown toggle functionality
- 3a86f6d style: add breakdown toggle and table styles
- 21e13d8 feat: add service type breakdown toggle and table HTML
- 48998da feat: add date range selector event handlers
- 0be752d feat: implement efficiency widget data loading and calculation
- dbde17f style: add date range selector and efficiency widget footer styles
- c710964 feat: add date range selector for efficiency metrics
- 7e68969 feat: add efficiency metrics widget HTML structure

**Total changes:** 1,527 additions across 8 files

### 3. Vercel Deployment Configuration

The repository has **one Vercel project** (prj_XDEuaHDVAzkRtcGAW6XKImbcBVxn) but appears to be deployed to **two different URLs**:

- **sailorskills-insight.vercel.app** → Linked to `main` branch
- **sailorskills-dashboard.vercel.app** → Linked to `feature/efficiency-metrics` branch (or is a separate Vercel project)

### 4. Navigation Configuration Issues

The shared package (`sailorskills-shared`) has **inconsistent URL references**:

**In navigation.js (line 76):**
```javascript
{ id: 'insight', label: 'INSIGHT', url: 'https://sailorskills-insight.vercel.app' }
```

**In constants.js (lines 12, 21):**
```javascript
DASHBOARD: 'https://sailorskills-dashboard.vercel.app',  // Business metrics and analytics
ADMIN: 'https://sailorskills-dashboard.vercel.app',      // Legacy alias
```

**Result:** Navigation links point to `sailorskills-insight.vercel.app` but constants still reference `sailorskills-dashboard.vercel.app`.

---

## Problem Statement

The user expects:
1. All links to point to **sailorskills-insight.vercel.app**
2. **sailorskills-insight.vercel.app** to show the NEW dashboard with efficiency metrics
3. **sailorskills-dashboard.vercel.app** to either redirect or be deprecated

Currently:
1. ❌ Navigation correctly points to sailorskills-insight.vercel.app
2. ❌ But sailorskills-insight.vercel.app shows OLD dashboard (main branch)
3. ❌ sailorskills-dashboard.vercel.app shows NEW dashboard (feature branch)
4. ❌ Constants still reference sailorskills-dashboard.vercel.app

---

## Solution Plan

### Option A: Merge Feature Branch (Recommended)

**Steps:**
1. Merge `feature/efficiency-metrics` → `main` branch
2. Push to GitHub to trigger deployment to sailorskills-insight.vercel.app
3. Update shared package constants.js to use sailorskills-insight.vercel.app
4. Configure sailorskills-dashboard.vercel.app to redirect to sailorskills-insight.vercel.app
5. Update all documentation references

**Pros:**
- Completes the rebrand
- Consolidates to single URL
- Efficiency metrics go live

**Cons:**
- Need to verify all 13 commits are production-ready

### Option B: Swap Vercel Project Branches

**Steps:**
1. In Vercel dashboard, change sailorskills-insight project to deploy from `feature/efficiency-metrics`
2. Keep `main` branch as-is for now
3. Test in production
4. Merge to main once verified

**Pros:**
- Quick deployment
- Can test before merging

**Cons:**
- Temporary workaround
- Still need to merge eventually

### Option C: Two Separate Vercel Projects

**Investigation Needed:**
- Check if there are actually TWO separate Vercel projects
- One for sailorskills-insight.vercel.app
- One for sailorskills-dashboard.vercel.app

**If true:**
- Delete the sailorskills-dashboard project
- Or configure it to redirect

---

## Files Requiring Updates

### 1. Merge Feature Branch to Main
**File:** N/A (Git operation)
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-dashboard
git checkout main
git merge feature/efficiency-metrics
git push origin main
```

### 2. Update Shared Package Constants
**File:** `/Users/brian/app-development/sailorskills-repos/sailorskills-shared/src/config/constants.js`

**Change line 12:**
```javascript
// FROM:
DASHBOARD: 'https://sailorskills-dashboard.vercel.app',

// TO:
DASHBOARD: 'https://sailorskills-insight.vercel.app',
```

**Change line 21:**
```javascript
// FROM:
ADMIN: 'https://sailorskills-dashboard.vercel.app',

// TO:
ADMIN: 'https://sailorskills-insight.vercel.app',
```

### 3. Update All Services Using Shared Package
After updating constants.js, update the shared submodule in:
- sailorskills-billing
- sailorskills-operations
- sailorskills-portal
- sailorskills-inventory
- sailorskills-video
- sailorskills-estimator

```bash
cd [service-directory]
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package with Insight URL fix"
git push
```

### 4. Vercel Configuration
**Action:** Log into Vercel dashboard and either:
- Configure sailorskills-dashboard.vercel.app to redirect to sailorskills-insight.vercel.app
- OR delete the sailorskills-dashboard Vercel project if separate

### 5. Update Documentation
**Files to update:**
- `/Users/brian/app-development/sailorskills-repos/sailorskills-dashboard/README.md`
- `/Users/brian/app-development/sailorskills-repos/sailorskills-dashboard/CLAUDE.md`
- `/Users/brian/app-development/sailorskills-repos/sailorskills-shared/NAVIGATION_INTEGRATION.md`
- `/Users/brian/app-development/sailorskills-repos/sailorskills-shared/SHARED_RESOURCES_DIRECTIVE.md`

Replace all instances of `sailorskills-dashboard.vercel.app` with `sailorskills-insight.vercel.app`.

---

## Recommended Action Plan

### Phase 1: Verify Feature Branch (Immediate)
1. ✅ Review the 13 commits on feature/efficiency-metrics
2. ✅ Confirm all changes are production-ready
3. ✅ Verify no breaking changes

### Phase 2: Merge and Deploy (Day 1)
1. Merge `feature/efficiency-metrics` → `main`
2. Push to trigger Vercel deployment
3. Wait for deployment to complete
4. Test sailorskills-insight.vercel.app shows efficiency metrics

### Phase 3: Update Shared Package (Day 1)
1. Update constants.js with new URL
2. Commit and push to sailorskills-shared
3. Update shared submodule in all services
4. Deploy all services with updated navigation

### Phase 4: Deprecate Old URL (Day 2)
1. Configure Vercel redirect from sailorskills-dashboard → sailorskills-insight
2. Update all documentation
3. Send notification to team about URL change

### Phase 5: Verify (Day 2)
1. Test all navigation links across services
2. Confirm efficiency metrics visible
3. Verify redirect working
4. Update any external bookmarks/links

---

## Test Files Created

The following test files were created during diagnosis:
- `/Users/brian/app-development/sailorskills-repos/sailorskills-dashboard/tests/url-comparison.spec.js`
- `/Users/brian/app-development/sailorskills-repos/sailorskills-dashboard/tests/authenticated-url-comparison.spec.js`

**Screenshots captured:**
- `screenshot-insight-authenticated.png` - Shows OLD dashboard (4 widgets)
- `screenshot-dashboard-authenticated.png` - Shows NEW dashboard (5 widgets)

---

## Next Steps

**Immediate action needed:**

1. **Decision Point:** Choose Option A, B, or C above
2. **Execute:** Follow the selected plan
3. **Verify:** Run tests to confirm both URLs show efficiency metrics
4. **Document:** Update team on URL consolidation

**Recommended:** Option A (Merge Feature Branch) - This completes the rebrand and gets efficiency metrics live.

---

**Report Generated:** 2025-11-03
**By:** Claude Code Assistant
**Status:** Awaiting user decision on solution approach
