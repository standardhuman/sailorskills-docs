# Phase 2.2: Shared Utilities Migration Plan

**Created:** 2025-10-27
**Updated:** 2025-10-27
**Status:** ⏸️ On Hold - Task 2.1 Complete, Awaiting Production Verification
**Goal:** Replace duplicated code with shared package imports across 5 services

**Note:** This plan was created during Task 2.2 investigation. However, we discovered Task 2.1 was incomplete and prioritized finishing it first. Task 2.1 is now complete and awaiting production verification before proceeding with Task 2.2.

---

## Executive Summary

**Current State:**
- 5 services have shared submodule added (billing, dashboard, inventory, operations, video)
- Services import from CDN URLs (`https://sailorskills-shared.vercel.app/...`)
- Each service has duplicated auth, supabase, stripe code

**Target State:**
- All services import from local submodule (`/shared/src/...`)
- Zero duplicated utility code
- Consistent auth system using shared package
- All tests passing post-migration

**Estimated Effort:** 6-8 hours (per original plan)
**Risk Level:** Medium (working auth systems, potential breaking changes)

---

## Audit Results

### sailorskills-operations

**Current Imports:**
```javascript
// main.js
import { initNavigation as initGlobalNav } from 'https://sailorskills-shared.vercel.app/src/ui/navigation.js';
```

**Local Auth Files:**
- `src/auth/init-supabase-auth.js` - Supabase auth initialization
- `src/auth/admin-auth.js` - Admin logout functionality

**Changes Required:**
1. ✅ Replace CDN URL → `/shared/src/ui/navigation.js`
2. ⚠️ Evaluate if local auth can be replaced with shared `SimpleAuth`
3. ✅ Update HTML to import from local submodule

**Build System:** Vite (ES modules)
**Test Command:** `npm run dev` → verify auth modal, navigation

---

### sailorskills-dashboard

**Current Imports:**
```html
<!-- dashboard.html -->
<link rel="stylesheet" href="https://sailorskills-shared.vercel.app/src/ui/design-tokens.css">
<link rel="stylesheet" href="https://sailorskills-shared.vercel.app/src/ui/styles.css">
```

**Local Auth Files:**
- `js/supabase-auth.js` (209 lines) - Full Supabase auth implementation with modal

**Local Scripts:**
- `js/dashboard.js` - Dashboard widget logic
- `js/customers.js` - Customer listing
- `js/revenue.js` - Revenue analytics

**Changes Required:**
1. ✅ Replace CDN URLs → `/shared/src/ui/...` in HTML
2. ⚠️ Replace `js/supabase-auth.js` with shared `SimpleAuth` + `createSupabaseClient()`
3. ✅ Update all JS files to import from `/shared/src/index.js`

**Build System:** None (static HTML/CSS/JS)
**Test Command:** Open `dashboard.html` in browser, verify auth, widgets

---

### sailorskills-billing

**Current Structure:**
```
src/
├── auth/           # Auth utilities
├── supabase/       # Supabase client
├── stripe/         # Stripe utilities
└── main.js
```

**Changes Required:**
1. 🔍 Audit `src/auth/`, `src/supabase/`, `src/stripe/` contents
2. ⚠️ Replace with shared package imports
3. ✅ Update `src/main.js` to import from `/shared/src/index.js`

**Build System:** Vite (ES modules)
**Test Command:** `npm run dev` → verify payment flows

**Status:** ⚠️ NEEDS DETAILED AUDIT (not completed yet)

---

### sailorskills-inventory

**Current Auth Files:**
- `supabase-auth.js` - Auth implementation
- `supabase-inventory-auth.js` - Inventory-specific auth

**Changes Required:**
1. 🔍 Audit both auth files
2. ⚠️ Replace with shared `SimpleAuth` + `createSupabaseClient()`
3. ✅ Update imports in HTML/JS files

**Build System:** None (static HTML/CSS/JS)
**Test Command:** Open in browser, verify auth, inventory features

**Status:** ⚠️ NEEDS DETAILED AUDIT (not completed yet)

---

### sailorskills-video

**Changes Required:**
1. 🔍 Audit for duplicated code
2. ⚠️ Replace with shared package imports

**Build System:** Unknown (not audited yet)
**Test Command:** TBD

**Status:** ⚠️ NEEDS DETAILED AUDIT (not completed yet)

---

## Migration Strategy

### Option A: Sequential Service-by-Service (RECOMMENDED)

