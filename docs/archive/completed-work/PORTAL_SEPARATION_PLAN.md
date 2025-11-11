# Portal Separation Plan
**Created:** 2025-10-25
**Goal:** Split sailorskills-operations into two independent Vercel projects

---

## Architecture Overview

### Before (Current State)
```
sailorskills-operations (one repo, one Vercel project)
├── Admin Dashboard (internal team)
└── Customer Portal (public customers)
```

### After (Target State)
```
sailorskills-operations (admin-only)
├── Domain: ops.sailorskills.com (already configured)
├── Purpose: Internal operations dashboard
└── Access: Admin team only

sailorskills-portal (customer-only)
├── Domain: portal.sailorskills.com
├── Purpose: Customer-facing portal
└── Access: Customer authentication
```

---

## File Migration Map

### Files Moving to New `sailorskills-portal` Repo

#### HTML Files (11 files)
- `login.html`
- `signup.html`
- `reset-password.html`
- `portal.html`
- `portal-account.html`
- `portal-invoices.html`
- `portal-messages.html`
- `portal-request-history.html`
- `portal-request-service.html`
- `portal-services.html` (service history)

**Note:** `client-portal.html` is LEGACY (old public URL-based portal, superseded by authenticated portal). Can be deleted from both repos.

#### JavaScript - Views (8 files)
- `src/views/portal.js`
- `src/views/service-history.js`
- `src/views/invoices.js`
- `src/views/messages.js`
- `src/views/request-service.js`
- `src/views/request-history.js`
- `src/views/account-settings.js`

#### JavaScript - Auth (4 files)
- `src/auth/login.js`
- `src/auth/signup.js`
- `src/auth/reset-password.js`
- `src/auth/auth.js` (customer authentication logic)

#### JavaScript - API (6 files)
- `src/api/service-logs.js` (customer-facing queries)
- `src/api/invoices.js`
- `src/api/messages.js`
- `src/api/service-requests.js`
- `src/api/account.js`

#### JavaScript - Other
- `src/lib/supabase.js` (copy - both repos need it)

**Note:** `src/client-portal.js` is LEGACY (old public portal). Can be deleted from both repos.

#### Configuration
- `package.json` (modified - remove admin dependencies)
- `vite.config.js` (copy)
- `vercel.json` (copy, modify rewrites)
- `.gitignore` (copy)
- `.env.example` (copy)

#### Shared Package (Git Submodule)
- `shared/` (git submodule - both repos reference same shared package)

---

### Files Staying in `sailorskills-operations` (Admin)

#### HTML Files
- `index.html` (admin dashboard)

#### JavaScript - Views (Admin)
- `src/views/dashboard.js`
- `src/views/boats.js`
- `src/views/service-logs.js` (admin entry form)
- `src/views/paint-alerts.js`
- `src/views/schedule.js`
- `src/views/packing.js`
- `src/views/admin-messages.js`
- `src/views/admin-service-requests.js`

#### JavaScript - Auth (Admin)
- `src/auth/admin-auth.js`
- `src/auth/init-supabase-auth.js`

#### JavaScript - Forms (All Admin)
- `src/forms/boat-form.js`
- `src/forms/customer-form.js`
- `src/forms/service-log-form.js`
- `src/forms/anode-form.js`
- `src/forms/paint-form.js`
- `src/forms/playlist-form.js`
- `src/forms/schedule-form.js`

#### JavaScript - Components (Shared UI)
- `src/components/modal.js`
- `src/components/toast.js`
- `src/components/confirm-dialog.js`

#### JavaScript - Utils
- `src/utils/column-config.js`
- All other utility files

#### JavaScript - Services
- `src/services/email-service.js`
- All other services

#### JavaScript - Other
- `src/main.js` (admin dashboard entry)
- `src/navigation.js` (admin nav)
- `src/lib/supabase.js` (keep copy)

#### API Directories
- `src/api/inventory.js` (admin only)

#### Database & Scripts
- `database/` (all SQL files stay - operations manages schema)
- `scripts/` (Notion import, etc.)
- `supabase/` (edge functions)

#### Documentation
- All markdown files (CLAUDE.md, README.md, etc.)

---

## Shared Dependencies

Both repos will share:

### 1. Git Submodule
- `sailorskills-shared` package
- Both repos add as submodule
- Provides: design tokens, common components, utilities

### 2. Supabase Database
- Same Supabase project
- Same database schema
- Row-Level Security (RLS) handles access control:
  - Customers see only their data
  - Admins see all data via admin role

### 3. Environment Variables
Both need:
```bash
VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
VITE_SUPABASE_ANON_KEY=<same-key>
```

### 4. NPM Dependencies
Both need:
- `@supabase/supabase-js`
- `vite`
- `@playwright/test` (testing)

Portal does NOT need:
- `@notionhq/client` (admin-only)
- `pg` (admin-only)

---

## Implementation Steps

### Phase 1: Create Portal Repo (1-2 hours)

1. **Create new GitHub repo**
   ```bash
   cd /Users/brian/app-development/sailorskills-repos
   mkdir sailorskills-portal
   cd sailorskills-portal
   git init
   git remote add origin https://github.com/standardhuman/sailorskills-portal.git
   ```

2. **Set up base structure**
   - Copy `package.json`, modify name/description
   - Copy `vite.config.js`
   - Copy `vercel.json`, modify for portal routes
   - Copy `.gitignore`
   - Create `.env.example`
   - Create `README.md` for portal

3. **Add shared package as submodule**
   ```bash
   git submodule add https://github.com/standardhuman/sailorskills-shared.git shared
   ```

