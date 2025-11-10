# Session Handoff: Billing Architecture Mystery & Missing Source Code
**Date:** 2025-11-06
**Status:** 🔴 CRITICAL - Source code location unresolved
**Priority:** 🔴 HIGH - Cannot implement features without finding source

---

## 🚨 Critical Problem

**Task:** Add "End Service" button to capture `service_ended_at` timestamp in Billing workflow

**Blocker:** Cannot find the source code that builds billing.sailorskills.com

---

## What We Know For Certain

### 1. billing.sailorskills.com IS DEPLOYED
**Live Site Inspection (from HTML source):**
```html
<title>Billing - Charge Customer | Sailor Skills</title>
<!-- Build: 2025-10-06 -->
<script type="module" crossorigin src="/assets/billing.bundle.js"></script>
<link rel="stylesheet" crossorigin href="/assets/billing.bundle.css">
```

**Features Visible in Browser (from screenshots):**
- Customer search interface
- "Start Service" button (appears after customer selection)
- Service conditions tracking (Paint sliders, Growth sliders)
- Anode tracking interface
- "End Service" button (appears after Start Service is clicked, above Report card)

**Browser Dev Tools Show:**
```
src/admin/inline-scripts/
├── conditions-logging.js
├── enhanced-charge-flow.js
├── time-tracking.js
├── service-functions.js
├── service-selection.js
├── supabase-init.js
├── universal-search.js
└── wizard-payment.js
```

### 2. THESE FILES DO NOT EXIST IN GIT

**Searched Repositories:**
- ✅ sailorskills-billing/ - NO admin directory, NO billing.bundle.js
- ✅ sailorskills-shared/ - NO admin directory in src/
- ✅ sailorskills-operations/ - NO admin directory

**What We Found Instead:**
```bash
# In sailorskills-shared/dist/
admin.html (built Oct 12, 2025)
assets/admin-D7VnO9eL.js (old bundle)
assets/admin-CfdBxhCo.css
```

**Verified:**
- ❌ "Start Service" NOT in admin-D7VnO9eL.js
- ❌ "End Service" NOT in admin-D7VnO9eL.js
- ❌ billing.bundle.js does NOT exist in any repo
- ❌ src/admin/inline-scripts/ does NOT exist anywhere

---

## Directory/Repo Confusion Documented

### sailorskills-billing Directory
**Location:** `/Users/brian/app-development/sailorskills-repos/sailorskills-billing/`

**Identity Crisis:**
- Directory name: `sailorskills-billing`
- Git remote: `https://github.com/standardhuman/sailorskills-operations.git`
- package.json name: `"sailorskills-operations"`
- CLAUDE.md title: "Sailor Skills **Operations**"
- README.md: Says "Operations"
- Vercel project: `sailorskills-billing` (ID: prj_syVa4bo9l2puWWbh55y6Kh6h85Uz)
- **Deploys to:** billing.sailorskills.com

**Contents:**
- Has "Start Service" button in `src/views/service-logs.js` (lines 85-96)
- Has service completion form in `src/forms/service-log-form.js`
- Does NOT have billing.bundle.js or src/admin/ structure
- Structure is Vite + vanilla JS modules

**Conclusion:** This directory is the **Operations** repo but deploys to billing.sailorskills.com via Vercel misconfiguration

### sailorskills-operations Directory
**Location:** `/Users/brian/app-development/sailorskills-repos/sailorskills-operations/`

**Identity:**
- Git remote: `https://github.com/standardhuman/sailorskills-operations.git` (SAME as billing!)
- Vercel project: `sailorskills-operations` (ID: prj_2klv1Zxhpvcs6f1cfxuiULqfTgUS)
- **Deploys to:** ops.sailorskills.com
- Does NOT have "Start Service" button (older version)

**Conclusion:** This is an older clone of Operations repo

### sailorskills-shared Directory
**Location:** `/Users/brian/app-development/sailorskills-repos/sailorskills-shared/`

**Identity:**
- Git remote: `https://github.com/standardhuman/sailorskills-shared.git`
- Contains: `dist/admin.html` (old Billing interface)
- Does NOT contain: src/admin/ or billing.bundle.js source

---

## What Deployed Code Shows

### From Browser Inspection of billing.sailorskills.com:

**The Interface Has:**
1. **Customer Search**
   - Universal search box
   - Customer card display
   - Boat information

2. **"Start Service" Button**
   - Appears after customer selection
   - Creates service_log with `service_started_at` timestamp
   - Sets `in_progress = true`

3. **Service Conditions Interface**
   - Paint condition sliders (Overall, Keel, Waterline, Boot Stripe)
   - Growth level slider
   - Anode tracking with location/condition
   - Propeller condition
   - Thru-hull status
   - Notes fields