**Process:**
1. Pick one service (start with dashboard - simplest)
2. Make changes in feature branch
3. Test locally thoroughly
4. Deploy to Vercel preview
5. Smoke test in production preview
6. Merge to main
7. Repeat for next service

**Pros:**
- Lower risk (one service at a time)
- Easy to rollback
- Can refine approach per service

**Cons:**
- Takes longer (5 separate deployments)
- More manual testing effort

**Estimated Time:** 8-10 hours total (1.5-2 hours per service)

---

### Option B: Batch Migration (HIGHER RISK)

**Process:**
1. Make changes to all 5 services
2. Test all locally
3. Deploy all to production
4. Test all in production

**Pros:**
- Faster completion
- All services consistent sooner

**Cons:**
- Higher risk (5 services at once)
- Harder to troubleshoot failures
- Difficult to rollback

**Estimated Time:** 6-8 hours (but higher failure risk)

---

## Detailed Migration Steps (Per Service)

### Step 1: Update CDN URLs → Local Submodule

**For HTML files:**
```html
<!-- BEFORE -->
<link rel="stylesheet" href="https://sailorskills-shared.vercel.app/src/ui/design-tokens.css">
<script type="module" src="https://sailorskills-shared.vercel.app/src/ui/navigation.js"></script>

<!-- AFTER -->
<link rel="stylesheet" href="/shared/src/ui/design-tokens.css">
<script type="module" src="/shared/src/ui/navigation.js"></script>
```

**For JS files:**
```javascript
// BEFORE
import { initNavigation } from 'https://sailorskills-shared.vercel.app/src/ui/navigation.js';

// AFTER
import { initNavigation } from '/shared/src/ui/navigation.js';
// OR (if using bundler)
import { initNavigation } from '../shared/src/ui/navigation.js';
```

**Verification:**
- `npm run dev` (for Vite services)
- Open in browser (for static services)
- Check browser console for import errors

---

### Step 2: Replace Auth Implementation

**For services with local auth files:**

**BEFORE:**
```javascript
// Local auth file (e.g., js/supabase-auth.js)
// 200+ lines of custom auth code
```

**AFTER:**
```javascript
// In main HTML or main.js
import { SimpleAuth, createSupabaseClient } from '/shared/src/index.js';

const supabase = createSupabaseClient();
const auth = new SimpleAuth({
  supabase,
  serviceName: 'Dashboard Admin',
  requiredAuth: true
});

// Wait for auth before loading content
await auth.checkAuth();
```

**Verification:**
- Auth modal appears
- Login with `standardhuman@gmail.com` / `KLRss!650`
- Content loads after successful login
- Logout button works

---

### Step 3: Replace Supabase Client

**BEFORE:**
```javascript
// Local supabase client initialization
const SUPABASE_URL = 'https://...';
const SUPABASE_ANON_KEY = '...';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**AFTER:**
```javascript
import { createSupabaseClient } from '/shared/src/index.js';
const supabase = createSupabaseClient();
```

**Verification:**
- Database queries work
- Data loads correctly
- No console errors

---

### Step 4: Replace Stripe (Billing only)

**BEFORE:**
```javascript
// Local stripe initialization
const stripe = Stripe(PUBLISHABLE_KEY);
```

**AFTER:**
```javascript
import { initStripe, createCardElement } from '/shared/src/index.js';
const stripe = initStripe();
const cardElement = createCardElement(stripe);
```

**Verification:**
- Payment form loads
- Stripe Elements render
- Test payment flow works

---

### Step 5: Test Locally

**For Vite services (operations, billing):**
```bash
npm run dev
# Test all features thoroughly
```

**For static services (dashboard, inventory):**
```bash
# Open in browser
open dashboard.html

# OR use local server
python3 -m http.server 8000
# Visit http://localhost:8000/dashboard.html
```

**Test Checklist:**
- [ ] Auth modal appears on load
- [ ] Login with test credentials works
- [ ] Content loads after auth
- [ ] Navigation works (if applicable)
- [ ] Core features work (queries, forms, etc.)
- [ ] Logout works
- [ ] No console errors

---

### Step 6: Deploy & Test in Production

```bash
# Commit changes
git add .
git commit -m "[PHASE2-2.2] Migrate [service] to shared package utilities"