4. **Create directory structure**
   ```
   sailorskills-portal/
   ├── src/
   │   ├── api/
   │   ├── auth/
   │   ├── lib/
   │   └── views/
   ├── shared/ (submodule)
   ├── package.json
   ├── vite.config.js
   └── vercel.json
   ```

### Phase 2: Copy Portal Files (1-2 hours)

5. **Copy HTML files**
   - Copy all `portal*.html`, `login.html`, `signup.html`, `reset-password.html`
   - Update paths if needed (shouldn't need changes)

6. **Copy JavaScript files**
   - Copy all portal-specific files listed above
   - Organize into proper directories

7. **Copy supporting files**
   - `src/lib/supabase.js`
   - Any portal-specific utilities

8. **Install dependencies**
   ```bash
   npm install
   ```

9. **Test locally**
   ```bash
   npm run dev
   ```

### Phase 3: Deploy Portal to Vercel (30 min)

10. **Create Vercel project**
    - Link sailorskills-portal repo
    - Set environment variables
    - Deploy

11. **Test deployment**
    - Verify login works
    - Verify portal pages load
    - Check Supabase connection

### Phase 4: Configure DNS (15 min)

12. **Add custom domain**
    - Vercel: Add `portal.sailorskills.com`
    - Get CNAME instructions

13. **Update Squarespace DNS**
    - Add CNAME record for `portal`
    - Wait for verification

### Phase 5: Clean Up Operations Repo (1 hour)

14. **Remove portal files from Operations**
    - Delete all portal HTML files
    - Delete portal JavaScript files
    - Update `package.json` if needed

15. **Update Operations navigation**
    - Remove any links to customer portal
    - Ensure admin-only routes work

16. **Test Operations**
    - Run `npm run dev`
    - Verify admin dashboard works
    - Run tests

17. **Deploy updated Operations**
    - Push to GitHub
    - Vercel auto-deploys

### Phase 6: Operations Domain (Already Configured)

18. **ops.sailorskills.com - Already Set Up**
    - ✅ DNS already configured
    - ✅ Vercel already connected
    - No action needed for this phase

### Phase 7: Documentation & Handoff (30 min)

19. **Update READMEs**
    - Portal: Document portal-specific setup
    - Operations: Update to reflect admin-only purpose

20. **Update CLAUDE.md files**
    - Portal: Customer portal guidelines
    - Operations: Admin dashboard guidelines

21. **Update root ROADMAP.md**
    - Document the separation
    - Update service architecture diagram

---

## Testing Checklist

### Portal Testing
- [ ] Login with password works
- [ ] Login with magic link works
- [ ] Signup flow works
- [ ] Password reset works
- [ ] Portal dashboard loads
- [ ] Service history displays correctly
- [ ] Invoices page works
- [ ] Messages page works
- [ ] Service request submission works
- [ ] Account settings update works
- [ ] Multi-boat switching works (if customer has >1 boat)
- [ ] Logout works

### Operations Testing
- [ ] Admin dashboard loads
- [ ] Boat management works
- [ ] Service log entry works
- [ ] Schedule view works
- [ ] Packing lists work
- [ ] Paint alerts work
- [ ] Admin messages work
- [ ] Admin service requests work
- [ ] All forms work

### Integration Testing
- [ ] Data entered in Operations appears in Portal
- [ ] Service logs show in customer portal
- [ ] Invoices sync correctly
- [ ] Messages work bidirectionally
- [ ] No CORS issues
- [ ] No authentication conflicts

---

## Rollback Plan

If something goes wrong:

1. **Portal issues**: Keep portal.sailorskills.com DNS paused, customers continue using old system
2. **Operations issues**: Revert git commit, Vercel auto-redeploys previous version
3. **DNS issues**: Can take 48 hours to propagate changes/rollbacks

**Mitigation**: Deploy portal first, test thoroughly, THEN clean up operations repo. Both repos can coexist during transition.

---

## Timeline Estimate

- **Phase 1**: Create Portal Repo - 1-2 hours
- **Phase 2**: Copy Portal Files - 1-2 hours
- **Phase 3**: Deploy Portal to Vercel - 30 min
- **Phase 4**: Configure DNS - 15 min + propagation time
- **Phase 5**: Clean Up Operations - 1 hour
- **Phase 6**: Operations Domain (already done) - 0 min
- **Phase 7**: Documentation - 30 min

**Total active work**: 4-6 hours
**Total elapsed time**: 1-2 days (including DNS propagation)

**Operations Domain**: Already configured at `ops.sailorskills.com`

---

## Post-Separation Benefits

✅ **Security**: Complete isolation between admin and customer code
✅ **Performance**: Smaller bundles, faster builds
✅ **Development**: Clear separation of concerns
✅ **Deployment**: Independent release cycles
✅ **Domains**: Professional branded subdomains
✅ **Maintenance**: Easier to reason about each codebase

---

## Questions Resolved

1. ✅ **`client-portal.html`**: LEGACY - Old public URL-based portal (accessed via `sailorskills.com/{boat-slug}`). Superseded by new authenticated portal. **Action:** Delete from both repos.
2. ✅ **Operations domain**: Already configured at `ops.sailorskills.com`
3. **Shared components**: If portal needs modal/toast, should we add to shared package or duplicate?
4. **Email service**: Portal may need to send emails (password reset). Use edge function or duplicate service?

---

## Next Steps

After approval:
1. Start with Phase 1 (create repo)
2. Work through phases sequentially
3. Test each phase before proceeding
4. Keep Operations repo untouched until Portal is verified working

---

**Ready to proceed?**