4. **"End Service" Button** ⭐ THIS IS WHAT WE NEED TO UPDATE
   - Appears after "Start Service" is clicked
   - Located "directly above the Report card"
   - Currently unknown what it does (can't see source code)

---

## Database Schema (Confirmed Working)

**Migration 023 Applied:**
```sql
-- These columns exist in service_logs table:
ALTER TABLE service_logs ADD COLUMN service_started_at TIMESTAMPTZ;
ALTER TABLE service_logs ADD COLUMN service_ended_at TIMESTAMPTZ;
ALTER TABLE service_logs ADD COLUMN in_progress BOOLEAN DEFAULT FALSE;
ALTER TABLE service_logs ADD COLUMN total_hours NUMERIC(5,2);
```

**Verified via Vercel inspect:**
- billing.sailorskills.com is LIVE
- Database connection works
- Service creation works (Start Service button functional per user)

---

## User Requirements (Confirmed)

**Workflow Needed:**
1. User searches customer → selects customer
2. Service interface loads with boat details
3. User clicks **"Start Service"** → Captures `service_started_at`, sets `in_progress = true`
4. **Banner appears at top:** "🟢 Open Services: [Boat Name] (45m)"
5. User performs service (diver goes in water)
6. Page may reload (data saved in DB, banner persists)
7. User clicks **"End Service"** → Should capture `service_ended_at`, calculate `total_hours`, set `in_progress = false`
8. User fills service conditions (paint, growth, anodes, etc.)
9. User clicks "Bill Customer" or "Log Only"

**Critical Note from User:**
> "we don't stop the service until all the data is entered, so we can just use the Stop Service button that already exists at the bottom of the service logging form"

This means "End Service" button already exists, we just need to update its functionality.

---

## Questions That Need Answers (Next Session)

### PRIORITY 1: Find the Source Code

**Questions:**
1. **Where is the source code** that builds `billing.bundle.js`?
2. **Is there uncommitted code** in any of the repos?
3. **Is there a different branch** that has the billing admin code?
4. **Was billing.sailorskills.com deployed from a different machine/directory?**

**Action Items:**
```bash
# Check all branches in all repos
cd /Users/brian/app-development/sailorskills-repos/sailorskills-billing
git branch -a
git log --oneline -20

cd /Users/brian/app-development/sailorskills-repos/sailorskills-shared
git branch -a
git log --oneline -20

# Check for uncommitted changes
git status

# Check Vercel deployment logs
vercel logs billing.sailorskills.com
```

### PRIORITY 2: Verify Deployment Source

**Questions:**
1. Which Vercel project serves billing.sailorskills.com?
2. What GitHub repo is connected to that Vercel project?
3. What branch is deployed?
4. When was the last deployment?

**Action Items:**
```bash
# Check Vercel project settings
vercel inspect billing.sailorskills.com

# Check which repo/branch is connected
# (May need to check Vercel dashboard web UI)
```

### PRIORITY 3: Understand the Build Process

**Questions:**
1. How does `billing.bundle.js` get created?
2. Is there a vite.config.js that builds it?
3. Are the src/admin/inline-scripts/ files source or build output?

**Possible Locations to Check:**
- sailorskills-shared with different vite config
- Hidden .vercel build directory
- Different repo entirely (sailorskills-billing-admin?)

---

## Attempted Solutions (What We Tried)

### 1. ✅ Searched All Local Repos
- Searched sailorskills-billing, sailorskills-operations, sailorskills-shared
- Used grep for "Start Service", "End Service", "billing.bundle"
- Used find for time-tracking.js, conditions-logging.js
- **Result:** Files do not exist in any local repo

### 2. ✅ Checked Git Remotes
- Verified sailorskills-billing → sailorskills-operations.git
- Verified sailorskills-operations → sailorskills-operations.git (same repo!)
- Verified sailorskills-shared → sailorskills-shared.git
- **Result:** Directory names don't match repo names

### 3. ✅ Checked Vercel Deployments
- billing.sailorskills.com ← sailorskills-billing Vercel project
- ops.sailorskills.com ← sailorskills-operations Vercel project
- **Result:** billing.sailorskills.com deployed from "sailorskills-billing" project

### 4. ✅ Checked Browser Source Maps
- Dev tools showed src/admin/inline-scripts/ structure
- But these are reconstructed from source maps
- Source maps reference files that don't exist locally
- **Result:** Deployed code is different from local code

### 5. ✅ Pulled Latest Changes
```bash
cd sailorskills-shared && git pull origin main
# Updated navigation.js (minor change)

cd sailorskills-billing && git pull origin main
# Already up to date
```
- **Result:** No new files appeared

---

## Evidence Files

### Test Files Found (Skipped)
**File:** `sailorskills-billing/tests/service-completion.spec.js`
- Lines 91, 114: References `#end-service-btn`
- Line 6: `test.describe.skip` - Tests are SKIPPED
- Line 3: Comment: "TODO: Fix auth setup for these tests"
- **Evidence:** Feature was planned/partially implemented but tests disabled

### Documentation Found
**Files:**
- `sailorskills-billing/CLAUDE.md` - Says "Operations" (contradictory)
- `sailorskills-billing/TEST_RESULTS_TASK5.md` - Documents service completion workflow
- `SESSION_HANDOFF_2025-11-06_SERVICE_CONFUSION.md` - Earlier handoff about same issue

---

## Architecture Hypotheses

### Hypothesis A: Code Exists on Different Branch
- billing.sailorskills.com deploys from `feature/billing-admin` branch
- Local repos are on `main` branch
- Need to check out correct branch

**Test:**
```bash
cd sailorskills-shared
git branch -a | grep -i billing
git checkout <billing-branch-if-exists>
```

### Hypothesis B: Code Not Committed
- billing.bundle.js is build output (in .gitignore)
- Source files exist but aren't committed
- Vercel builds from uncommitted code somehow

**Test:**
```bash
cd sailorskills-shared
git status
git ls-files --others --exclude-standard
```

### Hypothesis C: Separate Billing Repo Exists
- There's a `sailorskills-billing-admin` repo we haven't found
- That's where billing.bundle.js source lives
- Need to find and clone it

**Test:**
```bash
# Check GitHub for repos
gh repo list standardhuman | grep -i billing
```

### Hypothesis D: Build Happens on Vercel
- Source code is in a format Vercel transforms
- Vercel build step creates billing.bundle.js from admin.html inline scripts
- Local code doesn't need the bundle

**Test:**
- Check vercel.json for build commands
- Check Vercel dashboard for build logs

---

## Recommended Next Steps

### STEP 1: Determine Deployment Source (15 min)
```bash
# In Vercel dashboard:
1. Go to sailorskills-billing project
2. Check "Settings" → "Git"
3. Note: Repository, Branch, Root Directory
4. Check recent deployment logs
5. See what files were actually deployed
```

### STEP 2: Find Source Code (30 min)
```bash
# Based on Vercel settings, clone correct repo/branch:
cd /Users/brian/app-development/sailorskills-repos

# Check all branches
cd sailorskills-shared
git fetch --all
git branch -a

# Check for billing-related branches
git checkout <correct-branch>

# Verify files exist
ls -la src/admin/inline-scripts/
```

### STEP 3: Locate "End Service" Button (15 min)
```bash
# Once source is found:
grep -r "End Service" src/ --include="*.js"

# Read the file:
cat <file-with-end-service-button>

# Understand current implementation
```

### STEP 4: Implement Required Functionality (2 hrs)
**Requirements:**
- "End Service" button should capture `service_ended_at` timestamp
- Calculate `total_hours` = (service_ended_at - service_started_at)
- Set `in_progress = false`
- Save to database immediately
- Then allow user to fill rest of form

**File to Modify:** (TBD - need to find it first)

---

## Key Files Reference

**If Source Code is Found, These Files Likely Need Updates:**

1. **time-tracking.js** (or equivalent)
   - Add logic to capture `service_ended_at`
   - Calculate `total_hours`
   - Update `in_progress` flag

2. **service-functions.js** (or equivalent)
   - Add `endService()` function
   - Handle database update
   - Show success/error messages

3. **conditions-logging.js** (or equivalent)
   - Ensure timestamps are read-only after service ended
   - Pre-fill duration in form

---

## Questions for User (Next Session Start)

1. **When you visit billing.sailorskills.com**, can you:
   - Click "Start Service"
   - Click "End Service"
   - Tell me what happens (does it work? does it save timestamps?)

2. **Do you have access to:**
   - Vercel dashboard for sailorskills-billing project
   - Can you check deployment settings?
   - Can you see build logs?

3. **Can you check your local machine:**
   - Are there any uncommitted changes in sailorskills-shared?
   - Any untracked files in src/admin/?
   - Any other sailorskills-* directories we haven't looked at?

---

## Summary

**What We Know:**
- ✅ billing.sailorskills.com is live and working
- ✅ Has Start Service and End Service buttons
- ✅ Database schema is ready (migration 023 applied)
- ✅ User workflow is understood
- ✅ Directory/repo naming is confusing but documented

**What We DON'T Know:**
- ❌ Where the source code lives
- ❌ How billing.bundle.js is built
- ❌ What "End Service" button currently does
- ❌ Where to make changes

**Next Session Must:**
1. Find the source code (absolute priority)
2. Verify "End Service" button current implementation
3. Update it to capture timestamps correctly
4. Test and deploy

---

## Files Created This Session

**This Handoff:**
- `SESSION_HANDOFF_2025-11-06_BILLING_ARCHITECTURE_MYSTERY.md`

**Previous Handoff (Related):**
- `SESSION_HANDOFF_2025-11-06_SERVICE_CONFUSION.md` (directory naming confusion)

---

**Status:** Investigation incomplete - source code location required before implementation can proceed

**Next Developer:** Start with STEP 1 (Determine Deployment Source) above. Do NOT attempt to code until source files are located.

**Estimated Time to Resolve:** 1 hour to find source + 2 hours to implement once found

---

**Last Updated:** 2025-11-06
**Session Duration:** ~3 hours of investigation
**Result:** Mystery documented, requires user input to resolve