# Push (triggers Vercel deployment)
git push
```

**Production Test Checklist:**
- [ ] Visit production URL
- [ ] Test auth flow
- [ ] Test core features
- [ ] Check for console errors
- [ ] Verify no broken imports

---

## Risk Mitigation

### Rollback Strategy

**If migration breaks a service:**

1. **Immediate:** Revert commit
   ```bash
   git revert HEAD
   git push
   ```

2. **Alternative:** Branch protection
   - Test in preview deployment first
   - Only merge to main after successful preview test

---

### Testing Requirements

**Before marking service complete:**

1. ✅ Local testing passes
2. ✅ Vercel preview deployment works
3. ✅ Production deployment works
4. ✅ Auth flow verified
5. ✅ Core features tested
6. ✅ No console errors
7. ✅ Playwright tests pass (if applicable)

---

## Open Questions

### Question 1: Auth Compatibility

**Issue:** Services have different auth implementations:
- Operations: `initSupabaseAuth()` with options
- Dashboard: Full modal with 209 lines
- Inventory: Two separate auth files

**Question:** Can `SimpleAuth` from shared package handle all these use cases?

**Options:**
A. Use `SimpleAuth` as-is (may need enhancements)
B. Keep service-specific auth, only replace Supabase client
C. Create enhanced auth in shared package first

**Recommendation:** Option B (conservative) - Keep working auth, only replace Supabase client imports

---

### Question 2: Path Resolution

**Issue:** Services use different build systems:
- Vite services: Can use relative paths (`../shared/...`)
- Static services: Need absolute paths (`/shared/...`)

**Question:** Which path style should we standardize on?

**Options:**
A. `/shared/src/...` (absolute, works in browser)
B. `../shared/src/...` (relative, Vite resolves)
C. Mix (absolute for HTML, relative for JS)

**Recommendation:** Option A - Use absolute paths everywhere for consistency

---

### Question 3: Vercel Configuration

**Issue:** Vercel may need config to serve `/shared/` directory correctly

**Question:** Do we need to update `vercel.json` in each service?

**Possible change:**
```json
{
  "rewrites": [
    { "source": "/shared/(.*)", "destination": "/shared/$1" }
  ]
}
```

**Recommendation:** Test first service, add config if needed

---

## Success Criteria

**Task 2.2 is complete when:**

1. ✅ All 5 services import from local submodule (not CDN)
2. ✅ Zero duplicated auth/supabase/stripe code
3. ✅ All services authenticate successfully
4. ✅ All core features work
5. ✅ All services deployed to production
6. ✅ No console errors in any service
7. ✅ Playwright tests pass (where applicable)

---

## Recommendation

**Proposed Approach:**

1. **Start with Dashboard** (simplest, no build system)
   - Replace CDN URLs → `/shared/src/...`
   - Keep existing `js/supabase-auth.js` for now
   - Just replace import paths, not logic
   - Test thoroughly

2. **If successful, continue with:**
   - Operations (has Vite, already uses shared nav)
   - Inventory (static, similar to dashboard)
   - Billing (Vite, most complex)
   - Video (unknown, audit first)

3. **Auth replacement (Phase 2.3?):**
   - Once all imports switched to local
   - Then tackle auth standardization separately
   - Lower risk if done as separate step

**Rationale:**
- Minimize breaking changes
- Keep working auth systems intact
- Focus on import path consolidation first
- Auth standardization can be iterative improvement later

---

## Next Steps

**For approval:**

1. Review this plan
2. Answer open questions
3. Choose migration strategy (A or B)
4. Approve conservative approach (imports only) or full replacement (auth + imports)
5. Green light to proceed

**Once approved:**

1. Execute migration on dashboard (pilot)
2. Report results
3. Continue with remaining services
4. Document any lessons learned

---

## UPDATE: 2025-10-27

**Task 2.1 Status:** ✅ COMPLETE
- All 9 services now have git submodules
- All services migrated from CDN to local `/shared/` imports
- Builds passing (Operations, Billing)
- Commits pushed to GitHub
- Vercel deployments in progress

**Next Steps:**
1. ⏳ Verify production deployments (Operations, Dashboard, Inventory, Billing)
2. ⏳ Test for console errors and visual regressions
3. ⏳ Once verified, proceed with Task 2.2 (this plan)

---

**Status:** ⏸️ READY TO EXECUTE (after Task 2.1 verification)

**Recommended Approach for Task 2.2:**
- Option A: Sequential service-by-service migration
- Scope: Import path consolidation only (keep working auth for now)
- Start with: Dashboard (simplest case)

**Questions for review:**
1. Approve Option A (sequential) or Option B (batch)?
2. Replace auth implementations or keep them?
3. Any concerns with this approach?
